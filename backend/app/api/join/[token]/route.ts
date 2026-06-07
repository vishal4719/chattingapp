import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getClientIpFromHeaders } from "@/lib/ip";
import { generateSessionToken } from "@/lib/tokens";
import { getConversationHistory } from "@/lib/history";
import { emitParticipantJoined } from "@/lib/socket";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ token: string }> };

async function buildJoinResponse(
  conversation: {
    id: string;
    type: string;
    title: string;
  },
  participant: { id: string; sessionToken: string; displayName: string },
  rejoined: boolean
) {
  const history = await getConversationHistory(conversation.id, participant.id);
  const joinEvents = history.joinEvents.filter(
    (e) => e.id !== `join-${participant.id}`
  );

  return {
    conversationId: conversation.id,
    sessionToken: participant.sessionToken,
    participantId: participant.id,
    displayName: participant.displayName,
    type: conversation.type,
    title: conversation.title,
    messages: history.messages,
    joinEvents,
    rejoined,
  };
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;

  const conversation = await prisma.conversation.findUnique({
    where: { inviteToken: token },
  });

  if (!conversation) {
    return errorResponse("Invalid invite link", 404);
  }

  const auth = requireUser(req);
  let alreadyJoined = false;

  if (auth) {
    const existing = await prisma.participant.findFirst({
      where: {
        conversationId: conversation.id,
        userId: auth.userId,
      },
    });
    alreadyJoined = !!existing;
  }

  return jsonResponse({
    id: conversation.id,
    type: conversation.type,
    title: conversation.title,
    inviteToken: conversation.inviteToken,
    destroyed: !!conversation.destroyedAt,
    alreadyJoined,
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const auth = requireUser(req);

  if (!auth) {
    return errorResponse("Sign in to join this group", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
  });

  if (!user) {
    return errorResponse("User not found", 404);
  }

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
    const existing = await prisma.participant.findFirst({
      where: {
        conversationId: conversation.id,
        userId: user.id,
      },
    });

    if (existing) {
      const payload = await buildJoinResponse(
        conversation,
        existing,
        true
      );
      return jsonResponse(payload);
    }

    const ipAddress = getClientIpFromHeaders(req.headers);
    const sessionToken = generateSessionToken();

    const participant = await prisma.participant.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        displayName: user.name,
        phone: user.phone,
        ipAddress,
        sessionToken,
      },
    });

    emitParticipantJoined(conversation.id, {
      id: participant.id,
      displayName: participant.displayName,
    });

    const payload = await buildJoinResponse(
      conversation,
      participant,
      false
    );
    return jsonResponse(payload);
  } catch {
    return errorResponse("Failed to join conversation", 500);
  }
}
