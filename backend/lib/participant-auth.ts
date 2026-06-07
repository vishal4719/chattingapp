import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParticipantToken } from "@/lib/auth";

export async function getActiveParticipant(
  req: NextRequest,
  conversationId: string
) {
  const sessionToken = getParticipantToken(req);
  if (!sessionToken) return null;

  return prisma.participant.findFirst({
    where: { sessionToken, conversationId, leftAt: null },
  });
}

export async function getActiveParticipantWithUser(
  req: NextRequest,
  conversationId: string
) {
  const sessionToken = getParticipantToken(req);
  if (!sessionToken) return null;

  return prisma.participant.findFirst({
    where: { sessionToken, conversationId, leftAt: null },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      conversation: true,
    },
  });
}
