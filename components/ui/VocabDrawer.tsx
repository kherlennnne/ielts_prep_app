"use client";
import { useState } from "react";
import { X, Trash2, BookOpen, StickyNote, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { generateId } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface VocabDrawerProps {
  open: boolean;
  onClose: () => void;
  materialId?: string;
  allowAdd?: boolean;
}

export function VocabDrawer({ open, onClose, materialId, allowAdd }: VocabDrawerProps) {
  const { vocab, deleteVocab, updateVocab, addVocab } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newDef, setNewDef] = useState("");

  const words = materialId ? vocab.filter(v => v.materialId === materialId) : vocab;

  function handleAdd() {
    const w = newWord.trim();
    if (!w) return;
    addVocab({
      id: generateId(),
      word: w,
      context: w,
      materialId,
      note: newDef.trim() || undefined,
      savedAt: new Date().toISOString(),
    });
    setNewWord("");
    setNewDef("");
    setShowAddForm(false);
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />}
      <div className={cn(
        "fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-accent" />
            <h2 className="font-semibold text-gray-900 text-sm">Vocabulary</h2>
            {words.length > 0 && (
              <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {words.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {allowAdd && (
              <button
                onClick={() => setShowAddForm(v => !v)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors text-sm",
                  showAddForm ? "bg-accent text-white" : "hover:bg-gray-100 text-gray-500"
                )}
                title="Add word"
              >
                <Plus size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={15} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Add form */}
        {allowAdd && showAddForm && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 space-y-2 flex-shrink-0">
            <input
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              placeholder="Word or phrase..."
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent transition-colors bg-white"
            />
            <textarea
              value={newDef}
              onChange={e => setNewDef(e.target.value)}
              placeholder="Definition (optional)..."
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-accent resize-none transition-colors bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newWord.trim()}
                className="flex-1 bg-accent text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-40 transition-colors hover:bg-accent-dark"
              >
                Add Word
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewWord(""); setNewDef(""); }}
                className="text-xs text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Word list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {words.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">No words saved yet</p>
              <p className="text-xs text-gray-300 mt-1">
                {allowAdd ? "Add words above or select text in the passage" : "Select text in the passage to save words"}
              </p>
            </div>
          ) : (
            [...words].reverse().map(v => (
              <div key={v.id} className="bg-gray-50 rounded-xl p-3.5 group">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-gray-900 text-sm leading-tight">{v.word}</span>
                  <button
                    onClick={() => deleteVocab(v.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {v.context && v.context !== v.word && (
                  <p className="text-xs text-gray-500 italic leading-relaxed mb-2.5">
                    &ldquo;{v.context.length > 120 ? v.context.slice(0, 120) + "…" : v.context}&rdquo;
                  </p>
                )}

                {editingId === v.id ? (
                  <div>
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
                        className="text-xs text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingId(v.id); setNoteText(v.note ?? ""); }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-accent transition-colors"
                  >
                    <StickyNote size={11} />
                    {v.note
                      ? <span className="text-gray-700 text-left">{v.note}</span>
                      : <span>Add definition</span>
                    }
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
