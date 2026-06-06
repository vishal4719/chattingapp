import { v4 as uuidv4 } from "uuid";

export function generateInviteToken(): string {
  return uuidv4().replace(/-/g, "").slice(0, 16);
}

export function generateSessionToken(): string {
  return uuidv4();
}

export function buildInviteUrl(inviteToken: string): string {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
  return `${frontendUrl}/join/${inviteToken}`;
}
