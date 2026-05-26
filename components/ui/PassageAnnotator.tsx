"use client";
import { useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import type { VocabWord } from "@/lib/store";
import { cn } from "@/lib/utils";

export type AnnotationColor = "yellow" | "green" | "pink" | "blue";

export interface TextAnnotation {
  id: string;
  start: number;
  end: number;
  type: "highlight" | "underline";
  color?: AnnotationColor;
  sectionId: string;
}

export interface AnnotationToolbar {
  x: number;
  y: number;
  start: number;
  end: number;
  selectedText: string;
  sectionId: string;
}

const HIGHLIGHT_BG: Record<AnnotationColor, string> = {
  yellow: "bg-yellow-300/70",
  green:  "bg-green-300/70",
  pink:   "bg-pink-300/70",
  blue:   "bg-blue-300/70",
};

const HIGHLIGHT_DOT: Record<AnnotationColor, string> = {
  yellow: "bg-yellow-300",
  green:  "bg-green-300",
  pink:   "bg-pink-300",
  blue:   "bg-blue-300",
};

function getOffsetInContainer(container: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let n = walker.nextNode();
  while (n) {
    if (n === node) return pos + offset;
    pos += (n as Text).length;
    n = walker.nextNode();
  }
  return pos;
}

// Matches paragraph labels like [A], [B], [1], [AB] at the start of a line
const PARA_LABEL_RE = /\[([A-Z]{1,3}|\d+)\]\n?/g;

interface Segment {
  text: string;
  annotation?: TextAnnotation;
  vocab?: VocabWord;
  paraLabel?: string; // set when this segment is a paragraph label marker
}

function buildSegments(
  text: string,
  annotations: TextAnnotation[],
  vocabWords: VocabWord[],
  sectionId: string,
): Segment[] {
  const relevant = annotations.filter(a => a.sectionId === sectionId);
  const boundaries = new Set<number>([0, text.length]);
  const vocabRanges: { start: number; end: number; vocab: VocabWord }[] = [];
  const paraLabelRanges: { start: number; end: number; label: string }[] = [];

  // Paragraph label boundaries
  PARA_LABEL_RE.lastIndex = 0;
  let pm: RegExpExecArray | null;
  while ((pm = PARA_LABEL_RE.exec(text)) !== null) {
    boundaries.add(pm.index);
    boundaries.add(pm.index + pm[0].length);
    paraLabelRanges.push({ start: pm.index, end: pm.index + pm[0].length, label: pm[1] });
  }

  for (const ann of relevant) {
    if (ann.start >= 0 && ann.end <= text.length && ann.start < ann.end) {
      boundaries.add(ann.start);
      boundaries.add(ann.end);
    }
  }

  for (const v of vocabWords) {
    let pos = 0;
    while (pos < text.length) {
      const idx = text.toLowerCase().indexOf(v.word.toLowerCase(), pos);
      if (idx === -1) break;
      // Don't mark vocab inside paragraph labels
      const inLabel = paraLabelRanges.some(pl => idx >= pl.start && idx + v.word.length <= pl.end);
      if (!inLabel) {
        boundaries.add(idx);
        boundaries.add(idx + v.word.length);
        vocabRanges.push({ start: idx, end: idx + v.word.length, vocab: v });
      }
      pos = idx + 1;
    }
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const result: Segment[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    const seg = text.slice(start, end);
    const paraLabel = paraLabelRanges.find(pl => pl.start === start && pl.end === end);
    if (paraLabel) {
      result.push({ text: seg, paraLabel: paraLabel.label });
      continue;
    }
    const ann = relevant.find(a => a.start <= start && a.end >= end);
    const vocabMatch = vocabRanges.find(vr => vr.start === start && vr.end === end);
    result.push({ text: seg, annotation: ann, vocab: vocabMatch?.vocab });
  }

  return result;
}

interface PassageAnnotatorProps {
  text: string;
  sectionId: string;
  annotations: TextAnnotation[];
  vocabWords?: VocabWord[];
  toolbar: AnnotationToolbar | null;
  onToolbarOpen: (t: AnnotationToolbar) => void;
  onToolbarClose: () => void;
  onAnnotate: (start: number, end: number, type: TextAnnotation["type"], color?: AnnotationColor, sectionId?: string) => void;
  onClear: (start: number, end: number, sectionId: string) => void;
  onVocabClick?: (word: VocabWord, rect: DOMRect) => void;
  onSaveVocab?: () => void;
}

export function PassageAnnotator({
  text, sectionId, annotations, vocabWords = [],
  toolbar, onToolbarOpen, onToolbarClose,
  onAnnotate, onClear, onVocabClick, onSaveVocab,
}: PassageAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close toolbar on click outside
  useEffect(() => {
    const visible = toolbar && toolbar.sectionId === sectionId;
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-ann-toolbar]")) onToolbarClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [toolbar, sectionId, onToolbarClose]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;
    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) return;
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    if (!rect.width) return;
    const start = getOffsetInContainer(containerRef.current, range.startContainer, range.startOffset);
    const end = getOffsetInContainer(containerRef.current, range.endContainer, range.endOffset);
    if (start >= end) return;
    onToolbarOpen({ x: rect.left + rect.width / 2, y: rect.top, start, end, selectedText, sectionId });
  }, [sectionId, onToolbarOpen]);

  const segments = buildSegments(text, annotations, vocabWords, sectionId);
  const showToolbar = toolbar && toolbar.sectionId === sectionId;
  const hasExisting = showToolbar
    ? annotations.some(a => a.sectionId === sectionId && a.start < toolbar.end && a.end > toolbar.start)
    : false;

  return (
    <>
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="text-[14px] leading-relaxed text-gray-700 cursor-text whitespace-pre-wrap select-text"
      >
        {segments.map((seg, i) => {
          // Paragraph label — render as a styled badge, not selectable/annotatable
          if (seg.paraLabel) {
            return (
              <span
                key={i}
                contentEditable={false}
                className="inline-flex items-center justify-center min-w-[1.5rem] h-5 rounded bg-gray-700 text-white text-[11px] font-bold px-1.5 mr-1.5 select-none align-baseline"
                style={{ userSelect: "none" }}
              >
                {seg.paraLabel}
              </span>
            );
          }

          const ann = seg.annotation;
          const v = seg.vocab;
          let cls = "";
          let style: React.CSSProperties = {};

          if (ann?.type === "highlight" && ann.color) {
            cls = cn("rounded-[3px] px-[1px]", HIGHLIGHT_BG[ann.color]);
          }
          if (ann?.type === "underline") {
            style = { textDecoration: "underline", textDecorationThickness: "2px", textUnderlineOffset: "2px" };
          }

          if (v) {
            const vocabBase = v.note ? "bg-blue-100 text-blue-900" : "bg-blue-50 text-blue-800";
            return (
              <mark
                key={i}
                className={cn("rounded-sm px-0.5 not-italic cursor-pointer hover:brightness-95 transition-[filter]", ann?.type === "highlight" && ann.color ? HIGHLIGHT_BG[ann.color] : vocabBase)}
                style={style}
                onClick={e => {
                  if (!window.getSelection()?.isCollapsed) return;
                  onVocabClick?.(v, (e.currentTarget as Element).getBoundingClientRect());
                }}
              >
                {seg.text}
              </mark>
            );
          }

          if (cls || Object.keys(style).length > 0) {
            return <mark key={i} className={cn("not-italic", cls)} style={style}>{seg.text}</mark>;
          }

          return <span key={i}>{seg.text}</span>;
        })}
      </div>

      {/* Floating toolbar */}
      {showToolbar && (
        <div
          data-ann-toolbar="true"
          className="fixed z-50 bg-gray-900 rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-2 pointer-events-auto"
          style={{
            left: toolbar.x,
            top: toolbar.y,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
        >
          {/* Highlight colors */}
          {(["yellow", "green", "pink", "blue"] as AnnotationColor[]).map(color => (
            <button
              key={color}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onAnnotate(toolbar.start, toolbar.end, "highlight", color, sectionId); window.getSelection()?.removeAllRanges(); }}
              className={cn("w-5 h-5 rounded-full hover:scale-125 transition-transform flex-shrink-0", HIGHLIGHT_DOT[color])}
              title={`Highlight ${color}`}
            />
          ))}
          {/* Underline */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onAnnotate(toolbar.start, toolbar.end, "underline", undefined, sectionId); window.getSelection()?.removeAllRanges(); }}
            className="w-6 h-6 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white text-xs font-bold transition-colors flex-shrink-0"
            title="Underline"
            style={{ textDecoration: "underline" }}
          >
            U
          </button>
          {/* Clear */}
          {hasExisting && (
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onClear(toolbar.start, toolbar.end, sectionId); window.getSelection()?.removeAllRanges(); }}
              className="w-6 h-6 rounded-lg bg-gray-700 hover:bg-red-600 flex items-center justify-center transition-colors flex-shrink-0"
              title="Remove"
            >
              <X size={11} className="text-white" />
            </button>
          )}
          {/* Save word (practice) */}
          {onSaveVocab && (
            <>
              <div className="w-px h-4 bg-gray-700 mx-0.5 flex-shrink-0" />
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={onSaveVocab}
                className="px-2.5 py-1 rounded-lg bg-accent hover:bg-accent-dark text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                Save word
              </button>
            </>
          )}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onToolbarClose(); window.getSelection()?.removeAllRanges(); }}
            className="text-gray-500 hover:text-white transition-colors ml-0.5 flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </>
  );
}
