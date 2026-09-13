"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const { resolvedTheme, setTheme } = useTheme();
  const links = [["Home", "/"], ["QR Generator", "/qr"], ["AnyDownload", "/anydownload"], ["About", "/about"]];
  return <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-[#fafafa]/90 text-neutral-700 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-[#101010]/90 dark:text-neutral-300">
    <nav className="container flex h-16 items-center justify-between" aria-label="Main navigation">
      <Link href="/" className="font-bold tracking-[-0.04em] text-lg">Emmortals</Link>
      <div className="hidden items-center gap-6 md:flex">{links.map(([label, href]) => <Link key={href} href={href} className="text-sm text-neutral-600 transition hover:text-black dark:text-neutral-400 dark:hover:text-white">{label}</Link>)}<button aria-label="Toggle theme" className="rounded-full border border-neutral-300 p-2 dark:border-neutral-700" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{mounted && resolvedTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button></div>
      <button className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </nav>
    {open && <div className="border-t border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-[#101010] md:hidden">{links.map(([label, href]) => <Link onClick={() => setOpen(false)} className="block border-b border-neutral-100 py-3 text-sm dark:border-neutral-800" key={href} href={href}>{label}</Link>)}</div>}
  </header>;
}