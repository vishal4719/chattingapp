import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signAdminToken } from "@/lib/auth";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: NextRequest) {
  try {
    const adminCount = await prisma.admin.count();
    if (adminCount > 0) {
      return errorResponse("Registration is disabled", 403);
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid registration data", 400);
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const admin = await prisma.admin.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        name: parsed.data.name,
      },
    });

    const token = signAdminToken({ adminId: admin.id, email: admin.email });

    return jsonResponse({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch {
    return errorResponse("Registration failed", 500);
  }
}
