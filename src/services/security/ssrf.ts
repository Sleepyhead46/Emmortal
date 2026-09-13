import net from 'net';

/**
 * Checks if an IP address is a private, loopback, link-local, or reserved address.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!net.isIP(ip)) {
    return false;
  }

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;

    // Loopback 127.0.0.0/8
    if (a === 127) return true;
    // Broadcast / Zero 0.0.0.0/8
    if (a === 0) return true;
    // Private 10.0.0.0/8
    if (a === 10) return true;
    // Carrier-grade NAT 100.64.0.0/10
    if (a === 100 && b >= 64 && b <= 127) return true;
    // Link-local / Cloud Metadata 169.254.0.0/16
    if (a === 169 && b === 254) return true;
    // Private 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // IETF Protocol Assignments 192.0.0.0/24
    if (a === 192 && b === 0 && parts[2] === 0) return true;
    // Documentation 192.0.2.0/24
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    // Private 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // Benchmark 198.18.0.0/15
    if (a === 198 && (b === 18 || b === 19)) return true;
    // Multicast 224.0.0.0/4
    if (a >= 224 && a <= 239) return true;
    // Reserved 240.0.0.0/4
    if (a >= 240) return true;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback ::1
    if (lower === '::1' || lower === '0000:0000:0000:0000:0000:0000:0000:0001') return true;
    // Unspecified ::
    if (lower === '::') return true;
    // Unique local address fc00::/7 (fc00... or fd00...)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // Link-local unicast fe80::/10 (fe8..., fe9..., fea..., feb...)
    if (/^fe[89ab]/.test(lower)) return true;
    // IPv4-mapped IPv6 ::ffff:127.0.0.1
    if (lower.startsWith('::ffff:')) {
      const v4Part = lower.substring(7);
      if (net.isIPv4(v4Part)) {
        return isPrivateOrReservedIp(v4Part);
      }
    }
  }

  return false;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'broadcasthost',
  'metadata.google.internal',
  'metadata.internal',
  'instance-data',
  '169.254.169.254',
]);

/**
 * Validates a target media URL against SSRF and protocol manipulation attacks.
 */
export function validateSafeUrl(urlString: string): { isValid: boolean; error?: string; url?: URL } {
  try {
    const parsed = new URL(urlString);

    // Only allow HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Only HTTP and HTTPS protocols are permitted.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check blocked hostnames
    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return { isValid: false, error: 'Access to internal or restricted host is forbidden.' };
    }

    // Direct IP validation
    if (net.isIP(hostname)) {
      if (isPrivateOrReservedIp(hostname)) {
        return { isValid: false, error: 'Access to private or local network IP is forbidden.' };
      }
    }

    // Prevent credentials in URL
    if (parsed.username || parsed.password) {
      return { isValid: false, error: 'URLs containing embedded credentials are not permitted.' };
    }

    // Prevent unusual ports
    const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
    if (port !== 80 && port !== 443 && port !== 8080 && port !== 8443) {
      return { isValid: false, error: 'Non-standard network port is not permitted.' };
    }

    return { isValid: true, url: parsed };
  } catch {
    return { isValid: false, error: 'Malformed URL provided.' };
  }
}

/**
 * Validates whether the incoming URL belongs to one of the supported platforms.
 */
export function identifyPlatform(url: string): { platform?: 'youtube' | 'instagram' | 'tiktok'; error?: string } {
  const check = validateSafeUrl(url);
  if (!check.isValid || !check.url) {
    return { error: check.error || 'Invalid URL' };
  }

  const hostname = check.url.hostname.toLowerCase().replace(/^www\./, '');

  if (
    hostname === 'youtube.com' ||
    hostname === 'm.youtube.com' ||
    hostname === 'youtu.be' ||
    hostname === 'music.youtube.com'
  ) {
    return { platform: 'youtube' };
  }

  if (
    hostname === 'instagram.com' ||
    hostname === 'm.instagram.com' ||
    hostname === 'instagr.am'
  ) {
    return { platform: 'instagram' };
  }

  if (
    hostname === 'tiktok.com' ||
    hostname === 'm.tiktok.com' ||
    hostname === 'vt.tiktok.com' ||
    hostname === 'vm.tiktok.com'
  ) {
    return { platform: 'tiktok' };
  }

  return {
    error: 'Unsupported platform. Please enter a valid YouTube, Instagram, or TikTok URL.',
  };
}
