"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BookOpen, FlaskConical, BarChart2, GraduationCap, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/ui/LogoutButton";

const NAV = [
  { href: "/", label: "Dashboard", icon: BarChart2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/materials", label: "Materials", icon: BookOpen },
  { href: "/test", label: "Test Center", icon: FlaskConical },
  { href: "/review", label: "Review", icon: GraduationCap },
  { href: "/vocab", label: "Vocabulary", icon: BookMarked },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-16 bg-strawberry z-40">
      <nav className="flex-1 flex flex-col items-center justify-center gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
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
