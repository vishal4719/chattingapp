interface Props {
  displayName?: string;
}

export function TypingIndicator({ displayName }: Props) {
  return (
    <div className="flex justify-start mt-2 mb-1">
      <div className="bg-[var(--wa-incoming)] rounded-lg rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5 min-w-[52px]">
        <span className="typing-dot w-2 h-2 rounded-full bg-[var(--wa-text-secondary)] inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-[var(--wa-text-secondary)] inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-[var(--wa-text-secondary)] inline-block" />
      </div>
      {displayName && (
        <span className="sr-only">{displayName} is typing</span>
      )}
    </div>
  );
}
