const PREFIX = "chatapp_";

export function saveParticipantSession(
  conversationId: string,
  data: {
    sessionToken: string;
    participantId: string;
    displayName: string;
    title: string;
    type: string;
    isAdmin?: boolean;
  }
): void {
  localStorage.setItem(`${PREFIX}conv_${conversationId}`, JSON.stringify(data));
}

export function getParticipantSession(conversationId: string): {
  sessionToken: string;
  participantId: string;
  displayName: string;
  title: string;
  type: string;
  isAdmin?: boolean;
} | null {
  const raw = localStorage.getItem(`${PREFIX}conv_${conversationId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearParticipantSession(conversationId: string): void {
  localStorage.removeItem(`${PREFIX}conv_${conversationId}`);
}

export function getAllParticipantSessions(): Array<{
  conversationId: string;
  sessionToken: string;
  participantId: string;
  displayName: string;
  title: string;
  type: string;
  isAdmin?: boolean;
}> {
  const sessions: Array<{
    conversationId: string;
    sessionToken: string;
    participantId: string;
    displayName: string;
    title: string;
    type: string;
    isAdmin?: boolean;
  }> = [];

  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(`${PREFIX}conv_`)) continue;

    const conversationId = key.slice(`${PREFIX}conv_`.length);
    const session = getParticipantSession(conversationId);
    if (session) {
      sessions.push({ conversationId, ...session });
    }
  }

  return sessions;
}

export function clearAllParticipantSessions(): void {
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith(`${PREFIX}conv_`)
  );
  keys.forEach((k) => localStorage.removeItem(k));
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export function saveUserSession(token: string, user: UserProfile): void {
  localStorage.setItem("userToken", token);
  localStorage.setItem("userProfile", JSON.stringify(user));
}

export function getUserToken(): string | null {
  return localStorage.getItem("userToken");
}

export function getUserProfile(): UserProfile | null {
  const raw = localStorage.getItem("userProfile");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function clearUserSession(): void {
  localStorage.removeItem("userToken");
  localStorage.removeItem("userProfile");
}
