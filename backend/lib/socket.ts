import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { prisma } from "./prisma";
import { verifyAdminToken } from "./auth";
import type { MessagePayload } from "./s3";
import { getFrontendUrl } from "./env";
import {
  markConversationRead,
  markMessageDelivered,
  type MessageStatus,
} from "./receipts";

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
      origin: getFrontendUrl(),
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  global.__chatSocketIO = io;

  io.on("connection", (socket) => {
    const { participantToken, adminJwt } = socket.handshake.auth as {
      participantToken?: string;
      adminJwt?: string;
    };

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
