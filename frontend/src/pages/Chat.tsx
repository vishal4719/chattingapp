import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import {
  api,
  ChatItem,
  ChatMessage,
  JoinNotification,
  CallEventNotification,
  MessageReplyPreview,
} from "../lib/api";
import { createChatSocket, setupRoomJoin, sendTextMessageViaSocket } from "../lib/socket";
import {
  type CallState,
  type CallType,
  type IncomingCallPayload,
  emitCallAccept,
  emitCallDecline,
  emitCallEnd,
  emitCallStart,
  onCallIncoming,
} from "../lib/calls";
import {
  clearParticipantSession,
  getParticipantSession,
  saveParticipantSession,
} from "../lib/storage";
import { buildTimeline, upsertJoinEvent, upsertMessage, updateMessageStatus, mergePolledTimeline, removeMessageById, upsertCallEvent } from "../lib/timeline";
import { getPollIntervalMs } from "../lib/env";
import { ApiError } from "../lib/api";
import { formatTypingText } from "../lib/typing";
import { buildCallEventText, notifyAppRefresh, type CallLeaveSummary } from "../lib/callSummary";
import { showLocalNotification } from "../lib/notifications";
import { downloadAdminChatExport } from "../lib/exportChat";
import { formatLastMessagePreview } from "../components/AttachmentBubble";
import { MessageList } from "../components/MessageList";
import { MessageInput } from "../components/MessageInput";
import { Avatar } from "../components/Avatar";
import { ChatInfoPanel } from "../components/ChatInfoPanel";
import { CallOverlay } from "../components/CallOverlay";
import { IncomingCallModal } from "../components/IncomingCallModal";
import { CallSummaryModal } from "../components/CallSummaryModal";

interface ChatLocationState {
  conversationId?: string;
  messages?: ChatMessage[];
  joinEvents?: JoinNotification[];
}

interface ChatInfo {
  id: string;
  type: "GROUP" | "DIRECT";
  title: string;
  createdAt: string;
  messageCount: number;
  participantCount: number;
  you: { id: string; displayName: string; phone: string; joinedAt: string };
  participants: Array<{
    id: string;
    displayName: string;
    phone: string;
    joinedAt: string;
  }>;
}

export function Chat() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState<ChatItem[]>([]);
  const [session, setSession] = useState<ReturnType<
    typeof getParticipantSession
  >>(null);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(
    () => new Map()
  );
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("video");
  const [callToken, setCallToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(
    null
  );
  const [callJoining, setCallJoining] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callSummary, setCallSummary] = useState<CallLeaveSummary | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageReplyPreview | null>(null);
  const callParticipantsRef = useRef<Set<string>>(new Set());
  const callEndedRef = useRef(false);
  const callActiveRef = useRef(false);
  const callStartedAtRef = useRef<number | null>(null);
  const finishCallWithSummaryRef = useRef<
    (summary: CallLeaveSummary, endedByRemote?: boolean) => void
  >(() => undefined);
  const resetCallStateRef = useRef<() => void>(() => undefined);
  const socketRef = useRef<Socket | null>(null);
  const isAdmin = localStorage.getItem("adminToken") !== null;

  const resetCallState = useCallback(() => {
    setCallState("idle");
    setCallToken(null);
    setLivekitUrl(null);
    setIncomingCall(null);
    setCallJoining(false);
    setCallStartedAt(null);
    callParticipantsRef.current = new Set();
    callEndedRef.current = false;
    callActiveRef.current = false;
    callStartedAtRef.current = null;
  }, []);

  const finishCallWithSummary = useCallback(
    (summary: CallLeaveSummary, endedByRemote = false) => {
      if (callEndedRef.current) return;
      callEndedRef.current = true;

      const mergedNames = [
        ...callParticipantsRef.current,
        ...summary.participantNames,
      ].filter(Boolean);
      const uniqueNames = [...new Set(mergedNames)];
      const finalSummary: CallLeaveSummary = {
        durationSeconds: summary.durationSeconds,
        participantNames:
          uniqueNames.length > 0 ? uniqueNames : [...callParticipantsRef.current],
      };

      if (finalSummary.participantNames.length > 0 || finalSummary.durationSeconds > 0) {
        const endedAt = new Date().toISOString();
        const isGroupChat = session?.type === "GROUP";
        const event: CallEventNotification = {
          id: `call-${Date.now()}`,
          type: "call",
          callType,
          durationSeconds: finalSummary.durationSeconds,
          participantCount: finalSummary.participantNames.length || 1,
          participantNames: finalSummary.participantNames,
          endedAt,
          text: buildCallEventText(
            callType,
            finalSummary.durationSeconds,
            finalSummary.participantNames,
            !!isGroupChat
          ),
        };
        setItems((prev) => upsertCallEvent(prev, event));
        setCallSummary(finalSummary);
      }

      if (!endedByRemote && conversationId && socketRef.current?.connected) {
        emitCallEnd(socketRef.current, conversationId);
      }

      setCallState("idle");
      setCallToken(null);
      setLivekitUrl(null);
      setIncomingCall(null);
      setCallJoining(false);
      setCallStartedAt(null);
      callParticipantsRef.current = new Set();
      callActiveRef.current = false;
      callStartedAtRef.current = null;
      notifyAppRefresh();
    },
    [callType, conversationId, session?.type]
  );

  finishCallWithSummaryRef.current = finishCallWithSummary;
  resetCallStateRef.current = resetCallState;

  const markRead = useCallback(
    async (convId: string, participantToken: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("messages:read", { conversationId: convId });
      } else {
        await api
          .markConversationRead(convId, participantToken)
          .catch(() => undefined);
      }
      window.dispatchEvent(new CustomEvent("chat:sidebar-refresh"));
      notifyAppRefresh();
    },
    []
  );

  const markDelivered = useCallback((convId: string, messageId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("message:delivered", {
      conversationId: convId,
      messageId,
    });
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    // Reset everything when opening a different group
    setItems([]);
    setChatInfo(null);
    setInfoOpen(false);
    setClosed(false);
    setError("");
    setConnected(false);
    setTypingUsers(new Map());
    setReplyingTo(null);
    setLoading(true);
    resetCallStateRef.current();

    const stored = getParticipantSession(conversationId);
    if (!stored) {
      setError("Session expired. Please use the invite link again.");
      setLoading(false);
      return;
    }

    setSession(stored);

    const navState = location.state as ChatLocationState | null;
    if (
      navState?.conversationId === conversationId &&
      navState.messages
    ) {
      setItems(buildTimeline(navState.messages, navState.joinEvents ?? []));
    }

    let cancelled = false;

    async function init() {
      try {
        const [history, info] = await Promise.all([
          api.getMessages(conversationId!, stored!.sessionToken),
          api.getConversationInfo(conversationId!, stored!.sessionToken),
        ]);

        if (cancelled) return;

        // Always use fresh server data for this group only
        if (info.id !== conversationId) return;

        setItems(buildTimeline(history.messages, history.joinEvents));
        setChatInfo(info);

        await api
          .markConversationRead(conversationId!, stored!.sessionToken)
          .catch(() => undefined);
        window.dispatchEvent(new CustomEvent("chat:sidebar-refresh"));
      notifyAppRefresh();

        const socket = createChatSocket({
          participantToken: stored!.sessionToken,
          adminJwt: localStorage.getItem("adminToken") ?? undefined,
        });
        socketRef.current = socket;

        setupRoomJoin(socket, conversationId!);

        socket.on("connect", () => {
          setConnected(true);
          markRead(conversationId!, stored!.sessionToken);
        });
        socket.on("disconnect", () => setConnected(false));
        socket.on("connect_error", () => setConnected(false));

        socket.on(
          "message:new",
          (msg: ChatMessage & { conversationId?: string }) => {
            if (msg.conversationId && msg.conversationId !== conversationId) {
              return;
            }
            setTypingUsers((prev) => {
              const next = new Map(prev);
              next.delete(msg.participant.id);
              return next;
            });
            setItems((prev) => upsertMessage(prev, msg));
            notifyAppRefresh();

            if (msg.participant.id !== stored!.participantId) {
              markDelivered(conversationId!, msg.id);
              markRead(conversationId!, stored!.sessionToken);

              if (document.hidden) {
                const preview =
                  msg.preview ||
                  (msg.type && msg.type !== "TEXT" ? "Sent an attachment" : msg.content);
                showLocalNotification(
                  stored!.title,
                  `${msg.participant.displayName}: ${preview}`,
                  `/chat/${conversationId}`,
                  conversationId
                );
              }
            }
          }
        );

        socket.on(
          "message:status",
          (payload: {
            conversationId?: string;
            messageId: string;
            status: ChatMessage["status"];
          }) => {
            if (
              payload.conversationId &&
              payload.conversationId !== conversationId
            ) {
              return;
            }
            setItems((prev) =>
              updateMessageStatus(prev, payload.messageId, payload.status!)
            );
          }
        );

        socket.on(
          "typing:update",
          (payload: {
            conversationId?: string;
            participantId: string;
            displayName: string;
            isTyping: boolean;
          }) => {
            if (
              payload.conversationId &&
              payload.conversationId !== conversationId
            ) {
              return;
            }
            if (payload.participantId === stored!.participantId) return;

            setTypingUsers((prev) => {
              const next = new Map(prev);
              if (payload.isTyping) {
                next.set(payload.participantId, payload.displayName);
              } else {
                next.delete(payload.participantId);
              }
              return next;
            });
          }
        );

        socket.on(
          "participant:joined",
          (participant: {
            conversationId?: string;
            id: string;
            displayName: string;
            joinedAt?: string;
          }) => {
            if (
              participant.conversationId &&
              participant.conversationId !== conversationId
            ) {
              return;
            }
            if (participant.id === stored!.participantId) return;

            const notification: JoinNotification = {
              id: `join-${participant.id}`,
              type: "join",
              displayName: participant.displayName,
              joinedAt: participant.joinedAt ?? new Date().toISOString(),
            };

            setItems((prev) => upsertJoinEvent(prev, notification));

            notifyAppRefresh();

            setChatInfo((prev) => {
              if (!prev || prev.id !== conversationId) return prev;
              if (prev.participants.some((p) => p.id === participant.id)) {
                return prev;
              }
              return {
                ...prev,
                participantCount: prev.participantCount + 1,
                participants: [
                  ...prev.participants,
                  {
                    id: participant.id,
                    displayName: participant.displayName,
                    phone: "",
                    joinedAt: notification.joinedAt,
                  },
                ],
              };
            });
          }
        );

        socket.on("conversation:destroyed", (payload: { conversationId?: string }) => {
          if (
            payload.conversationId &&
            payload.conversationId !== conversationId
          ) {
            return;
          }
          resetCallStateRef.current();
          clearParticipantSession(conversationId!);
          setClosed(true);
          socket.disconnect();
          setTimeout(
            () => navigate(isAdmin ? "/admin-dashboard" : "/dashboard"),
            3000
          );
        });

        onCallIncoming(socket, (payload) => {
          if (payload.conversationId !== conversationId) return;
          if (payload.callerId === stored!.participantId) return;
          setIncomingCall(payload);
          setCallType(payload.callType);
          setCallState("incoming");
        });

        socket.on(
          "call:accepted",
          (payload: {
            conversationId: string;
            participantName: string;
          }) => {
            if (payload.conversationId !== conversationId) return;
            callParticipantsRef.current.add(payload.participantName);
          }
        );

        socket.on(
          "call:ended",
          (payload: { conversationId: string; endedBy: string }) => {
            if (payload.conversationId !== conversationId) return;
            if (callActiveRef.current && callStartedAtRef.current) {
              finishCallWithSummaryRef.current(
                {
                  participantNames: [...callParticipantsRef.current],
                  durationSeconds: Math.max(
                    1,
                    Math.floor((Date.now() - callStartedAtRef.current) / 1000)
                  ),
                },
                true
              );
            } else {
              resetCallStateRef.current();
            }
          }
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chat");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, navigate, isAdmin, location.state, markRead, markDelivered]);

  // Poll only when WebSocket is disconnected (e.g. serverless fallback)
  useEffect(() => {
    if (!conversationId || !session || loading || closed || error || connected) return;

    let cancelled = false;

    async function pollMessages() {
      try {
        const history = await api.getMessages(
          conversationId!,
          session!.sessionToken
        );
        if (cancelled) return;

        setItems((prev) =>
          mergePolledTimeline(prev, history.messages, history.joinEvents)
        );

        if (!socketRef.current?.connected) {
          await api
            .markConversationRead(conversationId!, session!.sessionToken)
            .catch(() => undefined);
        }
      } catch (err) {
        if (
          !cancelled &&
          err instanceof ApiError &&
          (err.status === 404 || err.status === 410)
        ) {
          clearParticipantSession(conversationId!);
          setClosed(true);
        }
      }
    }

    const interval = setInterval(pollMessages, getPollIntervalMs());
    pollMessages();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conversationId, session, loading, closed, error, connected]);

  const emitTypingStart = useCallback(() => {
    if (!conversationId || !socketRef.current?.connected) return;
    socketRef.current.emit("typing:start", { conversationId });
  }, [conversationId]);

  const emitTypingStop = useCallback(() => {
    if (!conversationId || !socketRef.current?.connected) return;
    socketRef.current.emit("typing:stop", { conversationId });
  }, [conversationId]);

  function handleReply(message: ChatMessage) {
    setReplyingTo({
      id: message.id,
      content: message.preview ?? formatLastMessagePreview(message),
      type: message.type,
      fileName: message.fileName,
      participant: message.participant,
    });
  }

  async function handleSend(content: string) {
    if (!conversationId || !session) return;

    emitTypingStop();

    const replyTarget = replyingTo;
    setReplyingTo(null);

    const optimisticId = `temp-${crypto.randomUUID()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      content,
      type: "TEXT",
      status: "SENT",
      createdAt: new Date().toISOString(),
      participant: {
        id: session.participantId,
        displayName: session.displayName,
      },
      replyTo: replyTarget ?? undefined,
    };

    setItems((prev) => upsertMessage(prev, optimistic));

    const socket = socketRef.current;
    if (socket?.connected) {
      try {
        await sendTextMessageViaSocket(
          socket,
          conversationId,
          content,
          replyTarget?.id
        );
        notifyAppRefresh();
      } catch {
        setItems((prev) => removeMessageById(prev, optimisticId));
      }
      return;
    }

    try {
      const { message } = await api.sendMessage(
        conversationId,
        content,
        session.sessionToken,
        replyTarget?.id
      );

      setItems((prev) => upsertMessage(prev, { ...message, pending: false }));
      notifyAppRefresh();
    } catch {
      setItems((prev) => removeMessageById(prev, optimisticId));
    }
  }

  async function handleExportChat() {
    if (!conversationId || !chatInfo) return;
    await downloadAdminChatExport(conversationId, chatInfo.title);
  }

  async function handleLeaveGroup() {
    if (!conversationId || !session) return;

    await api.leaveConversation(conversationId, session.sessionToken);
    clearParticipantSession(conversationId);
    window.dispatchEvent(new CustomEvent("chat:sidebar-refresh"));
    navigate("/dashboard");
  }

  async function handleDirectChat(targetParticipantId: string) {
    if (!conversationId || !session) return;

    const result = await api.startDirectChat(
      conversationId,
      targetParticipantId,
      session.sessionToken
    );

    saveParticipantSession(result.conversationId, {
      sessionToken: result.sessionToken,
      participantId: result.participantId,
      displayName: result.displayName,
      title: result.title,
      type: result.type,
    });

    window.dispatchEvent(new CustomEvent("chat:sidebar-refresh"));
    navigate(`/chat/${result.conversationId}`, {
      state: {
        conversationId: result.conversationId,
        messages: result.messages,
        joinEvents: result.joinEvents,
      },
    });
  }

  async function handleSendAttachment(file: File, caption: string) {
    if (!conversationId || !session) return;

    emitTypingStop();

    const { message } = await api.sendAttachment(
      conversationId,
      file,
      session.sessionToken,
      caption
    );

    setItems((prev) => upsertMessage(prev, message));
    notifyAppRefresh();
  }

  async function startCall(type: CallType) {
    if (!conversationId || !session || callState === "active") return;

    setCallJoining(true);
    setCallType(type);
    try {
      const data = await api.getCallToken(
        conversationId,
        session.sessionToken,
        type
      );
      setCallToken(data.token);
      setLivekitUrl(data.livekitUrl);
      if (socketRef.current?.connected) {
        emitCallStart(socketRef.current, conversationId, type);
      }
      const startedAt = Date.now();
      callParticipantsRef.current = new Set([session.displayName]);
      callActiveRef.current = true;
      callStartedAtRef.current = startedAt;
      setCallStartedAt(startedAt);
      setCallState("active");
      setIncomingCall(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start call");
      resetCallState();
    } finally {
      setCallJoining(false);
    }
  }

  async function acceptIncomingCall() {
    if (!conversationId || !session || !incomingCall) return;

    setCallJoining(true);
    setCallType(incomingCall.callType);
    try {
      const data = await api.getCallToken(
        conversationId,
        session.sessionToken,
        incomingCall.callType
      );
      setCallToken(data.token);
      setLivekitUrl(data.livekitUrl);
      if (socketRef.current?.connected) {
        emitCallAccept(
          socketRef.current,
          conversationId,
          incomingCall.callType
        );
      }
      const startedAt = Date.now();
      callParticipantsRef.current = new Set([
        session.displayName,
        incomingCall.callerName,
      ]);
      callActiveRef.current = true;
      callStartedAtRef.current = startedAt;
      setCallStartedAt(startedAt);
      setIncomingCall(null);
      setCallState("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join call");
      resetCallState();
    } finally {
      setCallJoining(false);
    }
  }

  function declineIncomingCall() {
    if (!conversationId || !incomingCall || !socketRef.current) return;
    emitCallDecline(
      socketRef.current,
      conversationId,
      incomingCall.callerId
    );
    resetCallState();
  }

  function handleCallLeave(summary: CallLeaveSummary) {
    finishCallWithSummary(summary);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--wa-header)] text-[var(--wa-text-secondary)]">
        Loading chat...
      </div>
    );
  }

  if (closed) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--wa-header)] p-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl text-red-400 mb-2">Chat closed</h1>
          <p className="text-[var(--wa-text-secondary)] text-sm">
            This group was deleted. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--wa-header)] p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error ?? "Session not found"}</p>
          <Link
            to={isAdmin ? "/admin-dashboard" : "/dashboard"}
            className="text-[var(--wa-green)] hover:underline text-sm"
          >
            {isAdmin ? "Back to admin" : "Back to chats"}
          </Link>
        </div>
      </div>
    );
  }

  const isGroup = session.type === "GROUP";
  const typingNames = Array.from(typingUsers.values());
  const isAnyoneTyping = typingNames.length > 0;

  const subtitle = isAnyoneTyping
    ? formatTypingText(typingNames)
    : isGroup
      ? `${chatInfo?.participantCount ?? 0} participants${connected ? ", online" : ", syncing…"}`
      : connected
        ? "online"
        : "syncing…";

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full overflow-hidden">
      <header className="max-md:fixed max-md:top-0 max-md:left-0 max-md:right-0 max-md:z-40 h-[60px] px-2 md:px-4 flex items-center gap-2 bg-[var(--wa-header)] shrink-0 border-b border-[var(--wa-border)] z-30">
        <Link
          to="/dashboard"
          className="md:hidden p-2 text-[var(--wa-text-secondary)]"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </Link>

        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-90"
        >
          <Avatar name={session.title} size="sm" />
          <div className="min-w-0">
            <h1 className="font-normal text-[16px] truncate">{session.title}</h1>
            <p
              className={`text-xs truncate ${
                isAnyoneTyping
                  ? "text-[var(--wa-green)]"
                  : "text-[var(--wa-text-secondary)]"
              }`}
            >
              {subtitle}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => startCall("video")}
            disabled={callJoining || callState === "active"}
            className="p-2 rounded-full hover:bg-[var(--wa-hover)] text-[var(--wa-text-secondary)] disabled:opacity-40"
            title="Video call"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => startCall("audio")}
            disabled={callJoining || callState === "active"}
            className="p-2 rounded-full hover:bg-[var(--wa-hover)] text-[var(--wa-text-secondary)] disabled:opacity-40"
            title="Voice call"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.07 21 3 13.93 3 5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="p-2 rounded-full hover:bg-[var(--wa-hover)] text-[var(--wa-text-secondary)]"
            title="Group info"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </button>
        </div>
      </header>

      <MessageList
        items={items}
        currentParticipantId={session.participantId}
        isGroup={isGroup}
        typingNames={typingNames}
        conversationId={conversationId!}
        participantToken={session.sessionToken}
        onReply={handleReply}
      />

      <MessageInput
        onSend={handleSend}
        onSendAttachment={handleSendAttachment}
        onTypingStart={emitTypingStart}
        onTypingStop={emitTypingStop}
        replyTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        replyAsOwn={replyingTo?.participant.id === session.participantId}
      />

      {chatInfo && chatInfo.id === conversationId && (
        <ChatInfoPanel
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          title={chatInfo.title}
          type={chatInfo.type}
          participants={chatInfo.participants}
          you={chatInfo.you}
          createdAt={chatInfo.createdAt}
          messageCount={chatInfo.messageCount}
          canExport={isAdmin}
          onExport={isAdmin ? handleExportChat : undefined}
          onLeave={chatInfo.type === "GROUP" ? handleLeaveGroup : undefined}
          onDirectChat={chatInfo.type === "GROUP" ? handleDirectChat : undefined}
        />
      )}

      {callState === "active" && callToken && livekitUrl && callStartedAt && (
        <CallOverlay
          token={callToken}
          serverUrl={livekitUrl}
          callType={callType}
          title={session.title}
          startedAt={callStartedAt}
          onLeave={handleCallLeave}
        />
      )}

      {callSummary && (
        <CallSummaryModal
          callType={callType}
          durationSeconds={callSummary.durationSeconds}
          participantNames={callSummary.participantNames}
          isGroup={isGroup}
          chatTitle={session.title}
          onClose={() => setCallSummary(null)}
        />
      )}

      {callState === "incoming" && incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          chatTitle={session.title}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
          loading={callJoining}
        />
      )}
    </div>
  );
}
