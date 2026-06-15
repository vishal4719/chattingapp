import { AppLogo } from "../components/AppLogo";

export function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[var(--wa-header)] border-b border-[var(--wa-border)] h-full">
      <div className="text-center px-8 max-w-md">
        <AppLogo size={120} className="mx-auto mb-8 opacity-95" />
        <h1 className="text-[32px] font-light text-[var(--wa-text)] mb-3">
          PandaMind
        </h1>
        <p className="text-[var(--wa-text-secondary)] text-sm leading-relaxed">
          Send and receive messages without keeping your phone connected.
          Use group chat, direct messages, video calls, and voice calls from
          any device.
        </p>
        <p className="text-[var(--wa-text-secondary)] text-xs mt-6 flex items-center justify-center gap-1">
          <svg viewBox="0 0 10 12" width="10" fill="currentColor" aria-hidden>
            <path d="M5 0C2.2 0 0 2.2 0 5v2l1.5-1.5V5c0-1.9 1.6-3.5 3.5-3.5S8.5 3.1 8.5 5v1.5L10 5V5c0-2.8-2.2-5-5-5z" />
          </svg>
          Your personal messages are stored securely
        </p>
      </div>
    </div>
  );
}
