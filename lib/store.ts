import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  score?: number;
  maxScore: number;
  timeSpent: number; // seconds
  answers: Record<string, string>;
  correctAnswers?: Record<string, string>;
  feedback?: string;
  completed: boolean;
}

export interface Material {
  id: string;
  title: string;
  type: "listening" | "reading" | "writing";
  content: string;
  questions: Question[];
  answerKey: Record<string, string>;
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

  // Materials
  materials: Material[];
  addMaterial: (m: Material) => void;
  deleteMaterial: (id: string) => void;

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

      materials: [],
      addMaterial: (m) => set((s) => ({ materials: [...s.materials, m] })),
      deleteMaterial: (id) =>
        set((s) => ({ materials: s.materials.filter((m) => m.id !== id) })),

      activeTest: null,
      setActiveTest: (t) => set({ activeTest: t }),
    }),
    {
      name: "ielts-store",
      partialize: (s) => ({
        events: s.events,
        sessions: s.sessions,
        materials: s.materials,
      }),
    }
  )
);
