import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getClientIpFromHeaders } from "@/lib/ip";
import { generateSessionToken } from "@/lib/tokens";
import { getUnreadCount } from "@/lib/receipts";
import { formatLastMessagePreview } from "@/lib/s3";
import { getAdminById, getWorkspaceId } from "@/lib/admin-workspace";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest) {
  const jwt = requireAdmin(req);
  if (!jwt) return errorResponse("Unauthorized", 401);

  const admin = await getAdminById(jwt.adminId);
  if (!admin) return errorResponse("Admin not found", 404);

  const workspaceId = getWorkspaceId(admin);
  const ipAddress = getClientIpFromHeaders(req.headers);

  const conversations = await prisma.conversation.findMany({
    where: {
      destroyedAt: null,
      OR: [
        { workspaceAdminId: workspaceId },
        { workspaceAdminId: null, createdByAdminId: workspaceId },
      ],
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          type: true,
          fileName: true,
          createdAt: true,
          participantId: true,
        },
      },
      participants: {
        where: { adminId: admin.id, leftAt: null },
        take: 1,
      },
    },
  });

  const chats = await Promise.all(
    conversations.map(async (conversation) => {
      let participant = conversation.participants[0];

      if (!participant) {
        participant = await prisma.participant.create({
          data: {
            conversationId: conversation.id,
            adminId: admin.id,
            displayName: admin.name,
            phone: "admin",
            ipAddress,
            sessionToken: generateSessionToken(),
          },
        });
      }

      const last = conversation.messages[0];
      const unreadCount = await getUnreadCount(conversation.id, participant.id);

      return {
        conversationId: conversation.id,
        sessionToken: participant.sessionToken,
        participantId: participant.id,
        displayName: participant.displayName,
        title: conversation.title,
        type: conversation.type,
        lastMessage: last
          ? {
              preview: formatLastMessagePreview(last),
              createdAt: last.createdAt.toISOString(),
            }
          : null,
        unreadCount,
      };
    })
  );

  chats.sort((a, b) => {
    const tA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const tB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return tB - tA;
  });

  return jsonResponse({ conversations: chats });
}
