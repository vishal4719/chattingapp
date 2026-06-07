import { AccessToken, TrackSource } from "livekit-server-sdk";
import {
  getLiveKitApiKey,
  getLiveKitApiSecret,
  getLiveKitUrl,
} from "./env";

export type CallType = "video" | "audio";

export function buildCallRoomName(conversationId: string): string {
  return `conv-${conversationId}`;
}

export async function createCallToken(params: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  callType: CallType;
}): Promise<{ token: string; livekitUrl: string; roomName: string }> {
  const token = new AccessToken(getLiveKitApiKey(), getLiveKitApiSecret(), {
    identity: params.participantIdentity,
    name: params.participantName,
    ttl: "2h",
  });

  token.addGrant({
    roomJoin: true,
    room: params.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canPublishSources:
      params.callType === "audio"
        ? [TrackSource.MICROPHONE]
        : [TrackSource.MICROPHONE, TrackSource.CAMERA, TrackSource.SCREEN_SHARE],
  });

  return {
    token: await token.toJwt(),
    livekitUrl: getLiveKitUrl(),
    roomName: params.roomName,
  };
}
