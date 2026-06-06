import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParticipantToken } from "@/lib/auth";
import { formatLastMessagePreview, formatMessagePayload } from "@/lib/s3";
import { getUnreadCount } from "@/lib/receipts";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id: conversationId } = await context.params;
  const sessionToken = getParticipantToken(req);

  if (!sessionToken) {
    return errorResponse("Unauthorized", 401);
  }

  const participant = await prisma.participant.findFirst({
    where: { sessionToken, conversationId },
  });

  if (!participant) {
    return errorResponse("Unauthorized", 401);
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          displayName: true,
          phone: true,
          joinedAt: true,
        },
      },
      _count: { select: { messages: true } },
    },
  });

  if (!conversation || conversation.destroyedAt) {
    return errorResponse("Conversation not found or closed", 404);
  }

  const lastMessage = await prisma.message.findFirst({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    include: {
      participant: { select: { id: true, displayName: true } },
    },
  });

  const lastMessagePayload = lastMessage
    ? await formatMessagePayload(lastMessage)
    : null;

  const unreadCount = await getUnreadCount(conversationId, participant.id);
  const lastMessageIsUnread =
    lastMessage !== null &&
    lastMessage.participantId !== participant.id &&
    unreadCount > 0;

  return jsonResponse({
    id: conversation.id,
    type: conversation.type,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    messageCount: conversation._count.messages,
    participantCount: conversation.participants.length,
    you: {
      id: participant.id,
      displayName: participant.displayName,
      phone: participant.phone,
      joinedAt: participant.joinedAt.toISOString(),
    },
    participants: conversation.participants,
    lastMessage: lastMessagePayload
      ? {
          ...lastMessagePayload,
          preview: formatLastMessagePreview({
            content: lastMessage!.content,
            type: lastMessage!.type,
            fileName: lastMessage!.fileName,
          }),
        }
      : null,
    unreadCount,
    lastMessageIsUnread,
  });
}
