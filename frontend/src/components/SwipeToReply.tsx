import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import type { ChatMessage } from "../lib/api";

const SWIPE_TRIGGER = 56;
const MAX_SWIPE = 72;

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  onReply?: (message: ChatMessage) => void;
  children: ReactNode;
  className?: string;
}

export function SwipeToReply({
  message,
  isOwn,
  onReply,
  children,
  className = "",
}: Props) {
  const [offsetX, setOffsetX] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiping = useRef(false);

  if (!onReply) {
    return <div className={className}>{children}</div>;
  }

  const reset = () => {
    setOffsetX(0);
    start.current = null;
    swiping.current = false;
  };

  const onTouchStart = (e: TouchEvent) => {
    start.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    swiping.current = false;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!start.current) return;

    const dx = e.touches[0].clientX - start.current.x;
    const dy = e.touches[0].clientY - start.current.y;

    if (!swiping.current) {
      if (Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(dy)) return;
      swiping.current = true;
    }

    const adjusted = isOwn ? -dx : dx;
    if (adjusted > 0) {
      const distance = Math.min(adjusted, MAX_SWIPE);
      setOffsetX(isOwn ? -distance : distance);
    } else {
      setOffsetX(0);
    }
  };

  const onTouchEnd = () => {
    if (Math.abs(offsetX) >= SWIPE_TRIGGER) {
      onReply(message);
    }
    reset();
  };

  const progress = Math.min(Math.abs(offsetX) / SWIPE_TRIGGER, 1);

  return (
    <div className={`relative ${className}`}>
      <div
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--wa-header)] text-[var(--wa-text-secondary)] ${
          isOwn ? "right-full mr-2" : "left-full ml-2"
        }`}
        style={{ opacity: progress * 0.95 }}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-9.1-11-11.1z" />
        </svg>
      </div>
      <div
        className="relative"
        style={{
          transform: offsetX ? `translateX(${offsetX}px)` : undefined,
          touchAction: "pan-y",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
