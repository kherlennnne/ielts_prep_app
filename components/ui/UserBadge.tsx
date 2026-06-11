import { cn } from "@/lib/utils";
import { getUserDisplay } from "@/lib/userDisplay";

interface UserBadgeProps {
  username?: string | null;
  className?: string;
}

export function UserBadge({ username, className }: UserBadgeProps) {
  const display = getUserDisplay(username);
  if (!display) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize",
        display.badgeClass,
        className
      )}
    >
      {display.label}
    </span>
  );
}
