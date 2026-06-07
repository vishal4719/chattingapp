import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { getJwtSecret } from "./env";

export interface AdminJwtPayload {
  adminId: string;
  email: string;
}

export interface UserJwtPayload {
  userId: string;
  email: string;
}

export function signAdminToken(payload: AdminJwtPayload): string {
  return jwt.sign({ ...payload, role: "admin" }, getJwtSecret(), { expiresIn: "7d" });
}

export function signUserToken(payload: UserJwtPayload): string {
  return jwt.sign({ ...payload, role: "user" }, getJwtSecret(), { expiresIn: "30d" });
}

export function verifyAdminToken(token: string): AdminJwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AdminJwtPayload & {
      role?: string;
    };
    if (decoded.role && decoded.role !== "admin") return null;
    return { adminId: decoded.adminId, email: decoded.email };
  } catch {
    return null;
  }
}

export function verifyUserToken(token: string): UserJwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as UserJwtPayload & {
      role?: string;
    };
    if (decoded.role && decoded.role !== "user") return null;
    return { userId: decoded.userId, email: decoded.email };
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

export function requireUser(req: NextRequest): UserJwtPayload | null {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyUserToken(token);
}

export function getOptionalUser(req: NextRequest): UserJwtPayload | null {
  return requireUser(req);
}

export function getParticipantToken(req: NextRequest): string | null {
  return req.headers.get("x-participant-token");
}
