"use client";
import { useState } from "react";
import { Plus, Trash2, ChevronRight, FileText, Headphones, PenLine, Upload, Type, Image as ImageIcon, X, ChevronDown, ChevronUp, Youtube, Pencil, FlaskConical, BookOpen, Download, Loader2 } from "lucide-react";
import { useStore, Material, TestSession, CalendarEvent, Question, Section, QuestionGroup } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getYouTubeId, parseTimestamp } from "@/lib/utils";
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

interface FormGroup {
  id: string;
  instruction: string;
  rawQuestions: string;
  rawAnswers: string;
  questionImage?: string;
}

interface FormSection {
  id: string;
  title: string;
  content: string;
  passageMode: "text" | "image";
  passageImage?: string;
  youtubeUrl: string;
  youtubeStart: string;
  youtubeEnd: string;
  groups: FormGroup[];
  collapsed: boolean;
}

const defaultGroup = (): FormGroup => ({
  id: generateId(), instruction: "", rawQuestions: "", rawAnswers: "", questionImage: undefined,
});

const defaultSection = (): FormSection => ({
  id: generateId(), title: "", content: "", passageMode: "text",
  passageImage: undefined, youtubeUrl: "", youtubeStart: "0:00", youtubeEnd: "",
  groups: [defaultGroup()], collapsed: false,
});

interface ParsedData {
  sections: Section[];
  questions: Question[];
  answerKey: Record<string, string>;
}

function secsToTimestamp(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function groupToForm(grp: QuestionGroup, answerKey: Record<string, string>): FormGroup {
  const rawQuestions = grp.questions.map(q => {
    let line = `${q.number}. ${q.text}`;
    if (q.options) line += "\n" + q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("\n");
    return line;
  }).join("\n\n");
  const rawAnswers = grp.questions.map(q => `${q.number}. ${answerKey[q.id] ?? ""}`).join("\n");
  return { id: grp.id, instruction: grp.instruction ?? "", rawQuestions, rawAnswers, questionImage: grp.questionImage };
}

function materialToForm(m: Material): { title: string; type: Material["type"]; testMode: Material["testMode"]; duration: number; sections: FormSection[] } {
  const sections: FormSection[] = (m.sections?.length ? m.sections : [{
    id: generateId(), title: undefined, content: m.content, passageImage: m.passageImage,
    youtubeUrl: undefined, youtubeStart: undefined, youtubeEnd: undefined,
    groups: [{ id: generateId(), instruction: undefined, questions: m.questions, questionImage: undefined }],
  }]).map(sec => ({
    id: sec.id,
    title: sec.title ?? "",
    content: sec.content ?? "",
    passageMode: sec.passageImage ? "image" as const : "text" as const,
    passageImage: sec.passageImage,
    youtubeUrl: sec.youtubeUrl ?? "",
    youtubeStart: sec.youtubeStart != null ? secsToTimestamp(sec.youtubeStart) : "0:00",
    youtubeEnd: sec.youtubeEnd != null ? secsToTimestamp(sec.youtubeEnd) : "",
    groups: sec.groups.map(g => groupToForm(g, m.answerKey)),
    collapsed: false,
  }));
  return { title: m.title, type: m.type, testMode: m.testMode ?? "mock", duration: m.duration ?? 60, sections };
}

export default function MaterialsPage() {
  const { materials, addMaterial, deleteMaterial, updateMaterial, sessions, addSession, events, addEvent } = useStore();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ title: "", type: "reading" as Material["type"], testMode: "mock" as Material["testMode"], duration: 60, sections: [defaultSection()] });
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState("");

  // ── Import from app_state backup ──────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importTab, setImportTab] = useState<"materials" | "sessions" | "events">("materials");
  const [backupMaterials, setBackupMaterials] = useState<Material[]>([]);
  const [backupSessions, setBackupSessions] = useState<TestSession[]>([]);
  const [backupEvents, setBackupEvents] = useState<CalendarEvent[]>([]);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  async function fetchBackup() {
    setImportLoading(true);
    setImportError("");
    setBackupMaterials([]);
    setBackupSessions([]);
    setBackupEvents([]);
    try {
      const { data, error } = await supabase
        .from("app_state")
        .select("value")
        .eq("key", "ielts-store")
        .single();
      if (error || !data) throw new Error(error?.message ?? "No backup found in app_state");
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      const mats: Material[] = parsed?.state?.materials ?? [];
      const sess: TestSession[] = parsed?.state?.sessions ?? [];
      const evts: CalendarEvent[] = parsed?.state?.events ?? [];
      if (!mats.length && !sess.length && !evts.length) throw new Error("No data found in backup");
      setBackupMaterials(mats);
      setBackupSessions(sess);
      setBackupEvents(evts);
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : "Failed to load backup");
    } finally {
      setImportLoading(false);
    }
  }

  function importMaterial(m: Material) {
    const exists = materials.some(ex => ex.id === m.id);
    const toAdd = exists ? { ...m, id: generateId(), createdAt: new Date().toISOString() } : m;
    addMaterial(toAdd);
    setImportedIds(prev => { const n = new Set(prev); n.add(m.id); return n; });
  }

  function importSession(s: TestSession) {
    const exists = sessions.some(ex => ex.id === s.id);
    const toAdd = exists ? { ...s, id: generateId() } : s;
    addSession(toAdd);
    setImportedIds(prev => { const n = new Set(prev); n.add(s.id); return n; });
  }

  function importCalendarEvent(e: CalendarEvent) {
    const exists = events.some(ex => ex.id === e.id);
    const toAdd = exists ? { ...e, id: generateId() } : e;
    addEvent(toAdd);
    setImportedIds(prev => { const n = new Set(prev); n.add(e.id); return n; });
  }

  function parseQuestions(raw: string, startNumber: number): Question[] {
    return raw.trim().split("\n\n").filter(Boolean).map((block, i) => {
      const lines = block.trim().split("\n");
      const firstLine = lines[0].replace(/^\d+[\.\)]\s*/, "");
      const opts = lines.slice(1).filter(l => /^[A-D][\.\)]/i.test(l.trim()));
      return {
        id: generateId(), number: startNumber + i,
        type: opts.length ? "mcq" : "short",
        text: firstLine,
        options: opts.length ? opts.map(o => o.replace(/^[A-D][\.\)]\s*/i, "")) : undefined,
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
      let qNumber = 1;
      const sections: Section[] = [];
      const allQuestions: Question[] = [];
      const allAnswerKey: Record<string, string> = {};

      for (const fs of form.sections) {
        const groups: QuestionGroup[] = [];
        for (const fg of fs.groups) {
          if (!fg.rawQuestions.trim()) continue;
          const questions = parseQuestions(fg.rawQuestions, qNumber);
          const answerKey = parseAnswers(fg.rawAnswers, questions);
          groups.push({ id: fg.id, instruction: fg.instruction || undefined, questionImage: fg.questionImage, questions });
          allQuestions.push(...questions);
          Object.assign(allAnswerKey, answerKey);
          qNumber += questions.length;
        }
        sections.push({
          id: fs.id, title: fs.title || undefined,
          content: fs.content || undefined, passageImage: fs.passageImage,
          youtubeUrl: fs.youtubeUrl || undefined,
          youtubeStart: fs.youtubeUrl ? parseTimestamp(fs.youtubeStart) : undefined,
          youtubeEnd: fs.youtubeUrl && fs.youtubeEnd ? parseTimestamp(fs.youtubeEnd) : undefined,
          groups,
        });
      }

      if (!allQuestions.length) throw new Error("No questions found — paste questions into at least one group");
      setParsed({ sections, questions: allQuestions, answerKey: allAnswerKey });
      setStep(3);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Parse error");
    }
  }

  function handleEdit(m: Material) {
    setForm(materialToForm(m));
    setEditingId(m.id);
    setStep(1);
    setParsed(null);
    setShowAdd(true);
  }

  function handleSave() {
    if (!parsed) return;
    const data = {
      title: form.title, type: form.type, testMode: form.testMode,
      content: form.sections[0]?.content,
      passageImage: form.sections[0]?.passageImage,
      sections: parsed.sections,
      questions: parsed.questions,
      answerKey: parsed.answerKey,
      duration: form.duration,
    };
    if (editingId) {
      updateMaterial(editingId, data);
    } else {
      addMaterial({ ...data, id: generateId(), createdAt: new Date().toISOString() });
    }
    closeModal();
  }

  function closeModal() {
    setShowAdd(false); setEditingId(null); setStep(1); setParsed(null); setParseError("");
    setForm({ title: "", type: "reading", testMode: "mock", duration: 60, sections: [defaultSection()] });
  }

  // Section helpers
  const updateSection = (sid: string, patch: Partial<FormSection>) =>
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === sid ? { ...s, ...patch } : s) }));

  const removeSection = (sid: string) =>
    setForm(f => ({ ...f, sections: f.sections.filter(s => s.id !== sid) }));

  const addGroup = (sid: string) =>
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === sid ? { ...s, groups: [...s.groups, defaultGroup()] } : s) }));

  const removeGroup = (sid: string, gid: string) =>
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === sid ? { ...s, groups: s.groups.filter(g => g.id !== gid) } : s) }));

  const updateGroup = (sid: string, gid: string, patch: Partial<FormGroup>) =>
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === sid ? { ...s, groups: s.groups.map(g => g.id === gid ? { ...g, ...patch } : g) } : s) }));

  function handleImageUpload(sid: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => updateSection(sid, { passageImage: ev.target?.result as string, passageMode: "image" });
    reader.readAsDataURL(file);
  }

  function handleGroupImageUpload(sid: string, gid: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => updateGroup(sid, gid, { questionImage: ev.target?.result as string });
    reader.readAsDataURL(file);
  }

  const canProceed = form.title && form.sections.some(s =>
    s.groups.some(g => g.rawQuestions.trim())
  );

  return (
    <div className="min-h-screen">
      <PageHeader title="Materials" subtitle="Your practice tests"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowImport(true); fetchBackup(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              title="Import from old backup"
            >
              <Download size={13} /> Import
            </button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add</Button>
          </div>
        }
      />

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
              const sectionCount = m.sections?.length ?? 0;
              return (
                <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0", TYPE_COLORS[m.type])}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{m.title}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {m.type} · {m.questions.length} questions{sectionCount > 1 ? ` · ${sectionCount} passages` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => router.push(`/test?tab=${m.testMode ?? "mock"}&material=${m.id}`)}>
                      Start <ChevronRight size={13} />
                    </Button>
                    <button onClick={() => handleEdit(m)}
                      className="p-2 rounded-lg hover:bg-accent-lightest text-gray-400 hover:text-accent-darker transition-colors">
                      <Pencil size={15} />
                    </button>
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

      <Modal open={showAdd} onClose={closeModal} title={editingId ? "Edit Material" : "Add Material"} className="sm:max-w-2xl">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-5">
          {["Info", "Sections & Questions", "Review"].map((s, i) => (
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

        {/* Step 1: Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Cambridge IELTS 17 – Test 1 Reading"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mode</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setForm(f => ({ ...f, testMode: "mock" }))}
                  className={cn(
                    "py-3 rounded-xl text-xs font-medium border flex flex-col items-center gap-1.5 transition-all",
                    form.testMode === "mock"
                      ? "bg-accent-lightest text-accent-darker border-accent/40"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <FlaskConical size={16} />
                  Mock Test
                  <span className="text-[10px] font-normal opacity-70">Timed, full exam conditions</span>
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, testMode: "practice" }))}
                  className={cn(
                    "py-3 rounded-xl text-xs font-medium border flex flex-col items-center gap-1.5 transition-all",
                    form.testMode === "practice"
                      ? "bg-green-50 text-green-700 border-green-300"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <BookOpen size={16} />
                  Practice Test
                  <span className="text-[10px] font-normal opacity-70">No timer, instant feedback</span>
                </button>
              </div>
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
            {form.testMode === "mock" && <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Timer</label>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs">
                  {[20, 30, 40, 60].map(min => (
                    <button key={min} onClick={() => setForm(f => ({ ...f, duration: min }))}
                      className={cn("px-3 py-2 font-medium transition-colors",
                        form.duration === min ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50 border-l border-gray-200 first:border-l-0")}>
                      {min}m
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number" min={1} max={300}
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-center"
                  />
                  <span className="text-xs text-gray-400 whitespace-nowrap">min</span>
                </div>
              </div>
            </div>}
            <Button className="w-full" onClick={() => setStep(2)} disabled={!form.title}>
              Next: Add Passages & Questions
            </Button>
          </div>
        )}

        {/* Step 2: Sections */}
        {step === 2 && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {form.sections.map((sec, si) => (
              <div key={sec.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                {/* Section header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <button onClick={() => updateSection(sec.id, { collapsed: !sec.collapsed })}
                    className="text-gray-400 hover:text-gray-600 transition-colors">
                    {sec.collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                  </button>
                  <input
                    value={sec.title}
                    onChange={e => updateSection(sec.id, { title: e.target.value })}
                    placeholder={`Passage ${si + 1} title (optional)`}
                    className="flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
                  />
                  {form.sections.length > 1 && (
                    <button onClick={() => removeSection(sec.id)}
                      className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {!sec.collapsed && (
                  <div className="p-4 space-y-4">
                    {/* YouTube (listening only) */}
                    {form.type === "listening" && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                          <Youtube size={12} /> Audio / Video
                        </label>
                        <input
                          value={sec.youtubeUrl}
                          onChange={e => updateSection(sec.id, { youtubeUrl: e.target.value })}
                          placeholder="YouTube URL (e.g. https://youtu.be/abc123)"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-accent transition-all mb-2"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-xs text-gray-400 whitespace-nowrap">Start</span>
                            <input
                              value={sec.youtubeStart}
                              onChange={e => updateSection(sec.id, { youtubeStart: e.target.value })}
                              placeholder="0:00"
                              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-accent transition-all text-center"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-xs text-gray-400 whitespace-nowrap">End</span>
                            <input
                              value={sec.youtubeEnd}
                              onChange={e => updateSection(sec.id, { youtubeEnd: e.target.value })}
                              placeholder="optional"
                              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-accent transition-all text-center"
                            />
                          </div>
                        </div>
                        {sec.youtubeUrl && !getYouTubeId(sec.youtubeUrl) && (
                          <p className="text-xs text-red-500 mt-1">Invalid YouTube URL</p>
                        )}
                        {sec.youtubeUrl && getYouTubeId(sec.youtubeUrl) && (
                          <p className="text-xs text-green-600 mt-1">✓ Valid — starts at {sec.youtubeStart}</p>
                        )}
                      </div>
                    )}

                    {/* Passage */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transcript / Passage</label>
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                          <button onClick={() => updateSection(sec.id, { passageMode: "text" })}
                            className={cn("px-2.5 py-1 flex items-center gap-1 transition-colors",
                              sec.passageMode === "text" ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50")}>
                            <Type size={10} /> Text
                          </button>
                          <button onClick={() => updateSection(sec.id, { passageMode: "image" })}
                            className={cn("px-2.5 py-1 flex items-center gap-1 transition-colors border-l border-gray-200",
                              sec.passageMode === "image" ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50")}>
                            <ImageIcon size={10} /> Image
                          </button>
                        </div>
                      </div>
                      {sec.passageMode === "text" ? (
                        <textarea value={sec.content} onChange={e => updateSection(sec.id, { content: e.target.value })}
                          rows={4} placeholder={"Paste the reading passage or audio transcript...\n\nFor labelled paragraphs use [A], [B], [C] on their own line:\n[A]\nFirst paragraph text...\n[B]\nSecond paragraph text..."}
                          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none" />
                      ) : sec.passageImage ? (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={sec.passageImage} alt="Passage" className="w-full" />
                          <button onClick={() => updateSection(sec.id, { passageImage: undefined })}
                            className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-red-50 transition-colors">
                            <X size={13} className="text-gray-500" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-accent hover:bg-accent-lightest transition-all group">
                          <Upload size={20} className="text-gray-300 group-hover:text-accent mb-1.5 transition-colors" />
                          <p className="text-xs font-medium text-gray-500 group-hover:text-accent-darker">Upload passage image</p>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(sec.id, e)} />
                        </label>
                      )}
                    </div>

                    {/* Question Groups */}
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Question Groups</label>
                      {sec.groups.map((grp, gi) => (
                        <div key={grp.id} className="bg-gray-50 rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Group {gi + 1}</span>
                            {sec.groups.length > 1 && (
                              <button onClick={() => removeGroup(sec.id, grp.id)}
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                                <X size={12} />
                              </button>
                            )}
                          </div>
                          <input
                            value={grp.instruction}
                            onChange={e => updateGroup(sec.id, grp.id, { instruction: e.target.value })}
                            placeholder="Instructions (e.g. Questions 1–7: Choose TRUE, FALSE or NOT GIVEN)"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-accent transition-all bg-white"
                          />
                          {grp.questionImage ? (
                            <div className="relative rounded-xl overflow-hidden border border-gray-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={grp.questionImage} alt="Diagram" className="w-full" />
                              <button onClick={() => updateGroup(sec.id, grp.id, { questionImage: undefined })}
                                className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-red-50 transition-colors">
                                <X size={13} className="text-gray-500" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-200 cursor-pointer hover:border-accent hover:bg-accent-lightest transition-all text-xs text-gray-400 hover:text-accent-darker group">
                              <Upload size={12} className="flex-shrink-0" />
                              Upload diagram / map / table (optional)
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleGroupImageUpload(sec.id, grp.id, e)} />
                            </label>
                          )}
                          <textarea value={grp.rawQuestions} onChange={e => updateGroup(sec.id, grp.id, { rawQuestions: e.target.value })}
                            rows={4} placeholder={"1. What is the main purpose?\nA) To inform\nB) To persuade\n\n2. According to the passage..."}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono outline-none focus:border-accent transition-all resize-none bg-white" />
                          <textarea value={grp.rawAnswers} onChange={e => updateGroup(sec.id, grp.id, { rawAnswers: e.target.value })}
                            rows={2} placeholder={"1. A\n2. TRUE\n3. economic factors"}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono outline-none focus:border-accent transition-all resize-none bg-white" />
                        </div>
                      ))}
                      <button onClick={() => addGroup(sec.id)}
                        className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-accent hover:text-accent-darker transition-colors flex items-center justify-center gap-1.5">
                        <Plus size={12} /> Add Question Group
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button onClick={() => setForm(f => ({ ...f, sections: [...f.sections, defaultSection()] }))}
              className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-accent hover:text-accent-darker transition-colors flex items-center justify-center gap-1.5">
              <Plus size={12} /> Add Passage / Section
            </button>

            {parseError && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{parseError}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={handleParse} disabled={!canProceed}>Parse & Preview</Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && parsed && (
          <div className="space-y-4">
            <div className="bg-accent-lightest rounded-xl p-3 text-sm text-accent-darker font-medium">
              ✓ {parsed.questions.length} questions across {parsed.sections.length} passage{parsed.sections.length !== 1 ? "s" : ""}
            </div>
            <div className="max-h-52 overflow-y-auto space-y-2">
              {parsed.sections.map((sec, si) => (
                <div key={sec.id}>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                    Passage {si + 1}{sec.title ? `: ${sec.title}` : ""}
                  </p>
                  {sec.groups.map((grp, gi) => (
                    <div key={grp.id} className="bg-gray-50 rounded-xl p-3 mb-1.5">
                      {grp.instruction && (
                        <p className="text-[11px] text-accent-darker font-medium mb-1.5 italic">{grp.instruction}</p>
                      )}
                      <p className="text-[11px] text-gray-500">{grp.questions.length} questions (Q{grp.questions[0]?.number}–Q{grp.questions[grp.questions.length - 1]?.number})</p>
                      {grp.questions.slice(0, 2).map(q => (
                        <div key={q.id} className="mt-1">
                          <p className="text-xs text-gray-700">Q{q.number}. {q.text.slice(0, 60)}{q.text.length > 60 ? "…" : ""}</p>
                        </div>
                      ))}
                      {grp.questions.length > 2 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">+{grp.questions.length - 2} more</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={handleSave}>{editingId ? "Update Material" : "Save Material"}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Import from backup modal */}
      <Modal open={showImport} onClose={() => { setShowImport(false); setImportedIds(new Set()); }} title="Import from backup">
        {importLoading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Reading backup...</span>
          </div>
        ) : importError ? (
          <div className="space-y-4">
            <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4">{importError}</div>
            <Button variant="secondary" className="w-full" onClick={() => setShowImport(false)}>Close</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Tab bar */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {(["materials", "sessions", "events"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setImportTab(tab)}
                  className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize",
                    importTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}
                >
                  {tab} ({tab === "materials" ? backupMaterials.length : tab === "sessions" ? backupSessions.length : backupEvents.length})
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {importTab === "materials" ? (
                backupMaterials.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No materials in backup</p>
                ) : backupMaterials.map(m => {
                  const Icon = TYPE_ICONS[m.type];
                  const done = importedIds.has(m.id);
                  const dupe = !done && materials.some(ex => ex.id === m.id);
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border flex-shrink-0", TYPE_COLORS[m.type])}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{m.title}</p>
                        <p className="text-xs text-gray-500 capitalize">{m.type} · {m.questions.length} questions</p>
                      </div>
                      {done ? (
                        <span className="text-xs text-green-600 font-medium flex-shrink-0">✓ Imported</span>
                      ) : (
                        <button onClick={() => importMaterial(m)}
                          className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0",
                            dupe ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : "bg-accent text-white hover:bg-accent-dark")}>
                          {dupe ? "Import copy" : "Import"}
                        </button>
                      )}
                    </div>
                  );
                })
              ) : importTab === "sessions" ? (
                backupSessions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No sessions in backup</p>
                ) : backupSessions.map(s => {
                  const done = importedIds.has(s.id);
                  const dupe = !done && sessions.some(ex => ex.id === s.id);
                  const mat = materials.find(m => m.id === s.materialId) ??
                              backupMaterials.find(m => m.id === s.materialId);
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 rounded-lg bg-accent-lightest flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-accent-darker capitalize">{s.type[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {mat?.title ?? `${s.type} test`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {s.date} · {s.score ?? "–"}/{s.maxScore} · {s.completed ? "Completed" : "Incomplete"}
                        </p>
                      </div>
                      {done ? (
                        <span className="text-xs text-green-600 font-medium flex-shrink-0">✓ Imported</span>
                      ) : (
                        <button onClick={() => importSession(s)}
                          className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0",
                            dupe ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : "bg-accent text-white hover:bg-accent-dark")}>
                          {dupe ? "Import copy" : "Import"}
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                backupEvents.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No calendar events in backup</p>
                ) : backupEvents.map(e => {
                  const done = importedIds.has(e.id);
                  const dupe = !done && events.some(ex => ex.id === e.id);
                  return (
                    <div key={e.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{e.type.slice(0, 3)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
                        <p className="text-xs text-gray-500">{e.date} · {e.time} · {e.duration}min</p>
                      </div>
                      {done ? (
                        <span className="text-xs text-green-600 font-medium flex-shrink-0">✓ Imported</span>
                      ) : (
                        <button onClick={() => importCalendarEvent(e)}
                          className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0",
                            dupe ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : "bg-accent text-white hover:bg-accent-dark")}>
                          {dupe ? "Import copy" : "Import"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <Button variant="secondary" className="w-full" onClick={() => { setShowImport(false); setImportedIds(new Set()); }}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
