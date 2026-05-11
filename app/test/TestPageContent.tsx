"use client";
import { useSearchParams, useRouter } from "next/navigation";
import TestInner from "./TestInner";
import PracticeInner from "./PracticeInner";
import { PageHeader } from "@/components/ui/PageHeader";
import { FlaskConical, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TestPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") ?? "mock";
  const materialId = searchParams.get("material");

  function setTab(t: string) {
    router.push(`/test?tab=${t}`);
  }

  return (
    <div className="min-h-screen">
      {!materialId && (
        <>
          <PageHeader title="Test Center" subtitle="Choose your test mode" />
          <div className="px-4 lg:px-8 mb-4">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
              <button
                onClick={() => setTab("practice")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  tab === "practice" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <BookOpen size={15} />
                Practice Test
              </button>
              <button
                onClick={() => setTab("mock")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  tab === "mock" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <FlaskConical size={15} />
                Mock Test
              </button>
            </div>
          </div>
        </>
      )}
      {tab === "practice" ? <PracticeInner /> : <TestInner />}
    </div>
  );
}
