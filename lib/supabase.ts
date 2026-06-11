import { createClient } from "@supabase/supabase-js";
import type { Material, TestSession, CalendarEvent, VocabWord, Tip } from "./store";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Mappers: store model ↔ DB row ─────────────────────────────────────────────

function materialToDb(m: Material) {
  return {
    id: m.id,
    title: m.title,
    group_name: m.groupName ?? null,
    type: m.type,
    test_mode: m.testMode ?? "mock",
    content: m.content ?? null,
    passage_image: m.passageImage ?? null,
    sections: m.sections ?? [],
    questions: m.questions ?? [],
    answer_key: m.answerKey ?? {},
    explanations: m.explanations ?? null,
    answer_locations: m.answerLocations ?? null,
    duration: m.duration ?? 60,
    created_at: m.createdAt,
  };
}

function dbToMaterial(row: Record<string, unknown>): Material {
  return {
    id: row.id as string,
    title: row.title as string,
    groupName: row.group_name as string | undefined,
    type: row.type as Material["type"],
    testMode: (row.test_mode as Material["testMode"]) ?? "mock",
    content: row.content as string | undefined,
    passageImage: row.passage_image as string | undefined,
    sections: (row.sections as Material["sections"]) ?? [],
    questions: (row.questions as Material["questions"]) ?? [],
    answerKey: (row.answer_key as Record<string, string>) ?? {},
    explanations: row.explanations as Record<string, string> | undefined,
    answerLocations: row.answer_locations as Material["answerLocations"] | undefined,
    duration: row.duration as number | undefined,
    createdAt: row.created_at as string,
  };
}

function sessionToDb(s: TestSession) {
  return {
    id: s.id,
    date: s.date,
    type: s.type,
    username: s.username ?? null,
    material_id: s.materialId ?? null,
    score: s.score ?? null,
    max_score: s.maxScore,
    time_spent: s.timeSpent,
    answers: s.answers ?? {},
    correct_answers: s.correctAnswers ?? null,
    feedback: s.feedback ?? null,
    completed: s.completed,
    tracked_event_id: s.trackedEventId ?? null,
  };
}

function dbToSession(row: Record<string, unknown>): TestSession {
  return {
    id: row.id as string,
    date: row.date as string,
    type: row.type as TestSession["type"],
    username: row.username as string | undefined,
    materialId: row.material_id as string | undefined,
    score: row.score as number | undefined,
    maxScore: row.max_score as number,
    timeSpent: row.time_spent as number,
    answers: (row.answers as Record<string, string>) ?? {},
    correctAnswers: row.correct_answers as Record<string, string> | undefined,
    feedback: row.feedback as string | undefined,
    completed: row.completed as boolean,
    trackedEventId: row.tracked_event_id as string | undefined,
  };
}

function eventToDb(e: CalendarEvent) {
  return {
    id: e.id,
    date: e.date,
    title: e.title,
    time: e.time,
    duration: e.duration,
    type: e.type,
    completed: e.completed,
    notes: e.notes ?? null,
    important: e.important ?? null,
  };
}

function dbToEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    date: row.date as string,
    title: row.title as string,
    time: row.time as string,
    duration: row.duration as number,
    type: row.type as CalendarEvent["type"],
    completed: row.completed as boolean,
    notes: row.notes as string | undefined,
    important: row.important as boolean | undefined,
  };
}

function vocabToDb(v: VocabWord) {
  return {
    id: v.id,
    word: v.word,
    context: v.context,
    material_id: v.materialId ?? null,
    note: v.note ?? null,
    saved_at: v.savedAt,
  };
}

function dbToVocab(row: Record<string, unknown>): VocabWord {
  return {
    id: row.id as string,
    word: row.word as string,
    context: row.context as string,
    materialId: row.material_id as string | undefined,
    note: row.note as string | undefined,
    savedAt: row.saved_at as string,
  };
}

function tipToDb(t: Tip) {
  return {
    id: t.id,
    category: t.category,
    title: t.title,
    content: t.content,
    order: t.order ?? 0,
    created_at: t.createdAt,
  };
}

function dbToTip(row: Record<string, unknown>): Tip {
  return {
    id: row.id as string,
    category: row.category as Tip["category"],
    title: row.title as string,
    content: row.content as string,
    order: (row.order as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

// ── Hydrate: fetch all data on app load ───────────────────────────────────────

export async function hydrateFromDb() {
  const [mats, sess, evts, voc, tps] = await Promise.all([
    supabase.from("materials").select("*"),
    supabase.from("sessions").select("*"),
    supabase.from("events").select("*"),
    supabase.from("vocab").select("*"),
    supabase.from("tips").select("*"),
  ]);

  for (const [name, res] of [["materials", mats], ["sessions", sess], ["events", evts], ["vocab", voc], ["tips", tps]] as const) {
    if (res.error) console.error(`[DB] hydrate ${name} error:`, res.error.message, res.error);
  }

  return {
    materials: (mats.data ?? []).map(dbToMaterial),
    sessions: (sess.data ?? []).map(dbToSession),
    events: (evts.data ?? []).map(dbToEvent),
    vocab: (voc.data ?? []).map(dbToVocab),
    tips: (tps.data ?? []).map(dbToTip),
  };
}

// ── Per-entity DB ops ─────────────────────────────────────────────────────────

function log(op: string, error: { message: string } | null) {
  if (error) console.error(`[DB] ${op}:`, error.message);
}

export const db = {
  materials: {
    upsert: (m: Material) =>
      supabase.from("materials").upsert(materialToDb(m), { onConflict: "id" })
        .then(({ error }) => log("upsert material", error)),
    delete: (id: string) =>
      supabase.from("materials").delete().eq("id", id)
        .then(({ error }) => log("delete material", error)),
  },
  sessions: {
    upsert: (s: TestSession) =>
      supabase.from("sessions").upsert(sessionToDb(s), { onConflict: "id" })
        .then(({ error }) => log("upsert session", error)),
    delete: (id: string) =>
      supabase.from("sessions").delete().eq("id", id)
        .then(({ error }) => log("delete session", error)),
  },
  events: {
    upsert: (e: CalendarEvent) =>
      supabase.from("events").upsert(eventToDb(e), { onConflict: "id" })
        .then(({ error }) => log("upsert event", error)),
    delete: (id: string) =>
      supabase.from("events").delete().eq("id", id)
        .then(({ error }) => log("delete event", error)),
  },
  vocab: {
    upsert: (v: VocabWord) =>
      supabase.from("vocab").upsert(vocabToDb(v), { onConflict: "id" })
        .then(({ error }) => log("upsert vocab", error)),
    delete: (id: string) =>
      supabase.from("vocab").delete().eq("id", id)
        .then(({ error }) => log("delete vocab", error)),
  },
  tips: {
    upsert: (t: Tip) =>
      supabase.from("tips").upsert(tipToDb(t), { onConflict: "id" })
        .then(({ error }) => log("upsert tip", error)),
    delete: (id: string) =>
      supabase.from("tips").delete().eq("id", id)
        .then(({ error }) => log("delete tip", error)),
  },
};
