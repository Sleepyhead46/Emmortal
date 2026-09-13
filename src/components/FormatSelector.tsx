'use client';

import React, { useState } from 'react';
import { DownloadFormat, Platform } from '@/services/types';
import {
  Download,
  Film,
  Music,
  Check,
  Loader2,
  Star,
  ChevronRight,
} from 'lucide-react';

interface FormatSelectorProps {
  formats: DownloadFormat[];
  platform: Platform;
  title: string;
}

export function FormatSelector({ formats, platform, title }: FormatSelectorProps) {
  const videoFormats = formats.filter((f) => f.type === 'video' || f.type === 'image');
  const audioFormats = formats.filter((f) => f.type === 'audio');

  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');

  // Pre-select the first (highest quality) format in each tab
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(
    videoFormats[0]?.id ?? null
  );
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(
    audioFormats[0]?.id ?? null
  );

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  const displayedFormats = activeTab === 'video' ? videoFormats : audioFormats;
  const selectedId = activeTab === 'video' ? selectedVideoId : selectedAudioId;
  const setSelectedId = activeTab === 'video' ? setSelectedVideoId : setSelectedAudioId;

  const selectedFormat = displayedFormats.find((f) => f.id === selectedId) ?? null;

  const handleDownload = (format: DownloadFormat) => {
    if (downloadingId) return;
    setDownloadingId(format.id);

    const downloadUrl = `/api/download?url=${encodeURIComponent(format.url)}&filename=${encodeURIComponent(
      title
    )}&extension=${encodeURIComponent(format.extension)}&platform=${encodeURIComponent(platform)}`;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `${title}.${format.extension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingId(null);
      setDownloadedIds((prev) => new Set(prev).add(format.id));
    }, 1500);
  };

  const isDownloading = downloadingId !== null;
  const isSelectedDownloading = downloadingId === selectedId;
  const isSelectedDownloaded = selectedId ? downloadedIds.has(selectedId) : false;

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Select Quality
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Choose a format below, then hit download
          </p>
        </div>

        {/* Video / Audio tab switch */}
        {audioFormats.length > 0 && (
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'video'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'audio'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Audio</span>
            </button>
          </div>
        )}
      </div>

      {/* Quality Option List */}
      <div className="px-3 sm:px-4 py-3 space-y-1.5">
        {displayedFormats.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No formats available for this category.
          </div>
        ) : (
          displayedFormats.map((format, idx) => {
            const isSelected = format.id === selectedId;
            const isThisDownloaded = downloadedIds.has(format.id);
            const isBest = idx === 0; // Highest quality is listed first

            return (
              <button
                key={format.id}
                type="button"
                onClick={() => setSelectedId(format.id)}
                className={`group w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150 ${
                  isSelected
                    ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                    : 'bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                {/* Left: icon + text */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-white/15 dark:bg-zinc-900/20'
                        : 'bg-zinc-200/70 dark:bg-zinc-700/60'
                    }`}
                  >
                    {format.type === 'audio' ? (
                      <Music
                        className={`w-4 h-4 ${isSelected ? 'text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-300'}`}
                      />
                    ) : (
                      <Film
                        className={`w-4 h-4 ${isSelected ? 'text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-300'}`}
                      />
                    )}
                  </div>

                  {/* Quality label */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-semibold text-sm ${
                          isSelected
                            ? 'text-white dark:text-zinc-900'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {format.quality || format.label}
                      </span>

                      {/* Extension badge */}
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-white/20 dark:bg-zinc-900/20 text-white dark:text-zinc-900'
                            : 'bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {format.extension}
                      </span>

                      {/* Best badge */}
                      {isBest && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-amber-400/30 text-amber-200 dark:text-amber-700'
                              : 'bg-amber-400/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          <Star className="w-2.5 h-2.5" />
                          Best
                        </span>
                      )}

                      {/* Downloaded indicator */}
                      {isThisDownloaded && !isSelected && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-2.5 h-2.5" />
                          Saved
                        </span>
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-1.5 text-xs mt-0.5 ${
                        isSelected
                          ? 'text-white/70 dark:text-zinc-900/60'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <span>{format.label}</span>
                      {format.sizeFormatted && (
                        <>
                          <span>·</span>
                          <span>{format.sizeFormatted}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: radio indicator */}
                <div
                  className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-white dark:border-zinc-900 bg-white dark:bg-zinc-900'
                      : 'border-zinc-300 dark:border-zinc-600 group-hover:border-zinc-400 dark:group-hover:border-zinc-500'
                  }`}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Download CTA Footer */}
      {selectedFormat && (
        <div className="px-5 sm:px-6 py-4 mt-1 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Selected summary */}
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Selected: </span>
            {selectedFormat.quality || selectedFormat.label}
            {' · '}
            <span className="font-mono uppercase">{selectedFormat.extension}</span>
            {selectedFormat.sizeFormatted && ` · ${selectedFormat.sizeFormatted}`}
          </div>

          {/* Big Download button */}
          <button
            type="button"
            onClick={() => handleDownload(selectedFormat)}
            disabled={isDownloading}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-xs active:scale-[0.97] w-full sm:w-auto justify-center ${
              isSelectedDownloaded
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isSelectedDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Starting Download…</span>
              </>
            ) : isSelectedDownloaded ? (
              <>
                <Check className="w-4 h-4" />
                <span>Downloaded</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                <span className="opacity-70 text-xs font-normal">Download again</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
