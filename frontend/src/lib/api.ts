import { getApiUrl } from "./env";
import { saveParticipantSession } from "./storage";

const API_URL = getApiUrl();

export interface Admin {
  id: string;
  email: string;
  name: string;
  accessType?: "INDEPENDENT" | "SHARED";
  workspaceAdminId?: string;
  isWorkspaceOwner?: boolean;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  type: "GROUP" | "DIRECT";
  title: string;
  inviteToken: string;
  inviteUrl: string;
  destroyedAt: string | null;
  createdAt: string;
  participantCount: number;
  messageCount: number;
}

export interface Participant {
  id: string;
  displayName: string;
  phone: string;
  ipAddress: string;
  joinedAt: string;
}

export interface ConversationDetail extends Omit<Conversation, "participantCount"> {
  participants: Participant[];
}

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
export type MessageStatus = "SENT" | "DELIVERED" | "READ";

export interface MessageReplyPreview {
  id: string;
  content: string;
  type?: MessageType;
  fileName?: string | null;
  participant: { id: string; displayName: string };
}

export interface ChatMessage {
  id: string;
  content: string;
  type?: MessageType;
  status?: MessageStatus;
  pending?: boolean;
  createdAt: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  attachmentUrl?: string;
  preview?: string;
  participant: { id: string; displayName: string };
  replyTo?: MessageReplyPreview;
}

export interface JoinNotification {
  id: string;
  type: "join";
  displayName: string;
  joinedAt: string;
}

export interface CallEventNotification {
  id: string;
  type: "call";
  callType: "video" | "audio";
  durationSeconds: number;
  participantCount: number;
  participantNames: string[];
  endedAt: string;
  text: string;
}

export type ChatItem = ChatMessage | JoinNotification | CallEventNotification;

export function isJoinNotification(item: ChatItem): item is JoinNotification {
  return "type" in item && item.type === "join";
}

export function isCallNotification(item: ChatItem): item is CallEventNotification {
  return "type" in item && item.type === "call";
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  participantToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const adminToken = localStorage.getItem("adminToken");
  const userToken = localStorage.getItem("userToken");
  if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
  else if (userToken) headers.Authorization = `Bearer ${userToken}`;
  if (participantToken) headers["X-Participant-Token"] = participantToken;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      "Cannot reach server. Check your internet connection and try again.",
      0
    );
  }
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new ApiError(`Server error (${res.status})`, res.status);
    }
  }

  if (!res.ok) {
    throw new ApiError(
      typeof data.error === "string" ? data.error : "Request failed",
      res.status
    );
  }

  return data as T;
}

async function uploadRequest<T>(
  path: string,
  formData: FormData,
  participantToken: string
): Promise<T> {
  const headers: Record<string, string> = {};

  const token = localStorage.getItem("adminToken");
  if (token) headers.Authorization = `Bearer ${token}`;
  headers["X-Participant-Token"] = participantToken;

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error ?? "Upload failed", res.status);
  }

  return data as T;
}

export function getAttachmentDownloadUrl(
  conversationId: string,
  messageId: string,
  participantToken: string
): string {
  const params = new URLSearchParams({ token: participantToken });
  return `${API_URL}/api/conversations/${conversationId}/attachments/${messageId}?${params}`;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; admin: Admin }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getAdminMe: () => request<{ admin: Admin }>("/api/admin/me"),

  getWorkspaceAdmins: () =>
    request<{ admins: Admin[] }>("/api/admin/admins"),

  createAdmin: (data: {
    name: string;
    email: string;
    password: string;
    accessType: "SHARED" | "INDEPENDENT";
  }) =>
    request<{ admin: Admin }>("/api/admin/admins", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getConversations: () => request<Conversation[]>("/api/admin/conversations"),

  getAdminChats: () =>
    request<{
      conversations: Array<{
        conversationId: string;
        sessionToken: string;
        participantId: string;
        displayName: string;
        title: string;
        type: string;
        lastMessage: { preview: string; createdAt: string } | null;
        unreadCount: number;
      }>;
    }>("/api/admin/chats"),

  getConversation: (id: string) =>
    request<ConversationDetail>(`/api/admin/conversations/${id}`),

  createConversation: (type: "GROUP" | "DIRECT", title: string) =>
    request<Conversation>("/api/admin/conversations", {
      method: "POST",
      body: JSON.stringify({ type, title }),
    }),

  demolishConversation: (id: string) =>
    request<{ success: boolean }>(`/api/admin/conversations/${id}`, {
      method: "DELETE",
    }),

  adminJoinConversation: (id: string) =>
    request<{
      conversationId: string;
      sessionToken: string;
      participantId: string;
      displayName: string;
      type: string;
      title: string;
      isAdmin: boolean;
      rejoined: boolean;
      messages: ChatMessage[];
      joinEvents: JoinNotification[];
    }>(`/api/admin/conversations/${id}/join`, { method: "POST" }),

  getJoinInfo: (token: string) =>
    request<{
      id: string;
      type: string;
      title: string;
      inviteToken: string;
      destroyed: boolean;
      alreadyJoined?: boolean;
    }>(`/api/join/${token}`),

  joinConversation: (token: string) =>
    request<{
      conversationId: string;
      sessionToken: string;
      participantId: string;
      displayName: string;
      type: string;
      title: string;
      messages: ChatMessage[];
      joinEvents: JoinNotification[];
      rejoined?: boolean;
    }>(`/api/join/${token}`, { method: "POST" }),

  userRegister: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) =>
    request<{ token: string; user: User }>("/api/auth/user/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  userLogin: (email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/user/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getUserMe: () => request<{ user: User }>("/api/auth/user/me"),

  getUserConversations: () =>
    request<{
      conversations: Array<{
        conversationId: string;
        sessionToken: string;
        participantId: string;
        displayName: string;
        title: string;
        type: string;
        lastMessage: { preview: string; createdAt: string } | null;
        unreadCount: number;
      }>;
    }>("/api/user/conversations"),

  getMessages: (conversationId: string, participantToken: string) =>
    request<{ messages: ChatMessage[]; joinEvents: JoinNotification[] }>(
      `/api/conversations/${conversationId}/messages`,
      {},
      participantToken
    ),

  getConversationInfo: (conversationId: string, participantToken: string) =>
    request<{
      id: string;
      type: "GROUP" | "DIRECT";
      title: string;
      createdAt: string;
      messageCount: number;
      participantCount: number;
      you: {
        id: string;
        displayName: string;
        phone: string;
        joinedAt: string;
      };
      participants: Array<{
        id: string;
        displayName: string;
        phone: string;
        joinedAt: string;
      }>;
      lastMessage: (ChatMessage & { preview?: string }) | null;
      unreadCount: number;
      lastMessageIsUnread?: boolean;
    }>(`/api/conversations/${conversationId}/info`, {}, participantToken),

  markConversationRead: (conversationId: string, participantToken: string) =>
    request<{ success: boolean; unreadCount: number }>(
      `/api/conversations/${conversationId}/read`,
      { method: "POST" },
      participantToken
    ),

  sendMessage: (
    conversationId: string,
    content: string,
    participantToken: string,
    replyToId?: string
  ) =>
    request<{ message: ChatMessage }>(
      `/api/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content,
          ...(replyToId ? { replyToId } : {}),
        }),
      },
      participantToken
    ),

  sendAttachment: (
    conversationId: string,
    file: File,
    participantToken: string,
    caption?: string
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    if (caption?.trim()) {
      formData.append("content", caption.trim());
    }
    return uploadRequest<{ message: ChatMessage }>(
      `/api/conversations/${conversationId}/messages`,
      formData,
      participantToken
    );
  },

  leaveConversation: (conversationId: string, participantToken: string) =>
    request<{ success: boolean; conversationId: string }>(
      `/api/conversations/${conversationId}/leave`,
      { method: "POST" },
      participantToken
    ),

  startDirectChat: (
    conversationId: string,
    targetParticipantId: string,
    participantToken: string
  ) =>
    request<{
      conversationId: string;
      sessionToken: string;
      participantId: string;
      displayName: string;
      title: string;
      type: string;
      messages: ChatMessage[];
      joinEvents: JoinNotification[];
      rejoined?: boolean;
    }>(
      `/api/conversations/${conversationId}/direct`,
      {
        method: "POST",
        body: JSON.stringify({ targetParticipantId }),
      },
      participantToken
    ),

  getCallToken: (
    conversationId: string,
    participantToken: string,
    callType: "video" | "audio" = "video"
  ) =>
    request<{
      token: string;
      roomName: string;
      livekitUrl: string;
      participantName: string;
      callType: "video" | "audio";
    }>(
      `/api/conversations/${conversationId}/calls/token`,
      { method: "POST", body: JSON.stringify({ callType }) },
      participantToken
    ),

  getPushConfig: () =>
    request<{ enabled: boolean; provider: string; firebaseProjectId?: string | null; expectedAndroidProjectId?: string }>(
      "/api/push/config"
    ),

  getPushStatus: () =>
    request<{
      configured: boolean;
      registered: boolean;
      tokenCount: number;
      firebaseProjectId: string | null;
      expectedAndroidProjectId: string;
      platforms: string[];
      lastUpdatedAt: string | null;
    }>("/api/push/status"),

  sendTestPush: () =>
    request<{ ok: boolean; sent: number; failed: number }>("/api/push/test", {
      method: "POST",
    }),

  registerFcmToken: (payload: { token: string; platform: "android" | "ios" }) =>
    request<{ ok: boolean }>("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export async function syncUserConversations(): Promise<void> {
  const userToken = localStorage.getItem("userToken");
  if (!userToken) return;

  const { conversations } = await api.getUserConversations();
  for (const c of conversations) {
    saveParticipantSession(c.conversationId, {
      sessionToken: c.sessionToken,
      participantId: c.participantId,
      displayName: c.displayName,
      title: c.title,
      type: c.type,
    });
  }
}

export async function syncAdminConversations(): Promise<
  Array<{
    conversationId: string;
    sessionToken: string;
    participantId: string;
    displayName: string;
    title: string;
    type: string;
    lastMessage: { preview: string; createdAt: string } | null;
    unreadCount: number;
  }>
> {
  const adminToken = localStorage.getItem("adminToken");
  if (!adminToken) return [];

  const { conversations } = await api.getAdminChats();
  for (const c of conversations) {
    saveParticipantSession(c.conversationId, {
      sessionToken: c.sessionToken,
      participantId: c.participantId,
      displayName: c.displayName,
      title: c.title,
      type: c.type,
      isAdmin: true,
    });
  }
  return conversations;
}

export { ApiError };
