"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BookOpen, FlaskConical, BarChart2, BookMarked, Lightbulb, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/useUser";
import { useState } from "react";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "Home", icon: BarChart2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/test", label: "Test", icon: FlaskConical },
  { href: "/materials", label: "Materials", icon: BookOpen, restricted: true },
  { href: "/vocab", label: "Vocab", icon: BookMarked },
  { href: "/tips", label: "Tips", icon: Lightbulb },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isRestricted } = useUser();
  const visibleNav = NAV.filter(item => !(item.restricted && isRestricted));
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 bottom-nav-safe">
      <div className="flex items-center justify-around px-1 pt-2 pb-2">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-[44px]",
                active ? "text-accent-darker" : "text-gray-400"
              )}>
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span className={cn("text-[10px]", active ? "font-semibold" : "font-medium")}>{label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-[44px] text-gray-400 hover:text-gray-600 disabled:opacity-40"
        >
          <LogOut size={22} strokeWidth={1.5} />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
