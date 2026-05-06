"use client";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, FlaskConical, BookOpen, GraduationCap, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { events, sessions, materials } = useStore();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayEvents = events.filter(e => e.date === today);
  const completedSessions = sessions.filter(s => s.completed);
  const avgBand = completedSessions.length
    ? (completedSessions.reduce((a, s) => a + (s.score ?? 0) / s.maxScore * 9, 0) / completedSessions.length).toFixed(1)
    : "–";
  const totalStudyMin = events.filter(e => e.completed).reduce((a, e) => a + e.duration, 0);

  const quickLinks = [
    { href: "/calendar", icon: CalendarDays, label: "Planner" },
    { href: "/test", icon: FlaskConical, label: "Take Test" },
    { href: "/materials", icon: BookOpen, label: "Materials" },
    { href: "/review", icon: GraduationCap, label: "Review" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageHeader
        title="Dashboard"
        subtitle={format(new Date(), "EEEE, MMMM d")}
      />

      {/* Stats row */}
      <div className="px-4 lg:px-8 grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Avg Band", value: avgBand, icon: TrendingUp, color: "text-accent-darker" },
          { label: "Tests Done", value: completedSessions.length, icon: CheckCircle2, color: "text-green-600" },
          { label: "Study hrs", value: Math.round(totalStudyMin / 60), icon: Clock, color: "text-blue-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
            <Icon size={14} className={cn(color, "mb-2")} />
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="px-4 lg:px-8 mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 p-4 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all active:scale-95">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-strawberry border-strawberry text-chocolate-fondant">
                <Icon size={18} />
              </div>
              <span className="font-medium text-gray-800 text-sm">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's schedule */}
      <div className="px-4 lg:px-8 mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today</h2>
        {todayEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <CalendarDays size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No sessions planned today</p>
            <Link href="/calendar" className="text-accent-darker text-sm font-medium mt-1 inline-block">Add one →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {todayEvents.map(ev => (
              <div key={ev.id} className={cn("bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3",
                ev.completed && "opacity-60")}>
                <div className={cn("w-1.5 h-10 rounded-full flex-shrink-0",
                  ev.type === "study" ? "bg-blue-400" : ev.type === "test" ? "bg-red-400" :
                  ev.type === "review" ? "bg-amber-400" : "bg-green-400")} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{ev.title}</p>
                  <p className="text-xs text-gray-500">{ev.time} · {ev.duration}min</p>
                </div>
                {ev.completed && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent sessions */}
      {completedSessions.length > 0 && (
        <div className="px-4 lg:px-8 mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Tests</h2>
          <div className="space-y-2">
            {completedSessions.slice(-3).reverse().map(s => {
              const band = ((s.score ?? 0) / s.maxScore * 9).toFixed(1);
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm capitalize">{s.type}</p>
                    <p className="text-xs text-gray-500">{s.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent-darker">{band}</p>
                    <p className="text-[11px] text-gray-400">Band Score</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
