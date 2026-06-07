import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getParticipantToken } from "@/lib/auth";
import { getClientIpFromHeaders } from "@/lib/ip";
import { getConversationHistory } from "@/lib/history";
import {
  createReceiptsForMessage,
} from "@/lib/receipts";
import {
  inferMessageType,
  resolveMimeType,
  uploadChatFile,
  formatMessagePayload,
} from "@/lib/s3";
import { emitNewMessage } from "@/lib/socket";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

const messageSchema = z.object({
  content: z.string().min(1).max(5000),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

async function getAuthenticatedParticipant(
  req: NextRequest,
  conversationId: string
) {
  const sessionToken = getParticipantToken(req);
  if (!sessionToken) return null;

  return prisma.participant.findFirst({
    where: { sessionToken, conversationId },
    include: {
      conversation: { select: { title: true } },
    },
  });
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id: conversationId } = await context.params;
  const participant = await getAuthenticatedParticipant(req, conversationId);

  if (!participant) {
    return errorResponse("Unauthorized", 401);
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.destroyedAt) {
    return errorResponse("Conversation not found or closed", 404);
  }

  const history = await getConversationHistory(
    conversationId,
    participant.id
  );

  const joinEvents = history.joinEvents.filter(
    (e) => e.id !== `join-${participant.id}`
  );

  return jsonResponse({
    messages: history.messages,
    joinEvents,
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: conversationId } = await context.params;
  const participant = await getAuthenticatedParticipant(req, conversationId);

  if (!participant) {
    return errorResponse("Unauthorized", 401);
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.destroyedAt) {
    return errorResponse("Conversation not found or closed", 404);
  }

  const ipAddress = getClientIpFromHeaders(req.headers);
  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return errorResponse("File is required", 400);
      }

      const caption = (formData.get("content") as string | null)?.trim() ?? "";
      if (caption.length > 5000) {
        return errorResponse("Caption is too long", 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = resolveMimeType(
        file.name || "file",
        file.type || "application/octet-stream"
      );

      let uploadResult;
      try {
        uploadResult = await uploadChatFile({
          groupTitle: conversation.title,
          senderName: participant.displayName,
          fileName: file.name || "file",
          mimeType,
          buffer,
        });
      } catch (err) {
        return errorResponse(
          err instanceof Error ? err.message : "Upload failed",
          400
        );
      }

      const message = await prisma.message.create({
        data: {
          conversationId,
          participantId: participant.id,
          content: caption,
          type: inferMessageType(uploadResult.mimeType),
          fileName: uploadResult.fileName,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
          s3Key: uploadResult.s3Key,
          ipAddress,
        },
        include: {
          participant: {
            select: { id: true, displayName: true },
          },
        },
      });

      await createReceiptsForMessage(
        message.id,
        conversationId,
        participant.id
      );

      const payload = await formatMessagePayload(message);
      payload.status = "SENT";
      emitNewMessage(conversationId, payload);
      return jsonResponse({ message: payload });
    }

    const body = await req.json();
    const parsed = messageSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Message content is required", 400);
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        participantId: participant.id,
        content: parsed.data.content,
        type: "TEXT",
        ipAddress,
      },
      include: {
        participant: {
          select: { id: true, displayName: true },
        },
      },
    });

    const [payload] = await Promise.all([
      formatMessagePayload(message).then((formatted) => {
        formatted.status = "SENT";
        return formatted;
      }),
      createReceiptsForMessage(message.id, conversationId, participant.id),
    ]);

    emitNewMessage(conversationId, payload);
    return jsonResponse({ message: payload });
  } catch {
    return errorResponse("Failed to send message", 500);
  }
}
