'use client';

import React, { useState } from 'react';
import { MediaAnalysisResult } from '@/services/types';
import { PlatformBadge } from './PlatformBadge';
import { Clock, User, ImageOff } from 'lucide-react';

interface MediaPreviewProps {
  media: MediaAnalysisResult;
}

/** Route all external thumbnail/avatar URLs through the server-side proxy so CDN
 *  hotlink-protection (403/empty responses) doesn't break the preview. */
function proxied(url: string | undefined): string | undefined {
  if (!url) return undefined;
  // Already a relative/local URL – no proxy needed
  if (url.startsWith('/') || url.startsWith('data:')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

function ThumbnailImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
        <ImageOff className="w-8 h-8" />
        <span className="text-xs">No Preview</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}

export function MediaPreview({ media }: MediaPreviewProps) {
  const thumbSrc = proxied(media.thumbnailUrl);
  const avatarSrc = proxied(media.author.avatarUrl);

  return (
    <div className="flex flex-col md:flex-row gap-5 items-start p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm dark:shadow-none">
      {/* Thumbnail */}
      <div className="relative w-full md:w-56 h-48 sm:h-52 md:h-36 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
        {thumbSrc ? (
          <ThumbnailImage src={thumbSrc} alt={media.title} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
            <ImageOff className="w-8 h-8" />
            <span className="text-xs">No Preview</span>
          </div>
        )}

        {media.durationFormatted && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white text-xs font-mono font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{media.durationFormatted}</span>
          </div>
        )}
      </div>

      {/* Info Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <PlatformBadge platform={media.platform} size="sm" />
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
              {media.mediaType === 'carousel'
                ? `Carousel (${media.carouselItems?.length || 0} items)`
                : media.mediaType}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug tracking-tight">
            {media.title}
          </h2>
        </div>

        {/* Author / Channel */}
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center gap-2.5">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={media.author.name}
              className="w-6 h-6 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
              <User className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
            {media.author.name}
          </span>
          {media.author.username && media.author.username !== media.author.name && (
            <span className="text-xs text-zinc-400 truncate">
              @{media.author.username}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
