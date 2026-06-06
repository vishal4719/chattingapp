import { prisma } from "./prisma";
import type { MessagePayload } from "./s3";
import { formatMessagePayload } from "./s3";

export type { MessagePayload };
export type MessageStatus = "SENT" | "DELIVERED" | "READ";

export async function createReceiptsForMessage(
  messageId: string,
  conversationId: string,
  senderParticipantId: string
): Promise<void> {
  const others = await prisma.participant.findMany({
    where: {
      conversationId,
      id: { not: senderParticipantId },
    },
    select: { id: true },
  });

  if (others.length === 0) return;

  await prisma.messageReceipt.createMany({
    data: others.map((p) => ({
      messageId,
      participantId: p.id,
    })),
    skipDuplicates: true,
  });
}

export async function computeMessageStatus(
  messageId: string
): Promise<MessageStatus> {
  const receipts = await prisma.messageReceipt.findMany({
    where: { messageId },
  });

  if (receipts.length === 0) return "SENT";

  const allDelivered = receipts.every((r) => r.deliveredAt !== null);
  const allRead = receipts.every((r) => r.readAt !== null);

  if (allRead) return "READ";
  if (allDelivered) return "DELIVERED";
  return "SENT";
}

export async function markMessageDelivered(
  messageId: string,
  participantId: string,
  conversationId: string
): Promise<MessageStatus | null> {
  const receipt = await prisma.messageReceipt.findUnique({
    where: {
      messageId_participantId: { messageId, participantId },
    },
    include: {
      message: { select: { participantId: true, conversationId: true } },
    },
  });

  if (
    !receipt ||
    receipt.message.conversationId !== conversationId ||
    receipt.deliveredAt
  ) {
    return null;
  }

  await prisma.messageReceipt.update({
    where: { id: receipt.id },
    data: {
      deliveredAt: new Date(),
    },
  });

  const status = await computeMessageStatus(messageId);
  return status;
}

export async function markConversationRead(
  conversationId: string,
  participantId: string
): Promise<Array<{ messageId: string; status: MessageStatus }>> {
  const now = new Date();

  const pending = await prisma.messageReceipt.findMany({
    where: {
      participantId,
      readAt: null,
      message: { conversationId },
    },
    select: { id: true, messageId: true, deliveredAt: true },
  });

  await prisma.participant.update({
    where: { id: participantId },
    data: { lastReadAt: now },
  });

  if (pending.length === 0) {
    return [];
  }

  await prisma.$transaction(
    pending.map((r) =>
      prisma.messageReceipt.update({
        where: { id: r.id },
        data: {
          readAt: now,
          deliveredAt: r.deliveredAt ?? now,
        },
      })
    )
  );

  const messageIds = [...new Set(pending.map((r) => r.messageId))];
  const updates: Array<{ messageId: string; status: MessageStatus }> = [];

  for (const messageId of messageIds) {
    const status = await computeMessageStatus(messageId);
    updates.push({ messageId, status });
  }

  return updates;
}

export async function getUnreadCount(
  conversationId: string,
  participantId: string
): Promise<number> {
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: { lastReadAt: true },
  });

  if (!participant) return 0;

  return prisma.message.count({
    where: {
      conversationId,
      participantId: { not: participantId },
      createdAt: participant.lastReadAt
        ? { gt: participant.lastReadAt }
        : undefined,
    },
  });
}

export async function formatMessageForViewer(
  message: {
    id: string;
    content: string;
    type: import("@prisma/client").MessageType;
    createdAt: Date;
    fileName: string | null;
    mimeType: string | null;
    fileSize: number | null;
    s3Key: string | null;
    participantId: string;
    participant: { id: string; displayName: string };
  },
  viewerParticipantId: string
): Promise<MessagePayload & { status?: MessageStatus }> {
  const payload = await formatMessagePayload(message);

  if (message.participantId === viewerParticipantId) {
    payload.status = await computeMessageStatus(message.id);
  }

  return payload;
}

export async function enrichMessagesForViewer(
  messages: Array<{
    id: string;
    content: string;
    type: import("@prisma/client").MessageType;
    createdAt: Date;
    fileName: string | null;
    mimeType: string | null;
    fileSize: number | null;
    s3Key: string | null;
    participantId: string;
    participant: { id: string; displayName: string };
  }>,
  viewerParticipantId: string
): Promise<Array<MessagePayload & { status?: MessageStatus }>> {
  return Promise.all(
    messages.map((m) => formatMessageForViewer(m, viewerParticipantId))
  );
}
