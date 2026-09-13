import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { streamMediaDownload } from '@/services/downloader';
import { rateLimiter, getClientIp } from '@/services/security/rate-limiter';
import { validateSafeUrl } from '@/services/security/ssrf';
import { logger } from '@/lib/logger';

const DownloadSchema = z.object({
  url: z.string().trim().url('Invalid media URL.'),
  filename: z.string().trim().default('media'),
  extension: z.string().trim().default('mp4'),
  platform: z.enum(['youtube', 'instagram', 'tiktok']).default('youtube'),
  mimeType: z.string().optional(),
});

export async function GET(req: NextRequest) {
  // Extract query parameters
  const { searchParams } = new URL(req.url);
  const rawParams = {
    url: searchParams.get('url') || '',
    filename: searchParams.get('filename') || 'media',
    extension: searchParams.get('extension') || 'mp4',
    platform: (searchParams.get('platform') || 'youtube') as 'youtube' | 'instagram' | 'tiktok',
    mimeType: searchParams.get('mimeType') || undefined,
  };

  return handleDownload(req, rawParams);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  return handleDownload(req, body);
}

async function handleDownload(req: NextRequest, payload: unknown) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  logger.info('media.download.request', { requestId, method: req.method });
  try {
    // 1. Rate limiter
    const clientIp = getClientIp(req);
    const rateCheck = rateLimiter.check(clientIp, 60, 60000); // 60 download requests/min
    if (!rateCheck.allowed) {
      logger.warn('media.download.rate_limited', { requestId });
      return NextResponse.json(
        {
          error: 'Download rate limit exceeded. Please wait a moment.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(rateCheck.resetTimeMs / 1000).toString(),
          },
        }
      );
    }

    // 2. Validate payload
    const parsed = DownloadSchema.safeParse(payload);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid download parameters.';
      logger.warn('media.download.invalid_payload', { requestId });
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { url, filename, extension, platform, mimeType } = parsed.data;

    // 3. SSRF Check
    const ssrfCheck = validateSafeUrl(url);
    if (!ssrfCheck.isValid) {
      logger.warn('media.download.blocked_url', { requestId, platform });
      return NextResponse.json({ error: ssrfCheck.error || 'Access to media URL is denied.' }, { status: 403 });
    }

    // 4. Stream media to browser
    const rangeHeader = req.headers.get('range');
    logger.info('media.download.streaming', { requestId, platform, hasRange: Boolean(rangeHeader), durationMs: Date.now() - startedAt });
    return await streamMediaDownload(
      {
        url,
        filename,
        extension,
        platform,
        mimeType,
      },
      rangeHeader
    );
  } catch (error: unknown) {
    logger.error('media.download.failed', error, { requestId, durationMs: Date.now() - startedAt });
    const message = error instanceof Error ? error.message : 'Failed to stream media download.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
