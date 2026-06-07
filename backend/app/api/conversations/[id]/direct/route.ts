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

type MemberIdentity = { userId?: string; adminId?: string };

function memberIdentity(participant: {
  userId: string | null;
  adminId: string | null;
}): MemberIdentity | null {
  if (participant.userId) return { userId: participant.userId };
  if (participant.adminId) return { adminId: participant.adminId };
  return null;
}

function identityMatches(
  participant: { userId: string | null; adminId: string | null },
  identity: MemberIdentity
): boolean {
  if (identity.userId && participant.userId === identity.userId) return true;
  if (identity.adminId && participant.adminId === identity.adminId) return true;
  return false;
}

async function findExistingDirectChat(
  workspaceAdminId: string | null,
  createdByAdminId: string,
  identityA: MemberIdentity,
  identityB: MemberIdentity
) {
  const candidates = await prisma.conversation.findMany({
    where: {
      type: "DIRECT",
      destroyedAt: null,
      createdByAdminId,
      workspaceAdminId,
    },
    include: {
      participants: {
        where: { leftAt: null },
        select: {
          id: true,
          userId: true,
          adminId: true,
          sessionToken: true,
          displayName: true,
          phone: true,
        },
      },
    },
  });

  return candidates.find((conv) => {
    if (conv.participants.length !== 2) return false;
    const hasA = conv.participants.some((p) => identityMatches(p, identityA));
    const hasB = conv.participants.some((p) => identityMatches(p, identityB));
    return hasA && hasB;
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

  const myIdentity = memberIdentity(participant);
  if (!myIdentity) {
    return errorResponse(
      "Sign in with a registered account to message privately",
      403
    );
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

    const targetIdentity = memberIdentity(target);
    if (!targetIdentity) {
      return errorResponse("This member has not registered an account yet", 400);
    }

    const existing = await findExistingDirectChat(
      sourceConversation.workspaceAdminId,
      sourceConversation.createdByAdminId,
      myIdentity,
      targetIdentity
    );

    if (existing) {
      let myParticipant = existing.participants.find((p) =>
        identityMatches(p, myIdentity)
      );

      if (!myParticipant) {
        myParticipant = await prisma.participant.create({
          data: {
            conversationId: existing.id,
            userId: myIdentity.userId,
            adminId: myIdentity.adminId,
            displayName: participant.displayName,
            phone: participant.phone,
            ipAddress: getClientIpFromHeaders(req.headers),
            sessionToken: generateSessionToken(),
          },
        });
      }

      const history = await getConversationHistory(existing.id, myParticipant.id);
      const other = existing.participants.find((p) =>
        identityMatches(p, targetIdentity)
      );

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
          userId: myIdentity.userId,
          adminId: myIdentity.adminId,
          displayName: participant.displayName,
          phone: participant.phone,
          ipAddress,
          sessionToken: generateSessionToken(),
        },
      }),
      prisma.participant.create({
        data: {
          conversationId: directConversation.id,
          userId: targetIdentity.userId,
          adminId: targetIdentity.adminId,
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
