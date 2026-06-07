interface Props {
  size?: number;
  className?: string;
}

export function AppLogo({ size = 64, className = "" }: Props) {
  return (
    <img
      src="/icon.svg"
      alt="ChatApp — group chat and messaging logo"
      width={size}
      height={size}
      className={`rounded-2xl shadow-sm ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}
