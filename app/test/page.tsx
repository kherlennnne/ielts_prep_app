"use client";
import { Suspense } from "react";
import TestPageContent from "./TestPageContent";

export default function TestPage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-gray-400">Loading...</p></div>}><TestPageContent /></Suspense>;
}
