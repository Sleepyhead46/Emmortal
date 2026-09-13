import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { streamMediaDownload } from '@/services/downloader';
import { rateLimiter, getClientIp } from '@/services/security/rate-limiter';
import { validateSafeUrl } from '@/services/security/ssrf';

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
  try {
    // 1. Rate limiter
    const clientIp = getClientIp(req);
    const rateCheck = rateLimiter.check(clientIp, 60, 60000); // 60 download requests/min
    if (!rateCheck.allowed) {
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
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { url, filename, extension, platform, mimeType } = parsed.data;

    // 3. SSRF Check
    const ssrfCheck = validateSafeUrl(url);
    if (!ssrfCheck.isValid) {
      return NextResponse.json({ error: ssrfCheck.error || 'Access to media URL is denied.' }, { status: 403 });
    }

    // 4. Stream media to browser
    const rangeHeader = req.headers.get('range');
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
    console.error('Download API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to stream media download.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
