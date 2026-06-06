import { io, Socket } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL ?? "http://localhost:3000";

export function createChatSocket(auth: {
  participantToken?: string;
  adminJwt?: string;
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
