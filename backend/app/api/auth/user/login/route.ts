import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword, signUserToken } from "@/lib/auth";
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

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }

    const valid = await comparePassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      return errorResponse("Invalid credentials", 401);
    }

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
    return errorResponse("Login failed", 500);
  }
}
