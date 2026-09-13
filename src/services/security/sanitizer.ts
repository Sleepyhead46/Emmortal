import sanitize from 'sanitize-filename';

/**
 * Sanitizes a filename for safe download, removing path traversal, null bytes,
 * special shell characters, and trimming to a safe length.
 */
export function sanitizeDownloadFilename(
  rawName: string,
  fallback: string = 'download',
  extension: string = 'mp4'
): string {
  // Strip control characters, newlines, null bytes
  let cleaned = (rawName || '').replace(/[\x00-\x1F\x7F<>:"/\\|?*]/g, ' ');

  // Use sanitize-filename library
  cleaned = sanitize(cleaned, { replacement: '_' });

  // Collapse multiple spaces/underscores
  cleaned = cleaned.replace(/[\s_-]+/g, '_').trim();

  // If empty after sanitization, use fallback
  if (!cleaned || cleaned === '_') {
    cleaned = fallback;
  }

  // Cap length to 100 characters to prevent filesystem overflow issues
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 100);
  }

  // Ensure extension is clean
  const cleanExt = extension.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'mp4';

  // If filename ends with the extension, don't duplicate
  if (cleaned.toLowerCase().endsWith(`.${cleanExt}`)) {
    return cleaned;
  }

  return `${cleaned}.${cleanExt}`;
}

/**
 * Derives appropriate MIME content type from file extension.
 */
export function getMimeType(extension: string): string {
  const ext = extension.replace(/^\./, '').toLowerCase();
  switch (ext) {
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'mp3':
      return 'audio/mpeg';
    case 'm4a':
      return 'audio/mp4';
    case 'wav':
      return 'audio/wav';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}
