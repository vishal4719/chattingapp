import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import {
  api,
  ChatItem,
  ChatMessage,
  JoinNotification,
} from "../lib/api";
import { createChatSocket, setupRoomJoin } from "../lib/socket";
import {
  clearParticipantSession,
  getParticipantSession,
} from "../lib/storage";
import { buildTimeline, upsertJoinEvent, upsertMessage, updateMessageStatus } from "../lib/timeline";
import { formatTypingText } from "../lib/typing";
import { MessageList } from "../components/MessageList";
import { MessageInput } from "../components/MessageInput";
import { Avatar } from "../components/Avatar";
import { ChatInfoPanel } from "../components/ChatInfoPanel";

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
  const socketRef = useRef<Socket | null>(null);
  const isAdmin = localStorage.getItem("adminToken") !== null;

  const markRead = useCallback((convId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("messages:read", { conversationId: convId });
    window.dispatchEvent(new CustomEvent("chat:sidebar-refresh"));
  }, []);

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
    setLoading(true);

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

        const socket = createChatSocket({
          participantToken: stored!.sessionToken,
          adminJwt: localStorage.getItem("adminToken") ?? undefined,
        });
        socketRef.current = socket;

        setupRoomJoin(socket, conversationId!);

        socket.on("connect", () => {
          setConnected(true);
          markRead(conversationId!);
        });
        socket.on("disconnect", () => setConnected(false));

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

            if (msg.participant.id !== stored!.participantId) {
              markDelivered(conversationId!, msg.id);
              markRead(conversationId!);
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
          clearParticipantSession(conversationId!);
          setClosed(true);
          socket.disconnect();
          setTimeout(
            () => navigate(isAdmin ? "/admin-dashboard" : "/dashboard"),
            3000
          );
        });
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

  const emitTypingStart = useCallback(() => {
    if (!conversationId || !socketRef.current?.connected) return;
    socketRef.current.emit("typing:start", { conversationId });
  }, [conversationId]);

  const emitTypingStop = useCallback(() => {
    if (!conversationId || !socketRef.current?.connected) return;
    socketRef.current.emit("typing:stop", { conversationId });
  }, [conversationId]);

  async function handleSend(content: string) {
    if (!conversationId || !session) return;

    emitTypingStop();

    const { message } = await api.sendMessage(
      conversationId,
      content,
      session.sessionToken
    );

    setItems((prev) => upsertMessage(prev, message));
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
      ? `${chatInfo?.participantCount ?? 0} participants${connected ? ", online" : ""}`
      : connected
        ? "online"
        : "connecting...";

  return (
    <>
      <header className="h-[60px] px-2 md:px-4 flex items-center gap-2 bg-[var(--wa-header)] shrink-0 border-b border-[var(--wa-border)]">
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
      </header>

      <MessageList
        items={items}
        currentParticipantId={session.participantId}
        isGroup={isGroup}
        typingNames={typingNames}
        conversationId={conversationId!}
        participantToken={session.sessionToken}
      />

      <MessageInput
        onSend={handleSend}
        onSendAttachment={handleSendAttachment}
        onTypingStart={emitTypingStart}
        onTypingStop={emitTypingStop}
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
        />
      )}
    </>
  );
}
