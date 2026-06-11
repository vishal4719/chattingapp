import type { MessageType } from "@prisma/client";
import { formatLastMessagePreview } from "./s3";

function formatExportTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = date;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatMessageLine(message: {
  content: string;
  type: MessageType;
  fileName: string | null;
  createdAt: Date;
  participant: { displayName: string };
}): string {
  const preview = formatLastMessagePreview(message);
  const body =
    message.type === "TEXT"
      ? message.content.trim()
      : message.content.trim()
        ? `${preview} — ${message.content.trim()}`
        : preview;

  return `[${formatExportTimestamp(message.createdAt)}] ${message.participant.displayName}: ${body}`;
}

export function safeExportFilename(title: string): string {
  const base =
    title
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 80) || "chat_export";
  return `${base}.txt`;
}

export function buildWhatsAppChatExport(params: {
  title: string;
  type: "GROUP" | "DIRECT";
  createdAt: Date;
  inviteUrl: string;
  participants: Array<{
    displayName: string;
    phone: string;
    joinedAt: Date;
  }>;
  messages: Array<{
    content: string;
    type: MessageType;
    fileName: string | null;
    createdAt: Date;
    participant: { displayName: string };
  }>;
}): string {
  const headerLabel =
    params.type === "GROUP"
      ? `WhatsApp Chat - ${params.title}`
      : `WhatsApp Chat with ${params.title}`;

  const lines: string[] = [
    headerLabel,
    "────────────────────────────────────────",
    `Type: ${params.type === "GROUP" ? "Group" : "Direct chat"}`,
    `Created: ${formatExportTimestamp(params.createdAt)}`,
    `Invite link: ${params.inviteUrl}`,
    `Participants (${params.participants.length}):`,
    ...params.participants.map(
      (p) =>
        `  - ${p.displayName} (${p.phone}) joined ${formatExportTimestamp(p.joinedAt)}`
    ),
    "",
    "Messages in this chat and calls are end-to-end encrypted. Media is omitted.",
    "────────────────────────────────────────",
    "",
  ];

  if (params.messages.length === 0) {
    lines.push("No messages in this chat.");
  } else {
    for (const message of params.messages) {
      lines.push(formatMessageLine(message));
    }
  }

  lines.push("");
  return lines.join("\n");
}
