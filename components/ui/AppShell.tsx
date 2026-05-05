"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { Sidebar } from "@/components/ui/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavigation = pathname === "/login";

  if (hideNavigation) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-56 pb-20 lg:pb-0 min-h-screen">{children}</main>
      </div>
      <BottomNav />
    </>
  );
}
