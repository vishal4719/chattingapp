import type { CallType } from "./calls";

export interface CallLeaveSummary {
  participantNames: string[];
  durationSeconds: number;
}

export function formatCallDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function buildCallEventText(
  callType: CallType,
  durationSeconds: number,
  participantNames: string[],
  isGroup: boolean
): string {
  const label = callType === "video" ? "Video call" : "Voice call";
  const duration = formatCallDuration(durationSeconds);
  const uniqueNames = [...new Set(participantNames.filter(Boolean))];
  const count = uniqueNames.length;

  if (isGroup) {
    const names =
      uniqueNames.length <= 3
        ? uniqueNames.join(", ")
        : `${uniqueNames.slice(0, 2).join(", ")} +${uniqueNames.length - 2} more`;
    return `${label} · ${duration} · ${count} joined${names ? ` (${names})` : ""}`;
  }

  return `${label} · ${duration}`;
}

export function notifyAppRefresh(): void {
  window.dispatchEvent(new CustomEvent("chat:sidebar-refresh"));
  window.dispatchEvent(new CustomEvent("chat:dashboard-refresh"));
}
