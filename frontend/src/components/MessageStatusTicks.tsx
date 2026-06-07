import type { MessageStatus } from "../lib/api";

interface Props {
  status?: MessageStatus;
  pending?: boolean;
}

export function MessageStatusTicks({ status = "SENT", pending }: Props) {
  const color =
    status === "READ" ? "#53bdeb" : "rgba(255,255,255,0.6)";

  if (pending) {
    return (
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        className="inline-block ml-1 -mt-0.5 shrink-0 opacity-60"
        aria-label="Sending"
      >
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="20 10"
        />
      </svg>
    );
  }

  if (status === "SENT") {
    return (
      <svg
        viewBox="0 0 12 11"
        width="14"
        height="13"
        className="inline-block ml-1 -mt-0.5 shrink-0"
        aria-label="Sent"
      >
        <path
          fill={color}
          d="M11.154.633a.643.643 0 0 0-.682-.05L1.907 5.68a.643.643 0 0 0-.05 1.07l2.253 1.653a.643.643 0 0 0 .758-.022l6.286-6.1a.643.643 0 0 0-.002-.948z"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 16 15"
      width="16"
      height="15"
      className="inline-block ml-1 -mt-0.5 shrink-0"
      aria-label={status === "READ" ? "Read" : "Delivered"}
    >
      <path
        fill={color}
        d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"
      />
    </svg>
  );
}
