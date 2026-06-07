import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/receipts";
import { formatLastMessagePreview } from "@/lib/s3";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth) {
    return errorResponse("Unauthorized", 401);
  }

  const participants = await prisma.participant.findMany({
    where: { userId: auth.userId, leftAt: null },
    include: {
      conversation: {
        select: {
          id: true,
          type: true,
          title: true,
          destroyedAt: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              type: true,
              fileName: true,
              createdAt: true,
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const conversations = await Promise.all(
    participants
      .filter((p) => !p.conversation.destroyedAt)
      .map(async (p) => {
        const last = p.conversation.messages[0];
        const unreadCount = await getUnreadCount(p.conversationId, p.id);

        return {
          conversationId: p.conversationId,
          sessionToken: p.sessionToken,
          participantId: p.id,
          displayName: p.displayName,
          title: p.conversation.title,
          type: p.conversation.type,
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

  conversations.sort((a, b) => {
    const tA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const tB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return tB - tA;
  });

  return jsonResponse({ conversations });
}
