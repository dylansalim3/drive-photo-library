import { useMemo } from "react";
import { cx } from "@/utils/cx";

interface UploaderAvatarPillProps {
  username?: string | null;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  className?: string;
  variant?: "glass" | "subtle";
}

const PALETTE = [
  { bg: "bg-emerald-500/25", text: "text-emerald-300", border: "border-emerald-400/40" },
  { bg: "bg-sky-500/25", text: "text-sky-300", border: "border-sky-400/40" },
  { bg: "bg-violet-500/25", text: "text-violet-300", border: "border-violet-400/40" },
  { bg: "bg-amber-500/25", text: "text-amber-300", border: "border-amber-400/40" },
  { bg: "bg-rose-500/25", text: "text-rose-300", border: "border-rose-400/40" },
  { bg: "bg-teal-500/25", text: "text-teal-300", border: "border-teal-400/40" },
  { bg: "bg-indigo-500/25", text: "text-indigo-300", border: "border-indigo-400/40" },
  { bg: "bg-fuchsia-500/25", text: "text-fuchsia-300", border: "border-fuchsia-400/40" },
];

function hashUsername(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function UploaderAvatarPill({
  username,
  size = "sm",
  showLabel = true,
  className,
  variant = "glass",
}: UploaderAvatarPillProps) {
  if (!username) return null;

  const color = useMemo(() => {
    const idx = hashUsername(username.toLowerCase()) % PALETTE.length;
    return PALETTE[idx];
  }, [username]);

  const initial = username.charAt(0).toUpperCase();

  const sizeClasses = {
    xs: {
      pill: "px-1.5 py-0.5 text-caption-2-medium gap-1",
      avatar: "size-3.5 text-[9px]",
      text: "text-[11px]",
    },
    sm: {
      pill: "px-2 py-0.5 text-caption-2-medium gap-1.5",
      avatar: "size-4 text-[10px]",
      text: "text-caption-2-medium",
    },
    md: {
      pill: "px-2.5 py-1 text-caption-1-medium gap-2",
      avatar: "size-5 text-caption-2-medium",
      text: "text-caption-1-medium",
    },
  }[size];

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full transition-all shrink-0 select-none",
        sizeClasses.pill,
        variant === "glass"
          ? "bg-black/55 backdrop-blur-md border border-white/20 text-white shadow-xs"
          : "bg-background-secondary-default border border-border-button-default text-text-primary",
        className,
      )}
      title={`Uploaded by @${username}`}
    >
      <span
        className={cx(
          "inline-flex items-center justify-center rounded-full font-bold border shrink-0",
          sizeClasses.avatar,
          color.bg,
          color.text,
          color.border,
        )}
      >
        {initial}
      </span>
      {showLabel && (
        <span className={cx("font-medium tracking-tight truncate max-w-[100px]", sizeClasses.text)}>
          @{username}
        </span>
      )}
    </span>
  );
}
