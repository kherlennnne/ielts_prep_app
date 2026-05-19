"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BookOpen, FlaskConical, BarChart2, BookMarked, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { useUser } from "@/lib/useUser";

const NAV = [
  { href: "/", label: "Dashboard", icon: BarChart2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/materials", label: "Materials", icon: BookOpen, restricted: true },
  { href: "/test", label: "Test Center", icon: FlaskConical },
  { href: "/vocab", label: "Vocabulary", icon: BookMarked },
  { href: "/tips", label: "Tips", icon: Lightbulb },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isRestricted } = useUser();
  const visibleNav = NAV.filter(item => !(item.restricted && isRestricted));

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-16 bg-strawberry z-40">
      <nav className="flex-1 flex flex-col items-center justify-center gap-1">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                active
                  ? "bg-white/35 text-chocolate-fondant"
                  : "text-chocolate-fondant/60 hover:bg-white/20 hover:text-chocolate-fondant"
              )}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.75} />
            </Link>
          );
        })}
      </nav>
      <div className="flex justify-center pb-5">
        <LogoutButton iconOnly compact className="w-10 h-10 text-chocolate-fondant/60 hover:bg-white/20 hover:text-chocolate-fondant rounded-xl" />
      </div>
    </aside>
  );
}
