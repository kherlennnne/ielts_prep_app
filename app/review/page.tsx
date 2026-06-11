"use client";
import { useState } from "react";
import { useStore, Material } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatTime, getBandScore, checkAnswer } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, GraduationCap, StickyNote, Trash2, BookOpen, FlaskConical, Lightbulb, Pencil } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { UserBadge } from "@/components/ui/UserBadge";
import { getUserDisplay } from "@/lib/userDisplay";

export default function ReviewPage() {
  const { sessions, materials, updateMaterial, deleteSession } = useStore();
  const { isRestricted, isCutie } = useUser();
  const completed = sessions.filter(s => s.completed).sort((a, b) => b.date.localeCompare(a.date));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "listening" | "reading" | "writing">("all");
  const [modeFilter, setModeFilter] = useState<"all" | "mock" | "practice">("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [editingExplanation, setEditingExplanation] = useState<{ sessionId: string; questionId: string } | null>(null);
  const [draftText, setDraftText] = useState("");

  const sessionUsers = Array.from(
    new Set(completed.map(s => s.username).filter((u): u is string => Boolean(u)))
  );

  const filtered = completed
    .filter(s => filter === "all" || s.type === filter)
    .filter(s => {
      if (modeFilter === "all") return true;
      const mat = materials.find(m => m.id === s.materialId);
      return modeFilter === "practice" ? mat?.testMode === "practice" : (mat?.testMode ?? "mock") === "mock";
    })
    .filter(s => userFilter === "all" || s.username === userFilter);

  function saveExplanation(materialId: string, questionId: string, text: string) {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    updateMaterial(materialId, {
      explanations: { ...(material.explanations ?? {}), [questionId]: text },
    });
    setEditingExplanation(null);
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
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
        {sessionUsers.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            <button
              onClick={() => setUserFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
                userFilter === "all"
                  ? "bg-gray-800 text-white shadow-sm"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
              )}
            >
              All users
            </button>
            {sessionUsers.map(username => {
              const display = getUserDisplay(username);
              return (
                <button
                  key={username}
                  onClick={() => setUserFilter(username)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-all flex-shrink-0 border",
                    userFilter === username
                      ? display?.badgeClass
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  )}
                >
                  {username}
                </button>
              );
            })}
          </div>
        )}

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
              const correct = material
                ? material.questions.reduce((n, q) => n + (checkAnswer(session.answers[q.id] ?? "", material.answerKey[q.id] ?? "") ? 1 : 0), 0)
                : session.score ?? 0;
              const total = session.maxScore;
              // Only show band score for mock tests
              const band = !isPractice && session.type !== "writing"
                ? getBandScore(correct, total, session.type as "listening" | "reading")
                : null;
              const isExpanded = expanded === session.id;
              const userDisplay = getUserDisplay(session.username);

              return (
                <div
                  key={session.id}
                  className={cn(
                    "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative",
                    userDisplay?.cardBorderClass,
                    userDisplay?.cardBgClass
                  )}
                >
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
                        <UserBadge username={session.username} />
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

{material && session.type !== "writing" && <ReviewQuestions
                        material={material}
                        sessionId={session.id}
                        sessionAnswers={session.answers}
                        correctAnswers={session.correctAnswers}
                        isCutie={isCutie}
                        editingExplanation={editingExplanation}
                        draftText={draftText}
                        setDraftText={setDraftText}
                        setEditingExplanation={setEditingExplanation}
                        saveExplanation={saveExplanation}
                      />}

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

function ReviewQuestions({ material, sessionId, sessionAnswers, correctAnswers, isCutie, editingExplanation, draftText, setDraftText, setEditingExplanation, saveExplanation }: {
  material: Material;
  sessionId: string;
  sessionAnswers: Record<string, string>;
  correctAnswers?: Record<string, string>;
  isCutie: boolean;
  editingExplanation: { sessionId: string; questionId: string } | null;
  draftText: string;
  setDraftText: (v: string) => void;
  setEditingExplanation: (v: { sessionId: string; questionId: string } | null) => void;
  saveExplanation: (materialId: string, questionId: string, text: string) => void;
}) {
  const { updateMaterial } = useStore();
  const [editingTipGroupId, setEditingTipGroupId] = useState<string | null>(null);
  const [draftTip, setDraftTip] = useState("");
  const [activeQId, setActiveQId] = useState<string | null>(null);

  function saveGroupTip(groupId: string, tip: string) {
    const updatedSections = (material.sections ?? []).map(sec => ({
      ...sec,
      groups: sec.groups.map(g => g.id === groupId ? { ...g, tip: tip.trim() || undefined } : g),
    }));
    updateMaterial(material.id, { sections: updatedSections });
    setEditingTipGroupId(null);
  }

  const allGroups: { id: string; instruction?: string; tip?: string; questions: Material["questions"] }[] = [];
  if (material.sections?.length) {
    for (const sec of material.sections)
      for (const grp of sec.groups) allGroups.push(grp);
  }
  if (!allGroups.length)
    allGroups.push({ id: "default", questions: material.questions });

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Answer Review</p>
      <div className="space-y-5">
        {allGroups.map(group => (
          <div key={group.id}>
            {group.instruction && (
              <div className="mb-2 px-3 py-2.5 bg-accent-lightest border border-accent/20 rounded-xl">
                <p className="text-xs text-accent-darker font-medium leading-relaxed">{group.instruction}</p>
              </div>
            )}
            {editingTipGroupId === group.id ? (
              <div className="mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb size={12} className="text-amber-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-amber-700">Group tip</span>
                </div>
                <textarea
                  value={draftTip}
                  onChange={e => setDraftTip(e.target.value)}
                  placeholder="Add a tip for this question group…"
                  rows={2}
                  autoFocus
                  className="w-full text-xs rounded-lg border border-amber-300 px-2.5 py-2 outline-none focus:border-amber-500 bg-white resize-none transition-colors leading-relaxed"
                />
                <div className="flex gap-1.5 mt-1.5">
                  <button onClick={() => saveGroupTip(group.id, draftTip)}
                    className="text-xs bg-amber-500 text-white px-3 py-1 rounded-lg font-medium">Save</button>
                  <button onClick={() => setEditingTipGroupId(null)}
                    className="text-xs text-gray-500 px-3 py-1 rounded-lg hover:bg-black/5 transition-colors">Cancel</button>
                </div>
              </div>
            ) : group.tip ? (
              <div className="flex items-start gap-2 mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <Lightbulb size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed flex-1">{group.tip}</p>
                {isCutie && (
                  <button onClick={() => { setEditingTipGroupId(group.id); setDraftTip(group.tip ?? ""); }}
                    className="p-1 rounded hover:bg-amber-100 text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0">
                    <Pencil size={11} />
                  </button>
                )}
              </div>
            ) : isCutie ? (
              <button
                onClick={() => { setEditingTipGroupId(group.id); setDraftTip(""); }}
                className="flex items-center gap-1.5 mb-2 text-xs text-amber-500 hover:text-amber-700 font-medium transition-colors"
              >
                <Lightbulb size={12} /> Add tip for this group
              </button>
            ) : null}
            <div className="space-y-2">
              {group.questions.map(q => {
                const given = sessionAnswers[q.id] ?? "";
                const expected = material.answerKey[q.id] ?? correctAnswers?.[q.id] ?? "";
                const isCorrect = checkAnswer(given, expected);
                const explanation = material.explanations?.[q.id] ?? "";
                const isEditingThis = editingExplanation?.sessionId === sessionId && editingExplanation?.questionId === q.id;

                const isActiveQ = activeQId === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => !isCutie && setActiveQId(isActiveQ ? null : q.id)}
                    className={cn(
                      "rounded-xl border overflow-hidden transition-all",
                      !isCutie && "cursor-pointer",
                      isActiveQ
                        ? "ring-2 ring-amber-400 border-amber-300"
                        : isCorrect ? "bg-green-50 border-green-100" : given ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"
                    )}
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-2 mb-2">
                        {isCorrect
                          ? <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                          : <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />}
                        <p className="text-xs text-gray-800 font-medium leading-relaxed">Q{q.number}: {q.text}</p>
                      </div>

                      {q.type === "mcq" && q.options && (
                        <div className="ml-5 mb-2 space-y-1">
                          {q.options.map((opt, i) => {
                            const letter = String.fromCharCode(65 + i);
                            const isUserAnswer = given === letter;
                            const isCorrectAnswer = expected === letter;
                            return (
                              <div key={i} className={cn(
                                "flex items-start gap-1.5 px-2 py-1 rounded-lg text-xs",
                                isCorrectAnswer ? "bg-green-100 text-green-800 font-medium"
                                  : isUserAnswer && !isCorrect ? "bg-red-100 text-red-700 line-through"
                                  : "text-gray-500"
                              )}>
                                <span className="font-semibold flex-shrink-0">{letter})</span>
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 ml-5">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                          isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                          Your: {given || "–"}
                        </span>
                        {!isCorrect && expected && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                            Correct: {expected}
                          </span>
                        )}
                      </div>
                    </div>

                    {(explanation || isCutie) && (
                      <div className="border-t border-black/5 px-3 pb-3 pt-2.5">
                        {isCutie && isEditingThis ? (
                          <div>
                            <textarea value={draftText} onChange={e => setDraftText(e.target.value)}
                              placeholder="Add explanation, notes, or why this is the correct answer..."
                              rows={3} autoFocus
                              className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-2 outline-none focus:border-accent bg-white resize-none transition-colors leading-relaxed"
                            />
                            <div className="flex gap-1.5 mt-1.5">
                              <button onClick={() => saveExplanation(material.id, q.id, draftText)}
                                className="text-xs bg-accent text-white px-3 py-1 rounded-lg font-medium">Save</button>
                              <button onClick={() => setEditingExplanation(null)}
                                className="text-xs text-gray-500 px-3 py-1 rounded-lg hover:bg-black/5 transition-colors">Cancel</button>
                            </div>
                          </div>
                        ) : isCutie ? (
                          <button onClick={() => { setEditingExplanation({ sessionId, questionId: q.id }); setDraftText(explanation); }}
                            className="flex items-start gap-1.5 text-left w-full group">
                            <StickyNote size={11} className="text-gray-400 group-hover:text-accent mt-0.5 flex-shrink-0 transition-colors" />
                            {explanation
                              ? <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">{explanation}</span>
                              : <span className="text-xs text-gray-400 italic group-hover:text-accent transition-colors">Add explanation…</span>}
                          </button>
                        ) : explanation ? (
                          <div className="flex items-start gap-1.5">
                            <StickyNote size={11} className="text-accent mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-gray-600 leading-relaxed">{explanation}</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                    {isActiveQ && !isCutie && (() => {
                      const loc = material.answerLocations?.[q.id];
                      let passageText = "";
                      let hStart = -1, hEnd = -1;

                      if (loc) {
                        passageText = material.sections?.find(s => s.id === loc.sectionId)?.content ?? material.content ?? "";
                        if (passageText && loc.end <= passageText.length) {
                          hStart = loc.start;
                          hEnd = loc.end;
                        }
                      }

                      if (hStart === -1 && expected) {
                        const candidates = [
                          material.content ?? "",
                          ...(material.sections ?? []).map(s => s.content ?? ""),
                        ];
                        for (const text of candidates) {
                          if (!text) continue;
                          const idx = text.toLowerCase().indexOf(expected.toLowerCase());
                          if (idx !== -1) {
                            passageText = text;
                            hStart = idx;
                            hEnd = idx + expected.length;
                            break;
                          }
                        }
                      }

                      if (hStart === -1 || !passageText) return null;
                      const snippetStart = Math.max(0, hStart - 80);
                      const snippetEnd = Math.min(passageText.length, hEnd + 80);
                      return (
                        <div className="border-t border-amber-200 px-3 pb-3 pt-2.5 bg-amber-50" onClick={e => e.stopPropagation()}>
                          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1.5">Answer from passage</p>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {snippetStart > 0 && <span className="text-gray-400">…</span>}
                            {passageText.slice(snippetStart, hStart)}
                            <mark className="bg-amber-300 text-gray-900 rounded px-0.5 font-medium not-italic">{passageText.slice(hStart, hEnd)}</mark>
                            {passageText.slice(hEnd, snippetEnd)}
                            {snippetEnd < passageText.length && <span className="text-gray-400">…</span>}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
