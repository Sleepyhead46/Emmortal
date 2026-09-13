import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeMedia } from '@/services/downloader';
import { rateLimiter, getClientIp } from '@/services/security/rate-limiter';
import { validateSafeUrl, identifyPlatform } from '@/services/security/ssrf';

const AnalyzeSchema = z.object({
  url: z.string().trim().url('Please enter a valid URL (e.g., https://...)'),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting check
    const clientIp = getClientIp(req);
    const rateCheck = rateLimiter.check(clientIp, 30, 60000); // 30 req/min
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait a moment before trying again.',
          resetTimeMs: rateCheck.resetTimeMs,
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(rateCheck.resetTimeMs / 1000).toString(),
          },
        }
      );
    }

    // 2. Request body validation
    const body = await req.json().catch(() => null);
    const parsed = AnalyzeSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid input payload.';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { url } = parsed.data;

    // 3. Security & SSRF check
    const ssrfCheck = validateSafeUrl(url);
    if (!ssrfCheck.isValid) {
      return NextResponse.json({ error: ssrfCheck.error || 'Disallowed URL.' }, { status: 400 });
    }

    // 4. Platform check
    const platformCheck = identifyPlatform(url);
    if (platformCheck.error) {
      return NextResponse.json({ error: platformCheck.error }, { status: 400 });
    }

    // 5. Fetch media details
    const result = await analyzeMedia(url);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('Analyze API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze media URL.';
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
