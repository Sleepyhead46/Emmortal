export type Platform = 'youtube' | 'instagram' | 'tiktok';

export type MediaType = 'video' | 'audio' | 'image' | 'carousel';

export interface DownloadFormat {
  id: string;
  label: string;
  quality: string;
  extension: 'mp4' | 'mp3' | 'm4a' | 'jpg' | 'png' | 'webp';
  type: 'video' | 'audio' | 'image';
  sizeFormatted?: string;
  url: string;
  requiresProxy?: boolean;
}

export interface CarouselItem {
  id: string;
  index: number;
  type: 'image' | 'video';
  thumbnailUrl: string;
  downloadUrl: string;
  extension: 'jpg' | 'mp4' | 'webp';
  width?: number;
  height?: number;
  quality?: string;
}

export interface MediaAnalysisResult {
  platform: Platform;
  url: string;
  title: string;
  author: {
    name: string;
    username?: string;
    avatarUrl?: string;
  };
  thumbnailUrl: string;
  durationFormatted?: string;
  mediaType: MediaType;
  formats: DownloadFormat[];
  carouselItems?: CarouselItem[];
  stats?: {
    views?: string;
    likes?: string;
    shares?: string;
  };
}

export interface DownloadRequest {
  url: string;
  filename: string;
  extension: string;
  platform: Platform;
  mimeType?: string;
}
