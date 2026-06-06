import type { ChatMessage } from "../lib/api";
import { getAttachmentDownloadUrl } from "../lib/api";

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  message: ChatMessage;
  conversationId: string;
  participantToken: string;
}

export function AttachmentBubble({
  message,
  conversationId,
  participantToken,
}: Props) {
  const downloadUrl =
    message.attachmentUrl ??
    getAttachmentDownloadUrl(conversationId, message.id, participantToken);

  const type = message.type ?? "DOCUMENT";

  return (
    <div className="px-1">
      {type === "IMAGE" && message.attachmentUrl && (
        <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={message.attachmentUrl}
            alt={message.fileName ?? "Image"}
            className="max-w-full max-h-[280px] rounded-md object-cover cursor-pointer"
          />
        </a>
      )}

      {type === "VIDEO" && message.attachmentUrl && (
        <video
          src={message.attachmentUrl}
          controls
          className="max-w-full max-h-[280px] rounded-md"
          preload="metadata"
        />
      )}

      {type === "DOCUMENT" && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#1a2327]/60 rounded-lg p-2.5 hover:bg-[#1a2327] transition min-w-[200px]"
        >
          <div className="w-10 h-10 rounded bg-[#54656f] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#e9edef">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v2H8v-2zm0 4h5v2H8v-2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] text-[#e9edef] truncate">
              {message.fileName ?? "Document"}
            </p>
            <p className="text-[12px] text-[var(--wa-text-secondary)]">
              {formatFileSize(message.fileSize)} · Download
            </p>
          </div>
        </a>
      )}

      {message.content && (
        <p className="text-[14.2px] leading-[19px] break-words whitespace-pre-wrap mt-1.5 text-[#e9edef]">
          {message.content}
        </p>
      )}
    </div>
  );
}

export function isAttachmentMessage(message: ChatMessage): boolean {
  return (
    message.type === "IMAGE" ||
    message.type === "VIDEO" ||
    message.type === "DOCUMENT"
  );
}

export function formatLastMessagePreview(message: ChatMessage): string {
  if (message.preview) return message.preview;
  switch (message.type) {
    case "IMAGE":
      return "Photo";
    case "VIDEO":
      return "Video";
    case "DOCUMENT":
      return message.fileName ? `📎 ${message.fileName}` : "Document";
    default:
      return message.content;
  }
}
