import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { getJwtSecret } from "./env";

export interface AdminJwtPayload {
  adminId: string;
  email: string;
}

export function signAdminToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyAdminToken(token: string): AdminJwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AdminJwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export function requireAdmin(req: NextRequest): AdminJwtPayload | null {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyAdminToken(token);
}

export function getParticipantToken(req: NextRequest): string | null {
  return req.headers.get("x-participant-token");
}
