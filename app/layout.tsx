import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/ui/AppShell";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
