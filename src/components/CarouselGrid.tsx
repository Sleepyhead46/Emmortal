'use client';

import React, { useState } from 'react';
import { CarouselItem, Platform } from '@/services/types';
import {
  CheckSquare,
  Square,
  Download,
  Image as ImageIcon,
  Video as VideoIcon,
  Check,
  Loader2,
  ImageOff,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

/** Proxy external CDN URLs through our server to bypass hotlink protection */
function proxied(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/') || url.startsWith('data:')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

interface CarouselGridProps {
  items: CarouselItem[];
  platform: Platform;
  title: string;
}

export function CarouselGrid({ items, platform, title }: CarouselGridProps) {
  // Set of selected item IDs (all selected by default)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(items.map((it) => it.id))
  );

  // Tracking download states for individual items
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // Batch download state
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    filename: string;
  } | null>(null);

  // Lightbox modal state
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  /**
   * Triggers a single direct download for an item via Blob or direct download link
   */
  const downloadSingleItem = async (item: CarouselItem): Promise<void> => {
    setDownloadingIds((prev) => new Set(prev).add(item.id));

    const cleanTitle =
      title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'instagram_media';
    const filename = `${cleanTitle}_item_${item.index}`;
    const downloadUrl = `/api/download?url=${encodeURIComponent(
      item.downloadUrl
    )}&filename=${encodeURIComponent(filename)}&extension=${encodeURIComponent(
      item.extension
    )}&platform=${encodeURIComponent(platform)}`;

    try {
      const res = await fetch(downloadUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', `${filename}.${item.extension}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      } else {
        // Fallback to direct anchor trigger
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `${filename}.${item.extension}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      // Fallback
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${filename}.${item.extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setCompletedIds((prev) => new Set(prev).add(item.id));
    }
  };

  /**
   * Triggers separate individual downloads sequentially
   */
  const handleDownloadSelected = async () => {
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    if (selectedItems.length === 0 || isBatchDownloading) return;

    setIsBatchDownloading(true);

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      const filename = `Item ${item.index} (${item.extension.toUpperCase()})`;
      setBatchProgress({
        current: i + 1,
        total: selectedItems.length,
        filename,
      });

      await downloadSingleItem(item);

      // Stagger downloads by 500ms to prevent browser throttling/popup blocking
      if (i < selectedItems.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setIsBatchDownloading(false);
    setTimeout(() => {
      setBatchProgress(null);
    }, 2500);
  };

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const photoCount = items.filter((i) => i.type === 'image').length;
  const videoCount = items.filter((i) => i.type === 'video').length;

  const activeItem =
    activePreviewIndex !== null && activePreviewIndex >= 0 && activePreviewIndex < items.length
      ? items[activePreviewIndex]
      : null;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm dark:shadow-none">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Instagram Carousel ({items.length} {items.length === 1 ? 'Item' : 'Items'})
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium">
              {photoCount > 0 && `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`}
              {photoCount > 0 && videoCount > 0 && ', '}
              {videoCount > 0 && `${videoCount} ${videoCount === 1 ? 'video' : 'videos'}`}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Click any image to select or zoom. Download all images together or save each individually in original quality.
          </p>
        </div>

        {/* Selection & Download Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={allSelected ? handleDeselectAll : handleSelectAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {allSelected ? (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Select All ({items.length})</span>
              </>
            )}
          </button>

          {/* Download Selected Button */}
          <button
            type="button"
            onClick={handleDownloadSelected}
            disabled={selectedIds.size === 0 || isBatchDownloading}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all active:scale-98"
          >
            {isBatchDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  Downloading {batchProgress?.current}/{batchProgress?.total}...
                </span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>
                  {allSelected
                    ? `Download All (${items.length})`
                    : `Download Selected (${selectedIds.size})`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Batch Progress Banner if active */}
      {batchProgress && (
        <div className="mt-4 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-zinc-800 dark:text-zinc-200">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-600 dark:text-zinc-400" />
            <span>
              Downloading <strong>{batchProgress.filename}</strong> (
              {batchProgress.current} of {batchProgress.total})
            </span>
          </div>
          <span className="text-xs font-mono font-medium text-zinc-500">
            {Math.round((batchProgress.current / batchProgress.total) * 100)}%
          </span>
        </div>
      )}

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 mt-5">
        {items.map((item, index) => {
          const isSelected = selectedIds.has(item.id);
          const isDownloading = downloadingIds.has(item.id);
          const isDownloaded = completedIds.has(item.id);

          return (
            <div
              key={item.id}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  toggleSelect(item.id);
                }
              }}
              className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 ${
                isSelected
                  ? 'border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-900/15 dark:ring-zinc-100/20'
                  : 'border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-600 opacity-85 hover:opacity-100'
              } bg-zinc-50 dark:bg-zinc-950/60`}
            >
              {/* Media Thumbnail Container */}
              <div
                onClick={() => toggleSelect(item.id)}
                className="relative aspect-square w-full bg-zinc-200 dark:bg-zinc-800 cursor-pointer overflow-hidden"
              >
                {proxied(item.thumbnailUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={proxied(item.thumbnailUrl)}
                    alt={`Item ${item.index}`}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      isSelected ? 'scale-100' : 'scale-98 filter contrast-90'
                    } group-hover:scale-103`}
                    loading="lazy"
                    onError={(e) => {
                      const parent = (e.currentTarget as HTMLImageElement).parentElement;
                      if (parent) {
                        e.currentTarget.style.display = 'none';
                        const placeholder = document.createElement('div');
                        placeholder.className =
                          'w-full h-full flex items-center justify-center text-zinc-400';
                        placeholder.innerHTML =
                          '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';
                        parent.insertBefore(placeholder, e.currentTarget);
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    <ImageOff className="w-8 h-8" />
                  </div>
                )}

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                {/* Checkbox in top left */}
                <div
                  className="absolute top-2.5 left-2.5 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(item.id);
                  }}
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md scale-105'
                        : 'bg-black/50 backdrop-blur-xs text-white/50 border border-white/40 hover:border-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Top Right: Type Badge & Zoom/Preview Button */}
                <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePreviewIndex(index);
                    }}
                    title="Zoom / Preview Image"
                    className="p-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white/80 hover:text-white transition-colors"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>

                  <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[11px] font-medium text-white flex items-center gap-1">
                    {item.type === 'video' ? (
                      <>
                        <VideoIcon className="w-3 h-3" />
                        <span>Video</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3 h-3" />
                        <span>Photo</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Item Number in bottom left */}
                <div className="absolute bottom-2.5 left-2.5 z-10 text-white text-xs font-semibold drop-shadow-xs flex items-center gap-1">
                  <span>Image #{item.index}</span>
                  {item.quality && (
                    <span className="text-[10px] text-zinc-300 font-normal opacity-90">
                      • {item.quality}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Tile Controls: Direct Download Button for this single item */}
              <div className="p-2.5 bg-white dark:bg-zinc-900 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[11px] font-mono font-medium uppercase text-zinc-500">
                  {item.extension}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSingleItem(item);
                  }}
                  disabled={isDownloading}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    isDownloaded
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                  } disabled:opacity-50`}
                  title={`Download image ${item.index} directly`}
                >
                  {isDownloading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isDownloaded ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-Screen Lightbox / Zoom Modal */}
      {activeItem && activePreviewIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6"
          onClick={() => setActivePreviewIndex(null)}
        >
          {/* Header */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">
                Image {activePreviewIndex + 1} of {items.length}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 uppercase">
                {activeItem.extension}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadSingleItem(activeItem)}
                disabled={downloadingIds.has(activeItem.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-900 hover:bg-zinc-100 text-xs font-medium transition-colors"
              >
                {downloadingIds.has(activeItem.id) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download this Image</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewIndex(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Image Container */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {activeItem.type === 'video' ? (
              <video
                src={activeItem.downloadUrl}
                controls
                autoPlay
                className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proxied(activeItem.downloadUrl || activeItem.thumbnailUrl)}
                alt={`Image ${activeItem.index}`}
                className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            )}

            {/* Previous Button */}
            {items.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePreviewIndex(
                    (activePreviewIndex - 1 + items.length) % items.length
                  );
                }}
                className="absolute left-2 sm:left-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all backdrop-blur-xs"
                title="Previous Image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Next Button */}
            {items.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePreviewIndex((activePreviewIndex + 1) % items.length);
                }}
                className="absolute right-2 sm:right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all backdrop-blur-xs"
                title="Next Image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Footer Navigation Thumbnails */}
          <div
            className="w-full max-w-2xl flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((it, idx) => (
              <button
                key={it.id}
                type="button"
                onClick={() => setActivePreviewIndex(idx)}
                className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  idx === activePreviewIndex
                    ? 'border-white scale-105 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxied(it.thumbnailUrl)}
                  alt={`Thumb ${it.index}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
