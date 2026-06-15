interface Props {
  size?: number;
  className?: string;
}

export function AppLogo({ size = 64, className = "" }: Props) {
  return (
    <img
      src="/icon-512.png"
      alt="PandaMind — group chat and messaging"
      width={size}
      height={size}
      className={`rounded-2xl shadow-sm ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}
