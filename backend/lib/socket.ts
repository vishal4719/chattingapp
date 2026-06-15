import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { z } from "zod";
import { prisma } from "./prisma";
import { verifyAdminToken, verifyUserToken } from "./auth";
import { getAdminById, getWorkspaceId } from "./admin-workspace";
import type { MessagePayload } from "./s3";
import { getAllowedOrigins } from "./env";
import {
  markConversationRead,
  markMessageDelivered,
  type MessageStatus,
} from "./receipts";
import { persistTextMessage } from "./send-message";

const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1).max(5000),
  replyToId: z.string().min(1).optional(),
});

declare global {
  // eslint-disable-next-line no-var
  var __chatSocketIO: SocketIOServer | undefined;
}

let io: SocketIOServer | null = null;

function getIO(): SocketIOServer | null {
  return io ?? global.__chatSocketIO ?? null;
}

export function initSocket(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || getAllowedOrigins().includes(origin.replace(/\/$/, ""))) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  global.__chatSocketIO = io;

  io.on("connection", (socket) => {
    const { participantToken, adminJwt, userJwt } = socket.handshake.auth as {
      participantToken?: string;
      adminJwt?: string;
      userJwt?: string;
    };

    socket.on("join:inbox", async () => {
      if (userJwt) {
        const user = verifyUserToken(userJwt);
        if (!user) return;

        const participants = await prisma.participant.findMany({
          where: {
            userId: user.userId,
            leftAt: null,
            conversation: { destroyedAt: null },
          },
          select: { conversationId: true },
        });

        for (const p of participants) {
          socket.join(`conv:${p.conversationId}`);
        }
        return;
      }

      if (adminJwt) {
        const admin = verifyAdminToken(adminJwt);
        if (!admin) return;

        const adminRecord = await getAdminById(admin.adminId);
        if (!adminRecord) return;

        const workspaceId = getWorkspaceId(adminRecord);
        const conversations = await prisma.conversation.findMany({
          where: {
            destroyedAt: null,
            OR: [
              { workspaceAdminId: workspaceId },
              { workspaceAdminId: null, createdByAdminId: workspaceId },
            ],
          },
          select: { id: true },
        });

        for (const c of conversations) {
          socket.join(`conv:${c.id}`);
        }
      }
    });

    socket.on("join:conversation", async (conversationId: string) => {
      if (!conversationId) return;

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || conversation.destroyedAt) {
        socket.emit("conversation:destroyed", { conversationId });
        return;
      }

      if (participantToken) {
        const participant = await prisma.participant.findFirst({
          where: {
            sessionToken: participantToken,
            conversationId,
            leftAt: null,
          },
        });

        if (participant) {
          socket.join(`conv:${conversationId}`);
          socket.data.participantId = participant.id;
          socket.data.displayName = participant.displayName;
          socket.data.conversationId = conversationId;
          return;
        }
      }

      if (adminJwt) {
        const admin = verifyAdminToken(adminJwt);
        if (admin) {
          socket.join(`conv:${conversationId}`);
          const adminParticipant = await prisma.participant.findFirst({
            where: { conversationId, adminId: admin.adminId },
          });
          if (adminParticipant) {
            socket.data.participantId = adminParticipant.id;
            socket.data.displayName = adminParticipant.displayName;
            socket.data.conversationId = conversationId;
          }
        }
      }
    });

    socket.on("typing:start", (data: { conversationId: string }) => {
      const participantId = socket.data.participantId as string | undefined;
      const displayName = socket.data.displayName as string | undefined;
      const joinedConv = socket.data.conversationId as string | undefined;

      if (!participantId || !displayName || data.conversationId !== joinedConv) {
        return;
      }

      socket.to(`conv:${data.conversationId}`).emit("typing:update", {
        conversationId: data.conversationId,
        participantId,
        displayName,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (data: { conversationId: string }) => {
      const participantId = socket.data.participantId as string | undefined;
      const displayName = socket.data.displayName as string | undefined;
      const joinedConv = socket.data.conversationId as string | undefined;

      if (!participantId || !displayName || data.conversationId !== joinedConv) {
        return;
      }

      socket.to(`conv:${data.conversationId}`).emit("typing:update", {
        conversationId: data.conversationId,
        participantId,
        displayName,
        isTyping: false,
      });
    });

    socket.on(
      "message:send",
      async (
        data: { conversationId: string; content: string; replyToId?: string },
        ack?: (response: { message?: MessagePayload; error?: string }) => void
      ) => {
        const participantId = socket.data.participantId as string | undefined;
        const joinedConv = socket.data.conversationId as string | undefined;
        const parsed = sendMessageSchema.safeParse(data);

        if (
          !participantId ||
          !parsed.success ||
          parsed.data.conversationId !== joinedConv
        ) {
          ack?.({ error: "Unauthorized" });
          return;
        }

        try {
          const forwarded = socket.handshake.headers["x-forwarded-for"];
          const ipAddress =
            (typeof forwarded === "string"
              ? forwarded.split(",")[0]?.trim()
              : undefined) ??
            socket.handshake.address ??
            "socket";

          const payload = await persistTextMessage({
            conversationId: parsed.data.conversationId,
            participantId,
            content: parsed.data.content,
            ipAddress,
            replyToId: parsed.data.replyToId,
          });

          ack?.({ message: payload });
        } catch {
          ack?.({ error: "Failed to send message" });
        }
      }
    );

    socket.on(
      "message:delivered",
      async (data: { conversationId: string; messageId: string }) => {
        const participantId = socket.data.participantId as string | undefined;
        const joinedConv = socket.data.conversationId as string | undefined;

        if (
          !participantId ||
          !data.messageId ||
          data.conversationId !== joinedConv
        ) {
          return;
        }

        const status = await markMessageDelivered(
          data.messageId,
          participantId,
          data.conversationId
        );

        if (status) {
          emitMessageStatus(data.conversationId, data.messageId, status);
        }
      }
    );

    socket.on(
      "messages:read",
      async (data: { conversationId: string }) => {
        const participantId = socket.data.participantId as string | undefined;
        const joinedConv = socket.data.conversationId as string | undefined;

        if (!participantId || data.conversationId !== joinedConv) {
          return;
        }

        const updates = await markConversationRead(
          data.conversationId,
          participantId
        );

        for (const { messageId, status } of updates) {
          emitMessageStatus(data.conversationId, messageId, status);
        }

        socket.emit("unread:update", {
          conversationId: data.conversationId,
          unreadCount: 0,
        });
      }
    );

    socket.on(
      "call:start",
      (data: { conversationId: string; callType: "video" | "audio" }) => {
        const participantId = socket.data.participantId as string | undefined;
        const displayName = socket.data.displayName as string | undefined;
        const joinedConv = socket.data.conversationId as string | undefined;

        if (
          !participantId ||
          !displayName ||
          !data.conversationId ||
          data.conversationId !== joinedConv
        ) {
          return;
        }

        socket.to(`conv:${data.conversationId}`).emit("call:incoming", {
          conversationId: data.conversationId,
          callType: data.callType,
          callerId: participantId,
          callerName: displayName,
        });
      }
    );

    socket.on(
      "call:accept",
      (data: { conversationId: string; callType: "video" | "audio" }) => {
        const participantId = socket.data.participantId as string | undefined;
        const displayName = socket.data.displayName as string | undefined;
        const joinedConv = socket.data.conversationId as string | undefined;

        if (
          !participantId ||
          !displayName ||
          data.conversationId !== joinedConv
        ) {
          return;
        }

        socket.to(`conv:${data.conversationId}`).emit("call:accepted", {
          conversationId: data.conversationId,
          callType: data.callType,
          participantId,
          participantName: displayName,
        });
      }
    );

    socket.on(
      "call:decline",
      (data: { conversationId: string; callerId: string }) => {
        const participantId = socket.data.participantId as string | undefined;
        const displayName = socket.data.displayName as string | undefined;
        const joinedConv = socket.data.conversationId as string | undefined;

        if (
          !participantId ||
          !displayName ||
          data.conversationId !== joinedConv
        ) {
          return;
        }

        io?.to(`conv:${data.conversationId}`).emit("call:declined", {
          conversationId: data.conversationId,
          participantId,
          participantName: displayName,
          callerId: data.callerId,
        });
      }
    );

    socket.on("call:end", (data: { conversationId: string }) => {
      const participantId = socket.data.participantId as string | undefined;
      const joinedConv = socket.data.conversationId as string | undefined;

      if (!participantId || data.conversationId !== joinedConv) {
        return;
      }

      socket.to(`conv:${data.conversationId}`).emit("call:ended", {
        conversationId: data.conversationId,
        endedBy: participantId,
      });
    });
  });

  return io;
}

export function emitConversationDestroyed(conversationId: string): void {
  getIO()?.to(`conv:${conversationId}`).emit("conversation:destroyed", {
    conversationId,
  });
}

export function emitNewMessage(
  conversationId: string,
  message: MessagePayload
): void {
  getIO()?.to(`conv:${conversationId}`).emit("message:new", {
    conversationId,
    ...message,
  });
}

export function emitMessageStatus(
  conversationId: string,
  messageId: string,
  status: MessageStatus
): void {
  getIO()?.to(`conv:${conversationId}`).emit("message:status", {
    conversationId,
    messageId,
    status,
  });
}

export function emitParticipantJoined(
  conversationId: string,
  participant: { id: string; displayName: string }
): void {
  getIO()?.to(`conv:${conversationId}`).emit("participant:joined", {
    conversationId,
    ...participant,
    joinedAt: new Date().toISOString(),
  });
}
