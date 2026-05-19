"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStore, Question } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { PassageAnnotator, TextAnnotation, AnnotationColor, AnnotationToolbar } from "@/components/ui/PassageAnnotator";
import { HighlightablePassage } from "@/components/ui/HighlightablePassage";
import { generateId, formatTime, getBandScore, checkAnswer, getYouTubeId } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle2, FlaskConical,
  FileText, Headphones, PenLine,
} from "lucide-react";
import { TestReview } from "@/components/ui/TestReview";
import { useUser } from "@/lib/useUser";

const DEFAULT_TIMES = { reading: 60, listening: 30, writing: 60 }; // minutes
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
  const {
    materials, sessions, addSession, updateSession, addEvent, updateEvent, updateMaterial,
  } = useStore();
  const { isCutie } = useUser();

  const mockMaterials = materials.filter(m => (m.testMode ?? "mock") === "mock");
  const material = materials.find(m => m.id === materialId);

  const [phase, setPhase] = useState<"select" | "intro" | "active" | "done">("select");
  const [reviewSession, setReviewSession] = useState<{ materialId: string; answers: Record<string, string>; date: string } | null>(null);
  const [showReviewPassage, setShowReviewPassage] = useState(true);
  const [reviewSectionIdx, setReviewSectionIdx] = useState(0);
  const [activeReviewQId, setActiveReviewQId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [showPassage, setShowPassage] = useState(true);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [annToolbar, setAnnToolbar] = useState<AnnotationToolbar | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function handleAnnotate(start: number, end: number, type: TextAnnotation["type"], color?: AnnotationColor, sid?: string) {
    setAnnotations(prev => {
      const kept = prev.filter(a => !(a.sectionId === sid && a.start < end && a.end > start));
      return [...kept, { id: generateId(), start, end, type, color, sectionId: sid ?? "" }];
    });
    setAnnToolbar(null);
  }

  function handleClearAnnotation(start: number, end: number, sid: string) {
    setAnnotations(prev => prev.filter(a => !(a.sectionId === sid && a.start < end && a.end > start)));
    setAnnToolbar(null);
  }

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function startTest() {
    if (!material) return;
    const id = generateId();
    const totalTime = (material.duration ?? DEFAULT_TIMES[material.type]) * 60;
    setTimeLeft(totalTime);
    setSessionId(id);
    addSession({
      id, date: new Date().toISOString().slice(0, 10),
      materialId: material.id, type: material.type,
      maxScore: material.questions.length, timeSpent: 0, answers: {}, completed: false,
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
      const given = finalAnswers[q.id] ?? "";
      const expected = material.answerKey[q.id] ?? "";
      if (checkAnswer(given, expected)) correct++;
    });

    const score = correct;
    const timeSpent = totalTime - timeLeft;
    const durationMinutes = Math.max(1, Math.ceil(timeSpent / 60));
    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10);
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const band = material.type !== "writing"
      ? getBandScore(correct, material.questions.length, material.type as "listening" | "reading")
      : undefined;

    const existingSession = sessions.find(s => s.id === sid);
    let trackedEventId = existingSession?.trackedEventId;

    if (trackedEventId) {
      updateEvent(trackedEventId, {
        date: currentDate, time: currentTime, duration: durationMinutes,
        type: "test", completed: true, title: `${material.title} (${material.type})`,
        notes: `Auto-tracked from completed test (${formatTime(timeSpent)}).`,
      });
    } else {
      trackedEventId = generateId();
      addEvent({
        id: trackedEventId, date: currentDate, title: `${material.title} (${material.type})`,
        time: currentTime, duration: durationMinutes, type: "test", completed: true,
        notes: `Auto-tracked from completed test (${formatTime(timeSpent)}).`,
      });
    }

    updateSession(sid, {
      answers: finalAnswers, completed: true, score, timeSpent,
      correctAnswers: material.answerKey,
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

  // ─── Review past session ─────────────────────────────────────────────────────
  if (reviewSession) {
    const reviewMat = materials.find(m => m.id === reviewSession.materialId);
    const hasPassage = reviewMat?.type !== "writing";
    const reviewSections = reviewMat?.sections ?? [];
    const activeSection = reviewSections[reviewSectionIdx] ?? null;
    const activeSectionId = activeSection?.id ?? "default";
    const passageContent = activeSection?.content ?? reviewMat?.content;
    const passageImg = activeSection?.passageImage ?? reviewMat?.passageImage;
    const passageTitle = activeSection?.title;
    const youtubeId = activeSection?.youtubeUrl ? getYouTubeId(activeSection.youtubeUrl) : null;
    const youtubeStart = activeSection?.youtubeStart ?? 0;
    const youtubeEnd = activeSection?.youtubeEnd;

    const activeLocation = activeReviewQId ? reviewMat?.answerLocations?.[activeReviewQId] : null;
    const highlight = activeLocation?.sectionId === activeSectionId ? activeLocation : null;

    const activeQNum = activeReviewQId
      ? reviewMat?.questions.find(q => q.id === activeReviewQId)?.number ?? null
      : null;

    const handleMarkRange = (start: number, end: number) => {
      if (!reviewMat || !activeReviewQId) return;
      updateMaterial(reviewMat.id, {
        answerLocations: {
          ...(reviewMat.answerLocations ?? {}),
          [activeReviewQId]: { sectionId: activeSectionId, start, end },
        },
      });
    };

    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => { setReviewSession(null); setShowReviewPassage(true); setReviewSectionIdx(0); setActiveReviewQId(null); }}
            className="text-sm text-accent-darker font-medium hover:opacity-70 transition-opacity flex-shrink-0"
          >
            ← Back
          </button>
          <span className="text-xs font-semibold text-gray-700 truncate">{reviewMat?.title ?? "Review"}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{reviewSession.date}</span>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Passage panel */}
          {hasPassage && (
            <div className={cn("lg:w-1/2 lg:border-r border-gray-100 flex flex-col", showReviewPassage ? "flex" : "hidden lg:flex")}>
              {reviewSections.length > 1 && (
                <div className="flex overflow-x-auto px-4 py-2 gap-2 border-b border-gray-100 bg-white flex-shrink-0">
                  {reviewSections.map((sec, i) => (
                    <button key={sec.id} onClick={() => setReviewSectionIdx(i)}
                      className={cn("px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                        i === reviewSectionIdx ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-100")}>
                      {sec.title || `Part ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Passage</span>
                <button onClick={() => setShowReviewPassage(false)} className="lg:hidden text-xs text-accent-darker font-medium">
                  Review →
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                {passageTitle && <h3 className="font-serif text-lg text-gray-900 mb-4 leading-snug">{passageTitle}</h3>}
                {youtubeId && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-gray-100 aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}?start=${youtubeStart}${youtubeEnd ? `&end=${youtubeEnd}` : ""}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {passageImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={passageImg} alt="Passage" className="w-full rounded-xl border border-gray-100" />
                ) : passageContent ? (
                  <HighlightablePassage
                    text={passageContent}
                    sectionId={activeSectionId}
                    highlight={highlight}
                    isCutie={isCutie}
                    activeQuestionNumber={activeQNum}
                    onMarkRange={handleMarkRange}
                  />
                ) : !youtubeId ? (
                  <div className="text-center py-14 text-gray-400 text-sm">No passage for this section</div>
                ) : null}
              </div>
            </div>
          )}

          {/* Review panel */}
          <div className={cn("flex-1 flex flex-col overflow-hidden", hasPassage && showReviewPassage ? "hidden lg:flex" : "flex")}>
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              {hasPassage && (
                <button onClick={() => { setShowReviewPassage(true); }} className="lg:hidden text-xs text-accent-darker font-medium mb-4 block">
                  ← Passage
                </button>
              )}
              <TestReview
                materialId={reviewSession.materialId}
                answers={reviewSession.answers}
                activeQuestionId={activeReviewQId}
                onQuestionSelect={qId => { setActiveReviewQId(qId); if (hasPassage) setShowReviewPassage(true); }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── No material selected ────────────────────────────────────────────────────
  if (!material) {
    return (
      <div className="px-4 lg:px-8">
        {mockMaterials.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <FlaskConical size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-500 mb-1">No mock test materials yet</p>
            <p className="text-sm text-gray-400 mb-4">Add a material and set it to Mock Test</p>
            <Button onClick={() => router.push("/materials")}>Go to Materials</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {mockMaterials.map((m) => {
              const Icon = TYPE_ICONS[m.type];
              const lastSession = sessions
                .filter(s => s.completed && s.materialId === m.id)
                .sort((a, b) => b.date.localeCompare(a.date))[0];
              return (
                <div key={m.id} className={cn(
                  "rounded-2xl border shadow-sm p-4 flex items-center gap-3",
                  lastSession
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-gray-100"
                )}>
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0", TYPE_COLORS[m.type])}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{m.title}</p>
                      {lastSession && (
                        <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Done
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 capitalize">{m.type} · {m.questions.length} questions</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {lastSession && (
                      <button
                        onClick={() => setReviewSession({ materialId: m.id, answers: lastSession.answers, date: lastSession.date })}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 transition-colors"
                      >
                        Review
                      </button>
                    )}
                    <Button size="sm" onClick={() => router.push(`/test?tab=mock&material=${m.id}`)}>
                      Start <ChevronRight size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Intro ───────────────────────────────────────────────────────────────────
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
                <p className="text-sm text-gray-500">{material.questions.length} questions · {material.duration ?? DEFAULT_TIMES[material.type]} minutes</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Timer starts immediately when you begin</p>
              <p>• Navigate between questions freely</p>
              <p>• Test auto-submits when time runs out</p>
              {material.type !== "writing" && <p>• Highlight words in the passage to save vocabulary</p>}
              {material.type !== "writing" && <p>• Upload an image if your passage is a scan</p>}
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

  // ─── Active ──────────────────────────────────────────────────────────────────
  if (phase === "active") {
    const isWarning = timeLeft < 300;
    const totalQ = material.questions.length;
    const answered = Object.keys(answers).filter(k => answers[k]).length;
    const hasPassage = material.type !== "writing";

    // Build a flat list of all groups across all sections
    type GroupEntry = { section: NonNullable<typeof material.sections>[0] | null; group: NonNullable<typeof material.sections>[0]["groups"][0] };
    const allGroups: GroupEntry[] = [];
    if (material.sections?.length) {
      for (const sec of material.sections) {
        for (const grp of sec.groups) {
          allGroups.push({ section: sec, group: grp });
        }
      }
    }
    if (!allGroups.length) {
      allGroups.push({ section: null, group: { id: "default", questions: material.questions } });
    }

    // currentQ is reused as the group index
    const groupIdx = Math.min(currentQ, allGroups.length - 1);
    const { section: currentSection, group: currentGroup } = allGroups[groupIdx];
    const totalGroups = allGroups.length;

    const passageContent = currentSection?.content ?? material.content;
    const passageImg = currentSection?.passageImage ?? material.passageImage;
    const passageTitle = currentSection?.title;
    const youtubeId = currentSection?.youtubeUrl ? getYouTubeId(currentSection.youtubeUrl) : null;
    const youtubeStart = currentSection?.youtubeStart ?? 0;
    const youtubeEnd = currentSection?.youtubeEnd;

    const firstQ = currentGroup.questions[0];
    const lastQ = currentGroup.questions[currentGroup.questions.length - 1];
    const groupLabel = firstQ && lastQ && firstQ.number !== lastQ.number
      ? `Q${firstQ.number}–Q${lastQ.number}`
      : firstQ ? `Q${firstQ.number}` : "";

    const groupIdxForQuestion = (qId: string): number => {
      const idx = allGroups.findIndex(({ group }) => group.questions.some(q => q.id === qId));
      return idx === -1 ? 0 : idx;
    };

    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {totalGroups > 1 && (
              <span className="text-xs text-gray-500 font-medium">Group {groupIdx + 1}/{totalGroups}</span>
            )}
            {groupLabel && (
              <>
                {totalGroups > 1 && <span className="text-xs text-gray-300">·</span>}
                <span className="text-xs text-gray-500 font-medium">{groupLabel}</span>
              </>
            )}
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-500">{answered}/{totalQ} answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-sm font-semibold",
              isWarning ? "bg-red-50 text-red-600 timer-pulse" : "bg-accent-lightest text-accent-darker"
            )}>
              {isWarning && <AlertTriangle size={13} />}
              <Clock size={13} />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Passage panel */}
          {hasPassage && (
            <div className={cn(
              "lg:w-1/2 lg:border-r border-gray-100 flex flex-col",
              showPassage ? "flex" : "hidden lg:flex"
            )}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Passage</span>
                <button onClick={() => setShowPassage(false)} className="lg:hidden text-xs text-accent-darker font-medium">
                  Questions →
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                {passageTitle && (
                  <h3 className="font-serif text-lg text-gray-900 mb-4 leading-snug">{passageTitle}</h3>
                )}
                {youtubeId && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-gray-100 aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}?start=${youtubeStart}${youtubeEnd ? `&end=${youtubeEnd}` : ""}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {passageImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={passageImg} alt="Passage" className="w-full rounded-xl border border-gray-100" />
                ) : passageContent ? (
                  <PassageAnnotator
                    text={passageContent}
                    sectionId={currentSection?.id ?? "default"}
                    annotations={annotations}
                    toolbar={annToolbar}
                    onToolbarOpen={setAnnToolbar}
                    onToolbarClose={() => setAnnToolbar(null)}
                    onAnnotate={handleAnnotate}
                    onClear={handleClearAnnotation}
                  />
                ) : !youtubeId ? (
                  <div className="text-center py-14 text-gray-400">
                    <p className="text-sm">No passage added to this material</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Questions panel — all questions in the current group */}
          <div className={cn(
            "flex-1 flex flex-col",
            hasPassage && showPassage ? "hidden lg:flex" : "flex"
          )}>
            <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
              {hasPassage && (
                <button
                  onClick={() => setShowPassage(true)}
                  className="lg:hidden text-xs text-accent-darker font-medium mb-4 block"
                >
                  ← Passage
                </button>
              )}
              {/* Group instruction shown once at the top */}
              {currentGroup.instruction && (
                <div className="mb-5 p-3.5 bg-accent-lightest border border-accent/20 rounded-xl">
                  <p className="text-xs text-accent-darker leading-relaxed">{currentGroup.instruction}</p>
                </div>
              )}
              {/* Optional diagram / map for this group */}
              {currentGroup.questionImage && (
                <div className="mb-5 rounded-xl overflow-hidden border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentGroup.questionImage} alt="Diagram" className="w-full" />
                </div>
              )}
              {/* All questions in this group */}
              <div className="space-y-5">
                {currentGroup.questions.map(q => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    answer={answers[q.id] ?? ""}
                    onAnswer={v => setAnswers(a => ({ ...a, [q.id]: v }))}
                    type={material.type}
                    forceText={!!currentGroup.questionImage}
                  />
                ))}
              </div>
            </div>

            {/* Nav */}
            <div className="border-t border-gray-100 p-4 bg-white flex-shrink-0">
              {/* Question dots — clicking jumps to the group containing that question */}
              <div className="flex flex-wrap gap-1.5 mb-4 max-h-20 overflow-y-auto">
                {material.questions.map(qq => {
                  const qGrpIdx = groupIdxForQuestion(qq.id);
                  const isActive = qGrpIdx === groupIdx;
                  return (
                    <button
                      key={qq.id}
                      onClick={() => { setCurrentQ(qGrpIdx); if (hasPassage) setShowPassage(false); }}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                        isActive
                          ? "bg-accent text-white"
                          : answers[qq.id]
                          ? "bg-accent-lightest text-accent-darker border border-accent/30"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {qq.number}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setCurrentQ(Math.max(0, groupIdx - 1)); if (hasPassage) setShowPassage(false); }}
                  disabled={groupIdx === 0}
                  className="p-2.5 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>
                <button
                  onClick={() => { setCurrentQ(Math.min(totalGroups - 1, groupIdx + 1)); if (hasPassage) setShowPassage(false); }}
                  disabled={groupIdx === totalGroups - 1}
                  className="p-2.5 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronRight size={18} className="text-gray-600" />
                </button>
                <Button variant="danger" className="flex-1" onClick={() => submitTest(sessionId, (material.duration ?? DEFAULT_TIMES[material.type]) * 60)}>
                  Submit Test
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  // ─── Done ────────────────────────────────────────────────────────────────────
  if (phase === "done") {
    const session = sessions.find(s => s.id === sessionId);
    const correct = session?.score ?? 0;
    const total = material.questions.length;
    const band = material.type !== "writing"
      ? getBandScore(correct, total, material.type as "listening" | "reading")
      : null;

    return (
      <div className="min-h-screen">
        <PageHeader title="Test Complete" />
        <div className="px-4 lg:px-8 space-y-4 pb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            {band && (
              <div>
                <p className="text-5xl font-bold text-accent-darker mb-1">{band}</p>
                <p className="text-sm text-gray-500">Estimated Band Score</p>
              </div>
            )}
            {material.type !== "writing" && (
              <p className="text-gray-700 font-medium mt-3">{correct}/{total} correct</p>
            )}
            <p className="text-sm text-gray-500 mt-1">{session?.timeSpent ? formatTime(session.timeSpent) : "–"} time spent</p>
          </div>

          {session?.feedback && (
            <div className="bg-accent-lightest rounded-2xl border border-accent/20 p-4">
              <p className="text-xs font-semibold text-accent-darker uppercase tracking-wider mb-1.5">Feedback</p>
              <p className="text-sm text-gray-700">{session.feedback}</p>
            </div>
          )}

          <TestReview materialId={material.id} answers={answers} />

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => router.push("/test?tab=mock")}>New Test</Button>
            <Button className="flex-1" onClick={() => { setPhase("intro"); setAnswers({}); setCurrentQ(0); }}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader title={material.title} />
      <div className="px-4 lg:px-8">
        <Button onClick={() => setPhase("intro")} size="lg" className="w-full">Start Test</Button>
      </div>
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────
function QuestionCard({ question, answer, onAnswer, type, forceText }: {
  question: Question; answer: string; onAnswer: (v: string) => void; type: string; forceText?: boolean;
}) {
  if (type === "writing") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-accent-lightest text-accent-darker text-xs font-semibold px-2.5 py-1 rounded-full">Q{question.number}</span>
        </div>
        <p className="text-gray-800 font-medium mb-4 leading-relaxed">{question.text}</p>
        <textarea
          value={answer} onChange={e => onAnswer(e.target.value)}
          rows={12} placeholder="Write your response here..."
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none leading-relaxed"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{answer.split(/\s+/).filter(Boolean).length} words</p>
      </div>
    );
  }

  if (question.type === "mcq" && question.options && !forceText) {
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
                className={cn(
                  "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                  selected ? "bg-accent-lightest border-accent text-accent-darker font-medium" : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                )}>
                <span className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                  selected ? "border-accent bg-accent text-white" : "border-gray-300 text-gray-400"
                )}>{letter}</span>
                <span className="text-sm leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === "truefalse" && !forceText) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-accent-lightest text-accent-darker text-xs font-semibold px-2.5 py-1 rounded-full">Q{question.number}</span>
        </div>
        <p className="text-gray-800 font-medium mb-4 leading-relaxed">{question.text}</p>
        <div className="grid grid-cols-3 gap-2">
          {["TRUE", "FALSE", "NOT GIVEN"].map(v => (
            <button key={v} onClick={() => onAnswer(v)}
              className={cn(
                "py-3 rounded-xl border text-xs font-semibold transition-all",
                answer === v ? "bg-accent border-accent text-white" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              )}>
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-accent-lightest text-accent-darker text-xs font-semibold px-2.5 py-1 rounded-full">Q{question.number}</span>
        <span className="text-xs text-gray-400">{question.type === "fillblank" ? "Fill in the blank" : "Short answer"}</span>
      </div>
      <p className="text-gray-800 font-medium mb-4 leading-relaxed">{question.text}</p>
      <input
        value={answer} onChange={e => onAnswer(e.target.value)}
        placeholder="Your answer..."
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
      />
    </div>
  );
}
