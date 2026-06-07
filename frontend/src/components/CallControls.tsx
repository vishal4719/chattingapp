import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import type { CallType } from "../lib/calls";

interface Props {
  callType: CallType;
  onLeave: () => void;
}

export function CallControls({ callType, onLeave }: Props) {
  const room = useRoomContext();
  const {
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    localParticipant,
  } = useLocalParticipant();

  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  async function toggleCamera() {
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  }

  async function toggleScreenShare() {
    await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
  }

  async function handleEnd() {
    onLeave();
    await room.disconnect();
  }

  const btnClass =
    "p-3 rounded-full bg-[var(--wa-hover)] hover:bg-[#374955] text-white transition disabled:opacity-40";

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3 bg-[var(--wa-header)]/95 border-t border-[var(--wa-border)]">
      <button
        type="button"
        onClick={toggleMic}
        className={btnClass}
        aria-label={isMicrophoneEnabled ? "Mute" : "Unmute"}
        title={isMicrophoneEnabled ? "Mute" : "Unmute"}
      >
        {isMicrophoneEnabled ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
          </svg>
        )}
      </button>

      {(callType === "video" || isCameraEnabled) && (
        <button
          type="button"
          onClick={toggleCamera}
          className={btnClass}
          aria-label={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
          title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {isCameraEnabled ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L19.73 21 21 19.73 3.27 2z" />
            </svg>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={toggleScreenShare}
        className={`${btnClass} ${isScreenShareEnabled ? "ring-2 ring-[var(--wa-green)]" : ""}`}
        aria-label="Share screen"
        title="Share screen"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={handleEnd}
        className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition"
        aria-label="End call"
        title="End call"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1v-7c0-.55.45-1 1-1h2.4c.55 0 1 .45 1 1v1.01C8.15 6.67 10.03 6 12 6c5.52 0 10 4.48 10 10h-2c0-4.42-3.58-8-8-8z" />
        </svg>
      </button>
    </div>
  );
}
