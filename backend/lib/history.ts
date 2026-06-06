import { prisma } from "./prisma";
import {
  enrichMessagesForViewer,
  type MessagePayload,
} from "./receipts";

export interface HistoryMessage extends MessagePayload {}

export interface HistoryJoinEvent {
  id: string;
  type: "join";
  displayName: string;
  joinedAt: string;
}

export async function getConversationHistory(
  conversationId: string,
  viewerParticipantId: string
): Promise<{
  messages: HistoryMessage[];
  joinEvents: HistoryJoinEvent[];
}> {
  const [messages, participants] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: {
        participant: {
          select: { id: true, displayName: true },
        },
      },
    }),
    prisma.participant.findMany({
      where: { conversationId },
      orderBy: { joinedAt: "asc" },
      select: { id: true, displayName: true, joinedAt: true },
    }),
  ]);

  const formattedMessages = await enrichMessagesForViewer(
    messages,
    viewerParticipantId
  );

  return {
    messages: formattedMessages,
    joinEvents: participants.map((p) => ({
      id: `join-${p.id}`,
      type: "join" as const,
      displayName: p.displayName,
      joinedAt: p.joinedAt.toISOString(),
    })),
  };
}
