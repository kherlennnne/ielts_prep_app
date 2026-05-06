import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function parseTimestamp(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(ts) || 0;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function expandOptionalParens(text: string): string[] {
  const match = text.match(/\(([^)]+)\)/);
  if (!match) return [text];
  const before = text.slice(0, match.index!);
  const inside = match[1];
  const after = text.slice(match.index! + match[0].length);
  const withGroup = expandOptionalParens((before + inside + after).replace(/\s+/g, " "));
  const withoutGroup = expandOptionalParens((before + after).replace(/\s+/g, " ").trim());
  return Array.from(new Set([...withGroup, ...withoutGroup]));
}

export function checkAnswer(given: string, expected: string): boolean {
  const g = given.toLowerCase().trim().replace(/\s+/g, " ");
  const slashAlts = expected.toLowerCase().split("/").map(s => s.trim());
  for (const alt of slashAlts) {
    for (const v of expandOptionalParens(alt)) {
      if (v.trim().replace(/\s+/g, " ") === g) return true;
    }
  }
  return false;
}

export function getBandScore(correct: number, total: number, type: "listening" | "reading") {
  const pct = (correct / total) * 100;
  if (type === "listening") {
    if (pct >= 97) return 9.0;
    if (pct >= 93) return 8.5;
    if (pct >= 87) return 8.0;
    if (pct >= 80) return 7.5;
    if (pct >= 72) return 7.0;
    if (pct >= 60) return 6.5;
    if (pct >= 50) return 6.0;
    if (pct >= 40) return 5.5;
    if (pct >= 33) return 5.0;
    return 4.0;
  }
  if (pct >= 95) return 9.0;
  if (pct >= 87) return 8.5;
  if (pct >= 80) return 8.0;
  if (pct >= 72) return 7.5;
  if (pct >= 65) return 7.0;
  if (pct >= 57) return 6.5;
  if (pct >= 50) return 6.0;
  if (pct >= 40) return 5.5;
  if (pct >= 33) return 5.0;
  return 4.0;
}

export const EVENT_COLORS: Record<string, string> = {
  study: "bg-blue-100 text-blue-800 border-blue-200",
  test: "bg-red-100 text-red-800 border-red-200",
  review: "bg-amber-100 text-amber-800 border-amber-200",
  break: "bg-green-100 text-green-800 border-green-200",
};

export const EVENT_DOT: Record<string, string> = {
  study: "bg-blue-400",
  test: "bg-red-400",
  review: "bg-amber-400",
  break: "bg-green-400",
};
