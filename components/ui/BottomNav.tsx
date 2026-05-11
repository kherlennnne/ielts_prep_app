"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BookOpen, FlaskConical, BarChart2, BookMarked, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { useUser } from "@/lib/useUser";

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

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 safe-area-pb">
      <div className="flex items-center justify-around px-1 pt-2 pb-safe">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-[56px]",
                active ? "text-accent-darker" : "text-gray-400")}>
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span className={cn("text-[10px] font-medium", active ? "font-semibold" : "")}>{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="px-3 pb-2 flex justify-end">
        <LogoutButton compact className="text-gray-500 hover:bg-gray-100" />
      </div>
    </nav>
  );
}
