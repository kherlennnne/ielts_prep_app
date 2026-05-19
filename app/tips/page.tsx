"use client";
import { useState } from "react";
import { Plus, Trash2, Pencil, Lightbulb, FileText, Headphones, PenLine, Globe } from "lucide-react";
import { useStore, Tip, TipCategory } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { generateId } from "@/lib/utils";
import { useUser } from "@/lib/useUser";
import { cn } from "@/lib/utils";

const CATEGORIES: { value: TipCategory; label: string; icon: typeof Globe }[] = [
  { value: "general",   label: "General",   icon: Globe },
  { value: "reading",   label: "Reading",   icon: FileText },
  { value: "listening", label: "Listening", icon: Headphones },
  { value: "writing",   label: "Writing",   icon: PenLine },
];

const CATEGORY_COLORS: Record<TipCategory, string> = {
  general:   "bg-accent-lightest text-accent-darker border-accent/20",
  reading:   "bg-blue-50 text-blue-700 border-blue-100",
  listening: "bg-purple-50 text-purple-700 border-purple-100",
  writing:   "bg-green-50 text-green-700 border-green-100",
};

export default function TipsPage() {
  const { tips, addTip, updateTip, deleteTip } = useStore();
  const { isCutie } = useUser();

  const [activeCategory, setActiveCategory] = useState<TipCategory>("general");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "general" as TipCategory });

  const filtered = tips
    .filter(t => t.category === activeCategory)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));

  function openAdd() {
    setEditingId(null);
    setForm({ title: "", content: "", category: activeCategory });
    setShowModal(true);
  }

  function openEdit(tip: Tip) {
    setEditingId(tip.id);
    setForm({ title: tip.title, content: tip.content, category: tip.category });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editingId) {
      updateTip(editingId, { title: form.title.trim(), content: form.content.trim(), category: form.category });
    } else {
      addTip({
        id: generateId(),
        category: form.category,
        title: form.title.trim(),
        content: form.content.trim(),
        order: tips.filter(t => t.category === form.category).length,
        createdAt: new Date().toISOString(),
      });
    }
    setShowModal(false);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <PageHeader
        title="Test Tips"
        subtitle="Strategies and advice for each section"
        action={isCutie ? (
          <Button size="sm" onClick={openAdd}><Plus size={14} /> Add Tip</Button>
        ) : undefined}
      />

      <div className="px-4 lg:px-8">
        {/* Category tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {CATEGORIES.map(({ value, label, icon: Icon }) => {
            const count = tips.filter(t => t.category === value).length;
            return (
              <button
                key={value}
                onClick={() => setActiveCategory(value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 border",
                  activeCategory === value
                    ? CATEGORY_COLORS[value]
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                )}
              >
                <Icon size={14} />
                {label}
                {count > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                    activeCategory === value ? "bg-white/60" : "bg-gray-100 text-gray-500"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tips list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <Lightbulb size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="font-medium text-gray-400">No {activeCategory} tips yet</p>
            {isCutie && (
              <p className="text-sm text-gray-300 mt-1">Click &ldquo;Add Tip&rdquo; to create your first one</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {filtered.map((tip, idx) => (
              <div key={tip.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                <div className="p-4 flex items-start gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold border",
                    CATEGORY_COLORS[tip.category]
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm mb-1.5">{tip.title}</p>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{tip.content}</p>
                  </div>
                  {isCutie && (
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => openEdit(tip)}
                        className="p-1.5 rounded-lg hover:bg-accent-lightest text-gray-400 hover:text-accent-darker transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteTip(tip.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit modal (cutie only) */}
      {isCutie && (
        <Modal open={showModal} onClose={closeModal} title={editingId ? "Edit Tip" : "Add Tip"}>
          <div className="space-y-4">
            {/* Category picker */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {CATEGORIES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setForm(f => ({ ...f, category: value }))}
                    className={cn(
                      "py-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all",
                      form.category === value ? CATEGORY_COLORS[value] : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Skim before you scan"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Content</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Explain the tip in detail..."
                rows={5}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none leading-relaxed"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={!form.title.trim() || !form.content.trim()}>
                {editingId ? "Update" : "Save Tip"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
