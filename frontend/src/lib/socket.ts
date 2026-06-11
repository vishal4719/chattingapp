import { io, Socket } from "socket.io-client";
import type { ChatMessage } from "./api";
import { getWsUrl } from "./env";

const WS_URL = getWsUrl();

export function createChatSocket(auth: {
  participantToken?: string;
  adminJwt?: string;
  userJwt?: string;
}): Socket {
  return io(WS_URL, {
    auth,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });
}

export function joinConversationRoom(
  socket: Socket,
  conversationId: string
): void {
  socket.emit("join:conversation", conversationId);
}

export function setupRoomJoin(
  socket: Socket,
  conversationId: string
): void {
  const join = () => joinConversationRoom(socket, conversationId);

  if (socket.connected) {
    join();
  }

  socket.on("connect", join);
  socket.io.on("reconnect", join);
}

export function joinInboxRooms(socket: Socket): void {
  const join = () => socket.emit("join:inbox");

  if (socket.connected) {
    join();
  }

  socket.on("connect", join);
  socket.io.on("reconnect", join);
}

export function sendTextMessageViaSocket(
  socket: Socket,
  conversationId: string,
  content: string,
  replyToId?: string
): Promise<ChatMessage> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(15000)
      .emit(
        "message:send",
        { conversationId, content, ...(replyToId ? { replyToId } : {}) },
        (err: Error | null, response: { message?: ChatMessage; error?: string }) => {
          if (err) {
            reject(err);
            return;
          }
          if (response?.message) {
            resolve(response.message);
            return;
          }
          reject(new Error(response?.error ?? "Failed to send message"));
        }
      );
  });
}
