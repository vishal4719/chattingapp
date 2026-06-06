import { v4 as uuidv4 } from "uuid";

export function generateInviteToken(): string {
  return uuidv4().replace(/-/g, "").slice(0, 16);
}

export function generateSessionToken(): string {
  return uuidv4();
}

import { getFrontendUrl } from "./env";

export function buildInviteUrl(inviteToken: string): string {
  return `${getFrontendUrl()}/join/${inviteToken}`;
}
