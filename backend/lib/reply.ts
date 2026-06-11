import { prisma } from "./prisma";
import { formatLastMessagePreview } from "./s3";
import type { MessageReplyPreview } from "./s3";

export async function resolveReplyTarget(
  conversationId: string,
  replyToId?: string | null
): Promise<string | null> {
  if (!replyToId) return null;

  const parent = await prisma.message.findFirst({
    where: { id: replyToId, conversationId },
    select: { id: true },
  });

  if (!parent) {
    throw new Error("Reply message not found");
  }

  return parent.id;
}

export function formatReplyPreview(message: {
  id: string;
  content: string;
  type: import("@prisma/client").MessageType;
  fileName: string | null;
  participant: { id: string; displayName: string };
}): MessageReplyPreview {
  return {
    id: message.id,
    content: formatLastMessagePreview(message),
    type: message.type,
    fileName: message.fileName,
    participant: message.participant,
  };
}
