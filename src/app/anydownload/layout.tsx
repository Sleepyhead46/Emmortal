import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public Media Downloader",
  description: "Analyze public YouTube, Instagram, and TikTok media and download individual files directly to your device.",
  alternates: { canonical: "/anydownload" },
};

export default function AnyDownloadLayout({ children }: { children: React.ReactNode }) { return children; }