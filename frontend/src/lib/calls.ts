import type { Socket } from "socket.io-client";

export type CallType = "video" | "audio";

export type CallState = "idle" | "outgoing" | "incoming" | "active";

export interface IncomingCallPayload {
  conversationId: string;
  callType: CallType;
  callerId: string;
  callerName: string;
}

export interface CallEndedPayload {
  conversationId: string;
  endedBy: string;
}

export function emitCallStart(
  socket: Socket,
  conversationId: string,
  callType: CallType
): void {
  socket.emit("call:start", { conversationId, callType });
}

export function emitCallAccept(
  socket: Socket,
  conversationId: string,
  callType: CallType
): void {
  socket.emit("call:accept", { conversationId, callType });
}

export function emitCallDecline(
  socket: Socket,
  conversationId: string,
  callerId: string
): void {
  socket.emit("call:decline", { conversationId, callerId });
}

export function emitCallEnd(socket: Socket, conversationId: string): void {
  socket.emit("call:end", { conversationId });
}

export function onCallIncoming(
  socket: Socket,
  handler: (payload: IncomingCallPayload) => void
): void {
  socket.on("call:incoming", handler);
}

export function onCallEnded(
  socket: Socket,
  handler: (payload: CallEndedPayload) => void
): void {
  socket.on("call:ended", handler);
}

export function offCallHandlers(socket: Socket): void {
  socket.off("call:incoming");
  socket.off("call:ended");
  socket.off("call:accepted");
  socket.off("call:declined");
}
