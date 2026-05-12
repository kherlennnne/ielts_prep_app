"use client";
import { useRef, useState } from "react";
import {
  Trash2, StickyNote, BookMarked, Search, FlaskConical, BookOpen,
  ChevronDown, ChevronRight, RotateCcw, CheckCircle2, XCircle,
} from "lucide-react";
import { useStore, VocabWord } from "@/lib/store";
import type { Material } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── main page ─── */
export default function VocabPage() {
  const { vocab, deleteVocab, updateVocab, materials } = useStore();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"review" | "test">("review");

  const filtered = vocab.filter(v =>
    v.word.toLowerCase().includes(search.toLowerCase()) ||
    v.note?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = new Map<string | null, VocabWord[]>();
  for (const v of [...filtered].reverse()) {
    const key = v.materialId ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(v);
  }

  const materialGroups = materials
    .filter(m => grouped.has(m.id))
    .map(m => ({ material: m, words: grouped.get(m.id)! }));
  const uncategorized = grouped.get(null) ?? [];

  return (
    <div className="min-h-screen">
      <PageHeader title="Vocabulary" subtitle={`${vocab.length} word${vocab.length !== 1 ? "s" : ""} saved`} />

      <div className="px-4 lg:px-8 pb-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
          {(["review", "test"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t === "review" ? "Review" : "Test"}
            </button>
          ))}
        </div>

        {/* Search — only shown in review */}
        {tab === "review" && (
          <div className="relative mb-5">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search words or definitions..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
        )}

        {vocab.length === 0 ? (
          <div className="text-center py-20">
            <BookMarked size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="font-medium text-gray-400">No vocabulary saved yet</p>
            <p className="text-sm text-gray-300 mt-1">Add words from the Practice Test or select text in a passage</p>
          </div>
        ) : tab === "review" && filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No words match &ldquo;{search}&rdquo;</p>
          </div>
        ) : tab === "review" ? (
          <ReviewTab
            materialGroups={materialGroups}
            uncategorized={uncategorized}
            deleteVocab={deleteVocab}
            updateVocab={updateVocab}
          />
        ) : (
          <TestTab materialGroups={materialGroups} uncategorized={uncategorized} />
        )}
      </div>
    </div>
  );
}

/* ─── Group badge ─── */
function ModeBadge({ material }: { material: Material }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
      material.testMode === "practice" ? "bg-green-100 text-green-700" : "bg-accent-lightest text-accent-darker"
    )}>
      {material.testMode === "practice" ? <><BookOpen size={9} />Practice</> : <><FlaskConical size={9} />Mock</>}
    </span>
  );
}

/* ─── Review tab ─── */
function ReviewTab({
  materialGroups, uncategorized, deleteVocab, updateVocab,
}: {
  materialGroups: { material: Material; words: VocabWord[] }[];
  uncategorized: VocabWord[];
  deleteVocab: (id: string) => void;
  updateVocab: (id: string, patch: Partial<VocabWord>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  function toggleGroup(id: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allGroups = [
    ...materialGroups.map(g => ({ id: g.material.id, label: g.material.title, material: g.material as Material | undefined, words: g.words })),
    ...(uncategorized.length > 0 ? [{ id: "__uncategorized__", label: "Uncategorized", material: undefined, words: uncategorized }] : []),
  ];

  return (
    <div className="space-y-3">
      {allGroups.map(g => {
        const isOpen = openGroups.has(g.id);
        return (
          <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleGroup(g.id)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isOpen ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                <span className="font-semibold text-gray-800 text-sm truncate">{g.label}</span>
                {g.material && <ModeBadge material={g.material} />}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{g.words.length} word{g.words.length !== 1 ? "s" : ""}</span>
            </button>

            {isOpen && (
              <div className="px-3 sm:px-4 pb-4 pt-1 border-t border-gray-50">
                <WordGrid
                  words={g.words}
                  editingId={editingId} noteText={noteText}
                  setEditingId={setEditingId} setNoteText={setNoteText}
                  deleteVocab={deleteVocab} updateVocab={updateVocab}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Test tab — group picker ─── */
function TestTab({
  materialGroups, uncategorized,
}: {
  materialGroups: { material: Material; words: VocabWord[] }[];
  uncategorized: VocabWord[];
}) {
  const [activeGroup, setActiveGroup] = useState<{ label: string; words: VocabWord[] } | null>(null);

  if (activeGroup) {
    return <Flashcards label={activeGroup.label} words={activeGroup.words} onBack={() => setActiveGroup(null)} />;
  }

  const allGroups = [
    ...materialGroups.map(g => ({ label: g.material.title, material: g.material as Material | undefined, words: g.words })),
    ...(uncategorized.length > 0 ? [{ label: "Uncategorized", material: undefined, words: uncategorized }] : []),
  ];

  if (allGroups.length === 0) {
    return (
      <div className="text-center py-20">
        <BookMarked size={36} className="text-gray-200 mx-auto mb-3" />
        <p className="font-medium text-gray-400">No vocabulary yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allGroups.map(g => {
        const withDefs = g.words.filter(w => w.note).length;
        return (
          <div key={g.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2.5">
              <span className="font-semibold text-gray-800 text-sm">{g.label}</span>
              {g.material && <ModeBadge material={g.material} />}
              <span className="text-xs text-gray-400">{g.words.length} word{g.words.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">
                {withDefs === 0 ? "Add definitions in Review to enable testing" : `${withDefs} of ${g.words.length} have definitions`}
              </p>
              <button
                disabled={withDefs === 0}
                onClick={() => setActiveGroup({ label: g.label, words: g.words })}
                className={cn(
                  "flex-shrink-0 text-xs font-medium px-4 py-1.5 rounded-xl transition-colors",
                  withDefs > 0 ? "bg-accent text-white hover:opacity-90" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                Start
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Flashcard quiz (type-in) ─── */
function Flashcards({ label, words, onBack }: { label: string; words: VocabWord[]; onBack: () => void }) {
  const [deck] = useState<VocabWord[]>(() => shuffle(words.filter(w => w.note)));
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = deck.length;
  const card = deck[index];
  const progress = (index / total) * 100;

  function submit() {
    if (!input.trim()) return;
    setSubmitted(true);
  }

  function grade(correct: boolean) {
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), incorrect: s.incorrect + (correct ? 0 : 1) }));
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setInput("");
      setSubmitted(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  if (done) {
    const total2 = score.correct + score.incorrect;
    const pct = Math.round((score.correct / total2) * 100);
    return (
      <div className="flex flex-col items-center py-12 gap-5 px-4">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <div className="text-5xl font-bold text-gray-800">{pct}%</div>
        <p className="text-gray-500 text-sm">{score.correct} / {total2} correct</p>
        <div className="flex gap-4 sm:gap-6 text-sm flex-wrap justify-center">
          <span className="flex items-center gap-1.5 text-green-600 font-medium"><CheckCircle2 size={15} />{score.correct} correct</span>
          <span className="flex items-center gap-1.5 text-red-500 font-medium"><XCircle size={15} />{score.incorrect} incorrect</span>
        </div>
        <div className="flex gap-3 mt-2 flex-wrap justify-center">
          <button onClick={onBack} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
            ← All groups
          </button>
          <button
            onClick={() => { setIndex(0); setInput(""); setSubmitted(false); setScore({ correct: 0, incorrect: 0 }); setDone(false); }}
            className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <RotateCcw size={14} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-0 sm:px-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-4 text-xs">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">← All groups</button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-medium truncate">{label}</span>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
        <span>{index + 1} / {total}</span>
        <span>{score.correct} correct · {score.incorrect} incorrect</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col gap-5">
        {/* Word */}
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{card.word}</p>
          <p className="text-xs text-gray-400 mt-1">Type the definition below</p>
        </div>

        {/* Input */}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !submitted) submit(); }}
            disabled={submitted}
            placeholder="Your definition..."
            className={cn(
              "w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all",
              submitted ? "bg-gray-50 text-gray-500 border-gray-200" : "border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
            )}
          />
          {!submitted && (
            <button
              onClick={submit}
              disabled={!input.trim()}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-medium transition-colors",
                input.trim() ? "bg-accent text-white hover:opacity-90" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              Check
            </button>
          )}
        </div>

        {/* Answer reveal */}
        {submitted && (
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Correct answer</p>
              <p className="text-sm text-gray-800 font-medium">{card.note}</p>
            </div>
            <p className="text-xs text-gray-500 text-center">Did your answer match?</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => grade(false)}
                className="flex-1 flex items-center justify-center gap-1.5 border-2 border-red-200 text-red-500 rounded-xl py-2.5 font-medium text-sm hover:bg-red-50 transition-colors"
              >
                <XCircle size={15} /> No
              </button>
              <button
                onClick={() => grade(true)}
                className="flex-1 flex items-center justify-center gap-1.5 border-2 border-green-200 text-green-600 rounded-xl py-2.5 font-medium text-sm hover:bg-green-50 transition-colors"
              >
                <CheckCircle2 size={15} /> Yes
              </button>
            </div>
          </div>
        )}
      </div>

      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mx-auto mt-5 transition-colors">
        <RotateCcw size={11} /> Quit session
      </button>
    </div>
  );
}

/* ─── Word grid ─── */
function WordGrid({ words, editingId, noteText, setEditingId, setNoteText, deleteVocab, updateVocab }: {
  words: VocabWord[];
  editingId: string | null;
  noteText: string;
  setEditingId: (id: string | null) => void;
  setNoteText: (t: string) => void;
  deleteVocab: (id: string) => void;
  updateVocab: (id: string, patch: Partial<VocabWord>) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
      {words.map(v => (
        <div key={v.id} className="bg-gray-50 rounded-xl border border-gray-100 p-3.5 group flex flex-col gap-2 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-gray-900 text-sm leading-tight break-words">{v.word}</span>
            <button
              onClick={() => deleteVocab(v.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {editingId === v.id ? (
            <div className="mt-0.5">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Definition or note..."
                rows={2}
                autoFocus
                className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-2 outline-none focus:border-accent resize-none transition-colors bg-white"
              />
              <div className="flex gap-1.5 mt-1.5">
                <button
                  onClick={() => { updateVocab(v.id, { note: noteText }); setEditingId(null); }}
                  className="text-xs bg-accent text-white px-3 py-1 rounded-lg font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setEditingId(v.id); setNoteText(v.note ?? ""); }}
              className={cn(
                "flex items-start gap-1.5 text-xs text-left transition-colors mt-auto",
                v.note ? "text-gray-700 hover:text-accent" : "text-gray-400 hover:text-accent"
              )}
            >
              <StickyNote size={11} className="mt-0.5 flex-shrink-0" />
              {v.note ? v.note : <span className="italic">Add definition</span>}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
