"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AutoLogout } from "@/components/ui/AutoLogout";
import { BottomNav } from "@/components/ui/BottomNav";
import { Sidebar } from "@/components/ui/Sidebar";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { CloudOff, Loader2 } from "lucide-react";

type SyncStatus = "checking" | "ok" | "error";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const syncFromDb = useStore((s) => s.syncFromDb);
  const isLoaded = useStore((s) => s.isLoaded);
  const hideNavigation = pathname === "/login";

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("checking");
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    checkAndLoad();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkAndLoad() {
    setSyncStatus("checking");
    // First verify we can write to Supabase
    try {
      const testId = "__sync_check__";
      const { error } = await supabase.from("materials").upsert({
        id: testId, title: "__test__", type: "reading", test_mode: "mock",
        questions: [], answer_key: {}, created_at: new Date().toISOString(),
      }, { onConflict: "id" });

      if (error) {
        setSyncStatus("error");
        setSyncError(error.message);
        // Still try to load whatever we can
        await syncFromDb();
        return;
      }

      await supabase.from("materials").delete().eq("id", testId);
      setSyncStatus("ok");
    } catch (e: unknown) {
      setSyncStatus("error");
      setSyncError(e instanceof Error ? e.message : "Connection failed");
    }

    await syncFromDb();
  }

  if (hideNavigation) {
    return <main className="min-h-screen">{children}</main>;
  }

  // Show full-screen loader while Supabase is loading
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-16 pb-20 lg:pb-0 min-h-screen flex flex-col items-center justify-center gap-3">
          <Loader2 size={22} className="text-gray-300 animate-spin" />
          <p className="text-gray-400 text-sm">Loading from Supabase…</p>
          {syncStatus === "error" && (
            <div className="mt-2 max-w-sm bg-red-50 border border-red-100 rounded-2xl p-4 text-xs text-red-700 space-y-2">
              <p className="font-semibold">Cloud sync error</p>
              <p>{syncError}</p>
              {(syncError.includes("security") || syncError.includes("42501")) && (
                <pre className="bg-red-100 rounded-lg p-2 text-[10px] whitespace-pre-wrap select-all leading-relaxed">{
`ALTER TABLE materials  DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions   DISABLE ROW LEVEL SECURITY;
ALTER TABLE events     DISABLE ROW LEVEL SECURITY;
ALTER TABLE vocab      DISABLE ROW LEVEL SECURITY;
ALTER TABLE tips       DISABLE ROW LEVEL SECURITY;`
                }</pre>
              )}
              {(syncError.includes("42P01") || syncError.includes("does not exist")) && (
                <p>Tables not created yet — run the setup SQL in Supabase SQL Editor.</p>
              )}
              <button onClick={checkAndLoad} className="underline font-medium">Retry</button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <>
      <AutoLogout />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-16 pb-20 lg:pb-0 min-h-screen">{children}</main>
      </div>
      <BottomNav />

      {/* Persistent error banner if sync is broken but app still loaded */}
      {syncStatus === "error" && (
        <div className="fixed bottom-20 right-4 lg:bottom-4 z-50 max-w-xs">
          <div className="bg-red-600 text-white text-xs rounded-2xl shadow-xl p-3 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CloudOff size={13} />
              Cloud sync not working — data won&apos;t be saved
            </div>
            <p className="opacity-80">{syncError}</p>
            {(syncError.includes("security") || syncError.includes("42501")) && (
              <pre className="bg-red-800/50 rounded-lg p-2 text-[10px] whitespace-pre-wrap select-all leading-relaxed">{
`ALTER TABLE materials  DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions   DISABLE ROW LEVEL SECURITY;
ALTER TABLE events     DISABLE ROW LEVEL SECURITY;
ALTER TABLE vocab      DISABLE ROW LEVEL SECURITY;
ALTER TABLE tips       DISABLE ROW LEVEL SECURITY;`
              }</pre>
            )}
            <button onClick={checkAndLoad} className="underline opacity-80 hover:opacity-100 transition-opacity">
              Retry
            </button>
          </div>
        </div>
      )}
    </>
  );
}
