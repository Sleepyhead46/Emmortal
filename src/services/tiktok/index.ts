import { MediaAnalysisResult, DownloadFormat, CarouselItem } from '../types';

/**
 * Resolves short TikTok URLs (e.g. vt.tiktok.com, vm.tiktok.com) to full URLs.
 */
async function resolveTikTokRedirect(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      },
      signal: AbortSignal.timeout(5000),
    });
    return res.url || url;
  } catch {
    return url;
  }
}

/**
 * Analyzes TikTok URL and extracts watermark-free video, audio, cover, or photo items.
 */
export async function analyzeTikTok(rawUrl: string): Promise<MediaAnalysisResult> {
  const resolvedUrl = await resolveTikTokRedirect(rawUrl);

  let title = 'TikTok Video';
  let authorName = 'TikTok Creator';
  let authorUsername = '';
  let avatarUrl = '';
  let thumbnailUrl = '';
  const formats: DownloadFormat[] = [];
  const carouselItems: CarouselItem[] = [];

  // Approach 1: Query TikWM API
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(resolvedUrl)}&count=12&cursor=0&web=1&hd=1`;
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const json = await res.json();
      if (json && json.code === 0 && json.data) {
        const data = json.data;
        title = data.title || title;

        if (data.author) {
          authorName = data.author.nickname || data.author.unique_id || authorName;
          authorUsername = data.author.unique_id || '';
          avatarUrl = data.author.avatar || '';
        }

        thumbnailUrl = data.cover || data.origin_cover || '';

        // If it's a TikTok photo slide/carousel
        if (Array.isArray(data.images) && data.images.length > 0) {
          data.images.forEach((imgUrl: string, idx: number) => {
            carouselItems.push({
              id: `tiktok-slide-${idx + 1}`,
              index: idx + 1,
              type: 'image',
              thumbnailUrl: imgUrl,
              downloadUrl: imgUrl,
              extension: 'jpg',
              quality: 'Original HD',
            });
          });
        } else {
          // Standard Video
          if (data.hdplay) {
            formats.push({
              id: 'tiktok-video-hd',
              label: 'MP4 Video (HD No Watermark)',
              quality: '1080p HD',
              extension: 'mp4',
              type: 'video',
              url: data.hdplay.startsWith('http') ? data.hdplay : `https://www.tikwm.com${data.hdplay}`,
              requiresProxy: true,
            });
          }

          if (data.play) {
            formats.push({
              id: 'tiktok-video-watermark-free',
              label: 'MP4 Video (No Watermark)',
              quality: '720p',
              extension: 'mp4',
              type: 'video',
              url: data.play.startsWith('http') ? data.play : `https://www.tikwm.com${data.play}`,
              requiresProxy: true,
            });
          }
        }

        // Audio track
        if (data.music) {
          formats.push({
            id: 'tiktok-audio',
            label: `Audio (${data.music_info?.title || 'Original Soundtrack'} - MP3)`,
            quality: 'Original Audio',
            extension: 'mp3',
            type: 'audio',
            url: data.music.startsWith('http') ? data.music : `https://www.tikwm.com${data.music}`,
            requiresProxy: true,
          });
        }

        // Cover thumbnail
        if (thumbnailUrl) {
          formats.push({
            id: 'tiktok-cover',
            label: 'Cover Thumbnail (JPG)',
            quality: 'HD Image',
            extension: 'jpg',
            type: 'image',
            url: thumbnailUrl,
            requiresProxy: true,
          });
        }
      }
    }
  } catch (err) {
    console.warn('TikTok TikWM API warning:', err);
  }

  // Fallback: TikTok oEmbed if API failed
  if (formats.length === 0 && carouselItems.length === 0) {
    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) }
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        if (oembed.title) title = oembed.title;
        if (oembed.author_name) authorName = oembed.author_name;
        if (oembed.author_unique_id) authorUsername = oembed.author_unique_id;
        if (oembed.thumbnail_url) {
          thumbnailUrl = oembed.thumbnail_url;
          formats.push({
            id: 'tiktok-cover-fallback',
            label: 'TikTok Video Thumbnail (JPG)',
            quality: 'HD Cover',
            extension: 'jpg',
            type: 'image',
            url: oembed.thumbnail_url,
            requiresProxy: true,
          });
        }
      }
    } catch (err) {
      console.warn('TikTok oEmbed fallback warning:', err);
    }
  }

  if (formats.length === 0 && carouselItems.length === 0) {
    throw new Error('Could not retrieve TikTok media details. The video may be private or removed.');
  }

  return {
    platform: 'tiktok',
    url: rawUrl,
    title,
    author: {
      name: authorName,
      username: authorUsername,
      avatarUrl: avatarUrl || undefined,
    },
    thumbnailUrl,
    mediaType: carouselItems.length > 0 ? 'carousel' : 'video',
    formats,
    carouselItems: carouselItems.length > 0 ? carouselItems : undefined,
  };
}
