import { NextRequest } from "next/server";
import { z } from "zod";
import { ConversationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildInviteUrl, generateInviteToken } from "@/lib/tokens";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

const createSchema = z.object({
  type: z.enum(["GROUP", "DIRECT"]),
  title: z.string().min(1).max(100),
});

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return errorResponse("Unauthorized", 401);

  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participants: true, messages: true } },
    },
  });

  return jsonResponse(
    conversations.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      inviteToken: c.inviteToken,
      inviteUrl: buildInviteUrl(c.inviteToken),
      destroyedAt: c.destroyedAt,
      createdAt: c.createdAt,
      participantCount: c._count.participants,
      messageCount: c._count.messages,
    }))
  );
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return errorResponse("Unauthorized", 401);

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid conversation data", 400);
    }

    const inviteToken = generateInviteToken();
    const conversation = await prisma.conversation.create({
      data: {
        type: parsed.data.type as ConversationType,
        title: parsed.data.title,
        inviteToken,
        createdByAdminId: admin.adminId,
      },
    });

    return jsonResponse({
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      inviteToken: conversation.inviteToken,
      inviteUrl: buildInviteUrl(conversation.inviteToken),
      createdAt: conversation.createdAt,
    });
  } catch {
    return errorResponse("Failed to create conversation", 500);
  }
}
