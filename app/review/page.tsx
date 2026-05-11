"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatTime, getBandScore, checkAnswer } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, GraduationCap, StickyNote, Trash2, BookOpen, FlaskConical } from "lucide-react";
import { useUser } from "@/lib/useUser";

export default function ReviewPage() {
  const { sessions, materials, updateMaterial, deleteSession } = useStore();
  const { isRestricted, isCutie } = useUser();
  const completed = sessions.filter(s => s.completed).sort((a, b) => b.date.localeCompare(a.date));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "listening" | "reading" | "writing">("all");
  const [modeFilter, setModeFilter] = useState<"all" | "mock" | "practice">("all");
  const [editingExplanation, setEditingExplanation] = useState<{ sessionId: string; questionId: string } | null>(null);
  const [draftText, setDraftText] = useState("");

  const filtered = completed
    .filter(s => filter === "all" || s.type === filter)
    .filter(s => {
      if (modeFilter === "all") return true;
      const mat = materials.find(m => m.id === s.materialId);
      return modeFilter === "practice" ? mat?.testMode === "practice" : (mat?.testMode ?? "mock") === "mock";
    });

  function saveExplanation(materialId: string, questionId: string, text: string) {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    updateMaterial(materialId, {
      explanations: { ...(material.explanations ?? {}), [questionId]: text },
    });
    setEditingExplanation(null);
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="Review" subtitle={`${completed.length} test${completed.length !== 1 ? "s" : ""} completed`} />

      <div className="px-4 lg:px-8">
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {(["all", "reading", "listening", "writing"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-all flex-shrink-0",
                filter === f ? "bg-accent text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300")}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-5">
          {(["all", "mock", "practice"] as const).map(m => (
            <button key={m} onClick={() => setModeFilter(m)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-all flex-shrink-0",
                modeFilter === m
                  ? m === "practice" ? "bg-green-600 text-white shadow-sm"
                    : m === "mock" ? "bg-accent text-white shadow-sm"
                    : "bg-gray-800 text-white shadow-sm"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300")}>
              {m === "practice" && <BookOpen size={11} />}
              {m === "mock" && <FlaskConical size={11} />}
              {m}
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
              // Use materialId directly first, then fall back to fuzzy match
              const material = materials.find(m => m.id === session.materialId)
                ?? materials.find(m => m.type === session.type && m.questions.some(q => session.answers[q.id] !== undefined));
              const isPractice = material?.testMode === "practice";
              const correct = session.score ?? 0;
              const total = session.maxScore;
              // Only show band score for mock tests
              const band = !isPractice && session.type !== "writing"
                ? getBandScore(correct, total, session.type as "listening" | "reading")
                : null;
              const isExpanded = expanded === session.id;

              return (
                <div key={session.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
                  <button onClick={() => setExpanded(isExpanded ? null : session.id)}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      isPractice ? "bg-green-50" : "bg-accent-lightest"
                    )}>
                      {isPractice ? (
                        <BookOpen size={18} className="text-green-600" />
                      ) : band ? (
                        <span className="text-lg font-bold text-accent-darker">{band}</span>
                      ) : (
                        <span className="text-sm font-semibold text-accent-darker">W</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm capitalize">
                          {material?.title ?? `${session.type} Test`}
                        </p>
                        <span className={cn(
                          "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          isPractice ? "bg-green-100 text-green-700" : "bg-accent-lightest text-accent-darker"
                        )}>
                          {isPractice ? <><BookOpen size={9} /> Practice</> : <><FlaskConical size={9} /> Mock</>}
                        </span>
                      </div>
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
                  {!isRestricted && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteSession(session.id); if (expanded === session.id) setExpanded(null); }}
                      className="absolute top-3 right-10 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-4">
                      {session.feedback && (
                        <div className="bg-accent-lightest rounded-xl p-3">
                          <p className="text-xs font-semibold text-accent-darker uppercase tracking-wider mb-1">Feedback</p>
                          <p className="text-sm text-gray-700">{session.feedback}</p>
                        </div>
                      )}

                      {material && session.type !== "writing" && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Answer Review</p>
                          <div className="space-y-2">
                            {material.questions.map(q => {
                              const given = session.answers[q.id] ?? "";
                              const expected = session.correctAnswers?.[q.id] ?? material.answerKey[q.id] ?? "";
                              const isCorrect = checkAnswer(given, expected);
                              const explanation = material.explanations?.[q.id] ?? "";
                              const isEditingThis = editingExplanation?.sessionId === session.id && editingExplanation?.questionId === q.id;

                              return (
                                <div key={q.id} className={cn("rounded-xl border overflow-hidden",
                                  isCorrect ? "bg-green-50 border-green-100" : given ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100")}>
                                  <div className="flex items-start gap-2 p-3">
                                    {isCorrect
                                      ? <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                      : <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-700 mb-1.5 leading-relaxed">
                                        <span className="font-medium">Q{q.number}:</span> {q.text.slice(0, 100)}{q.text.length > 100 ? "…" : ""}
                                      </p>
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

                                  {/* Explanation — cutie edits, pookie reads */}
                                  {material && (explanation || isCutie) && (
                                    <div className="border-t border-black/5 px-3 pb-3 pt-2.5">
                                      {isCutie && isEditingThis ? (
                                        <div>
                                          <textarea
                                            value={draftText}
                                            onChange={e => setDraftText(e.target.value)}
                                            placeholder="Add explanation, notes, or why this is the correct answer..."
                                            rows={3}
                                            autoFocus
                                            className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-2 outline-none focus:border-accent bg-white resize-none transition-colors leading-relaxed"
                                          />
                                          <div className="flex gap-1.5 mt-1.5">
                                            <button
                                              onClick={() => saveExplanation(material.id, q.id, draftText)}
                                              className="text-xs bg-accent text-white px-3 py-1 rounded-lg font-medium"
                                            >
                                              Save
                                            </button>
                                            <button
                                              onClick={() => setEditingExplanation(null)}
                                              className="text-xs text-gray-500 px-3 py-1 rounded-lg hover:bg-black/5 transition-colors"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : isCutie ? (
                                        <button
                                          onClick={() => {
                                            setEditingExplanation({ sessionId: session.id, questionId: q.id });
                                            setDraftText(explanation);
                                          }}
                                          className="flex items-start gap-1.5 text-left w-full group"
                                        >
                                          <StickyNote size={11} className="text-gray-400 group-hover:text-accent mt-0.5 flex-shrink-0 transition-colors" />
                                          {explanation ? (
                                            <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">{explanation}</span>
                                          ) : (
                                            <span className="text-xs text-gray-400 italic group-hover:text-accent transition-colors">Add explanation…</span>
                                          )}
                                        </button>
                                      ) : explanation ? (
                                        <div className="flex items-start gap-1.5">
                                          <StickyNote size={11} className="text-accent mt-0.5 flex-shrink-0" />
                                          <span className="text-xs text-gray-600 leading-relaxed">{explanation}</span>
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {session.type === "writing" && material && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Responses</p>
                          {material.questions.map(q => (
                            <div key={q.id} className="mb-4">
                              <p className="text-xs font-medium text-gray-600 mb-1">Q{q.number}: {q.text}</p>
                              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-2">
                                {session.answers[q.id] || <span className="text-gray-400 italic">No response</span>}
                              </div>
                              {/* Feedback — cutie edits, pookie reads */}
                              {(material.explanations?.[q.id] || isCutie) && (
                                isCutie && editingExplanation?.sessionId === session.id && editingExplanation?.questionId === q.id ? (
                                  <div>
                                    <textarea
                                      value={draftText}
                                      onChange={e => setDraftText(e.target.value)}
                                      placeholder="Add teacher feedback or notes..."
                                      rows={3}
                                      autoFocus
                                      className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-2 outline-none focus:border-accent bg-white resize-none transition-colors"
                                    />
                                    <div className="flex gap-1.5 mt-1.5">
                                      <button onClick={() => saveExplanation(material.id, q.id, draftText)}
                                        className="text-xs bg-accent text-white px-3 py-1 rounded-lg font-medium">Save</button>
                                      <button onClick={() => setEditingExplanation(null)}
                                        className="text-xs text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-100">Cancel</button>
                                    </div>
                                  </div>
                                ) : isCutie ? (
                                  <button
                                    onClick={() => { setEditingExplanation({ sessionId: session.id, questionId: q.id }); setDraftText(material.explanations?.[q.id] ?? ""); }}
                                    className="flex items-start gap-1.5 text-left group">
                                    <StickyNote size={11} className="text-gray-400 group-hover:text-accent mt-0.5 flex-shrink-0 transition-colors" />
                                    {material.explanations?.[q.id] ? (
                                      <span className="text-xs text-gray-600">{material.explanations[q.id]}</span>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic group-hover:text-accent transition-colors">Add feedback…</span>
                                    )}
                                  </button>
                                ) : material.explanations?.[q.id] ? (
                                  <div className="flex items-start gap-1.5">
                                    <StickyNote size={11} className="text-accent mt-0.5 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">{material.explanations[q.id]}</span>
                                  </div>
                                ) : null
                              )}
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
