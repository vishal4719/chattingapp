import { FormEvent, useEffect, useRef, useState } from "react";

interface Props {
  onSend: (content: string) => Promise<void>;
  onSendAttachment?: (file: File, caption: string) => Promise<void>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
}

const TYPING_STOP_DELAY = 2000;

const ACCEPTED_FILES =
  "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,text/plain,application/zip";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageInput({
  onSend,
  onSendAttachment,
  onTypingStart,
  onTypingStop,
  disabled,
}: Props) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isTypingRef = useRef(false);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (isTypingRef.current) onTypingStop?.();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [onTypingStop, previewUrl]);

  function scheduleTypingStop() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop?.();
      }
    }, TYPING_STOP_DELAY);
  }

  function handleChange(value: string) {
    setContent(value);

    if (!value.trim()) {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop?.();
      }
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart?.();
    } else {
      onTypingStart?.();
    }

    scheduleTypingStop();
  }

  function clearSelectedFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending || disabled) return;

    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop?.();
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);

    setSending(true);
    try {
      if (selectedFile && onSendAttachment) {
        await onSendAttachment(selectedFile, content.trim());
        setContent("");
        clearSelectedFile();
      } else {
        const trimmed = content.trim();
        if (!trimmed) {
          setSending(false);
          return;
        }
        setContent("");
        setSending(false);
        void onSend(trimmed);
        return;
      }
    } finally {
      setSending(false);
    }
  }

  const canSend = selectedFile ? !sending : content.trim().length > 0 && !sending;

  return (
    <footer className="shrink-0 bg-[var(--wa-header)] border-t border-[var(--wa-border)]">
      {selectedFile && (
        <div className="px-4 pt-3 flex items-center gap-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-14 h-14 rounded-lg object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-[var(--wa-input)] flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="var(--wa-text-secondary)">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--wa-text)] truncate">{selectedFile.name}</p>
            <p className="text-xs text-[var(--wa-text-secondary)]">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={clearSelectedFile}
            className="p-1 text-[var(--wa-text-secondary)] hover:text-[var(--wa-text)]"
            aria-label="Remove file"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      )}

      <div className="px-4 py-3 flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILES}
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          className="p-2 text-[var(--wa-text-secondary)] hover:text-[var(--wa-text)] shrink-0 disabled:opacity-40"
          aria-label="Attach file"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
          </svg>
        </button>

        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => {
              if (isTypingRef.current) {
                isTypingRef.current = false;
                onTypingStop?.();
              }
              if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
            }}
            placeholder={selectedFile ? "Add a caption (optional)" : "Type a message"}
            disabled={disabled || sending}
            className="flex-1 rounded-lg bg-[var(--wa-input)] border-none px-4 py-2.5 text-[15px] text-[var(--wa-text)] placeholder:text-[var(--wa-text-secondary)] focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !canSend}
            className="p-2.5 rounded-full bg-[var(--wa-green)] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#06cf9c] transition shrink-0"
            aria-label="Send"
          >
            {sending ? (
              <svg className="animate-spin" viewBox="0 0 24 24" width="22" height="22" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </footer>
  );
}
