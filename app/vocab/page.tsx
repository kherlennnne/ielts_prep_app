"use client";
import { useState } from "react";
import { Trash2, StickyNote, BookMarked, Search, FlaskConical, BookOpen } from "lucide-react";
import { useStore, VocabWord } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

export default function VocabPage() {
  const { vocab, deleteVocab, updateVocab, materials } = useStore();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const filtered = vocab.filter(v =>
    v.word.toLowerCase().includes(search.toLowerCase()) ||
    v.note?.toLowerCase().includes(search.toLowerCase()) ||
    v.context?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by materialId
  const grouped = new Map<string | null, VocabWord[]>();
  for (const v of [...filtered].reverse()) {
    const key = v.materialId ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(v);
  }

  // Build ordered groups: materials first (by their order in materials list), then uncategorized
  const materialGroups = materials
    .filter(m => grouped.has(m.id))
    .map(m => ({ material: m, words: grouped.get(m.id)! }));
  const uncategorized = grouped.get(null) ?? [];

  return (
    <div className="min-h-screen">
      <PageHeader title="Vocabulary" subtitle={`${vocab.length} word${vocab.length !== 1 ? "s" : ""} saved`} />

      <div className="px-4 lg:px-8">
        {/* Search */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search words, definitions or context..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>

        {vocab.length === 0 ? (
          <div className="text-center py-20">
            <BookMarked size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="font-medium text-gray-400">No vocabulary saved yet</p>
            <p className="text-sm text-gray-300 mt-1">Add words from the Practice Test or select text in a passage</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No words match &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-8">
            {materialGroups.map(({ material, words }) => (
              <div key={material.id}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-semibold text-gray-700 text-sm">{material.title}</h2>
                  <span className={cn(
                    "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    material.testMode === "practice"
                      ? "bg-green-100 text-green-700"
                      : "bg-accent-lightest text-accent-darker"
                  )}>
                    {material.testMode === "practice"
                      ? <><BookOpen size={9} /> Practice</>
                      : <><FlaskConical size={9} /> Mock</>
                    }
                  </span>
                  <span className="text-xs text-gray-400">{words.length} word{words.length !== 1 ? "s" : ""}</span>
                </div>
                <WordGrid words={words} editingId={editingId} noteText={noteText}
                  setEditingId={setEditingId} setNoteText={setNoteText}
                  deleteVocab={deleteVocab} updateVocab={updateVocab} />
              </div>
            ))}

            {uncategorized.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-semibold text-gray-500 text-sm">Uncategorized</h2>
                  <span className="text-xs text-gray-400">{uncategorized.length} word{uncategorized.length !== 1 ? "s" : ""}</span>
                </div>
                <WordGrid words={uncategorized} editingId={editingId} noteText={noteText}
                  setEditingId={setEditingId} setNoteText={setNoteText}
                  deleteVocab={deleteVocab} updateVocab={updateVocab} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {words.map(v => (
        <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 group flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-gray-900 text-base leading-tight">{v.word}</span>
            <button
              onClick={() => deleteVocab(v.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {v.context && v.context !== v.word && (
            <p className="text-xs text-gray-500 italic leading-relaxed">
              &ldquo;{v.context.length > 140 ? v.context.slice(0, 140) + "…" : v.context}&rdquo;
            </p>
          )}

          {editingId === v.id ? (
            <div className="mt-1">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Definition or note..."
                rows={2}
                autoFocus
                className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-2 outline-none focus:border-accent resize-none transition-colors"
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
