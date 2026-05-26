"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, FlaskConical, BookMarked, Lightbulb, TrendingUp, Clock, CheckCircle2, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { cn, checkAnswer } from "@/lib/utils";

export default function Dashboard() {
  const { events, sessions, materials, vocab } = useStore();
  const completedSessions = sessions.filter(s => s.completed);

  function getLiveCorrect(s: typeof sessions[0]) {
    const mat = materials.find(m => m.id === s.materialId);
    if (!mat) return s.score ?? 0;
    return mat.questions.reduce((n, q) => n + (checkAnswer(s.answers[q.id] ?? "", mat.answerKey[q.id] ?? "") ? 1 : 0), 0);
  }

  const topBand = completedSessions.length
    ? Math.max(...completedSessions.map(s => getLiveCorrect(s) / s.maxScore * 9)).toFixed(1)
    : "–";
  const totalStudyMin = events.filter(e => e.completed).reduce((a, e) => a + e.duration, 0);

  const today = format(new Date(), "yyyy-MM-dd");
  const nextImportant = events
    .filter(e => e.important && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  const daysUntil = nextImportant
    ? Math.round((new Date(nextImportant.date).getTime() - new Date(today).getTime()) / 86400000)
    : null;

  const quickLinks = [
    { href: "/calendar", icon: CalendarDays, label: "Planner" },
    { href: "/test", icon: FlaskConical, label: "Take Test" },
    { href: "/vocab", icon: BookMarked, label: "Vocabulary" },
    { href: "/tips", icon: Lightbulb, label: "Tips" },
  ];

  const vocabWithNotes = vocab.filter(v => v.note);
  const [vocabIdx, setVocabIdx] = useState(() =>
    vocabWithNotes.length ? Math.floor(Math.random() * vocabWithNotes.length) : 0
  );
  const currentWord = vocabWithNotes[vocabIdx] ?? null;

  return (
    <div className="min-h-screen bg-white w-full overflow-x-hidden">
      <PageHeader
        title="Dashboard"
        subtitle={format(new Date(), "EEEE, MMMM d")}
      />

      {/* Stats row */}
      <div className="px-4 lg:px-8 grid grid-cols-4 gap-2 mb-6">
        {[
          { label: "Best Band", value: topBand, icon: TrendingUp, color: "text-accent-darker" },
          { label: "Tests Done", value: completedSessions.length, icon: CheckCircle2, color: "text-green-600" },
          { label: "Study hrs", value: Math.round(totalStudyMin / 60), icon: Clock, color: "text-blue-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
            <Icon size={14} className={cn(color, "mb-2")} />
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
          <Star size={14} className="text-amber-400 fill-amber-400 mb-2" />
          <p className="text-xl font-bold text-gray-900">{daysUntil !== null ? daysUntil : "–"}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{nextImportant ? "days left" : "No event"}</p>
        </div>
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

      {/* Vocab flashcard */}
      <div className="px-4 lg:px-8 mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vocabulary</h2>
        {vocabWithNotes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <BookMarked size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No vocabulary saved yet</p>
            <Link href="/vocab" className="text-accent-darker text-sm font-medium mt-1 inline-block">Add words →</Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setVocabIdx(i => (i - 1 + vocabWithNotes.length) % vocabWithNotes.length)}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                <ChevronLeft size={16} className="text-gray-500" />
              </button>
              <div className="flex-1 text-center">
                <p className="font-semibold text-gray-900 text-base">{currentWord!.word}</p>
                <p className="text-sm text-gray-500 mt-1">{currentWord!.note}</p>
                {currentWord!.context && (
                  <p className="text-xs text-gray-400 mt-2 italic leading-relaxed">{currentWord!.context}</p>
                )}
              </div>
              <button
                onClick={() => setVocabIdx(i => (i + 1) % vocabWithNotes.length)}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                <ChevronRight size={16} className="text-gray-500" />
              </button>
            </div>
            <p className="text-center text-[11px] text-gray-300 mt-3">{vocabIdx + 1} / {vocabWithNotes.length}</p>
          </div>
        )}
      </div>

      {/* Recent session */}
      {completedSessions.length > 0 && (() => {
        const s = completedSessions[completedSessions.length - 1];
        const band = (getLiveCorrect(s) / s.maxScore * 9).toFixed(1);
        return (
          <div className="px-4 lg:px-8 mb-8">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Test</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm capitalize">{s.type}</p>
                <p className="text-xs text-gray-500">{s.date}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-accent-darker">{band}</p>
                <p className="text-[11px] text-gray-400">Band Score</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
