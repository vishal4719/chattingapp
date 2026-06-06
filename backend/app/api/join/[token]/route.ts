import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIpFromHeaders } from "@/lib/ip";
import { generateSessionToken } from "@/lib/tokens";
import { getConversationHistory } from "@/lib/history";
import { emitParticipantJoined } from "@/lib/socket";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

const joinSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().min(5).max(20),
});

type RouteContext = { params: Promise<{ token: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { token } = await context.params;

  const conversation = await prisma.conversation.findUnique({
    where: { inviteToken: token },
  });

  if (!conversation) {
    return errorResponse("Invalid invite link", 404);
  }

  return jsonResponse({
    id: conversation.id,
    type: conversation.type,
    title: conversation.title,
    inviteToken: conversation.inviteToken,
    destroyed: !!conversation.destroyedAt,
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;

  const conversation = await prisma.conversation.findUnique({
    where: { inviteToken: token },
  });

  if (!conversation) {
    return errorResponse("Invalid invite link", 404);
  }

  if (conversation.destroyedAt) {
    return errorResponse("This conversation has been closed", 410);
  }

  try {
    const body = await req.json();
    const parsed = joinSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Name and phone are required", 400);
    }

    const ipAddress = getClientIpFromHeaders(req.headers);
    const sessionToken = generateSessionToken();

    const participant = await prisma.participant.create({
      data: {
        conversationId: conversation.id,
        displayName: parsed.data.name,
        phone: parsed.data.phone,
        ipAddress,
        sessionToken,
      },
    });

    const history = await getConversationHistory(conversation.id);

    // Exclude the new joiner's own join event — others see it live via socket
    const joinEvents = history.joinEvents.filter(
      (e) => e.id !== `join-${participant.id}`
    );

    emitParticipantJoined(conversation.id, {
      id: participant.id,
      displayName: participant.displayName,
    });

    return jsonResponse({
      conversationId: conversation.id,
      sessionToken: participant.sessionToken,
      participantId: participant.id,
      displayName: participant.displayName,
      type: conversation.type,
      title: conversation.title,
      messages: history.messages,
      joinEvents,
    });
  } catch {
    return errorResponse("Failed to join conversation", 500);
  }
}
