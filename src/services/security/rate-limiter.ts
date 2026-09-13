interface RateLimitRecord {
  timestamps: number[];
}

class InMemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically clean up records older than 10 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [ip, record] of this.records.entries()) {
          const recent = record.timestamps.filter((t) => now - t < 600000);
          if (recent.length === 0) {
            this.records.delete(ip);
          } else {
            record.timestamps = recent;
          }
        }
      }, 60000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Check if an IP has exceeded rate limit.
   * @param key IP address or identifier
   * @param maxRequests Maximum requests allowed in window
   * @param windowMs Window size in milliseconds
   */
  public check(
    key: string,
    maxRequests: number = 30,
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetTimeMs: number } {
    const now = Date.now();
    const record = this.records.get(key) || { timestamps: [] };

    // Filter timestamps within the window
    const windowStart = now - windowMs;
    const recent = record.timestamps.filter((t) => t > windowStart);

    if (recent.length >= maxRequests) {
      const earliest = recent[0];
      const resetTimeMs = earliest + windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        resetTimeMs: Math.max(0, resetTimeMs),
      };
    }

    recent.push(now);
    this.records.set(key, { timestamps: recent });

    return {
      allowed: true,
      remaining: maxRequests - recent.length,
      resetTimeMs: windowMs,
    };
  }
}

export const rateLimiter = new InMemoryRateLimiter();

/**
 * Extracts client IP from Next.js request headers.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}
