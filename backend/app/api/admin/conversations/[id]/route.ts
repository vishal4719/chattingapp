import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildInviteUrl } from "@/lib/tokens";
import {
  emitConversationDestroyed,
} from "@/lib/socket";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest, context: RouteContext) {
  const admin = requireAdmin(req);
  if (!admin) return errorResponse("Unauthorized", 401);

  const { id } = await context.params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          displayName: true,
          phone: true,
          ipAddress: true,
          joinedAt: true,
        },
      },
      _count: { select: { messages: true } },
    },
  });

  if (!conversation) {
    return errorResponse("Conversation not found", 404);
  }

  return jsonResponse({
    id: conversation.id,
    type: conversation.type,
    title: conversation.title,
    inviteToken: conversation.inviteToken,
    inviteUrl: buildInviteUrl(conversation.inviteToken),
    destroyedAt: conversation.destroyedAt,
    createdAt: conversation.createdAt,
    messageCount: conversation._count.messages,
    participants: conversation.participants,
  });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const admin = requireAdmin(req);
  if (!admin) return errorResponse("Unauthorized", 401);

  const { id } = await context.params;

  const conversation = await prisma.conversation.findUnique({ where: { id } });

  if (!conversation) {
    return errorResponse("Conversation not found", 404);
  }

  if (conversation.destroyedAt) {
    return errorResponse("Conversation already destroyed", 400);
  }

  await prisma.conversation.update({
    where: { id },
    data: { destroyedAt: new Date() },
  });

  emitConversationDestroyed(id);

  return jsonResponse({ success: true, conversationId: id });
}
