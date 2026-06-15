import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildInviteUrl } from "@/lib/tokens";
import { assertWorkspaceConversation, getAdminById } from "@/lib/admin-workspace";
import {
  buildWhatsAppChatExport,
  safeExportFilename,
} from "@/lib/export-chat";
import {
  errorResponse,
  optionsResponse,
} from "@/lib/response";
import { resolveCorsOrigin } from "@/lib/env";

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest, context: RouteContext) {
  const jwt = requireAdmin(req);
  if (!jwt) return errorResponse("Unauthorized", 401);

  const admin = await getAdminById(jwt.adminId);
  if (!admin) return errorResponse("Admin not found", 404);

  const { id } = await context.params;

  const access = await assertWorkspaceConversation(id, admin);
  if (!access.ok) return errorResponse(access.error, access.status);

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { joinedAt: "asc" },
        select: {
          displayName: true,
          phone: true,
          joinedAt: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          participant: {
            select: { displayName: true },
          },
        },
      },
    },
  });

  if (!conversation) {
    return errorResponse("Conversation not found", 404);
  }

  const text = buildWhatsAppChatExport({
    title: conversation.title,
    type: conversation.type,
    createdAt: conversation.createdAt,
    inviteUrl: buildInviteUrl(conversation.inviteToken),
    participants: conversation.participants,
    messages: conversation.messages,
  });

  const filename = safeExportFilename(conversation.title);

  return new Response(text, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": resolveCorsOrigin(req.headers.get("origin")),
      "Access-Control-Allow-Credentials": "true",
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
