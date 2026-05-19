"use client";
import { useRef, useEffect } from "react";
import { Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

interface HighlightablePassageProps {
  text: string;
  sectionId: string;
  highlight?: { start: number; end: number } | null;
  isCutie?: boolean;
  activeQuestionNumber?: number | null;
  onMarkRange?: (start: number, end: number) => void;
  className?: string;
}

function getCharOffset(container: Node, targetNode: Node, targetOffset: number): number {
  let offset = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node === targetNode) return offset + targetOffset;
    offset += (node as Text).length;
  }
  return offset + targetOffset;
}

export function HighlightablePassage({
  text,
  sectionId,
  highlight,
  isCutie,
  activeQuestionNumber,
  onMarkRange,
  className,
}: HighlightablePassageProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const highlightRef = useRef<HTMLElement>(null);

  // Scroll highlight into view when it changes
  useEffect(() => {
    if (highlight && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  function handleMouseUp() {
    if (!isCutie || !onMarkRange || activeQuestionNumber == null) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current) return;
    const range = sel.getRangeAt(0);
    if (!ref.current.contains(range.commonAncestorContainer)) return;
    const start = getCharOffset(ref.current, range.startContainer, range.startOffset);
    const end = getCharOffset(ref.current, range.endContainer, range.endOffset);
    if (end > start) {
      onMarkRange(start, end);
      sel.removeAllRanges();
    }
  }

  const hasHighlight = highlight && highlight.end > highlight.start && highlight.end <= text.length;

  return (
    <div className="relative">
      {isCutie && activeQuestionNumber != null && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <Crosshair size={11} />
          Select text to mark the answer location for Q{activeQuestionNumber}
        </div>
      )}
      <p
        ref={ref}
        onMouseUp={handleMouseUp}
        className={cn(
          "text-sm text-gray-700 leading-relaxed whitespace-pre-wrap",
          isCutie && activeQuestionNumber != null && "cursor-crosshair select-text",
          className
        )}
      >
        {hasHighlight ? (
          <>
            {text.slice(0, highlight.start)}
            <mark
              ref={highlightRef}
              className="bg-amber-200 text-gray-900 rounded px-0.5 not-italic font-medium"
            >
              {text.slice(highlight.start, highlight.end)}
            </mark>
            {text.slice(highlight.end)}
          </>
        ) : text}
      </p>
    </div>
  );
}
