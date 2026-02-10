"use client";

import dynamic from "next/dynamic";

const EpubViewerWithQuiz = dynamic(
  () => import("./EpubViewerWithQuiz"),
  { ssr: false }
);

export default function EpubViewerClient() {
  return <EpubViewerWithQuiz />;
}
