"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BookOpen, FlaskConical, BarChart2, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: BarChart2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/materials", label: "Materials", icon: BookOpen },
  { href: "/test", label: "Test Center", icon: FlaskConical },
  { href: "/review", label: "Review", icon: GraduationCap },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-56 bg-accent z-40 shadow-sm">
      <div className="px-5 py-6 border-b border-white/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/25 flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm leading-tight">IELTS Prep</h1>
            <p className="text-white/60 text-[10px]">Study Hub</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active ? "bg-white/22 text-white" : "text-white/75 hover:bg-white/12 hover:text-white")}>
              <Icon size={16} strokeWidth={active ? 2 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-white/15">
        <p className="text-white/45 text-[11px]">Band 9 or bust 💪</p>
      </div>
    </aside>
  );
}
