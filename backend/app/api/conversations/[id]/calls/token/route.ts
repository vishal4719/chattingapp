import { NextRequest } from "next/server";
import { z } from "zod";
import { getActiveParticipant } from "@/lib/participant-auth";
import { buildCallRoomName, createCallToken } from "@/lib/livekit";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/response";

const tokenSchema = z.object({
  callType: z.enum(["video", "audio"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: conversationId } = await context.params;
  const participant = await getActiveParticipant(req, conversationId);

  if (!participant) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = tokenSchema.safeParse(body);
    const callType = parsed.success && parsed.data.callType ? parsed.data.callType : "video";

    const roomName = buildCallRoomName(conversationId);
    const { token, livekitUrl } = await createCallToken({
      roomName,
      participantIdentity: participant.id,
      participantName: participant.displayName,
      callType,
    });

    return jsonResponse({
      token,
      roomName,
      livekitUrl,
      participantName: participant.displayName,
      callType,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create call token";
    return errorResponse(message, 500);
  }
}
