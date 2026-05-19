"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, StickyNote, Lightbulb, Pencil } from "lucide-react";
import { useStore, QuestionGroup } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { checkAnswer } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TestReviewProps {
  materialId: string;
  answers: Record<string, string>;
  activeQuestionId?: string | null;
  onQuestionSelect?: (qId: string | null) => void;
}

export function TestReview({ materialId, answers, activeQuestionId, onQuestionSelect }: TestReviewProps) {
  const { materials, updateMaterial } = useStore();
  const { isCutie } = useUser();
  const material = materials.find(m => m.id === materialId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [editingTipGroupId, setEditingTipGroupId] = useState<string | null>(null);
  const [draftTip, setDraftTip] = useState("");

  if (!material) return null;

  function saveExplanation(questionId: string, text: string) {
    if (!material) return;
    updateMaterial(material.id, {
      explanations: { ...(material.explanations ?? {}), [questionId]: text },
    });
    setEditingId(null);
  }

  function saveGroupTip(groupId: string, tip: string) {
    if (!material) return;
    const updatedSections = (material.sections ?? []).map(sec => ({
      ...sec,
      groups: sec.groups.map(g => g.id === groupId ? { ...g, tip: tip.trim() || undefined } : g),
    }));
    updateMaterial(material.id, { sections: updatedSections });
    setEditingTipGroupId(null);
  }

  if (material.type === "writing") {
    return (
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Responses</p>
        <div className="space-y-3">
          {material.questions.map(q => {
            const explanation = material.explanations?.[q.id] ?? "";
            const isEditingThis = editingId === q.id;
            return (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">Q{q.number}: {q.text}</p>
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {answers[q.id] || <span className="text-gray-400 italic">No response written</span>}
                  </div>
                </div>
                {(explanation || isCutie) && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    {isCutie && isEditingThis ? (
                      <div>
                        <textarea
                          value={draftText}
                          onChange={e => setDraftText(e.target.value)}
                          placeholder="Add teacher feedback or notes..."
                          rows={3}
                          autoFocus
                          className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-2 outline-none focus:border-accent bg-white resize-none transition-colors leading-relaxed"
                        />
                        <div className="flex gap-1.5 mt-1.5">
                          <button onClick={() => saveExplanation(q.id, draftText)}
                            className="text-xs bg-accent text-white px-3 py-1 rounded-lg font-medium">Save</button>
                          <button onClick={() => setEditingId(null)}
                            className="text-xs text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-100">Cancel</button>
                        </div>
                      </div>
                    ) : isCutie ? (
                      <button
                        onClick={() => { setEditingId(q.id); setDraftText(explanation); }}
                        className="flex items-start gap-1.5 text-left w-full group"
                      >
                        <StickyNote size={11} className="text-gray-400 group-hover:text-accent mt-0.5 flex-shrink-0 transition-colors" />
                        {explanation
                          ? <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">{explanation}</span>
                          : <span className="text-xs text-gray-400 italic group-hover:text-accent transition-colors">Add feedback…</span>}
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
    );
  }

  // Build groups list: use sections/groups if available, else a single flat group
  const allGroups: { group: QuestionGroup }[] = [];
  if (material.sections?.length) {
    for (const sec of material.sections) {
      for (const grp of sec.groups) allGroups.push({ group: grp });
    }
  }
  if (!allGroups.length) {
    allGroups.push({ group: { id: "default", questions: material.questions } });
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Answer Review</p>
      <div className="space-y-5">
        {allGroups.map(({ group }) => (
          <div key={group.id}>
            {/* Group instruction */}
            {group.instruction && (
              <div className="mb-2 px-3 py-2.5 bg-accent-lightest border border-accent/20 rounded-xl">
                <p className="text-xs text-accent-darker font-medium leading-relaxed">{group.instruction}</p>
              </div>
            )}
            {/* Group tip */}
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
                const given = answers[q.id] ?? "";
                const expected = material.answerKey[q.id] ?? "";
                const isCorrect = checkAnswer(given, expected);
                const explanation = material.explanations?.[q.id] ?? "";
                const isEditingThis = editingId === q.id;

                const isActiveQ = activeQuestionId === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => onQuestionSelect?.(isActiveQ ? null : q.id)}
                    className={cn(
                      "rounded-xl border overflow-hidden transition-all",
                      onQuestionSelect && "cursor-pointer",
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
                        <p className="text-xs text-gray-800 leading-relaxed font-medium">
                          Q{q.number}: {q.text}
                        </p>
                      </div>

                      {/* MCQ options */}
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
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
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
                            <textarea
                              value={draftText}
                              onChange={e => setDraftText(e.target.value)}
                              placeholder="Add explanation or notes for this question…"
                              rows={3}
                              autoFocus
                              className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-2 outline-none focus:border-accent bg-white resize-none transition-colors leading-relaxed"
                            />
                            <div className="flex gap-1.5 mt-1.5">
                              <button onClick={() => saveExplanation(q.id, draftText)}
                                className="text-xs bg-accent text-white px-3 py-1 rounded-lg font-medium">Save</button>
                              <button onClick={() => setEditingId(null)}
                                className="text-xs text-gray-500 px-3 py-1 rounded-lg hover:bg-black/5 transition-colors">Cancel</button>
                            </div>
                          </div>
                        ) : isCutie ? (
                          <button
                            onClick={() => { setEditingId(q.id); setDraftText(explanation); }}
                            className="flex items-start gap-1.5 text-left w-full group"
                          >
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
