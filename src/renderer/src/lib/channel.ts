import type { ArchiveSnapshot } from '../../../shared/archive';

export function normalizeChannelInput(input: string): string {
  const trimmed = input.trim();

  if (trimmed.startsWith('@')) {
    return `https://www.youtube.com/${trimmed}`;
  }

  return trimmed;
}

export function normalizePlaylistInput(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isLikelyYoutubePlaylistUrl(input: string): boolean {
  try {
    const url = new URL(input);
    const hostname = url.hostname.replace(/^www\./i, '').toLocaleLowerCase('en-US');
    const isYoutubeHost = hostname === 'youtube.com' || hostname === 'youtu.be' || hostname.endsWith('.youtube.com');

    return isYoutubeHost && (url.searchParams.has('list') || url.pathname.toLocaleLowerCase('en-US') === '/playlist');
  } catch {
    return false;
  }
}

export function findScannedChannelId(snapshot: ArchiveSnapshot, requestedUrl: string): string | null {
  const normalizedRequestedUrl = requestedUrl.trim().toLocaleLowerCase('en-US');
  const requestedHandle = normalizedRequestedUrl.match(/youtube\.com\/(@[^/?#]+)/i)?.[1] ?? null;

  return (
    snapshot.channels.find((channel) => channel.sourceUrl.toLocaleLowerCase('en-US') === normalizedRequestedUrl)?.id ??
    (requestedHandle
      ? snapshot.channels.find((channel) => channel.handle.toLocaleLowerCase('en-US') === requestedHandle)?.id
      : undefined) ??
    null
  );
}
