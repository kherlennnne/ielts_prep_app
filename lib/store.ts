import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { supabaseStorage } from "./supabase";

export type EventType = "study" | "test" | "review" | "break";

export interface CalendarEvent {
  id: string;
  date: string; // ISO yyyy-MM-dd
  title: string;
  time: string;
  duration: number; // minutes
  type: EventType;
  completed: boolean;
  notes?: string;
}

export interface TestSession {
  id: string;
  date: string;
  type: "listening" | "reading" | "writing";
  materialId?: string;
  score?: number;
  maxScore: number;
  timeSpent: number; // seconds
  answers: Record<string, string>;
  correctAnswers?: Record<string, string>;
  feedback?: string;
  completed: boolean;
  trackedEventId?: string;
}

export interface Material {
  id: string;
  title: string;
  type: "listening" | "reading" | "writing";
  content?: string;
  passageImage?: string;
  sections?: Section[];
  questions: Question[];
  answerKey: Record<string, string>;
  duration?: number; // minutes
  explanations?: Record<string, string>; // questionId → explanation
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
  questionImage?: string; // diagram / map / table
  questions: Question[];
}

export interface Section {
  id: string;
  title?: string;
  content?: string;
  passageImage?: string;
  youtubeUrl?: string;
  youtubeStart?: number; // seconds
  youtubeEnd?: number;   // seconds
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

interface Store {
  // Calendar
  events: CalendarEvent[];
  addEvent: (e: CalendarEvent) => void;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  // Tests
  sessions: TestSession[];
  addSession: (s: TestSession) => void;
  updateSession: (id: string, patch: Partial<TestSession>) => void;
  deleteSession: (id: string) => void;

  // Materials
  materials: Material[];
  addMaterial: (m: Material) => void;
  deleteMaterial: (id: string) => void;
  updateMaterial: (id: string, patch: Partial<Material>) => void;

  // Vocabulary
  vocab: VocabWord[];
  addVocab: (v: VocabWord) => void;
  deleteVocab: (id: string) => void;
  updateVocab: (id: string, patch: Partial<VocabWord>) => void;

  // Active test state (non-persisted)
  activeTest: { materialId: string; sessionId: string } | null;
  setActiveTest: (t: { materialId: string; sessionId: string } | null) => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (e) => set((s) => ({ events: [...s.events, e] })),
      updateEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      sessions: [],
      addSession: (sess) => set((s) => ({ sessions: [...s.sessions, sess] })),
      updateSession: (id, patch) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, ...patch } : sess
          ),
        })),
      deleteSession: (id) =>
        set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== id) })),

      materials: [],
      addMaterial: (m) => set((s) => ({ materials: [...s.materials, m] })),
      deleteMaterial: (id) =>
        set((s) => ({ materials: s.materials.filter((m) => m.id !== id) })),
      updateMaterial: (id, patch) =>
        set((s) => ({ materials: s.materials.map((m) => m.id === id ? { ...m, ...patch } : m) })),

      vocab: [],
      addVocab: (v) => set((s) => ({ vocab: [...s.vocab, v] })),
      deleteVocab: (id) => set((s) => ({ vocab: s.vocab.filter((v) => v.id !== id) })),
      updateVocab: (id, patch) =>
        set((s) => ({ vocab: s.vocab.map((v) => v.id === id ? { ...v, ...patch } : v) })),

      activeTest: null,
      setActiveTest: (t) => set({ activeTest: t }),
    }),
    {
      name: "ielts-store",
      storage: createJSONStorage(() => supabaseStorage),
      partialize: (s) => ({
        events: s.events,
        sessions: s.sessions,
        materials: s.materials,
        vocab: s.vocab,
      }),
    }
  )
);
