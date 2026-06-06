import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParticipantToken } from "@/lib/auth";
import { markConversationRead } from "@/lib/receipts";
import { emitMessageStatus } from "@/lib/socket";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: NextRequest, context: RouteContext) {
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
  });

  if (!conversation || conversation.destroyedAt) {
    return errorResponse("Conversation not found or closed", 404);
  }

  const updates = await markConversationRead(
    conversationId,
    participant.id
  );

  for (const { messageId, status } of updates) {
    emitMessageStatus(conversationId, messageId, status);
  }

  return jsonResponse({
    success: true,
    updatedMessageIds: updates.map((u) => u.messageId),
    unreadCount: 0,
  });
}
