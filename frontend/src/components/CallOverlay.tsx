import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import type { CallType } from "../lib/calls";
import { CallControls } from "./CallControls";
import { Avatar } from "./Avatar";

interface Props {
  token: string;
  serverUrl: string;
  callType: CallType;
  title: string;
  onLeave: () => void;
}

function CallGrid({ audioOnly }: { audioOnly: boolean }) {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  const participants = useParticipants();

  if (audioOnly && tracks.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center gap-6">
        {participants.map((p) => (
          <div key={p.identity} className="flex flex-col items-center gap-2">
            <Avatar name={p.name || p.identity} size="xl" />
            <p className="text-sm text-[var(--wa-text-secondary)]">
              {p.name || p.identity}
              {p.isLocal ? " (You)" : ""}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
      {tracks.map((track) => (
        <ParticipantTile
          key={track.participant.identity + track.source}
          trackRef={track}
          className="rounded-lg overflow-hidden bg-[var(--wa-header)] min-h-[180px]"
        />
      ))}
    </div>
  );
}

export function CallOverlay({
  token,
  serverUrl,
  callType,
  title,
  onLeave,
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--wa-bg)]">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video={callType === "video"}
        onDisconnected={onLeave}
        className="flex flex-col h-full"
      >
        <header className="h-[60px] px-4 flex items-center justify-between bg-[var(--wa-header)] border-b border-[var(--wa-border)] shrink-0">
          <div>
            <p className="text-[17px] font-normal">{title}</p>
            <p className="text-xs text-[var(--wa-green)]">
              {callType === "video" ? "Video call" : "Voice call"}
            </p>
          </div>
        </header>

        <CallGrid audioOnly={callType === "audio"} />
        <RoomAudioRenderer />
        <CallControls callType={callType} onLeave={onLeave} />
      </LiveKitRoom>
    </div>
  );
}
