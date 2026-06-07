import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signUserToken } from "@/lib/auth";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

const registerSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().min(5).max(20),
  password: z.string().min(6),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid registration data", 400);
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return errorResponse("Email already registered", 409);
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone.trim(),
        passwordHash,
      },
    });

    const token = signUserToken({ userId: user.id, email: user.email });

    return jsonResponse({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch {
    return errorResponse("Registration failed", 500);
  }
}
