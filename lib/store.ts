import { create } from "zustand";
import { hydrateFromDb, db } from "./supabase";

export type EventType = "study" | "test" | "review" | "break";

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  time: string;
  duration: number;
  type: EventType;
  completed: boolean;
  notes?: string;
  important?: boolean;
}

export interface TestSession {
  id: string;
  date: string;
  type: "listening" | "reading" | "writing";
  username?: string;
  materialId?: string;
  score?: number;
  maxScore: number;
  timeSpent: number;
  answers: Record<string, string>;
  correctAnswers?: Record<string, string>;
  feedback?: string;
  completed: boolean;
  trackedEventId?: string;
}

export interface AnswerLocation {
  sectionId: string;
  start: number;
  end: number;
}

export interface Material {
  id: string;
  title: string;
  groupName?: string;
  type: "listening" | "reading" | "writing";
  testMode?: "mock" | "practice";
  content?: string;
  passageImage?: string;
  sections?: Section[];
  questions: Question[];
  answerKey: Record<string, string>;
  duration?: number;
  explanations?: Record<string, string>;
  answerLocations?: Record<string, AnswerLocation>;
  createdAt: string;
}

export interface Question {
  id: string;
  number: number;
  type: "mcq" | "short" | "essay" | "fillblank" | "truefalse";
  text: string;
  options?: string[];
  section?: string;
}

export interface QuestionGroup {
  id: string;
  instruction?: string;
  questionImage?: string;
  tip?: string;
  questions: Question[];
}

export interface Section {
  id: string;
  title?: string;
  content?: string;
  passageImage?: string;
  youtubeUrl?: string;
  youtubeStart?: number;
  youtubeEnd?: number;
  groups: QuestionGroup[];
}

export interface VocabWord {
  id: string;
  word: string;
  context: string;
  materialId?: string;
  note?: string;
  savedAt: string;
}

export type TipCategory = "general" | "reading" | "listening" | "writing";

export interface Tip {
  id: string;
  category: TipCategory;
  title: string;
  content: string;
  order: number;
  createdAt: string;
}

interface Store {
  isLoaded: boolean;
  syncFromDb: () => Promise<void>;

  events: CalendarEvent[];
  addEvent: (e: CalendarEvent) => void;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  sessions: TestSession[];
  addSession: (s: TestSession) => void;
  updateSession: (id: string, patch: Partial<TestSession>) => void;
  deleteSession: (id: string) => void;

  materials: Material[];
  addMaterial: (m: Material) => void;
  deleteMaterial: (id: string) => void;
  updateMaterial: (id: string, patch: Partial<Material>) => void;

  vocab: VocabWord[];
  addVocab: (v: VocabWord) => void;
  deleteVocab: (id: string) => void;
  updateVocab: (id: string, patch: Partial<VocabWord>) => void;

  tips: Tip[];
  addTip: (t: Tip) => void;
  updateTip: (id: string, patch: Partial<Tip>) => void;
  deleteTip: (id: string) => void;

  activeTest: { materialId: string; sessionId: string } | null;
  setActiveTest: (t: { materialId: string; sessionId: string } | null) => void;
}

export const useStore = create<Store>()((set, get) => ({
  isLoaded: false,

  syncFromDb: async () => {
    // ── Step 1: Show localStorage data immediately so nothing looks lost ──────
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("ielts-store");
        if (raw) {
          const parsed = JSON.parse(raw);
          const ls = parsed?.state ?? parsed ?? {};
          // Show it right away so the user sees their data while Supabase loads
          set({
            materials: ls.materials ?? [],
            sessions:  ls.sessions  ?? [],
            events:    ls.events    ?? [],
            vocab:     ls.vocab     ?? [],
            tips:      ls.tips      ?? [],
          });
        }
      } catch { /* ignore parse errors */ }
    }

    // ── Step 2: One-time migration — push localStorage data to Supabase ───────
    if (typeof window !== "undefined" && !localStorage.getItem("ielts-db-migrated")) {
      try {
        const raw = localStorage.getItem("ielts-store");
        if (raw) {
          const parsed = JSON.parse(raw);
          const ls = parsed?.state ?? parsed ?? {};
          console.log("[Migration] Pushing localStorage data to Supabase…");
          await Promise.all([
            ...(ls.materials ?? []).map((m: Material)     => db.materials.upsert(m)),
            ...(ls.sessions  ?? []).map((s: TestSession)  => db.sessions.upsert(s)),
            ...(ls.events    ?? []).map((e: CalendarEvent) => db.events.upsert(e)),
            ...(ls.vocab     ?? []).map((v: VocabWord)    => db.vocab.upsert(v)),
            ...(ls.tips      ?? []).map((t: Tip)          => db.tips.upsert(t)),
          ]);
          localStorage.setItem("ielts-db-migrated", "1");
          console.log("[Migration] Done.");
        } else {
          localStorage.setItem("ielts-db-migrated", "1");
        }
      } catch (e) {
        console.error("[Migration] Failed — will retry next load:", e);
      }
    }

    // ── Step 3: Fetch authoritative data from Supabase ────────────────────────
    try {
      const data = await hydrateFromDb();
      // Only overwrite if Supabase returned something; otherwise keep localStorage data
      const hasRemote = data.materials.length > 0 || data.sessions.length > 0 ||
                        data.events.length > 0 || data.vocab.length > 0 || data.tips.length > 0;
      if (hasRemote) set({ ...data });
    } catch (e) {
      console.error("[DB] sync failed:", e);
    }

    set({ isLoaded: true });
  },

  // ── Calendar ───────────────────────────────────────────────────────────────
  events: [],
  addEvent: (e) => {
    set((s) => ({ events: [...s.events, e] }));
    db.events.upsert(e);
  },
  updateEvent: (id, patch) => {
    set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
    const updated = get().events.find((e) => e.id === id);
    if (updated) db.events.upsert(updated);
  },
  deleteEvent: (id) => {
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    db.events.delete(id);
  },

  // ── Sessions ───────────────────────────────────────────────────────────────
  sessions: [],
  addSession: (sess) => {
    set((s) => ({ sessions: [...s.sessions, sess] }));
    db.sessions.upsert(sess);
  },
  updateSession: (id, patch) => {
    set((s) => ({ sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, ...patch } : sess)) }));
    const updated = get().sessions.find((s) => s.id === id);
    if (updated) db.sessions.upsert(updated);
  },
  deleteSession: (id) => {
    set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== id) }));
    db.sessions.delete(id);
  },

  // ── Materials ──────────────────────────────────────────────────────────────
  materials: [],
  addMaterial: (m) => {
    set((s) => ({ materials: [...s.materials, m] }));
    db.materials.upsert(m);
  },
  deleteMaterial: (id) => {
    set((s) => ({ materials: s.materials.filter((m) => m.id !== id) }));
    db.materials.delete(id);
  },
  updateMaterial: (id, patch) => {
    set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
    const updated = get().materials.find((m) => m.id === id);
    if (updated) db.materials.upsert(updated);
  },

  // ── Vocabulary ─────────────────────────────────────────────────────────────
  vocab: [],
  addVocab: (v) => {
    set((s) => ({ vocab: [...s.vocab, v] }));
    db.vocab.upsert(v);
  },
  deleteVocab: (id) => {
    set((s) => ({ vocab: s.vocab.filter((v) => v.id !== id) }));
    db.vocab.delete(id);
  },
  updateVocab: (id, patch) => {
    set((s) => ({ vocab: s.vocab.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
    const updated = get().vocab.find((v) => v.id === id);
    if (updated) db.vocab.upsert(updated);
  },

  // ── Tips ───────────────────────────────────────────────────────────────────
  tips: [],
  addTip: (t) => {
    set((s) => ({ tips: [...s.tips, t] }));
    db.tips.upsert(t);
  },
  updateTip: (id, patch) => {
    set((s) => ({ tips: s.tips.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    const updated = get().tips.find((t) => t.id === id);
    if (updated) db.tips.upsert(updated);
  },
  deleteTip: (id) => {
    set((s) => ({ tips: s.tips.filter((t) => t.id !== id) }));
    db.tips.delete(id);
  },

  activeTest: null,
  setActiveTest: (t) => set({ activeTest: t }),
}));
