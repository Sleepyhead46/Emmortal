'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Clipboard, X, Loader2, ArrowRight } from 'lucide-react';
import { PlatformBadge } from './PlatformBadge';
import { Platform } from '@/services/types';

interface UrlInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  initialUrl?: string;
}

export function UrlInput({ onAnalyze, isLoading, initialUrl = '' }: UrlInputProps) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = url.trim().toLowerCase();
  const detectedPlatform: Platform | null = trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('music.youtube.com') ? 'youtube' : trimmed.includes('instagram.com') || trimmed.includes('instagr.am') ? 'instagram' : trimmed.includes('tiktok.com') || trimmed.includes('vt.tiktok.com') || trimmed.includes('vm.tiktok.com') ? 'tiktok' : null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || isLoading) return;
    onAnalyze(url.trim());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    } catch {
      // If clipboard permission is denied, focus input
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    setUrl('');
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative group">
        {/* Glow border on focus / active */}
        <div className="absolute -inset-0.5 bg-zinc-200 dark:bg-gradient-to-r dark:from-zinc-700 dark:to-zinc-600 rounded-3xl blur-sm opacity-0 group-focus-within:opacity-60 transition duration-300" />

        <div className="relative flex flex-col sm:flex-row items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-full shadow-sm shadow-zinc-200/80 dark:shadow-2xl dark:shadow-black/40 p-2 sm:p-2.5 transition-all duration-200">
          {/* Left search icon or detected platform */}
          <div className="hidden sm:flex items-center pl-3 pr-2">
            <AnimatePresence mode="wait">
              {detectedPlatform ? (
                <motion.div
                  key={detectedPlatform}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <PlatformBadge platform={detectedPlatform} size="sm" showLabel={false} />
                </motion.div>
              ) : (
                <motion.div
                  key="search-icon"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Search className="w-5 h-5 text-zinc-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main URL Input */}
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube, Instagram, or TikTok link here..."
            className="w-full bg-transparent px-3 sm:px-2 py-3 sm:py-2 text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden font-normal"
            disabled={isLoading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          {/* Actions inside input (Paste, Clear, Platform label) */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end px-2 sm:px-0 mt-2 sm:mt-0">
            {detectedPlatform && (
              <div className="sm:hidden">
                <PlatformBadge platform={detectedPlatform} size="sm" />
              </div>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              {url ? (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isLoading}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Clear input"
                  aria-label="Clear URL"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              )}

              {/* Submit / Analyze button */}
              <button
                type="submit"
                disabled={!url.trim() || isLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-full font-medium text-sm text-white bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all duration-200 active:scale-98"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Helpful Hint */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
            Enter
          </kbd>
          to analyze
        </span>
        <span>•</span>
        <span>Zero archives or ZIPs generated</span>
        <span>•</span>
        <span>Direct device streaming</span>
      </div>
    </form>
  );
}
