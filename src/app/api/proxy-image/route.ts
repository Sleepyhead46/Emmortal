import { NextRequest, NextResponse } from 'next/server';

// Allowed CDN hostnames – only proxy images from trusted media CDNs
const ALLOWED_HOSTNAMES = [
  'cdninstagram.com',
  'scontent.cdninstagram.com',
  'fbcdn.net',
  'snapcdn.app',
  'ytimg.com',
  'i.ytimg.com',
  'tiktokcdn.com',
  'tikwm.com',
  'pbs.twimg.com',
  'instagram.com',
  'threads.net',
  'akamaihd.net',
];

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTNAMES.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Only allow https
  if (parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only HTTPS URLs are allowed' }, { status: 400 });
  }

  // Allowlist check – prevents SSRF
  if (!isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        // Mimic a browser request without a referer to bypass hotlink protection
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        // Deliberately omit Referer so CDN hotlink checks pass
      },
      // Do not follow redirects to an SSRF target
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';

    // Only proxy image content types
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 400 });
    }

    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache proxied images for 1 hour in the browser, 24h in CDN
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error('[proxy-image] fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
  }
}
