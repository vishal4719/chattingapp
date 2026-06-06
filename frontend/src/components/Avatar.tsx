import { getAvatarColor, getInitials } from "../lib/avatar";

interface Props {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "w-10 h-10 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-16 h-16 text-xl",
  xl: "w-24 h-24 text-3xl",
};

export function Avatar({ name, size = "md", className = "" }: Props) {
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-medium text-white shrink-0 ${className}`}
      style={{ backgroundColor: getAvatarColor(name) }}
    >
      {getInitials(name) || "?"}
    </div>
  );
}
