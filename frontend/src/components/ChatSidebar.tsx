import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import {
  api,
  ApiError,
  ChatMessage,
  syncAdminConversations,
  syncUserConversations,
} from "../lib/api";
import { formatChatTime } from "../lib/avatar";
import {
  clearAllParticipantSessions,
  clearParticipantSession,
  clearUserSession,
  getAllParticipantSessions,
  getParticipantSession,
  getUserProfile,
} from "../lib/storage";
import { createChatSocket, joinInboxRooms } from "../lib/socket";
import { showBrowserMessageNotification } from "../lib/browser-notifications";
import { Avatar } from "./Avatar";
import { formatLastMessagePreview } from "./AttachmentBubble";

export interface SidebarChat {
  conversationId: string;
  title: string;
  type: string;
  displayName: string;
  lastMessage?: string;
  lastMessageTime?: string;
  isGroup: boolean;
  unreadCount: number;
}

interface Props {
  onChatsLoaded?: (chats: SidebarChat[]) => void;
}

function sortChats(chats: SidebarChat[]): SidebarChat[] {
  return [...chats].sort((a, b) => {
    const tA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const tB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return tB - tA;
  });
}

function previewFromMessage(msg: ChatMessage): string {
  return (
    msg.preview ??
    (msg.type && msg.type !== "TEXT" ? "Sent an attachment" : msg.content)
  );
}

export function ChatSidebar({ onChatsLoaded }: Props) {
  const { conversationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState<SidebarChat[]>([]);
  const [loading, setLoading] = useState(true);
  const lastMessageAtRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);
  const conversationIdRef = useRef(conversationId);
  const socketRef = useRef<Socket | null>(null);
  const loadRef = useRef<(() => void) | null>(null);
  const chatsRef = useRef<SidebarChat[]>([]);
  const isAdmin = localStorage.getItem("adminToken") !== null;
  const adminUser = JSON.parse(localStorage.getItem("adminUser") ?? "{}");
  const userProfile = getUserProfile();

  conversationIdRef.current = conversationId;

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    if (!conversationId) return;
    setChats((prev) =>
      prev.map((chat) =>
        chat.conversationId === conversationId
          ? { ...chat, unreadCount: 0 }
          : chat
      )
    );
  }, [conversationId]);

  useEffect(() => {
    const adminJwt = isAdmin
      ? (localStorage.getItem("adminToken") ?? undefined)
      : undefined;
    const userJwt = !isAdmin
      ? (localStorage.getItem("userToken") ?? undefined)
      : undefined;

    if (!adminJwt && !userJwt) return;

    const socket = createChatSocket({ adminJwt, userJwt });
    socketRef.current = socket;
    joinInboxRooms(socket);

    socket.on(
      "message:new",
      (msg: ChatMessage & { conversationId?: string }) => {
        const convId = msg.conversationId;
        if (!convId) return;

        const session = getParticipantSession(convId);
        const fromSelf = session
          ? msg.participant.id === session.participantId
          : false;
        const isActive = conversationIdRef.current === convId;
        const preview = previewFromMessage(msg);

        setChats((prev) => {
          const existing = prev.find((c) => c.conversationId === convId);
          if (!existing) {
            loadRef.current?.();
            return prev;
          }

          const updated = prev.map((chat) => {
            if (chat.conversationId !== convId) return chat;
            return {
              ...chat,
              lastMessage: preview,
              lastMessageTime: msg.createdAt,
              unreadCount:
                isActive || fromSelf ? (isActive ? 0 : chat.unreadCount) : chat.unreadCount + 1,
            };
          });

          return sortChats(updated);
        });

        const prevAt = lastMessageAtRef.current.get(convId);
        if (msg.createdAt !== prevAt) {
          lastMessageAtRef.current.set(convId, msg.createdAt);
        }

        if (!fromSelf && (!isActive || document.visibilityState !== "visible")) {
          const chatTitle =
            chatsRef.current.find((c) => c.conversationId === convId)?.title ??
            "New message";
          showBrowserMessageNotification({
            conversationId: convId,
            title: chatTitle,
            body: `${msg.participant.displayName}: ${preview}`,
            url: `/chat/${convId}`,
          });
        }
      }
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAdmin]);

  useEffect(() => {
    async function load() {
      if (isAdmin) {
        try {
          const conversations = await syncAdminConversations();
          const open: SidebarChat[] = conversations.map((c) => ({
            conversationId: c.conversationId,
            title: c.title,
            type: c.type,
            displayName: c.displayName,
            lastMessage: c.lastMessage?.preview,
            lastMessageTime: c.lastMessage?.createdAt,
            isGroup: c.type === "GROUP",
            unreadCount: c.unreadCount,
          }));

          for (const chat of open) {
            const messageAt = chat.lastMessageTime;

            if (messageAt) {
              lastMessageAtRef.current.set(chat.conversationId, messageAt);
            }
          }

          setChats(open);
          onChatsLoaded?.(open);
          setLoading(false);
          initializedRef.current = true;
          socketRef.current?.emit("join:inbox");
        } catch {
          setLoading(false);
        }
        return;
      }

      if (localStorage.getItem("userToken")) {
        try {
          await syncUserConversations();
        } catch {
          // Keep cached sessions if sync fails
        }
      }

      const sessions = getAllParticipantSessions();
      const open: SidebarChat[] = [];

      for (const session of sessions) {
        try {
          const info = await api.getConversationInfo(
            session.conversationId,
            session.sessionToken
          );
          open.push({
            conversationId: session.conversationId,
            title: info.title,
            type: info.type,
            displayName: session.displayName,
            lastMessage: info.lastMessage
              ? formatLastMessagePreview(info.lastMessage)
              : undefined,
            lastMessageTime: info.lastMessage?.createdAt,
            isGroup: info.type === "GROUP",
            unreadCount: info.unreadCount ?? 0,
          });

          const messageAt = info.lastMessage?.createdAt;

          if (messageAt) {
            lastMessageAtRef.current.set(session.conversationId, messageAt);
          }
        } catch (err) {
          if (
            err instanceof ApiError &&
            (err.status === 401 || err.status === 404 || err.status === 410)
          ) {
            clearParticipantSession(session.conversationId);
          }
        }
      }

      open.sort((a, b) => {
        const tA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const tB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return tB - tA;
      });

      setChats(open);
      onChatsLoaded?.(open);
      setLoading(false);
      initializedRef.current = true;
      socketRef.current?.emit("join:inbox");
    }

    loadRef.current = () => {
      void load();
    };

    load();

    const onRefresh = () => load();
    window.addEventListener("chat:sidebar-refresh", onRefresh);
    window.addEventListener("chat:dashboard-refresh", onRefresh);
    window.addEventListener("focus", onRefresh);

    const interval = setInterval(load, 30000);

    return () => {
      window.removeEventListener("chat:sidebar-refresh", onRefresh);
      window.removeEventListener("chat:dashboard-refresh", onRefresh);
      window.removeEventListener("focus", onRefresh);
      clearInterval(interval);
    };
  }, [location.pathname, conversationId, onChatsLoaded, isAdmin]);

  const profileName = isAdmin
    ? (adminUser.name ?? "Admin")
    : (userProfile?.name ?? chats[0]?.displayName ?? "User");

  function handleLogout() {
    clearUserSession();
    clearAllParticipantSessions();
    navigate("/login");
  }

  return (
    <aside className="flex flex-col h-full bg-[var(--wa-panel)] border-r border-[var(--wa-border)] w-full md:w-[420px] shrink-0">
      <header className="h-[60px] px-4 flex items-center justify-between bg-[var(--wa-header)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={profileName} size="sm" />
          <div className="min-w-0">
            <p className="font-medium truncate text-[15px]">
              {isAdmin ? adminUser.name ?? "Admin" : userProfile?.name ?? "Chats"}
            </p>
            {(isAdmin || userProfile) && (
              <p className="text-xs text-[var(--wa-text-secondary)] truncate">
                {isAdmin ? adminUser.email : userProfile?.email}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isAdmin && userProfile && (
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-full hover:bg-[var(--wa-hover)] text-[var(--wa-text-secondary)]"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
            </button>
          )}
          {isAdmin && (
          <Link
            to="/admin-dashboard"
            title="Admin settings"
            className="p-2 rounded-full hover:bg-[var(--wa-hover)] text-[var(--wa-text-secondary)]"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            </svg>
          </Link>
          )}
        </div>
      </header>

      <div className="px-3 py-2 bg-[var(--wa-panel)]">
        <div className="rounded-lg bg-[var(--wa-header)] px-3 py-2 flex items-center gap-3">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#8696a0">
            <path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z" />
          </svg>
          <span className="text-sm text-[var(--wa-text-secondary)]">Search chats</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto wa-scrollbar">
        {loading ? (
          <p className="p-4 text-sm text-[var(--wa-text-secondary)]">Loading chats...</p>
        ) : chats.length === 0 ? (
          <p className="p-4 text-sm text-[var(--wa-text-secondary)] text-center">
            No chats are open
          </p>
        ) : (
          chats.map((chat) => {
            const active = conversationId === chat.conversationId;
            const hasUnread = chat.unreadCount > 0 && !active;

            return (
              <Link
                key={chat.conversationId}
                to={`/chat/${chat.conversationId}`}
                state={{ conversationId: chat.conversationId }}
                className={`flex items-center gap-3 px-3 py-3 border-b border-[var(--wa-border)] hover:bg-[var(--wa-hover)] transition ${
                  active ? "bg-[var(--wa-hover)]" : ""
                }`}
              >
                <Avatar
                  name={chat.isGroup ? chat.title : chat.title}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <p
                      className={`truncate text-[17px] ${
                        hasUnread ? "font-semibold text-[var(--wa-text)]" : "font-medium"
                      }`}
                    >
                      {chat.title}
                    </p>
                    {chat.lastMessageTime && (
                      <span
                        className={`text-xs shrink-0 ${
                          hasUnread
                            ? "text-[var(--wa-green)] font-medium"
                            : "text-[var(--wa-text-secondary)]"
                        }`}
                      >
                        {formatChatTime(chat.lastMessageTime)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-2 mt-0.5">
                    <p
                      className={`text-sm truncate ${
                        hasUnread
                          ? "font-medium text-[var(--wa-text)]"
                          : "text-[var(--wa-text-secondary)]"
                      }`}
                    >
                      {chat.lastMessage ?? (
                        chat.isGroup
                          ? `${chat.type === "GROUP" ? "Group" : "Direct"} · Tap to open`
                          : "Tap to chat"
                      )}
                    </p>
                    {hasUnread && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--wa-green)] text-[#111b21] text-xs font-medium flex items-center justify-center">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
