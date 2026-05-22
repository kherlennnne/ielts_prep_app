"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStore, Question, Section, VocabWord } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { HighlightablePassage } from "@/components/ui/HighlightablePassage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { VocabDrawer } from "@/components/ui/VocabDrawer";
import { PassageAnnotator, TextAnnotation, AnnotationColor, AnnotationToolbar } from "@/components/ui/PassageAnnotator";
import { checkAnswer, getYouTubeId, generateId, formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, BookOpen,
  FileText, Headphones, PenLine, BookMarked, X,
} from "lucide-react";
import { TestReview } from "@/components/ui/TestReview";

const TYPE_ICONS = { listening: Headphones, reading: FileText, writing: PenLine };
const TYPE_COLORS = {
  listening: "bg-purple-50 text-purple-600 border-purple-100",
  reading: "bg-blue-50 text-blue-600 border-blue-100",
  writing: "bg-green-50 text-green-600 border-green-100",
};

function extractContext(text: string, word: string): string {
  const idx = text.toLowerCase().indexOf(word.toLowerCase());
  if (idx === -1) return word;
  let start = idx, end = idx + word.length;
  for (let i = idx - 1; i >= Math.max(0, idx - 150); i--) {
    if (".!?\n".includes(text[i])) { start = i + 1; break; }
    if (i === 0) start = 0;
  }
  for (let i = idx + word.length; i < Math.min(text.length, idx + word.length + 150); i++) {
    if (".!?\n".includes(text[i])) { end = i + 1; break; }
    if (i === text.length - 1) end = text.length;
  }
  return text.slice(start, end).trim();
}

export default function PracticeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const materialId = searchParams.get("material");
  const { materials, vocab, sessions, addVocab, addEvent, addSession, updateMaterial } = useStore();
  const { isCutie } = useUser();

  const practiceMaterials = materials.filter(m => m.testMode === "practice");
  const material = materials.find(m => m.id === materialId);
  const materialVocab = vocab.filter(v => v.materialId === materialId);

  const [reviewSession, setReviewSession] = useState<{ materialId: string; answers: Record<string, string>; date: string } | null>(null);
  const [showReviewPassage, setShowReviewPassage] = useState(true);
  const [reviewSectionIdx, setReviewSectionIdx] = useState(0);
  const [activeReviewQId, setActiveReviewQId] = useState<string | null>(null);
  const [activeDoneQId, setActiveDoneQId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"active" | "done">("active");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentGroupIdx, setCurrentGroupIdx] = useState(0);
  const [showPassage, setShowPassage] = useState(true);
  const [vocabOpen, setVocabOpen] = useState(false);
  const [previewVocabId, setPreviewVocabId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [annToolbar, setAnnToolbar] = useState<AnnotationToolbar | null>(null);

  // Definition tooltip (for clicking already-saved vocab words)
  const [defTooltip, setDefTooltip] = useState<{ word: string; note: string; x: number; y: number } | null>(null);

  // Time tracking (no visible countdown)
  const startTimeRef = useRef<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  // Capture passage content for context extraction
  const passageContentRef = useRef<string>("");

  useEffect(() => {
    if (material && !startTimeRef.current) startTimeRef.current = Date.now();
  }, [material]);

  // Close definition tooltip when clicking outside
  useEffect(() => {
    if (!defTooltip) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-def-tooltip]")) setDefTooltip(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [defTooltip]);

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

  function handleSaveVocab() {
    if (!annToolbar) return;
    const word = annToolbar.selectedText;
    const context = extractContext(passageContentRef.current, word);
    addVocab({
      id: generateId(),
      word,
      context,
      materialId: materialId ?? undefined,
      savedAt: new Date().toISOString(),
    });
    setAnnToolbar(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleWordClick(word: VocabWord, rect: DOMRect) {
    setDefTooltip({ word: word.word, note: word.note ?? "", x: rect.left + rect.width / 2, y: rect.top });
  }

  type GroupEntry = {
    section: Section | null;
    group: { id: string; instruction?: string; questionImage?: string; questions: Question[] };
  };

  const allGroups: GroupEntry[] = [];
  if (material?.sections?.length) {
    for (const sec of material.sections) {
      for (const grp of sec.groups) {
        allGroups.push({ section: sec, group: grp });
      }
    }
  }
  if (!allGroups.length && material) {
    allGroups.push({ section: null, group: { id: "default", questions: material.questions } });
  }

  // ── Review past session ───────────────────────────────────────────────────────
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
    let highlight: { start: number; end: number } | null = activeLocation?.sectionId === activeSectionId ? activeLocation : null;

    if (!highlight && activeReviewQId && passageContent) {
      const expected = reviewMat?.answerKey[activeReviewQId] ?? "";
      if (expected) {
        const idx = passageContent.toLowerCase().indexOf(expected.toLowerCase());
        if (idx !== -1) highlight = { start: idx, end: idx + expected.length };
      }
    }
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
                <button onClick={() => setShowReviewPassage(true)} className="lg:hidden text-xs text-accent-darker font-medium mb-4 block">
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

  // ── Select phase ──────────────────────────────────────────────────────────────
  if (!material) {
    return (
      <div className="px-4 lg:px-8">
        {practiceMaterials.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <BookOpen size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-500 mb-1">No practice materials yet</p>
            <p className="text-sm text-gray-400 mb-4">Add a material and set it to Practice Test</p>
            <Button onClick={() => router.push("/materials")}>Go to Materials</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {(["listening", "reading", "writing"] as const)
              .map(type => ({ type, items: practiceMaterials.filter(m => m.type === type) }))
              .filter(({ items }) => items.length > 0)
              .map(({ type, items }) => {
                const Icon = TYPE_ICONS[type];
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center border", TYPE_COLORS[type])}>
                        <Icon size={13} />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider capitalize">{type}</span>
                      <span className="text-xs text-gray-300">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((m) => {
                        const mVocab = vocab.filter(v => v.materialId === m.id);
                        const lastSession = sessions
                          .filter(s => s.completed && s.materialId === m.id)
                          .sort((a, b) => b.date.localeCompare(a.date))[0];
                        return (
                          <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{m.title}</p>
                                <p className="text-xs text-gray-500">{m.questions.length} questions · No timer</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                                <button
                                  onClick={() => setPreviewVocabId(m.id)}
                                  className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-accent-lightest hover:text-accent-darker border border-gray-200 hover:border-accent/30 transition-colors"
                                >
                                  <BookMarked size={13} />
                                  Vocab
                                  {mVocab.length > 0 && (
                                    <span className="bg-accent text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                                      {mVocab.length}
                                    </span>
                                  )}
                                </button>
                                {(lastSession || isCutie) && (
                                  <button
                                    onClick={() => setReviewSession({ materialId: m.id, answers: lastSession?.answers ?? {}, date: lastSession?.date ?? "" })}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 transition-colors"
                                  >
                                    Review
                                  </button>
                                )}
                                <Button size="sm" onClick={() => router.push(`/test?tab=practice&material=${m.id}`)}>
                                  Practice <ChevronRight size={13} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Pre-test vocab drawer */}
        <VocabDrawer
          open={!!previewVocabId}
          onClose={() => setPreviewVocabId(null)}
          materialId={previewVocabId ?? undefined}
          allowAdd
        />
      </div>
    );
  }

  // ── Done phase ────────────────────────────────────────────────────────────────
  if (phase === "done") {
    let correct = 0;
    material.questions.forEach(q => {
      if (checkAnswer(answers[q.id] ?? "", material.answerKey[q.id] ?? "")) correct++;
    });
    const total = material.questions.length;

    return (
      <div className="min-h-screen">
        <PageHeader title="Practice Complete" />
        <div className="px-4 lg:px-8 space-y-4 pb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            {material.type !== "writing" && (
              <p className="text-gray-700 font-medium mt-3">{correct}/{total} correct</p>
            )}
            {timeSpent > 0 && (
              <p className="text-xs text-gray-400 mt-1">Time spent: {formatTime(timeSpent)}</p>
            )}
          </div>

          <TestReview materialId={material.id} answers={answers} activeQuestionId={activeDoneQId} onQuestionSelect={setActiveDoneQId} />

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => router.push("/test?tab=practice")}>
              Back
            </Button>
            <Button className="flex-1" onClick={() => {
              setPhase("active");
              setAnswers({});
              setCurrentGroupIdx(0);
              setTimeSpent(0);
              startTimeRef.current = Date.now();
            }}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active phase ──────────────────────────────────────────────────────────────
  const groupIdx = Math.min(currentGroupIdx, allGroups.length - 1);
  const { section: currentSection, group: currentGroup } = allGroups[groupIdx];
  const totalGroups = allGroups.length;
  const hasPassage = material.type !== "writing";
  const answered = Object.keys(answers).filter(k => answers[k]).length;
  const totalQ = material.questions.length;

  const passageContent = (currentSection as any)?.content ?? material.content;
  const passageImg = (currentSection as any)?.passageImage ?? material.passageImage;
  const passageTitle = (currentSection as any)?.title;
  const youtubeId = (currentSection as any)?.youtubeUrl ? getYouTubeId((currentSection as any).youtubeUrl) : null;
  const youtubeStart = (currentSection as any)?.youtubeStart ?? 0;
  const youtubeEnd = (currentSection as any)?.youtubeEnd;

  const firstQ = currentGroup.questions[0];
  const lastQ = currentGroup.questions[currentGroup.questions.length - 1];
  const groupLabel = firstQ && lastQ && firstQ.number !== lastQ.number
    ? `Q${firstQ.number}–Q${lastQ.number}`
    : firstQ ? `Q${firstQ.number}` : "";

  const groupIdxForQuestion = (qId: string): number => {
    const idx = allGroups.findIndex(({ group }) => group.questions.some(q => q.id === qId));
    return idx === -1 ? 0 : idx;
  };

  function finish() {
    if (!material) return;
    const elapsed = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;
    setTimeSpent(elapsed);

    const durationMinutes = Math.max(1, Math.ceil(elapsed / 60));
    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10);
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let correct = 0;
    material.questions.forEach(q => {
      if (checkAnswer(answers[q.id] ?? "", material.answerKey[q.id] ?? "")) correct++;
    });

    const eventId = generateId();
    addEvent({
      id: eventId,
      date: currentDate,
      title: `${material.title} (practice)`,
      time: currentTime,
      duration: durationMinutes,
      type: "study",
      completed: true,
      notes: `Practice session — ${correct}/${material.questions.length} correct · ${formatTime(elapsed)}`,
    });

    addSession({
      id: generateId(),
      date: currentDate,
      type: material.type,
      materialId: material.id,
      score: correct,
      maxScore: material.questions.length,
      timeSpent: elapsed,
      answers,
      correctAnswers: material.answerKey,
      completed: true,
      trackedEventId: eventId,
    });

    setPhase("done");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-accent-darker" />
          <span className="text-xs font-semibold text-accent-darker">Practice</span>
          {totalGroups > 1 && (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-500 font-medium">Group {groupIdx + 1}/{totalGroups}</span>
            </>
          )}
          {groupLabel && (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-500 font-medium">{groupLabel}</span>
            </>
          )}
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-500">{answered}/{totalQ} answered</span>
        </div>
        <div className="flex items-center gap-2">
          {hasPassage && (
            <button
              onClick={() => setVocabOpen(true)}
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <BookMarked size={13} />
              <span className="hidden sm:inline">Vocab</span>
              {materialVocab.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {materialVocab.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => router.push("/test?tab=practice")}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium"
          >
            Exit
          </button>
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
                (() => { passageContentRef.current = passageContent; return null; })() ||
                <PassageAnnotator
                  text={passageContent}
                  sectionId={currentSection?.id ?? "default"}
                  annotations={annotations}
                  vocabWords={materialVocab}
                  toolbar={annToolbar}
                  onToolbarOpen={t => { setDefTooltip(null); setAnnToolbar(t); }}
                  onToolbarClose={() => setAnnToolbar(null)}
                  onAnnotate={handleAnnotate}
                  onClear={handleClearAnnotation}
                  onVocabClick={handleWordClick}
                  onSaveVocab={handleSaveVocab}
                />
              ) : !youtubeId ? (
                <div className="text-center py-14 text-gray-400">
                  <p className="text-sm">No passage added to this material</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Questions panel */}
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
            {currentGroup.instruction && (
              <div className="mb-5 p-3.5 bg-accent-lightest border border-accent/20 rounded-xl">
                <p className="text-xs text-accent-darker leading-relaxed">{currentGroup.instruction}</p>
              </div>
            )}
            {currentGroup.questionImage && (
              <div className="mb-5 rounded-xl overflow-hidden border border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentGroup.questionImage} alt="Diagram" className="w-full" />
              </div>
            )}
            <div className="space-y-5">
              {currentGroup.questions.map(q => (
                <PracticeQuestionCard
                  key={q.id}
                  question={q}
                  answer={answers[q.id] ?? ""}
                  onAnswer={v => setAnswers(a => ({ ...a, [q.id]: v }))}
                  type={material.type}
                  forceText={!!currentGroup.questionImage}
                  isChecked={false}
                  isCorrect={false}
                  correctAnswer=""
                  explanation={undefined}
                />
              ))}
            </div>
          </div>

          {/* Nav */}
          <div className="border-t border-gray-100 p-4 bg-white flex-shrink-0">
            <div className="flex flex-wrap gap-1.5 mb-4 max-h-20 overflow-y-auto">
              {material.questions.map(qq => {
                const qGrpIdx = groupIdxForQuestion(qq.id);
                const isActive = qGrpIdx === groupIdx;
                return (
                  <button
                    key={qq.id}
                    onClick={() => { setCurrentGroupIdx(qGrpIdx); if (hasPassage) setShowPassage(false); }}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                      isActive ? "bg-accent text-white"
                        : answers[qq.id] ? "bg-accent-lightest text-accent-darker border border-accent/30"
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
                onClick={() => { setCurrentGroupIdx(Math.max(0, groupIdx - 1)); if (hasPassage) setShowPassage(false); }}
                disabled={groupIdx === 0}
                className="p-2.5 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => { setCurrentGroupIdx(Math.min(totalGroups - 1, groupIdx + 1)); if (hasPassage) setShowPassage(false); }}
                disabled={groupIdx === totalGroups - 1}
                className="p-2.5 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
              <Button className="flex-1" onClick={finish}>Submit</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Definition tooltip */}
      {defTooltip && (
        <div
          data-def-tooltip="true"
          className="fixed z-50 bg-gray-900 text-white rounded-xl shadow-xl px-4 py-3 max-w-[260px] pointer-events-auto"
          style={{
            left: defTooltip.x,
            top: defTooltip.y,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
        >
          <p className="font-semibold text-sm">{defTooltip.word}</p>
          {defTooltip.note ? (
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">{defTooltip.note}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1 italic">No definition — add one in Vocab</p>
          )}
          <button
            onClick={() => setDefTooltip(null)}
            className="absolute top-2 right-2 text-gray-500 hover:text-white transition-colors"
          >
            <X size={11} />
          </button>
        </div>
      )}

      <VocabDrawer
        open={vocabOpen}
        onClose={() => setVocabOpen(false)}
        materialId={materialId ?? undefined}
        allowAdd
      />
    </div>
  );
}

// ── Practice Question Card ────────────────────────────────────────────────────
function PracticeQuestionCard({ question, answer, onAnswer, type, forceText, isChecked, isCorrect, correctAnswer, explanation }: {
  question: Question; answer: string; onAnswer: (v: string) => void; type: string; forceText?: boolean;
  isChecked: boolean; isCorrect: boolean; correctAnswer: string; explanation?: string;
}) {
  const feedbackBg = isChecked
    ? isCorrect ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
    : "border-transparent";

  const FeedbackBadge = () => !isChecked ? null : (
    <div className={cn("flex flex-wrap items-center gap-1.5 mt-3 text-xs font-medium", isCorrect ? "text-green-700" : "text-red-600")}>
      {isCorrect
        ? <><CheckCircle2 size={13} /> Correct!</>
        : <><XCircle size={13} /> Incorrect{correctAnswer && <> — correct: <span className="font-bold">{correctAnswer}</span></>}</>
      }
      {!isCorrect && explanation && (
        <p className="mt-1 text-gray-600 font-normal w-full">{explanation}</p>
      )}
    </div>
  );

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
      <div className={cn("p-4 rounded-2xl border transition-all", feedbackBg)}>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-accent-lightest text-accent-darker text-xs font-semibold px-2.5 py-1 rounded-full">Q{question.number}</span>
        </div>
        <p className="text-gray-800 font-medium mb-4 leading-relaxed">{question.text}</p>
        <div className="space-y-2">
          {question.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const selected = answer === letter;
            const isCorrectOpt = isChecked && correctAnswer === letter;
            const isWrongSel = isChecked && selected && !isCorrect;
            return (
              <button key={i} onClick={() => !isChecked && onAnswer(letter)}
                className={cn(
                  "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                  isCorrectOpt ? "bg-green-50 border-green-300 text-green-800 font-medium"
                    : isWrongSel ? "bg-red-50 border-red-300 text-red-800"
                    : selected ? "bg-accent-lightest border-accent text-accent-darker font-medium"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                )}>
                <span className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                  isCorrectOpt ? "border-green-500 bg-green-500 text-white"
                    : isWrongSel ? "border-red-400 bg-red-400 text-white"
                    : selected ? "border-accent bg-accent text-white"
                    : "border-gray-300 text-gray-400"
                )}>{letter}</span>
                <span className="text-sm leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>
        <FeedbackBadge />
      </div>
    );
  }

  if (question.type === "truefalse" && !forceText) {
    return (
      <div className={cn("p-4 rounded-2xl border transition-all", feedbackBg)}>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-accent-lightest text-accent-darker text-xs font-semibold px-2.5 py-1 rounded-full">Q{question.number}</span>
        </div>
        <p className="text-gray-800 font-medium mb-4 leading-relaxed">{question.text}</p>
        <div className="grid grid-cols-3 gap-2">
          {["TRUE", "FALSE", "NOT GIVEN"].map(v => {
            const isCorrectOpt = isChecked && correctAnswer.toUpperCase() === v;
            const isWrongSel = isChecked && answer === v && !isCorrect;
            return (
              <button key={v} onClick={() => !isChecked && onAnswer(v)}
                className={cn(
                  "py-3 rounded-xl border text-xs font-semibold transition-all",
                  isCorrectOpt ? "bg-green-100 border-green-400 text-green-800"
                    : isWrongSel ? "bg-red-100 border-red-400 text-red-700"
                    : answer === v ? "bg-accent border-accent text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                )}>
                {v}
              </button>
            );
          })}
        </div>
        <FeedbackBadge />
      </div>
    );
  }

  return (
    <div className={cn("p-4 rounded-2xl border transition-all", feedbackBg)}>
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-accent-lightest text-accent-darker text-xs font-semibold px-2.5 py-1 rounded-full">Q{question.number}</span>
        <span className="text-xs text-gray-400">{question.type === "fillblank" ? "Fill in the blank" : "Short answer"}</span>
      </div>
      <p className="text-gray-800 font-medium mb-4 leading-relaxed">{question.text}</p>
      <input
        value={answer} onChange={e => onAnswer(e.target.value)}
        placeholder="Your answer..."
        className={cn(
          "w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all",
          isChecked
            ? isCorrect ? "border-green-300 bg-green-50 focus:border-green-400" : "border-red-300 bg-red-50 focus:border-red-400"
            : "border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
        )}
      />
      <FeedbackBadge />
    </div>
  );
}
