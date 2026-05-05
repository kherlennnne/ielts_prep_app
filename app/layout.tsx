import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";
import { Sidebar } from "@/components/ui/Sidebar";

export const metadata: Metadata = {
  title: "IELTS Prep Hub",
  description: "Your IELTS preparation companion",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#a2b9d5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="flex min-h-screen">
          {/* Desktop sidebar */}
          <Sidebar />
          {/* Main content */}
          <main className="flex-1 lg:ml-56 pb-20 lg:pb-0 min-h-screen">
            {children}
          </main>
        </div>
        {/* Mobile bottom nav */}
        <BottomNav />
      </body>
    </html>
  );
}
