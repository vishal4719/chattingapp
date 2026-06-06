export function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[var(--wa-header)] border-b border-[var(--wa-border)] h-full">
      <div className="text-center px-8 max-w-md">
        <div className="mb-8 opacity-30">
          <svg viewBox="0 0 303 172" width="260" fill="#364147">
            <path d="M229.5 47.5c-39.2 0-71.1 31.9-71.1 71.1s31.9 71.1 71.1 71.1 71.1-31.9 71.1-71.1-31.9-71.1-71.1-71.1zm0 127.5c-31.1 0-56.4-25.3-56.4-56.4s25.3-56.4 56.4-56.4 56.4 25.3 56.4 56.4-25.3 56.4-56.4 56.4z" />
            <path d="M73.5 47.5C34.3 47.5 2.4 79.4 2.4 118.6s31.9 71.1 71.1 71.1 71.1-31.9 71.1-71.1S112.7 47.5 73.5 47.5zm0 127.5c-31.1 0-56.4-25.3-56.4-56.4s25.3-56.4 56.4-56.4 56.4 25.3 56.4 56.4-25.3 56.4-56.4 56.4z" />
          </svg>
        </div>
        <h2 className="text-[32px] font-light text-[var(--wa-text)] mb-3">
          Chat App Web
        </h2>
        <p className="text-[var(--wa-text-secondary)] text-sm leading-relaxed">
          Send and receive messages without keeping your phone connected.
          <br />
          Select a chat from the sidebar to start messaging.
        </p>
        <p className="text-[var(--wa-text-secondary)] text-xs mt-6 flex items-center justify-center gap-1">
          <svg viewBox="0 0 10 12" width="10" fill="currentColor">
            <path d="M5 0C2.2 0 0 2.2 0 5v2l1.5-1.5V5c0-1.9 1.6-3.5 3.5-3.5S8.5 3.1 8.5 5v1.5L10 5V5c0-2.8-2.2-5-5-5z" />
          </svg>
          Your personal messages are stored securely
        </p>
      </div>
    </div>
  );
}
