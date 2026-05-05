"use client";
import { useState } from "react";
import { Plus, Trash2, ChevronRight, FileText, Headphones, PenLine } from "lucide-react";
import { useStore, Material, Question } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { generateId } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const TYPE_ICONS = { listening: Headphones, reading: FileText, writing: PenLine };
const TYPE_COLORS = {
  listening: "bg-purple-50 text-purple-600 border-purple-100",
  reading: "bg-blue-50 text-blue-600 border-blue-100",
  writing: "bg-green-50 text-green-600 border-green-100",
};

export default function MaterialsPage() {
  const { materials, addMaterial, deleteMaterial } = useStore();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "", type: "reading" as Material["type"],
    content: "", rawQuestions: "", rawAnswers: "",
  });
  const [parsed, setParsed] = useState<{ questions: Question[]; answerKey: Record<string, string> } | null>(null);
  const [parseError, setParseError] = useState("");

  function parseQuestions(raw: string): Question[] {
    return raw.trim().split("\n\n").filter(Boolean).map((block, i) => {
      const lines = block.trim().split("\n");
      const firstLine = lines[0].replace(/^\d+[\.\)]\s*/, "");
      const opts = lines.slice(1).filter(l => /^[A-D][\.\)]/i.test(l.trim()));
      return {
        id: generateId(), number: i + 1,
        type: opts.length ? "mcq" : "short",
        text: firstLine,
        options: opts.length ? opts.map(o => o.replace(/^[A-D][\.\)]\s*/i, "")) : undefined,
        section: undefined,
      };
    });
  }

  function parseAnswers(raw: string, questions: Question[]): Record<string, string> {
    const key: Record<string, string> = {};
    raw.trim().split("\n").forEach((line, i) => {
      const val = line.replace(/^\d+[\.\):\s]+/, "").trim();
      if (questions[i]) key[questions[i].id] = val;
    });
    return key;
  }

  function handleParse() {
    setParseError("");
    try {
      const questions = parseQuestions(form.rawQuestions);
      if (!questions.length) throw new Error("No questions found");
      const answerKey = parseAnswers(form.rawAnswers, questions);
      setParsed({ questions, answerKey });
      setStep(3);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Parse error");
    }
  }

  function handleSave() {
    if (!parsed) return;
    addMaterial({
      id: generateId(), title: form.title, type: form.type,
      content: form.content, questions: parsed.questions,
      answerKey: parsed.answerKey, createdAt: new Date().toISOString(),
    });
    setShowAdd(false);
    setStep(1);
    setForm({ title: "", type: "reading", content: "", rawQuestions: "", rawAnswers: "" });
    setParsed(null);
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="Materials" subtitle="Add your practice tests"
        action={<Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add</Button>} />

      <div className="px-4 lg:px-8">
        {materials.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <FileText size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-500 mb-1">No materials yet</p>
            <p className="text-sm text-gray-400 mb-4">Add your practice test content to get started</p>
            <Button onClick={() => setShowAdd(true)}>Add First Material</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map(m => {
              const Icon = TYPE_ICONS[m.type];
              return (
                <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0", TYPE_COLORS[m.type])}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{m.title}</p>
                    <p className="text-xs text-gray-500 capitalize">{m.type} · {m.questions.length} questions</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => router.push(`/test?material=${m.id}`)}>
                      Start <ChevronRight size={13} />
                    </Button>
                    <button onClick={() => deleteMaterial(m.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setStep(1); setParsed(null); setParseError(""); }} title="Add Material" className="sm:max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5">
          {["Info", "Questions", "Review"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn("w-6 h-6 rounded-full text-xs flex items-center justify-center font-semibold",
                step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-accent text-white" : "bg-gray-100 text-gray-400")}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className={cn("text-xs font-medium", step === i + 1 ? "text-gray-900" : "text-gray-400")}>{s}</span>
              {i < 2 && <div className="w-6 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Cambridge IELTS 17 – Test 1"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Test Type</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {(["reading", "listening", "writing"] as const).map(t => {
                  const Icon = TYPE_ICONS[t];
                  return (
                    <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={cn("py-3 rounded-xl text-xs font-medium capitalize border flex flex-col items-center gap-1.5 transition-all",
                        form.type === t ? TYPE_COLORS[t] : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100")}>
                      <Icon size={16} />{t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Passage / Audio Script</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={5} placeholder="Paste the reading passage or audio transcript here..."
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none" />
            </div>
            <Button className="w-full" onClick={() => setStep(2)} disabled={!form.title || !form.content}>Next: Add Questions</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Questions</label>
              <p className="text-xs text-gray-400 mt-0.5 mb-1.5">Separate questions with a blank line. For MCQ, add options on new lines starting with A) B) C) D)</p>
              <textarea value={form.rawQuestions} onChange={e => setForm(f => ({ ...f, rawQuestions: e.target.value }))}
                rows={8} placeholder={"1. What is the main purpose of the article?\nA) To inform\nB) To persuade\nC) To entertain\nD) To describe\n\n2. According to the passage, ..."}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Answer Key</label>
              <p className="text-xs text-gray-400 mt-0.5 mb-1.5">One answer per line matching question order</p>
              <textarea value={form.rawAnswers} onChange={e => setForm(f => ({ ...f, rawAnswers: e.target.value }))}
                rows={4} placeholder={"1. A\n2. TRUE\n3. economic factors"}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none" />
            </div>
            {parseError && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{parseError}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={handleParse} disabled={!form.rawQuestions}>Parse & Preview</Button>
            </div>
          </div>
        )}

        {step === 3 && parsed && (
          <div className="space-y-4">
            <div className="bg-accent-lightest rounded-xl p-3 text-sm text-accent-darker font-medium">
              ✓ Parsed {parsed.questions.length} questions with {Object.keys(parsed.answerKey).length} answers
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {parsed.questions.map(q => (
                <div key={q.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-0.5">Q{q.number} · {q.type}</p>
                  <p className="text-sm text-gray-800">{q.text}</p>
                  {q.options && (
                    <div className="mt-1.5 space-y-0.5">
                      {q.options.map((o, i) => (
                        <p key={i} className="text-xs text-gray-500">{String.fromCharCode(65 + i)}) {o}</p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-green-600 font-medium mt-1.5">Answer: {parsed.answerKey[q.id] || "–"}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={handleSave}>Save Material</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
