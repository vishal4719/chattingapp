import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword, signAdminToken } from "@/lib/auth";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid email or password", 400);
    }

    const admin = await prisma.admin.findUnique({
      where: { email: parsed.data.email },
    });

    if (!admin) {
      return errorResponse("Invalid credentials", 401);
    }

    const valid = await comparePassword(parsed.data.password, admin.passwordHash);
    if (!valid) {
      return errorResponse("Invalid credentials", 401);
    }

    const token = signAdminToken({ adminId: admin.id, email: admin.email });

    return jsonResponse({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch {
    return errorResponse("Login failed", 500);
  }
}
