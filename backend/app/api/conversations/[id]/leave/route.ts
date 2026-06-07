import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveParticipant } from "@/lib/participant-auth";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: conversationId } = await context.params;
  const participant = await getActiveParticipant(req, conversationId);

  if (!participant) {
    return errorResponse("Unauthorized", 401);
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.destroyedAt) {
    return errorResponse("Conversation not found or closed", 404);
  }

  await prisma.participant.update({
    where: { id: participant.id },
    data: { leftAt: new Date() },
  });

  return jsonResponse({ success: true, conversationId });
}
