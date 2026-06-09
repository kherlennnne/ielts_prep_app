import { ACTIVE_TIME_MAX_DELTA_SECONDS } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const USER_SESSIONS_TABLE = "user_sessions";

type LogoutReason = "manual" | "inactivity" | "timeout";

interface CreateUserSessionInput {
  sessionId: string;
  username: string;
  rememberMe: boolean;
  userAgent?: string | null;
  nowMs?: number;
}

interface RecordActivityInput {
  sessionId?: string;
  username?: string;
  lastActiveMs?: number;
  nowMs?: number;
  endReason?: LogoutReason;
}

function getActiveDeltaSeconds(lastActiveMs: number | undefined, nowMs: number) {
  if (!lastActiveMs || !Number.isFinite(lastActiveMs)) return 0;

  const rawDeltaSeconds = Math.floor((nowMs - lastActiveMs) / 1000);
  if (rawDeltaSeconds <= 0) return 0;

  return Math.min(rawDeltaSeconds, ACTIVE_TIME_MAX_DELTA_SECONDS);
}

function logTrackingError(operation: string, error: { message: string } | null) {
  if (error) console.error(`[DB] ${operation}:`, error.message);
}

export async function createUserSession({
  sessionId,
  username,
  rememberMe,
  userAgent,
  nowMs = Date.now(),
}: CreateUserSessionInput) {
  const now = new Date(nowMs).toISOString();

  const { error } = await supabase.from(USER_SESSIONS_TABLE).insert({
    id: sessionId,
    username,
    created_datetime: now,
    last_active_datetime: now,
    active_seconds: 0,
    remember_me: rememberMe,
    user_agent: userAgent ?? null,
  });

  logTrackingError("create user session", error);
}

export async function recordUserSessionActivity({
  sessionId,
  username,
  lastActiveMs,
  nowMs = Date.now(),
  endReason,
}: RecordActivityInput) {
  if (!sessionId || !username) return;

  const now = new Date(nowMs).toISOString();
  const activeDeltaSeconds = getActiveDeltaSeconds(lastActiveMs, nowMs);

  const { data, error: readError } = await supabase
    .from(USER_SESSIONS_TABLE)
    .select("active_seconds")
    .eq("id", sessionId)
    .maybeSingle();

  if (readError) {
    logTrackingError("read user session", readError);
    return;
  }

  const currentActiveSeconds =
    typeof data?.active_seconds === "number" ? data.active_seconds : 0;

  const row = {
    id: sessionId,
    username,
    last_active_datetime: now,
    active_seconds: currentActiveSeconds + activeDeltaSeconds,
    ...(data ? {} : { created_datetime: now, remember_me: false }),
    ...(endReason ? { ended_datetime: now, logout_reason: endReason } : {}),
  };

  const { error } = await supabase
    .from(USER_SESSIONS_TABLE)
    .upsert(row, { onConflict: "id" });

  logTrackingError("record user session activity", error);
}
