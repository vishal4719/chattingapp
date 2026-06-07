import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth) {
    return errorResponse("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });

  if (!user) {
    return errorResponse("User not found", 404);
  }

  return jsonResponse({ user });
}
