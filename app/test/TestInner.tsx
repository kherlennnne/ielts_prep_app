"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStore, Question } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { generateId, formatTime, getBandScore } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  FileText,
  Headphones,
  PenLine,
} from "lucide-react";

const TEST_TIMES = { reading: 3600, listening: 1800, writing: 3600 };
const TYPE_ICONS = { listening: Headphones, reading: FileText, writing: PenLine };
const TYPE_COLORS = {
  listening: "bg-purple-50 text-purple-600 border-purple-100",
  reading: "bg-blue-50 text-blue-600 border-blue-100",
  writing: "bg-green-50 text-green-600 border-green-100",
};

export default function TestInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const materialId = searchParams.get("material");
  const { materials, sessions, addSession, updateSession, addEvent, updateEvent } = useStore();

  const material = materials.find(m => m.id === materialId);

  const [phase, setPhase] = useState<"select" | "intro" | "active" | "done">("select");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [showPassage, setShowPassage] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function startTest() {
    if (!material) return;
    const id = generateId();
    const totalTime = TEST_TIMES[material.type];
    setTimeLeft(totalTime);
    setSessionId(id);
    addSession({
      id, date: new Date().toISOString().slice(0, 10),
      materialId: material.id,
      type: material.type, maxScore: material.questions.length,
      timeSpent: 0, answers: {}, completed: false,
    });
    setPhase("active");
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { stopTimer(); submitTest(id, totalTime); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  function submitTest(sid: string, totalTime: number) {
    stopTimer();
    setPhase("done");
    const sess = sessions.find(s => s.id === sid) ?? { answers: {} };
    const finalAnswers = { ...sess.answers, ...answers };
    if (!material) return;

    let correct = 0;
    material.questions.forEach(q => {
      const given = (finalAnswers[q.id] ?? "").toLowerCase().trim();
      const expected = (material.answerKey[q.id] ?? "").toLowerCase().trim();
      if (given === expected) correct++;
    });

    const score = correct;
    const timeSpent = totalTime - timeLeft;
    const durationMinutes = Math.max(1, Math.ceil(timeSpent / 60));
    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10);
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const band = material.type !== "writing" ? getBandScore(correct, material.questions.length, material.type as "listening" | "reading") : undefined;

    const existingSession = sessions.find(s => s.id === sid);
    let trackedEventId = existingSession?.trackedEventId;

    if (trackedEventId) {
      updateEvent(trackedEventId, {
        date: currentDate,
        time: currentTime,
        duration: durationMinutes,
        type: "test",
        completed: true,
        title: `${material.title} (${material.type})`,
        notes: `Auto-tracked from completed test (${formatTime(timeSpent)}).`,
      });
    } else {
      trackedEventId = generateId();
      addEvent({
        id: trackedEventId,
        date: currentDate,
        title: `${material.title} (${material.type})`,
        time: currentTime,
        duration: durationMinutes,
        type: "test",
        completed: true,
        notes: `Auto-tracked from completed test (${formatTime(timeSpent)}).`,
      });
    }

    updateSession(sid, {
      answers: finalAnswers, completed: true,
      score, timeSpent, correctAnswers: material.answerKey,
      feedback: generateFeedback(band, material.type, correct, material.questions.length),
      trackedEventId,
    });
    setAnswers(finalAnswers);
  }

  function generateFeedback(band: number | undefined, type: string, correct: number, total: number) {
    if (type === "writing") return "Writing submitted. Have your teacher review this against IELTS band descriptors.";
    const b = band ?? 0;
    if (b >= 8) return `Excellent! Band ${b} — Outstanding performance. Focus on maintaining consistency.`;
    if (b >= 7) return `Great! Band ${b} — Strong performance with minor gaps. Review incorrect answers carefully.`;
    if (b >= 6) return `Good. Band ${b} — Competent user. Work on speed and vocabulary range.`;
    if (b >= 5) return `Band ${b} — Modest user. Consistent practice needed. Focus on skimming/scanning skills.`;
    return `Band ${b} — Keep practicing! Focus on understanding question types and building vocabulary. You got ${correct}/${total} correct.`;
  }

  useEffect(() => () => stopTimer(), [stopTimer]);

  if (!material) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Test Center" subtitle="Choose a material to begin" />
        <div className="px-4 lg:px-8">
          {materials.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <FlaskConical size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-500 mb-1">No materials yet</p>
              <p className="text-sm text-gray-400 mb-4">Add practice materials first</p>
              <Button onClick={() => router.push("/materials")}>Go to Materials</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((m) => {
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
                    <Button size="sm" onClick={() => router.push(`/test?material=${m.id}`)}>
                      Start <ChevronRight size={13} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="min-h-screen">
        <PageHeader title={material.title} />
        <div className="px-4 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-lightest flex items-center justify-center">
                <Clock size={22} className="text-accent-darker" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 capitalize">{material.type} Test</p>
                <p className="text-sm text-gray-500">{material.questions.length} questions · {Math.round(TEST_TIMES[material.type] / 60)} minutes</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• The timer starts immediately when you begin</p>
              <p>• You can navigate between questions freely</p>
              <p>• The test auto-submits when time runs out</p>
              {material.type === "reading" && <p>• The passage is shown alongside questions</p>}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setPhase("select")}>Back</Button>
            <Button className="flex-1" size="lg" onClick={startTest}>Begin Test</Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "active") {
    const q = material.questions[currentQ];
    const isWarning = timeLeft < 300;
    const totalQ = material.questions.length;
    const answered = Object.keys(answers).filter(k => answers[k]).length;

    return (
      <div className="min-h-screen flex flex-col">
        {/* Timer header */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Q{currentQ + 1}/{totalQ}</span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-500">{answered} answered</span>
          </div>
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-sm font-semibold",
            isWarning ? "bg-red-50 text-red-600 timer-pulse" : "bg-accent-lightest text-accent-darker")}>
            {isWarning && <AlertTriangle size={13} />}
            <Clock size={13} />
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Passage (reading/listening) */}
          {material.content && (material.type === "reading" || material.type === "listening") && (
            <div className={cn("lg:w-1/2 lg:border-r border-gray-100", showPassage ? "block" : "hidden lg:block")}>
              <div className="p-4 lg:p-6 lg:h-[calc(100vh-120px)] overflow-y-auto">
                <div className="flex items-center justify-between mb-3 lg:hidden">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Passage</h3>
                  <button onClick={() => setShowPassage(false)} className="text-xs text-accent-darker font-medium">Show Questions</button>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed text-[14px] whitespace-pre-wrap">{material.content}</div>
              </div>
            </div>
          )}

          {/* Questions */}
          <div className={cn("flex-1", material.content && !showPassage ? "block" : "", material.content && showPassage ? "hidden lg:flex lg:flex-col" : "flex flex-col")}>
            <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
              {material.content && (
                <button onClick={() => setShowPassage(true)} className="lg:hidden text-xs text-accent-darker font-medium mb-4 block">
                  ← Show Passage
                </button>
              )}
              {q && <QuestionCard question={q} answer={answers[q.id] ?? ""} onAnswer={v => setAnswers(a => ({ ...a, [q.id]: v }))} type={material.type} />}
            </div>

            {/* Question nav */}
            <div className="border-t border-gray-100 p-4 bg-white">
              <div className="flex flex-wrap gap-1.5 mb-4 max-h-20 overflow-y-auto">
                {material.questions.map((qq, i) => (
                  <button key={qq.id} onClick={() => { setCurrentQ(i); if (material.content) setShowPassage(false); }}
                    className={cn("w-8 h-8 rounded-lg text-xs font-medium transition-all",
                      i === currentQ ? "bg-accent text-white" :
                      answers[qq.id] ? "bg-accent-lightest text-accent-darker border border-accent/30" :
                      "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setCurrentQ(Math.max(0, currentQ - 1)); if (material.content) setShowPassage(false); }}
                  disabled={currentQ === 0} className="p-2.5 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>
                <button onClick={() => { setCurrentQ(Math.min(totalQ - 1, currentQ + 1)); if (material.content) setShowPassage(false); }}
                  disabled={currentQ === totalQ - 1} className="p-2.5 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <ChevronRight size={18} className="text-gray-600" />
                </button>
                <Button variant="danger" className="flex-1" onClick={() => submitTest(sessionId, TEST_TIMES[material.type])}>
                  Submit Test
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const session = sessions.find(s => s.id === sessionId);
    const correct = session?.score ?? 0;
    const total = material.questions.length;
    const band = material.type !== "writing" ? getBandScore(correct, total, material.type as "listening" | "reading") : null;

    return (
      <div className="min-h-screen">
        <PageHeader title="Test Complete" />
        <div className="px-4 lg:px-8 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            {band && (
              <div>
                <p className="text-5xl font-bold text-accent-darker mb-1">{band}</p>
                <p className="text-sm text-gray-500">Estimated Band Score</p>
              </div>
            )}
            <p className="text-gray-700 font-medium mt-3">{correct}/{total} correct</p>
            <p className="text-sm text-gray-500 mt-1">{session?.timeSpent ? formatTime(session.timeSpent) : "–"} time spent</p>
          </div>

          {session?.feedback && (
            <div className="bg-accent-lightest rounded-2xl border border-accent/20 p-4">
              <p className="text-xs font-semibold text-accent-darker uppercase tracking-wider mb-1.5">Feedback</p>
              <p className="text-sm text-gray-700">{session.feedback}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => router.push("/review")}>Review Answers</Button>
            <Button className="flex-1" onClick={() => { setPhase("intro"); setAnswers({}); setCurrentQ(0); }}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  // select phase fallback
  return (
    <div className="min-h-screen">
      <PageHeader title={material.title} />
      <div className="px-4 lg:px-8">
        <Button onClick={() => setPhase("intro")} size="lg" className="w-full">Start Test</Button>
      </div>
    </div>
  );
}

function QuestionCard({ question, answer, onAnswer, type }: { question: Question; answer: string; onAnswer: (v: string) => void; type: string }) {
  if (type === "writing") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-accent-lightest text-accent-darker text-xs font-semibold px-2.5 py-1 rounded-full">Q{question.number}</span>
        </div>
        <p className="text-gray-800 font-medium mb-4 leading-relaxed">{question.text}</p>
        <textarea value={answer} onChange={e => onAnswer(e.target.value)}
          rows={12} placeholder="Write your response here..."
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none leading-relaxed" />
        <p className="text-xs text-gray-400 mt-1 text-right">{answer.split(/\s+/).filter(Boolean).length} words</p>
      </div>
    );
  }

  if (question.type === "mcq" && question.options) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-accent-lightest text-accent-darker text-xs font-semibold px-2.5 py-1 rounded-full">Q{question.number}</span>
        </div>
        <p className="text-gray-800 font-medium mb-4 leading-relaxed">{question.text}</p>
        <div className="space-y-2">
          {question.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const selected = answer === letter;
            return (
              <button key={i} onClick={() => onAnswer(letter)}
                className={cn("w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                  selected ? "bg-accent-lightest border-accent text-accent-darker font-medium" : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50")}>
                <span className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                  selected ? "border-accent bg-accent text-white" : "border-gray-300 text-gray-400")}>
                  {letter}
                </span>
                <span className="text-sm leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === "truefalse") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-accent-lightest text-accent-darker text-xs font-semibold px-2.5 py-1 rounded-full">Q{question.number}</span>
        </div>
        <p className="text-gray-800 font-medium mb-4 leading-relaxed">{question.text}</p>
        <div className="grid grid-cols-3 gap-2">
          {["TRUE", "FALSE", "NOT GIVEN"].map(v => (
            <button key={v} onClick={() => onAnswer(v)}
              className={cn("py-3 rounded-xl border text-xs font-semibold transition-all",
                answer === v ? "bg-accent border-accent text-white" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300")}>
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Short answer / fill in blank
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-accent-lightest text-accent-darker text-xs font-semibold px-2.5 py-1 rounded-full">Q{question.number}</span>
        <span className="text-xs text-gray-400 capitalize">{question.type === "fillblank" ? "Fill in the blank" : "Short answer"}</span>
      </div>
      <p className="text-gray-800 font-medium mb-4 leading-relaxed">{question.text}</p>
      <input value={answer} onChange={e => onAnswer(e.target.value)}
        placeholder="Your answer..."
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
    </div>
  );
}
