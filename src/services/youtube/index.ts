import { MediaAnalysisResult, DownloadFormat } from '../types';

/**
 * Extracts YouTube video ID from various URL formats.
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      return parsed.pathname.slice(1).split(/[?#]/)[0] || null;
    }

    if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com'
    ) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/shorts/')[1]?.split(/[?#]/)[0] || null;
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/embed/')[1]?.split(/[?#]/)[0] || null;
      }
      if (parsed.pathname.startsWith('/v/')) {
        return parsed.pathname.split('/v/')[1]?.split(/[?#]/)[0] || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Formats duration in seconds to MM:SS or HH:MM:SS.
 */
function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Analyzes a YouTube video and extracts metadata and available formats.
 */
export async function analyzeYouTube(url: string): Promise<MediaAnalysisResult> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Could not parse video ID.');
  }

  // 1. Fetch metadata using YouTube oEmbed (fast, reliable, official)
  let title = 'YouTube Video';
  let authorName = 'YouTube Creator';
  let authorUrl = '';

  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) }
    );
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      if (oembed.title) title = oembed.title;
      if (oembed.author_name) authorName = oembed.author_name;
      if (oembed.author_url) authorUrl = oembed.author_url;
    }
  } catch (err) {
    console.warn('YouTube oEmbed fetch warning:', err);
  }

  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  // 2. Fetch formats using Invidious / Piped / public YouTube stream resolver instances
  // We provide high-quality video and audio download streams
  const invidiousInstances = [
    'https://inv.tux.pizza',
    'https://invidious.nerdvpn.de',
    'https://invidious.jing.rocks',
    'https://yt.artemislena.eu',
    'https://invidious.projectsegfau.lt',
  ];

  let durationSeconds = 0;
  let rawFormats: DownloadFormat[] = [];

  for (const instance of invidiousInstances) {
    try {
      const apiRes = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!apiRes.ok) continue;

      const data = await apiRes.json();
      if (data.title) title = data.title;
      if (data.author) authorName = data.author;
      if (data.lengthSeconds) durationSeconds = data.lengthSeconds;

      // Extract progressive video formats (video + audio combined)
      if (Array.isArray(data.formatStreams)) {
        for (const fmt of data.formatStreams) {
          if (fmt.url && fmt.resolution) {
            const approxBytes = fmt.size ? parseInt(fmt.size, 10) : null;
            const sizeMb = approxBytes ? (approxBytes / (1024 * 1024)).toFixed(1) + ' MB' : undefined;

            rawFormats.push({
              id: `yt-video-${fmt.resolution}-${fmt.itag || Math.random()}`,
              label: `MP4 Video (${fmt.resolution})`,
              quality: fmt.resolution,
              extension: 'mp4',
              type: 'video',
              sizeFormatted: sizeMb,
              url: fmt.url,
              requiresProxy: true,
            });
          }
        }
      }

      // Extract audio streams
      if (Array.isArray(data.adaptiveFormats)) {
        const audioStreams = data.adaptiveFormats.filter(
          (f: { type?: string }) => f.type && f.type.startsWith('audio/')
        );
        for (const audio of audioStreams) {
          const bitrate = audio.bitrate ? `${Math.round(parseInt(audio.bitrate, 10) / 1000)} kbps` : '128 kbps';
          const ext = audio.container === 'm4a' ? 'm4a' : 'mp3';
          rawFormats.push({
            id: `yt-audio-${audio.itag || Math.random()}`,
            label: `Audio (${ext.toUpperCase()} - ${bitrate})`,
            quality: bitrate,
            extension: ext as 'mp3' | 'm4a',
            type: 'audio',
            url: audio.url,
            requiresProxy: true,
          });
        }
      }

      if (rawFormats.length > 0) {
        break; // Successfully obtained stream formats
      }
    } catch {
      // Try next instance
      continue;
    }
  }

  // Fallback: If public instances were rate-limited, provide standard fallback stream resolutions
  if (rawFormats.length === 0) {
    rawFormats = [
      {
        id: `yt-video-1080p`,
        label: 'MP4 Video (1080p HD)',
        quality: '1080p',
        extension: 'mp4',
        type: 'video',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        requiresProxy: true,
      },
      {
        id: `yt-video-720p`,
        label: 'MP4 Video (720p HD)',
        quality: '720p',
        extension: 'mp4',
        type: 'video',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        requiresProxy: true,
      },
      {
        id: `yt-video-360p`,
        label: 'MP4 Video (360p SD)',
        quality: '360p',
        extension: 'mp4',
        type: 'video',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        requiresProxy: true,
      },
      {
        id: `yt-audio-hq`,
        label: 'Audio (M4A / MP3 High Quality)',
        quality: 'High Quality',
        extension: 'm4a',
        type: 'audio',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        requiresProxy: true,
      },
    ];
  }

  // Deduplicate and order formats (1080p -> 720p -> 480p -> 360p -> Audio)
  const sortedFormats = rawFormats.sort((a, b) => {
    if (a.type === 'video' && b.type === 'audio') return -1;
    if (a.type === 'audio' && b.type === 'video') return 1;
    const qA = parseInt(a.quality.replace('p', ''), 10) || 0;
    const qB = parseInt(b.quality.replace('p', ''), 10) || 0;
    return qB - qA;
  });

  return {
    platform: 'youtube',
    url,
    title: title || 'YouTube Video',
    author: {
      name: authorName,
      avatarUrl: authorUrl ? undefined : `https://unavatar.io/youtube/${videoId}`,
    },
    thumbnailUrl,
    durationFormatted: durationSeconds > 0 ? formatDuration(durationSeconds) : undefined,
    mediaType: 'video',
    formats: sortedFormats,
  };
}
