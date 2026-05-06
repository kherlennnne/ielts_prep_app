"use client";
import { useState } from "react";
import { Trash2, StickyNote, BookMarked, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

export default function VocabPage() {
  const { vocab, deleteVocab, updateVocab, materials } = useStore();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const filtered = vocab
    .filter(v =>
      v.word.toLowerCase().includes(search.toLowerCase()) ||
      v.note?.toLowerCase().includes(search.toLowerCase())
    )
    .slice()
    .reverse();

  const getMaterialTitle = (materialId?: string) => {
    if (!materialId) return null;
    return materials.find(m => m.id === materialId)?.title ?? null;
  };

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
            placeholder="Search words or notes..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>

        {vocab.length === 0 ? (
          <div className="text-center py-20">
            <BookMarked size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="font-medium text-gray-400">No vocabulary saved yet</p>
            <p className="text-sm text-gray-300 mt-1">Highlight words while taking a test to save them here</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No words match "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(v => {
              const source = getMaterialTitle(v.materialId);
              return (
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

                  <p className="text-xs text-gray-500 italic leading-relaxed">
                    "{v.context.length > 140 ? v.context.slice(0, 140) + "…" : v.context}"
                  </p>

                  {source && (
                    <span className="text-[10px] text-accent-darker font-medium bg-accent-lightest px-2 py-0.5 rounded-full self-start">
                      {source}
                    </span>
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
                      {v.note ? v.note : <span className="italic">Add note or definition</span>}
                    </button>
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
