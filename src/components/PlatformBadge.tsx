'use client';

import React from 'react';
import { Platform } from '@/services/types';

interface PlatformBadgeProps {
  platform: Platform;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// Crisp YouTube SVG
function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// Crisp Instagram SVG
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

// Crisp TikTok SVG
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3.1 15.68a6.34 6.34 0 0 0 10.82 4.48c.02-.02.04-.04.06-.06V11.2a8.28 8.28 0 0 0 5.61 2.16V9.91a4.84 4.84 0 0 1-3-.97v-.01a4.85 4.85 0 0 1-2-2.24Z" />
    </svg>
  );
}

export function PlatformBadge({ platform, size = 'md', showLabel = true }: PlatformBadgeProps) {
  const configs = {
    youtube: {
      name: 'YouTube',
      icon: YouTubeIcon,
      bgColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    instagram: {
      name: 'Instagram',
      icon: InstagramIcon,
      bgColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
      iconColor: 'text-pink-600 dark:text-pink-400',
    },
    tiktok: {
      name: 'TikTok',
      icon: TikTokIcon,
      bgColor: 'bg-zinc-800/10 dark:bg-zinc-100/10 text-zinc-900 dark:text-zinc-100 border-zinc-400/20',
      iconColor: 'text-zinc-900 dark:text-zinc-100',
    },
  };

  const config = configs[platform] || configs.youtube;
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-3 py-1 gap-2',
    lg: 'text-base px-4 py-1.5 gap-2.5',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={`inline-flex items-center font-medium rounded-full border transition-all duration-200 ${config.bgColor} ${sizeClasses[size]}`}
    >
      <IconComponent className={`${iconSizes[size]} ${config.iconColor}`} />
      {showLabel && <span>{config.name}</span>}
    </div>
  );
}
