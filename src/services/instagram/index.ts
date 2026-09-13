import { MediaAnalysisResult, CarouselItem, DownloadFormat } from '../types';

/**
 * Extracts Instagram shortcode from standard, reel, or TV post URL.
 */
export function extractInstagramShortcode(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    // Matches /p/:shortcode, /reel/:shortcode, /reels/:shortcode, /tv/:shortcode
    const typeIndex = pathParts.findIndex((part) =>
      ['p', 'reel', 'reels', 'tv'].includes(part.toLowerCase())
    );

    if (typeIndex !== -1 && pathParts[typeIndex + 1]) {
      return pathParts[typeIndex + 1];
    }
  } catch {
    return null;
  }
  return null;
}

/** Decode HTML entities in scraped text/URLs */
function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/\\/g, '');
}

/** Standard browser-like headers for Instagram requests */
const IG_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

export interface InstagramParsedResult {
  carouselItems: CarouselItem[];
  format: DownloadFormat | null;
  meta: {
    title?: string;
    author?: string;
    username?: string;
    avatar?: string;
    thumbnail?: string;
  };
}

/**
 * Extracts the best image URL from candidates or display resources
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBestCandidate(candidates?: any[]): string {
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  const sorted = [...candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0]?.url || sorted[0]?.src || '';
}

/**
 * Universal Instagram parser: parses ANY Instagram API response object,
 * including GraphQL PolarisPostRootQuery, web_info, ?__a=1, and embed payloads.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAnyInstagramMedia(media: any, shortcode: string): InstagramParsedResult {
  const empty: InstagramParsedResult = { carouselItems: [], format: null, meta: {} };
  if (!media || typeof media !== 'object') return empty;

  const carouselItems: CarouselItem[] = [];
  const meta: InstagramParsedResult['meta'] = {};

  // 1. Extract metadata (Caption, Author, Avatar)
  const caption =
    media.caption?.text ||
    media.edge_media_to_caption?.edges?.[0]?.node?.text ||
    media.title ||
    '';
  if (caption) meta.title = caption.slice(0, 80);

  const owner = media.user || media.owner;
  if (owner) {
    if (owner.full_name) meta.author = owner.full_name;
    if (owner.username) meta.username = owner.username;
    if (owner.profile_pic_url) meta.avatar = owner.profile_pic_url;
  }

  // 2. Check for carousel_media (from web_info / items[0] / mobile API)
  if (Array.isArray(media.carousel_media) && media.carousel_media.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    media.carousel_media.forEach((child: any, idx: number) => {
      const isVid = child.media_type === 2 || (Array.isArray(child.video_versions) && child.video_versions.length > 0);
      let downloadUrl = '';
      let thumbUrl = '';

      if (isVid && Array.isArray(child.video_versions) && child.video_versions.length > 0) {
        // Highest resolution video
        const sortedVids = [...child.video_versions].sort((a, b) => (b.width || 0) - (a.width || 0));
        downloadUrl = sortedVids[0]?.url || '';
      }

      if (child.image_versions2?.candidates) {
        thumbUrl = extractBestCandidate(child.image_versions2.candidates);
        if (!downloadUrl) downloadUrl = thumbUrl;
      }

      if (downloadUrl) {
        carouselItems.push({
          id: `ig-carousel-${shortcode}-${idx + 1}`,
          index: idx + 1,
          type: isVid ? 'video' : 'image',
          thumbnailUrl: thumbUrl || downloadUrl,
          downloadUrl: downloadUrl,
          extension: isVid ? 'mp4' : 'jpg',
          quality: isVid ? 'HD Video' : 'Original Photo (High Res)',
        });
      }
    });

    if (carouselItems.length > 0) {
      meta.thumbnail = carouselItems[0].thumbnailUrl;
      return { carouselItems, format: null, meta };
    }
  }

  // 3. Check for edge_sidecar_to_children (from GraphQL shortcode_media)
  const sidecarEdges = media.edge_sidecar_to_children?.edges;
  if (Array.isArray(sidecarEdges) && sidecarEdges.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sidecarEdges.forEach((edge: any, idx: number) => {
      const node = edge?.node;
      if (!node) return;
      const isVid = node.is_video === true;
      const downloadUrl = isVid ? node.video_url : (extractBestCandidate(node.display_resources) || node.display_url);
      const thumbUrl = node.thumbnail_src || node.display_url || extractBestCandidate(node.display_resources) || downloadUrl;

      if (downloadUrl) {
        carouselItems.push({
          id: `ig-carousel-${shortcode}-${idx + 1}`,
          index: idx + 1,
          type: isVid ? 'video' : 'image',
          thumbnailUrl: thumbUrl,
          downloadUrl: downloadUrl,
          extension: isVid ? 'mp4' : 'jpg',
          quality: isVid ? 'HD Video' : 'Original Photo (High Res)',
        });
      }
    });

    if (carouselItems.length > 0) {
      meta.thumbnail = carouselItems[0].thumbnailUrl;
      return { carouselItems, format: null, meta };
    }
  }

  // 4. Single Video
  const isVideo = media.is_video || media.media_type === 2 || !!media.video_url || (Array.isArray(media.video_versions) && media.video_versions.length > 0);
  if (isVideo) {
    let videoUrl = media.video_url || '';
    if (!videoUrl && Array.isArray(media.video_versions) && media.video_versions.length > 0) {
      const sortedVids = [...media.video_versions].sort((a, b) => (b.width || 0) - (a.width || 0));
      videoUrl = sortedVids[0]?.url || '';
    }

    if (videoUrl) {
      const thumb =
        media.thumbnail_src ||
        media.display_url ||
        extractBestCandidate(media.image_versions2?.candidates) ||
        '';
      meta.thumbnail = thumb;

      return {
        carouselItems: [],
        format: {
          id: `ig-video-${shortcode}`,
          label: 'MP4 Video (HD Original)',
          quality: 'Original HD',
          extension: 'mp4',
          type: 'video',
          url: videoUrl,
          requiresProxy: true,
        },
        meta,
      };
    }
  }

  // 5. Single Image
  const imageUrl =
    extractBestCandidate(media.image_versions2?.candidates) ||
    extractBestCandidate(media.display_resources) ||
    media.display_url ||
    '';

  if (imageUrl) {
    meta.thumbnail = imageUrl;
    return {
      carouselItems: [],
      format: {
        id: `ig-photo-${shortcode}`,
        label: 'Photo (High Resolution JPG)',
        quality: 'Original High-Res',
        extension: 'jpg',
        type: 'image',
        url: imageUrl,
        requiresProxy: true,
      },
      meta,
    };
  }

  return empty;
}

/**
 * If the URL is wrapped in a JWT token (e.g. from saveinsta/snapcdn),
 * decodes the payload to get the direct unproxied scontent.cdninstagram.com URL.
 */
function extractDirectCdnUrl(rawUrl: string): string {
  try {
    if (rawUrl.includes('token=')) {
      const parsed = new URL(rawUrl);
      const token = parsed.searchParams.get('token');
      if (token) {
        const parts = token.split('.');
        if (parts[1]) {
          const payloadStr = Buffer.from(parts[1], 'base64').toString('utf-8');
          const payload = JSON.parse(payloadStr);
          if (payload.url && typeof payload.url === 'string' && payload.url.startsWith('http')) {
            return payload.url;
          }
        }
      }
    }
  } catch {
    // fallback
  }
  return rawUrl;
}

/**
 * Strategy 1: JerryCoder / OggyAPI Worker (Supports multi-media carousels and direct CDN extraction)
 */
async function tryOggyApi(cleanPostUrl: string, shortcode: string): Promise<InstagramParsedResult> {
  const empty: InstagramParsedResult = { carouselItems: [], format: null, meta: {} };

  const endpoints = [
    `https://jerrycoder.oggyapi.workers.dev/insta?url=${encodeURIComponent(cleanPostUrl)}`,
    `https://api.vsub.tech/api/instagram?url=${encodeURIComponent(cleanPostUrl)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'User-Agent': IG_HEADERS['User-Agent'],
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(7000),
      });

      if (!res.ok) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json: any = await res.json().catch(() => null);
      if (!json) continue;

      const carouselItems: CarouselItem[] = [];

      // Structure A: data object with media_url_1, media_url_2, ...
      if (json.data && typeof json.data === 'object' && !Array.isArray(json.data)) {
        const d = json.data;
        const total = d.total_media || Object.keys(d).filter((k) => k.startsWith('media_url_')).length;

        if (total > 1) {
          for (let i = 1; i <= Math.max(total, 30); i++) {
            const raw = d[`media_url_${i}`];
            if (!raw) continue;
            const directUrl = extractDirectCdnUrl(raw);
            const isVid = raw.includes('.mp4') || directUrl.includes('.mp4') || d.type === 'video';

            carouselItems.push({
              id: `ig-carousel-${shortcode}-${carouselItems.length + 1}`,
              index: carouselItems.length + 1,
              type: isVid ? 'video' : 'image',
              thumbnailUrl: directUrl || raw,
              downloadUrl: directUrl || raw,
              extension: isVid ? 'mp4' : 'jpg',
              quality: isVid ? 'HD Video' : 'Original Photo (High Res)',
            });
          }

          if (carouselItems.length > 0) {
            return {
              carouselItems,
              format: null,
              meta: {
                thumbnail: carouselItems[0].thumbnailUrl,
              },
            };
          }
        } else if (d.url || d.media_url_1) {
          const chosenUrl = d.media_url_1 || d.url;
          const directUrl = extractDirectCdnUrl(chosenUrl);
          const isVid = d.type === 'video' || directUrl.includes('.mp4') || chosenUrl.includes('.mp4');
          return {
            carouselItems: [],
            format: {
              id: `ig-media-${shortcode}`,
              label: isVid ? 'MP4 Video (HD Original)' : 'Photo (High Res JPG)',
              quality: 'Original HD',
              extension: isVid ? 'mp4' : 'jpg',
              type: isVid ? 'video' : 'image',
              url: directUrl || chosenUrl,
              requiresProxy: true,
            },
            meta: {
              thumbnail: directUrl || chosenUrl,
            },
          };
        }
      }

      // Structure B: data array
      if (Array.isArray(json.data) && json.data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.data.forEach((item: any, idx: number) => {
          const rawUrl = item.url || item.download_url || '';
          if (!rawUrl) return;
          const directUrl = extractDirectCdnUrl(rawUrl);
          const isVid = item.type === 'video' || directUrl.includes('.mp4') || rawUrl.includes('.mp4');

          carouselItems.push({
            id: `ig-carousel-${shortcode}-${idx + 1}`,
            index: idx + 1,
            type: isVid ? 'video' : 'image',
            thumbnailUrl: item.thumbnail || directUrl || rawUrl,
            downloadUrl: directUrl || rawUrl,
            extension: isVid ? 'mp4' : 'jpg',
            quality: isVid ? 'HD Video' : 'Original Photo (High Res)',
          });
        });

        if (carouselItems.length > 1) {
          return {
            carouselItems,
            format: null,
            meta: {
              thumbnail: carouselItems[0].thumbnailUrl,
            },
          };
        }
      }
    } catch {
      // try next endpoint
    }
  }

  return empty;
}

/**
 * Strategy 2: PolarisPostRootQuery GraphQL API
 * Uses Instagram's modern persisted query endpoints.
 */
async function tryPolarisGraphQL(shortcode: string): Promise<InstagramParsedResult> {
  const empty: InstagramParsedResult = { carouselItems: [], format: null, meta: {} };
  const configs = [
    {
      endpoint: 'https://www.instagram.com/api/graphql',
      docId: '10015901848480474',
      friendlyName: 'PolarisPostActionLoadPostQueryQuery',
    },
    {
      endpoint: 'https://www.instagram.com/api/graphql',
      docId: '8845758582119845',
      friendlyName: 'PolarisPostActionLoadPostQueryQuery',
    },
    {
      endpoint: 'https://www.instagram.com/graphql/query',
      docId: '27128499623469141',
      friendlyName: 'PolarisPostRootQuery',
    },
  ];

  for (const cfg of configs) {
    try {
      const body = new URLSearchParams({
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: cfg.friendlyName,
        variables: JSON.stringify({ shortcode }),
        doc_id: cfg.docId,
      });

      const res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: {
          ...IG_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-IG-App-ID': '936619743392459',
          'X-FB-Friendly-Name': cfg.friendlyName,
          Referer: `https://www.instagram.com/p/${shortcode}/`,
          Origin: 'https://www.instagram.com',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json: any = await res.json().catch(() => null);
      if (!json) continue;

      const media =
        json.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0] ||
        json.data?.xdt_shortcode_media ||
        json.data?.shortcode_media;

      if (media) {
        const parsed = parseAnyInstagramMedia(media, shortcode);
        if (parsed.carouselItems.length > 0 || parsed.format) {
          return parsed;
        }
      }
    } catch {
      // try next config
    }
  }

  return empty;
}

/**
 * Converts Instagram shortcode to 64-bit numeric media ID.
 */
export function shortcodeToMediaId(shortcode: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (let i = 0; i < shortcode.length; i++) {
    const char = shortcode[i];
    const val = BigInt(alphabet.indexOf(char));
    if (val < BigInt(0)) continue;
    id = id * BigInt(64) + val;
  }
  return id.toString();
}

/**
 * Strategy: Instagram Mobile Media Info API (Uses numeric media ID)
 */
async function tryMobileMediaInfo(shortcode: string): Promise<InstagramParsedResult> {
  const empty: InstagramParsedResult = { carouselItems: [], format: null, meta: {} };
  const mediaId = shortcodeToMediaId(shortcode);
  if (!mediaId || mediaId === '0') return empty;

  try {
    const url = `https://i.instagram.com/api/v1/media/${mediaId}/info/`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Instagram 219.0.0.12.117 Android (30/11; 480dpi; 1080x2280; OnePlus; GM1903; OnePlus7; qcom; en_US; 345091763)',
        'X-IG-App-ID': '936619743392459',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: '*/*',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return empty;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json().catch(() => null);
    if (!json?.items?.[0]) return empty;

    return parseAnyInstagramMedia(json.items[0], shortcode);
  } catch {
    return empty;
  }
}

/**
 * Strategy 2: Instagram Web Info API
 */
async function tryWebInfo(shortcode: string): Promise<InstagramParsedResult> {
  const empty: InstagramParsedResult = { carouselItems: [], format: null, meta: {} };

  try {
    const url = `https://www.instagram.com/api/v1/media/shortcode/${shortcode}/web_info/`;
    const res = await fetch(url, {
      headers: {
        ...IG_HEADERS,
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return empty;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json().catch(() => null);
    if (!json?.items?.[0]) return empty;

    return parseAnyInstagramMedia(json.items[0], shortcode);
  } catch {
    return empty;
  }
}

/**
 * Strategy 3: Scrape Instagram's shared_data / ?__a=1&__d=dis JSON.
 */
async function trySharedData(shortcode: string): Promise<InstagramParsedResult> {
  const empty: InstagramParsedResult = { carouselItems: [], format: null, meta: {} };

  try {
    const pageUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;
    const res = await fetch(pageUrl, {
      headers: {
        ...IG_HEADERS,
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return empty;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json().catch(() => null);
    if (!json) return empty;

    const media = json.items?.[0] || json.graphql?.shortcode_media;
    if (media) {
      return parseAnyInstagramMedia(media, shortcode);
    }
  } catch {
    return empty;
  }
  return empty;
}

/**
 * Strategy 4: Cobalt Multi-Instance API (Extracts Carousel Pickers & Media)
 */
async function tryCobalt(
  cleanPostUrl: string,
  shortcode: string
): Promise<{ carouselItems: CarouselItem[]; format: DownloadFormat | null }> {
  const cobaltInstances = [
    'https://api.cobalt.tools',
    'https://cobalt-api.kwiatekm.tokyo',
    'https://cobalt.api.scav.top',
    'https://co.wuk.sh',
  ];

  for (const instance of cobaltInstances) {
    try {
      const res = await fetch(instance, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: cleanPostUrl }),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;

      const text = await res.text();
      let data: {
        status?: string;
        picker?: Array<{ type?: string; url?: string; thumb?: string }>;
        url?: string;
        filename?: string;
      };
      try {
        data = JSON.parse(text);
      } catch {
        continue;
      }

      if (data.status === 'picker' && Array.isArray(data.picker) && data.picker.length > 0) {
        const items: CarouselItem[] = data.picker
          .map((item, idx) => {
            const isVid = item.type === 'video' || item.url?.includes('.mp4');
            const mediaUrl = item.url || '';
            if (!mediaUrl) return null;
            return {
              id: `ig-carousel-${shortcode}-${idx + 1}`,
              index: idx + 1,
              type: (isVid ? 'video' : 'image') as 'video' | 'image',
              thumbnailUrl: item.thumb || item.url || '',
              downloadUrl: mediaUrl,
              extension: (isVid ? 'mp4' : 'jpg') as 'mp4' | 'jpg',
              quality: isVid ? 'HD Video' : 'Original Photo',
            };
          })
          .filter(Boolean) as CarouselItem[];

        if (items.length > 0) return { carouselItems: items, format: null };
      } else if (data.url) {
        const isVid = data.filename?.endsWith('.mp4') || data.url.includes('.mp4');
        const format: DownloadFormat = {
          id: `ig-media-${shortcode}`,
          label: isVid ? 'MP4 Video (HD Original)' : 'Photo (High Res JPG)',
          quality: 'Original HD',
          extension: isVid ? 'mp4' : 'jpg',
          type: isVid ? 'video' : 'image',
          url: data.url,
          requiresProxy: true,
        };
        return { carouselItems: [], format };
      }
    } catch {
      // try next instance
    }
  }
  return { carouselItems: [], format: null };
}

/**
 * Strategy 5: Public Instagram Scraper / Proxy Resolvers
 */
async function tryPublicResolvers(
  cleanPostUrl: string,
  shortcode: string
): Promise<InstagramParsedResult> {
  const empty: InstagramParsedResult = { carouselItems: [], format: null, meta: {} };

  try {
    const resolverUrl = `https://api.vsub.tech/api/instagram?url=${encodeURIComponent(cleanPostUrl)}`;
    const res = await fetch(resolverUrl, {
      headers: {
        'User-Agent': IG_HEADERS['User-Agent'],
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json: any = await res.json().catch(() => null);
      if (json && json.status === 'success' && Array.isArray(json.data)) {
        const carouselItems: CarouselItem[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.data.forEach((item: any, idx: number) => {
          const isVid = item.type === 'video' || item.url?.includes('.mp4');
          const dlUrl = item.url;
          if (dlUrl) {
            carouselItems.push({
              id: `ig-carousel-${shortcode}-${idx + 1}`,
              index: idx + 1,
              type: isVid ? 'video' : 'image',
              thumbnailUrl: item.thumbnail || dlUrl,
              downloadUrl: dlUrl,
              extension: isVid ? 'mp4' : 'jpg',
              quality: isVid ? 'HD Video' : 'Original Photo',
            });
          }
        });

        if (carouselItems.length > 1) {
          return {
            carouselItems,
            format: null,
            meta: {
              title: json.caption ? json.caption.slice(0, 80) : undefined,
              author: json.owner?.username || undefined,
            },
          };
        } else if (carouselItems.length === 1) {
          const it = carouselItems[0];
          return {
            carouselItems: [],
            format: {
              id: `ig-media-${shortcode}`,
              label: it.type === 'video' ? 'MP4 Video (HD)' : 'Photo (Original JPG)',
              quality: 'High Resolution',
              extension: it.extension,
              type: it.type,
              url: it.downloadUrl,
              requiresProxy: true,
            },
            meta: {
              thumbnail: it.thumbnailUrl,
            },
          };
        }
      }
    }
  } catch {
    // ignore
  }

  return empty;
}

/**
 * Strategy 6: Embed Page HTML & Embedded Script Scraper
 */
async function tryEmbedPage(shortcode: string): Promise<InstagramParsedResult> {
  const empty: InstagramParsedResult = { carouselItems: [], format: null, meta: {} };

  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const res = await fetch(embedUrl, {
      headers: IG_HEADERS,
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return empty;
    const html = await res.text();

    // Check for window.__additionalDataLoaded or window._sharedData
    const jsonMatches = [
      html.match(/window\.__additionalDataLoaded\s*\(\s*['"][^'"]*['"]\s*,\s*(\{[\s\S]+?\})\s*\)\s*;/),
      html.match(/window\._sharedData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/),
    ];

    for (const match of jsonMatches) {
      if (!match?.[1]) continue;
      try {
        const jsonData = JSON.parse(match[1]);
        const media = jsonData?.graphql?.shortcode_media || jsonData?.items?.[0] || null;
        if (media) {
          const result = parseAnyInstagramMedia(media, shortcode);
          if (result.carouselItems.length > 0 || result.format) return result;
        }
      } catch {
        // continue
      }
    }

    // Fallback: HTML extraction
    const meta: InstagramParsedResult['meta'] = {};
    const authorMatch = html.match(/class="CaptionUsername"[^>]*>([^<]+)<\/a>/i);
    if (authorMatch?.[1]) {
      meta.username = authorMatch[1].trim();
      meta.author = `@${meta.username}`;
    }

    const captionMatch = html.match(/class="CaptionComments"[^>]*>([\s\S]*?)<\/div>/i);
    if (captionMatch?.[1]) {
      meta.title = captionMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 80);
    }

    const videoMatch = html.match(/<video[^>]+src="([^">]+)"/i);
    const imgMatch = html.match(/<img[^>]+class="[^"]*EmbeddedMediaImage[^"]*"[^>]+src="([^">]+)"/i);

    if (videoMatch?.[1]) {
      const url = decodeHtml(videoMatch[1]);
      meta.thumbnail = imgMatch ? decodeHtml(imgMatch[1]) : url;
      return {
        carouselItems: [],
        format: {
          id: `ig-video-${shortcode}`,
          label: 'MP4 Video (HD)',
          quality: 'HD',
          extension: 'mp4',
          type: 'video',
          url,
          requiresProxy: true,
        },
        meta,
      };
    }

    if (imgMatch?.[1]) {
      const url = decodeHtml(imgMatch[1]);
      meta.thumbnail = url;
      return {
        carouselItems: [],
        format: {
          id: `ig-photo-${shortcode}`,
          label: 'Photo (Full Resolution JPG)',
          quality: 'Full Resolution',
          extension: 'jpg',
          type: 'image',
          url,
          requiresProxy: true,
        },
        meta,
      };
    }
  } catch (err) {
    console.warn('[instagram] embed page error:', err);
  }

  return empty;
}

/**
 * Analyzes Instagram URL and extracts individual images, reels, or full multi-image carousel items.
 */
export async function analyzeInstagram(rawUrl: string): Promise<MediaAnalysisResult> {
  const shortcode = extractInstagramShortcode(rawUrl);
  if (!shortcode) {
    throw new Error('Invalid Instagram URL. Could not parse post shortcode.');
  }

  const cleanPostUrl = `https://www.instagram.com/p/${shortcode}/`;

  let title = `Instagram Post`;
  let authorName = 'Instagram Creator';
  let authorUsername = '';
  let avatarUrl: string | undefined;
  let thumbnailUrl = '';
  let carouselItems: CarouselItem[] = [];
  let format: DownloadFormat | null = null;

  // Run primary strategies concurrently
  const [oggyRes, mobileRes, polarisRes, webInfoRes, sharedDataRes, cobaltRes, publicRes] = await Promise.allSettled([
    tryOggyApi(cleanPostUrl, shortcode),
    tryMobileMediaInfo(shortcode),
    tryPolarisGraphQL(shortcode),
    tryWebInfo(shortcode),
    trySharedData(shortcode),
    tryCobalt(cleanPostUrl, shortcode),
    tryPublicResolvers(cleanPostUrl, shortcode),
  ]);

  const applyMeta = (meta?: InstagramParsedResult['meta']) => {
    if (!meta) return;
    if (meta.title && !title.startsWith('Instagram')) title = meta.title;
    if (meta.author) authorName = meta.author;
    if (meta.username) authorUsername = meta.username;
    if (meta.avatar) avatarUrl = meta.avatar;
    if (meta.thumbnail) thumbnailUrl = meta.thumbnail;
  };

  // Collect metadata from all fulfilled strategies
  if (oggyRes.status === 'fulfilled') applyMeta(oggyRes.value.meta);
  if (mobileRes.status === 'fulfilled') applyMeta(mobileRes.value.meta);
  if (polarisRes.status === 'fulfilled') applyMeta(polarisRes.value.meta);
  if (webInfoRes.status === 'fulfilled') applyMeta(webInfoRes.value.meta);
  if (sharedDataRes.status === 'fulfilled') applyMeta(sharedDataRes.value.meta);
  if (publicRes.status === 'fulfilled') applyMeta(publicRes.value.meta);

  // PRIORITY ORDER FOR CAROUSEL / FORMAT:
  // 1. OggyAPI / JerryCoder carousel (extracts all carousel slides)
  if (oggyRes.status === 'fulfilled' && oggyRes.value.carouselItems.length > 0) {
    carouselItems = oggyRes.value.carouselItems;
  }
  // 2. Mobile Media Info API carousel
  else if (mobileRes.status === 'fulfilled' && mobileRes.value.carouselItems.length > 0) {
    carouselItems = mobileRes.value.carouselItems;
  }
  // 3. Polaris GraphQL carousel
  else if (polarisRes.status === 'fulfilled' && polarisRes.value.carouselItems.length > 0) {
    carouselItems = polarisRes.value.carouselItems;
  }
  // 4. Web Info API carousel
  else if (webInfoRes.status === 'fulfilled' && webInfoRes.value.carouselItems.length > 0) {
    carouselItems = webInfoRes.value.carouselItems;
  }
  // 5. Shared Data / ?__a=1 carousel
  else if (sharedDataRes.status === 'fulfilled' && sharedDataRes.value.carouselItems.length > 0) {
    carouselItems = sharedDataRes.value.carouselItems;
  }
  // 6. Cobalt API carousel picker
  else if (cobaltRes.status === 'fulfilled' && cobaltRes.value.carouselItems.length > 0) {
    carouselItems = cobaltRes.value.carouselItems;
  }
  // 7. Public resolver carousel
  else if (publicRes.status === 'fulfilled' && publicRes.value.carouselItems.length > 0) {
    carouselItems = publicRes.value.carouselItems;
  }
  // If no carousel found, check for single format
  else if (oggyRes.status === 'fulfilled' && oggyRes.value.format) {
    format = oggyRes.value.format;
  } else if (mobileRes.status === 'fulfilled' && mobileRes.value.format) {
    format = mobileRes.value.format;
  } else if (polarisRes.status === 'fulfilled' && polarisRes.value.format) {
    format = polarisRes.value.format;
  } else if (webInfoRes.status === 'fulfilled' && webInfoRes.value.format) {
    format = webInfoRes.value.format;
  } else if (sharedDataRes.status === 'fulfilled' && sharedDataRes.value.format) {
    format = sharedDataRes.value.format;
  } else if (cobaltRes.status === 'fulfilled' && cobaltRes.value.format) {
    format = cobaltRes.value.format;
  } else if (publicRes.status === 'fulfilled' && publicRes.value.format) {
    format = publicRes.value.format;
  }

  // Fallback to embed page if still nothing
  if (carouselItems.length === 0 && !format) {
    const embedRes = await tryEmbedPage(shortcode);
    applyMeta(embedRes.meta);
    if (embedRes.carouselItems.length > 0) {
      carouselItems = embedRes.carouselItems;
    } else if (embedRes.format) {
      format = embedRes.format;
    }
  }

  // oEmbed fallback if still nothing
  if (carouselItems.length === 0 && !format) {
    try {
      const oembedRes = await fetch(
        `https://api.instagram.com/oembed/?url=${encodeURIComponent(cleanPostUrl)}`,
        { headers: { 'User-Agent': IG_HEADERS['User-Agent'] }, signal: AbortSignal.timeout(5000) }
      );
      const ct = oembedRes.headers.get('content-type') || '';
      if (oembedRes.ok && ct.includes('application/json')) {
        const oembed = (await oembedRes.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };
        if (oembed.title) title = oembed.title;
        if (oembed.author_name) {
          authorName = oembed.author_name;
          authorUsername = oembed.author_name;
        }
        if (oembed.thumbnail_url) {
          thumbnailUrl = oembed.thumbnail_url;
          format = {
            id: `ig-photo-oembed-${shortcode}`,
            label: 'Photo / Media (High Res)',
            quality: 'High Resolution',
            extension: 'jpg',
            type: 'image',
            url: oembed.thumbnail_url,
            requiresProxy: true,
          };
        }
      }
    } catch {
      /* ignored */
    }
  }

  // Absolute last resort fallback: direct media endpoint
  if (carouselItems.length === 0 && !format) {
    thumbnailUrl = thumbnailUrl || `https://www.instagram.com/p/${shortcode}/media/?size=l`;
    format = {
      id: `ig-fallback-${shortcode}`,
      label: 'Photo / Media (Original)',
      quality: 'Original',
      extension: 'jpg',
      type: 'image',
      url: `https://www.instagram.com/p/${shortcode}/media/?size=l`,
      requiresProxy: true,
    };
  }

  // Build final result: if carousel, display all images
  if (carouselItems.length > 0) {
    if (!thumbnailUrl) thumbnailUrl = carouselItems[0].thumbnailUrl;
    return {
      platform: 'instagram',
      url: rawUrl,
      title: title || `Instagram Post (${shortcode})`,
      author: { name: authorName, username: authorUsername || undefined, avatarUrl },
      thumbnailUrl,
      mediaType: 'carousel',
      formats: [],
      carouselItems,
    };
  }

  return {
    platform: 'instagram',
    url: rawUrl,
    title: title || `Instagram Post (${shortcode})`,
    author: { name: authorName, username: authorUsername || undefined, avatarUrl },
    thumbnailUrl: thumbnailUrl || `https://www.instagram.com/p/${shortcode}/media/?size=l`,
    mediaType: format?.type === 'video' ? 'video' : 'image',
    formats: format ? [format] : [],
  };
}
