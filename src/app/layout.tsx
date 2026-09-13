import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: { default: "Emmortal | Simple tools. Powerful results.", template: "%s | Emmortal" },
  description: "Privacy-first tools for QR creation and public media downloads.",
  openGraph: { title: "Emmortal", description: "Simple tools. Powerful results.", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body><ThemeProvider><SiteNav />{children}</ThemeProvider></body>
    </html>
  );
}
