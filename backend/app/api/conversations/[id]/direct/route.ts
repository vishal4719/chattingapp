import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveParticipantWithUser } from "@/lib/participant-auth";
import { getClientIpFromHeaders } from "@/lib/ip";
import { getConversationHistory } from "@/lib/history";
import { generateInviteToken, generateSessionToken } from "@/lib/tokens";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

const directSchema = z.object({
  targetParticipantId: z.string().min(1),
});

type RouteContext = { params: Promise<{ id: string }> };

async function findExistingDirectChat(
  workspaceAdminId: string | null,
  createdByAdminId: string,
  userIdA: string,
  userIdB: string
) {
  const candidates = await prisma.conversation.findMany({
    where: {
      type: "DIRECT",
      destroyedAt: null,
      createdByAdminId,
      workspaceAdminId,
      participants: {
        some: { userId: userIdA, leftAt: null },
      },
    },
    include: {
      participants: {
        where: { leftAt: null },
        select: { id: true, userId: true, sessionToken: true, displayName: true },
      },
    },
  });

  return candidates.find((conv) => {
    const userIds = conv.participants
      .map((p) => p.userId)
      .filter((id): id is string => !!id);
    return (
      userIds.length === 2 &&
      userIds.includes(userIdA) &&
      userIds.includes(userIdB)
    );
  });
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: sourceConversationId } = await context.params;
  const participant = await getActiveParticipantWithUser(
    req,
    sourceConversationId
  );

  if (!participant) {
    return errorResponse("Unauthorized", 401);
  }

  if (!participant.userId) {
    return errorResponse("Sign in with a registered account to message privately", 403);
  }

  const sourceConversation = participant.conversation;
  if (sourceConversation.destroyedAt) {
    return errorResponse("Conversation not found or closed", 404);
  }

  try {
    const body = await req.json();
    const parsed = directSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid request", 400);
    }

    const target = await prisma.participant.findFirst({
      where: {
        id: parsed.data.targetParticipantId,
        conversationId: sourceConversationId,
        leftAt: null,
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!target) {
      return errorResponse("Participant not found", 404);
    }

    if (target.id === participant.id) {
      return errorResponse("Cannot message yourself", 400);
    }

    if (!target.userId) {
      return errorResponse("This member has not registered an account yet", 400);
    }

    const existing = await findExistingDirectChat(
      sourceConversation.workspaceAdminId,
      sourceConversation.createdByAdminId,
      participant.userId,
      target.userId
    );

    if (existing) {
      let myParticipant = existing.participants.find(
        (p) => p.userId === participant.userId
      );

      if (!myParticipant) {
        myParticipant = await prisma.participant.create({
          data: {
            conversationId: existing.id,
            userId: participant.userId,
            displayName: participant.displayName,
            phone: participant.phone,
            ipAddress: getClientIpFromHeaders(req.headers),
            sessionToken: generateSessionToken(),
          },
        });
      }

      const history = await getConversationHistory(existing.id, myParticipant.id);
      const other = existing.participants.find((p) => p.userId === target.userId);

      return jsonResponse({
        conversationId: existing.id,
        sessionToken: myParticipant.sessionToken,
        participantId: myParticipant.id,
        displayName: participant.displayName,
        title: other?.displayName ?? target.displayName,
        type: "DIRECT",
        rejoined: true,
        messages: history.messages,
        joinEvents: history.joinEvents.filter(
          (e) => e.id !== `join-${myParticipant!.id}`
        ),
      });
    }

    const ipAddress = getClientIpFromHeaders(req.headers);
    const directConversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        title: target.displayName,
        inviteToken: generateInviteToken(),
        createdByAdminId: sourceConversation.createdByAdminId,
        workspaceAdminId: sourceConversation.workspaceAdminId,
      },
    });

    const [myDirectParticipant, _theirParticipant] = await prisma.$transaction([
      prisma.participant.create({
        data: {
          conversationId: directConversation.id,
          userId: participant.userId,
          displayName: participant.displayName,
          phone: participant.phone,
          ipAddress,
          sessionToken: generateSessionToken(),
        },
      }),
      prisma.participant.create({
        data: {
          conversationId: directConversation.id,
          userId: target.userId,
          displayName: target.displayName,
          phone: target.phone,
          ipAddress: "direct",
          sessionToken: generateSessionToken(),
        },
      }),
    ]);

    return jsonResponse({
      conversationId: directConversation.id,
      sessionToken: myDirectParticipant.sessionToken,
      participantId: myDirectParticipant.id,
      displayName: myDirectParticipant.displayName,
      title: target.displayName,
      type: "DIRECT",
      rejoined: false,
      messages: [],
      joinEvents: [],
    });
  } catch {
    return errorResponse("Failed to start direct chat", 500);
  }
}
