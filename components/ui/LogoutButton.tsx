"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
  compact?: boolean;
}

export function LogoutButton({ className, compact = false }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed",
        compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
        className
      )}
    >
      <LogOut size={compact ? 14 : 16} />
      {loading ? "Signing out..." : "Log out"}
    </button>
  );
}
