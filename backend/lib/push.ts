import webpush from "web-push";
import { prisma } from "./prisma";
import { getFrontendUrl, getVapidPrivateKey, getVapidPublicKey, getVapidSubject } from "./env";
import { formatLastMessagePreview } from "./s3";

let configured = false;

function ensureConfigured(): boolean {
  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  const subject = getVapidSubject();

  if (!publicKey || !privateKey || !subject) {
    return false;
  }

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }

  return true;
}

export function isPushConfigured(): boolean {
  return !!(getVapidPublicKey() && getVapidPrivateKey() && getVapidSubject());
}

export function getPublicVapidKey(): string | null {
  return getVapidPublicKey() ?? null;
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  conversationId: string;
}

async function sendToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string; id: string },
  payload: PushPayload
): Promise<void> {
  if (!ensureConfigured()) return;

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410 || status === 401 || status === 403) {
      await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
    } else {
      console.error("[push] send failed:", status, subscription.endpoint.slice(0, 48));
    }
  }
}

export async function notifyConversationMessage(
  conversationId: string,
  senderParticipantId: string,
  message: {
    content: string;
    type: string;
    fileName?: string | null;
    participant: { displayName: string };
  }
): Promise<void> {
  if (!isPushConfigured()) return;

  const [conversation, recipients] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { title: true },
    }),
    prisma.participant.findMany({
      where: {
        conversationId,
        leftAt: null,
        id: { not: senderParticipantId },
      },
      select: { userId: true, adminId: true },
    }),
  ]);

  if (!conversation || recipients.length === 0) return;

  const userIds = [...new Set(recipients.map((p) => p.userId).filter(Boolean))] as string[];
  const adminIds = [...new Set(recipients.map((p) => p.adminId).filter(Boolean))] as string[];

  if (userIds.length === 0 && adminIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      OR: [
        ...(userIds.length ? [{ userId: { in: userIds } }] : []),
        ...(adminIds.length ? [{ adminId: { in: adminIds } }] : []),
      ],
    },
  });

  if (subscriptions.length === 0) return;

  const preview = formatLastMessagePreview({
    content: message.content,
    type: message.type as "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT",
    fileName: message.fileName ?? null,
  });

  const payload: PushPayload = {
    title: conversation.title,
    body: `${message.participant.displayName}: ${preview}`,
    url: `${getFrontendUrl()}/chat/${conversationId}`,
    conversationId,
  };

  await Promise.allSettled(
    subscriptions.map((sub) => sendToSubscription(sub, payload))
  );
}
