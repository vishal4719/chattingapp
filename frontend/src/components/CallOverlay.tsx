import { useEffect, useRef, useState } from "react";
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
import type { CallLeaveSummary } from "../lib/callSummary";
import { formatCallDuration } from "../lib/callSummary";
import { CallControls } from "./CallControls";
import { Avatar } from "./Avatar";

interface Props {
  token: string;
  serverUrl: string;
  callType: CallType;
  title: string;
  startedAt: number;
  onLeave: (summary: CallLeaveSummary) => void;
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

function CallRoomContent({
  callType,
  title,
  startedAt,
  onLeave,
}: {
  callType: CallType;
  title: string;
  startedAt: number;
  onLeave: (summary: CallLeaveSummary) => void;
}) {
  const participants = useParticipants();
  const leftRef = useRef(false);
  const namesRef = useRef<string[]>([]);
  const [elapsed, setElapsed] = useState(0);

  namesRef.current = participants.map((p) => p.name || p.identity);

  useEffect(() => {
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  function finishCall() {
    if (leftRef.current) return;
    leftRef.current = true;
    const durationSeconds = Math.max(
      1,
      Math.floor((Date.now() - startedAt) / 1000)
    );
    onLeave({
      participantNames: namesRef.current,
      durationSeconds,
    });
  }

  return (
    <>
      <header className="h-[60px] px-4 flex items-center justify-between bg-[var(--wa-header)] border-b border-[var(--wa-border)] shrink-0">
        <div>
          <p className="text-[17px] font-normal">{title}</p>
          <p className="text-xs text-[var(--wa-green)]">
            {callType === "video" ? "Video call" : "Voice call"} ·{" "}
            {formatCallDuration(elapsed)} · {participants.length} in call
          </p>
        </div>
      </header>

      <CallGrid audioOnly={callType === "audio"} />
      <RoomAudioRenderer />
      <CallControls callType={callType} onLeave={finishCall} />
    </>
  );
}

export function CallOverlay({
  token,
  serverUrl,
  callType,
  title,
  startedAt,
  onLeave,
}: Props) {
  const summaryRef = useRef(onLeave);
  summaryRef.current = onLeave;
  const startedAtRef = useRef(startedAt);
  startedAtRef.current = startedAt;
  const leftRef = useRef(false);

  function handleDisconnected() {
    if (leftRef.current) return;
    leftRef.current = true;
    const durationSeconds = Math.max(
      1,
      Math.floor((Date.now() - startedAtRef.current) / 1000)
    );
    summaryRef.current({
      participantNames: [],
      durationSeconds,
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--wa-bg)]">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video={callType === "video"}
        onDisconnected={handleDisconnected}
        className="flex flex-col h-full"
      >
        <CallRoomContent
          callType={callType}
          title={title}
          startedAt={startedAt}
          onLeave={(summary) => {
            leftRef.current = true;
            summaryRef.current(summary);
          }}
        />
      </LiveKitRoom>
    </div>
  );
}
