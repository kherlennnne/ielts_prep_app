"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, StickyNote } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { checkAnswer } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TestReviewProps {
  materialId: string;
  answers: Record<string, string>;
}

export function TestReview({ materialId, answers }: TestReviewProps) {
  const { materials, updateMaterial } = useStore();
  const { isCutie } = useUser();
  const material = materials.find(m => m.id === materialId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");

  if (!material) return null;

  function saveExplanation(questionId: string, text: string) {
    if (!material) return;
    updateMaterial(material.id, {
      explanations: { ...(material.explanations ?? {}), [questionId]: text },
    });
    setEditingId(null);
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

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Answer Review</p>
      <div className="space-y-2">
        {material.questions.map(q => {
          const given = answers[q.id] ?? "";
          const expected = material.answerKey[q.id] ?? "";
          const isCorrect = checkAnswer(given, expected);
          const explanation = material.explanations?.[q.id] ?? "";
          const isEditingThis = editingId === q.id;

          return (
            <div key={q.id} className={cn(
              "rounded-xl border overflow-hidden",
              isCorrect ? "bg-green-50 border-green-100" : given ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"
            )}>
              <div className="flex items-start gap-2 p-3">
                {isCorrect
                  ? <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                  : <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 mb-1.5 leading-relaxed">
                    <span className="font-medium">Q{q.number}:</span>{" "}
                    {q.text.slice(0, 120)}{q.text.length > 120 ? "…" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
