"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatTime, getBandScore } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, GraduationCap } from "lucide-react";

export default function ReviewPage() {
  const { sessions, materials } = useStore();
  const completed = sessions.filter(s => s.completed).sort((a, b) => b.date.localeCompare(a.date));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "listening" | "reading" | "writing">("all");

  const filtered = filter === "all" ? completed : completed.filter(s => s.type === filter);

  return (
    <div className="min-h-screen">
      <PageHeader title="Review" subtitle={`${completed.length} test${completed.length !== 1 ? "s" : ""} completed`} />

      <div className="px-4 lg:px-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {(["all", "reading", "listening", "writing"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-all flex-shrink-0",
                filter === f ? "bg-accent text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300")}>
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <GraduationCap size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-500">No completed tests yet</p>
            <p className="text-sm text-gray-400 mt-1">Complete a test to see your review here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(session => {
              const material = materials.find(m => {
                // match by type since we don't store materialId on session directly
                return m.type === session.type && m.questions.some(q => session.answers[q.id] !== undefined);
              });
              const correct = session.score ?? 0;
              const total = session.maxScore;
              const band = session.type !== "writing" ? getBandScore(correct, total, session.type as "listening" | "reading") : null;
              const isExpanded = expanded === session.id;

              return (
                <div key={session.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Session header */}
                  <button onClick={() => setExpanded(isExpanded ? null : session.id)}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      session.type === "reading" ? "bg-blue-50" : session.type === "listening" ? "bg-purple-50" : "bg-green-50")}>
                      {band ? (
                        <span className={cn("text-lg font-bold", session.type === "reading" ? "text-blue-600" : session.type === "listening" ? "text-purple-600" : "text-green-600")}>
                          {band}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-green-600">W</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm capitalize">{session.type} Test</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">{session.date}</span>
                        {session.type !== "writing" && (
                          <span className="text-xs text-gray-500">{correct}/{total} correct</span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={10} />{formatTime(session.timeSpent)}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4">
                      {/* Feedback */}
                      {session.feedback && (
                        <div className="bg-accent-lightest rounded-xl p-3 mb-4">
                          <p className="text-xs font-semibold text-accent-darker uppercase tracking-wider mb-1">Feedback</p>
                          <p className="text-sm text-gray-700">{session.feedback}</p>
                        </div>
                      )}

                      {/* Answers review */}
                      {material && session.type !== "writing" && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Answer Review</p>
                          <div className="space-y-2">
                            {material.questions.map(q => {
                              const given = (session.answers[q.id] ?? "").trim();
                              const expected = (session.correctAnswers?.[q.id] ?? material.answerKey[q.id] ?? "").trim();
                              const isCorrect = given.toLowerCase() === expected.toLowerCase();
                              return (
                                <div key={q.id} className={cn("rounded-xl p-3 border",
                                  isCorrect ? "bg-green-50 border-green-100" : given ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100")}>
                                  <div className="flex items-start gap-2">
                                    {isCorrect ? <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" /> :
                                      <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-600 mb-1">Q{q.number}: {q.text.slice(0, 80)}{q.text.length > 80 ? "…" : ""}</p>
                                      <div className="flex flex-wrap gap-2">
                                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                                          isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                          Your: {given || "–"}
                                        </span>
                                        {!isCorrect && (
                                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                                            Correct: {expected}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Writing response */}
                      {session.type === "writing" && material && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Responses</p>
                          {material.questions.map(q => (
                            <div key={q.id} className="mb-4">
                              <p className="text-xs font-medium text-gray-600 mb-1">Q{q.number}: {q.text}</p>
                              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {session.answers[q.id] || <span className="text-gray-400 italic">No response</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
