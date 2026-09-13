import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { ThemeProvider } from "@/components/theme-provider";

const description = "Privacy-first QR creation and public media tools. Simple tools. Powerful results.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: { default: "Emmortals | Simple tools. Powerful results.", template: "%s | Emmortals" },
    description,
    keywords: ["QR generator", "privacy-first tools", "public media downloader", "YouTube downloader", "Instagram downloader", "TikTok downloader"],
    alternates: { canonical: "/" },
    icons: { icon: "/logo.svg" },
    openGraph: { title: "Emmortals", description, type: "website", url: origin, siteName: "Emmortals", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Emmortals - Simple tools. Powerful results." }] },
    twitter: { card: "summary_large_image", title: "Emmortals", description, images: ["/opengraph-image"] },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body><ThemeProvider><SiteNav />{children}</ThemeProvider><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebApplication", name: "Emmortals", description, applicationCategory: "UtilitiesApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, featureList: ["Client-side QR generation", "Public media analysis", "Direct media downloads"] }) }} /></body>
    </html>
  );
}
