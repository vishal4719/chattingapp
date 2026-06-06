import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getClientIpFromHeaders } from "@/lib/ip";
import { generateSessionToken } from "@/lib/tokens";
import { getConversationHistory } from "@/lib/history";
import { emitParticipantJoined } from "@/lib/socket";
import { assertWorkspaceConversation, getAdminById } from "@/lib/admin-workspace";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: NextRequest, context: RouteContext) {
  const jwt = requireAdmin(req);
  if (!jwt) return errorResponse("Unauthorized", 401);

  const adminRecord = await getAdminById(jwt.adminId);
  if (!adminRecord) return errorResponse("Admin not found", 404);

  const { id: conversationId } = await context.params;

  const access = await assertWorkspaceConversation(conversationId, adminRecord);
  if (!access.ok) return errorResponse(access.error, access.status);

  const conversation = access.conversation;

  if (conversation.destroyedAt) {
    return errorResponse("This conversation has been closed", 410);
  }

  try {

    const existing = await prisma.participant.findFirst({
      where: { conversationId, adminId: adminRecord.id },
    });

    if (existing) {
      const history = await getConversationHistory(conversationId, existing.id);
      const joinEvents = history.joinEvents.filter(
        (e) => e.id !== `join-${existing.id}`
      );

      return jsonResponse({
        conversationId: conversation.id,
        sessionToken: existing.sessionToken,
        participantId: existing.id,
        displayName: existing.displayName,
        type: conversation.type,
        title: conversation.title,
        isAdmin: true,
        rejoined: true,
        messages: history.messages,
        joinEvents,
      });
    }

    const ipAddress = getClientIpFromHeaders(req.headers);
    const sessionToken = generateSessionToken();

    const participant = await prisma.participant.create({
      data: {
        conversationId,
        adminId: adminRecord.id,
        displayName: adminRecord.name,
        phone: "admin",
        ipAddress,
        sessionToken,
      },
    });

    emitParticipantJoined(conversationId, {
      id: participant.id,
      displayName: participant.displayName,
    });

    const history = await getConversationHistory(conversationId, participant.id);
    const joinEvents = history.joinEvents.filter(
      (e) => e.id !== `join-${participant.id}`
    );

    return jsonResponse({
      conversationId: conversation.id,
      sessionToken: participant.sessionToken,
      participantId: participant.id,
      displayName: participant.displayName,
      type: conversation.type,
      title: conversation.title,
      isAdmin: true,
      rejoined: false,
      messages: history.messages,
      joinEvents,
    });
  } catch (err) {
    console.error("Admin join failed:", err);
    return errorResponse("Failed to join conversation", 500);
  }
}
