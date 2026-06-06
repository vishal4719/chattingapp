import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParticipantToken } from "@/lib/auth";
import { getAttachmentUrl } from "@/lib/s3";
import { errorResponse, optionsResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string; messageId: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id: conversationId, messageId } = await context.params;
  const queryToken = req.nextUrl.searchParams.get("token");
  const sessionToken = getParticipantToken(req) ?? queryToken;

  if (!sessionToken) {
    return errorResponse("Unauthorized", 401);
  }

  const participant = await prisma.participant.findFirst({
    where: { sessionToken, conversationId },
  });

  if (!participant) {
    return errorResponse("Unauthorized", 401);
  }

  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId },
  });

  if (!message || !message.s3Key) {
    return errorResponse("Attachment not found", 404);
  }

  const url = await getAttachmentUrl(message.s3Key);
  return Response.redirect(url, 302);
}
