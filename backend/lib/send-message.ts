import { prisma } from "./prisma";
import { formatMessagePayload } from "./s3";
import { createReceiptsForMessage } from "./receipts";
import { emitNewMessage } from "./socket";
import { notifyConversationMessage } from "./push";
import { resolveReplyTarget } from "./reply";

const messageInclude = {
  participant: {
    select: { id: true, displayName: true },
  },
  replyTo: {
    include: {
      participant: {
        select: { id: true, displayName: true },
      },
    },
  },
} as const;

export async function persistTextMessage(params: {
  conversationId: string;
  participantId: string;
  content: string;
  ipAddress: string;
  replyToId?: string | null;
}) {
  const replyToId = await resolveReplyTarget(
    params.conversationId,
    params.replyToId
  );

  const message = await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      participantId: params.participantId,
      content: params.content,
      type: "TEXT",
      ipAddress: params.ipAddress,
      replyToId,
    },
    include: messageInclude,
  });

  const payload = await formatMessagePayload(message);
  payload.status = "SENT";

  emitNewMessage(params.conversationId, payload);

  void createReceiptsForMessage(
    message.id,
    params.conversationId,
    params.participantId
  );
  void notifyConversationMessage(params.conversationId, params.participantId, {
    content: payload.content,
    type: payload.type ?? "TEXT",
    fileName: payload.fileName,
    participant: payload.participant,
  });

  return payload;
}
