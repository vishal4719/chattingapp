import admin from "firebase-admin";
import { prisma } from "./prisma";
import { getFirebaseServiceAccount, getFrontendUrl, isFcmConfigured } from "./env";
import { formatLastMessagePreview } from "./s3";

let firebaseApp: admin.app.App | null = null;

/** Must match frontend FCM_CHANNEL_ID and Android default_notification_channel_id. */
const FCM_ANDROID_CHANNEL_ID = "pandamind_messages";

function getFirebaseApp(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;
  const account = getFirebaseServiceAccount();
  if (!account) return null;
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(account),
  });
  return firebaseApp;
}

export function isPushConfigured(): boolean {
  return isFcmConfigured();
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  conversationId: string;
}

async function sendToToken(
  token: { token: string; id: string },
  payload: PushPayload
): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;

  try {
    await admin.messaging().send({
      token: token.token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url,
        conversationId: payload.conversationId,
        title: payload.title,
        body: payload.body,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: FCM_ANDROID_CHANNEL_ID,
          priority: "high",
          defaultVibrateTimings: true,
          defaultSound: true,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: "default",
            badge: 1,
          },
        },
      },
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      await prisma.fcmToken.delete({ where: { id: token.id } }).catch(() => undefined);
    } else {
      console.error("[fcm] send failed:", code, token.token.slice(0, 16));
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

  const tokens = await prisma.fcmToken.findMany({
    where: {
      OR: [
        ...(userIds.length ? [{ userId: { in: userIds } }] : []),
        ...(adminIds.length ? [{ adminId: { in: adminIds } }] : []),
      ],
    },
  });

  if (tokens.length === 0) return;

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

  await Promise.allSettled(tokens.map((entry) => sendToToken(entry, payload)));
}

async function getConversationRecipientTokens(
  conversationId: string,
  excludeParticipantId: string
) {
  const recipients = await prisma.participant.findMany({
    where: {
      conversationId,
      leftAt: null,
      id: { not: excludeParticipantId },
    },
    select: { userId: true, adminId: true },
  });

  const userIds = [...new Set(recipients.map((p) => p.userId).filter(Boolean))] as string[];
  const adminIds = [...new Set(recipients.map((p) => p.adminId).filter(Boolean))] as string[];

  if (userIds.length === 0 && adminIds.length === 0) return [];

  return prisma.fcmToken.findMany({
    where: {
      OR: [
        ...(userIds.length ? [{ userId: { in: userIds } }] : []),
        ...(adminIds.length ? [{ adminId: { in: adminIds } }] : []),
      ],
    },
  });
}

export async function notifyIncomingCall(
  conversationId: string,
  callerParticipantId: string,
  callType: "video" | "audio",
  callerName: string
): Promise<void> {
  if (!isPushConfigured()) return;

  const [conversation, tokens] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { title: true },
    }),
    getConversationRecipientTokens(conversationId, callerParticipantId),
  ]);

  if (!conversation || tokens.length === 0) return;

  const callLabel = callType === "video" ? "Video call" : "Voice call";
  const payload: PushPayload = {
    title: conversation.title,
    body: `${callerName}: Incoming ${callLabel.toLowerCase()}`,
    url: `${getFrontendUrl()}/chat/${conversationId}`,
    conversationId,
  };

  await Promise.allSettled(tokens.map((entry) => sendToToken(entry, payload)));
}
