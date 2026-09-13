import { MediaAnalysisResult, DownloadRequest } from '../types';
import { identifyPlatform, validateSafeUrl } from '../security/ssrf';
import { analyzeYouTube } from '../youtube';
import { analyzeInstagram } from '../instagram';
import { analyzeTikTok } from '../tiktok';
import { sanitizeDownloadFilename, getMimeType } from '../security/sanitizer';

/**
 * Dispatches analysis request to the appropriate platform provider.
 */
export async function analyzeMedia(url: string): Promise<MediaAnalysisResult> {
  const platformCheck = identifyPlatform(url);
  if (platformCheck.error || !platformCheck.platform) {
    throw new Error(platformCheck.error || 'Unsupported media platform.');
  }

  switch (platformCheck.platform) {
    case 'youtube':
      return await analyzeYouTube(url);
    case 'instagram':
      return await analyzeInstagram(url);
    case 'tiktok':
      return await analyzeTikTok(url);
    default:
      throw new Error('Unsupported media platform.');
  }
}

/**
 * Fetches media from upstream URL and streams directly to client response
 * with proper attachment headers, zero memory buffering, and range support.
 */
export async function streamMediaDownload(
  req: DownloadRequest,
  rangeHeader?: string | null
): Promise<Response> {
  const { url, filename, extension } = req;

  // SSRF check on target stream URL
  const check = validateSafeUrl(url);
  if (!check.isValid || !check.url) {
    return new Response(JSON.stringify({ error: check.error || 'Forbidden media URL.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const safeFilename = sanitizeDownloadFilename(filename, 'media', extension);
  const mimeType = req.mimeType || getMimeType(extension);

  // Setup upstream request headers
  const upstreamHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: '*/*',
    'Accept-Encoding': 'identity', // Avoid compressed responses when streaming media
  };

  // Preserve Range header for resumable or partial media streams
  if (rangeHeader) {
    upstreamHeaders['Range'] = rangeHeader;
  }

  // Set appropriate Referer depending on the platform / target host
  const host = check.url.hostname.toLowerCase();
  if (host.includes('tiktok') || host.includes('tikwm')) {
    upstreamHeaders['Referer'] = 'https://www.tiktok.com/';
  } else if (
    host.includes('instagram') ||
    host.includes('cdninstagram') ||
    host.includes('fbcdn')
  ) {
    upstreamHeaders['Referer'] = 'https://www.instagram.com/';
  } else if (host.includes('youtube') || host.includes('googlevideo')) {
    upstreamHeaders['Referer'] = 'https://www.youtube.com/';
  }

  try {
    const upstreamRes = await fetch(url, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(30000), // 30-second initial connection timeout
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return new Response(
        JSON.stringify({
          error: `Upstream media server returned error ${upstreamRes.status}: ${upstreamRes.statusText}`,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Client response headers
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', mimeType);
    responseHeaders.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(safeFilename)}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
    );
    responseHeaders.set('Cache-Control', 'public, max-age=3600');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    const acceptRanges = upstreamRes.headers.get('accept-ranges');
    if (acceptRanges) {
      responseHeaders.set('Accept-Ranges', acceptRanges);
    }

    const status = upstreamRes.status === 206 ? 206 : 200;

    // Stream directly via upstream body ReadableStream
    return new Response(upstreamRes.body as unknown as BodyInit, {
      status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown download streaming error';
    return new Response(JSON.stringify({ error: `Streaming failed: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
