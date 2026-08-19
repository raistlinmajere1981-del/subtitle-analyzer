import type { ScanChannelFilters, SubtitleStatus, VideoRecord, VideoType, WeekdayLabel } from '../../../shared/archive.js';
import type { YtDlpChannelPayload, YtDlpEntry, YtDlpThumbnail } from './types.js';

const weekdayLabels: WeekdayLabel[] = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];

export function needsDetailedMetadata(entry: YtDlpEntry): boolean {
  return isVideoEntry(entry) && (getPublishedDate(entry) === null || getDurationSeconds(entry) === null);
}

export function mergeEntryDetails(entry: YtDlpEntry, detail: YtDlpEntry): YtDlpEntry {
  const hasPublishedDate = getPublishedDate(entry) !== null;
  const hasDuration = getDurationSeconds(entry) !== null;
  const hasAnyUrl = pickString(entry.webpage_url, entry.url) !== null;

  return {
    ...entry,
    id: entry.id ?? detail.id,
    title: pickString(entry.title) ? entry.title : detail.title,
    upload_date: hasPublishedDate ? entry.upload_date : detail.upload_date,
    timestamp: hasPublishedDate ? entry.timestamp : detail.timestamp,
    release_timestamp: hasPublishedDate ? entry.release_timestamp : detail.release_timestamp,
    duration: hasDuration ? entry.duration : detail.duration,
    duration_string: hasDuration ? entry.duration_string : detail.duration_string,
    availability: pickString(entry.availability) ? entry.availability : detail.availability,
    webpage_url: hasAnyUrl ? entry.webpage_url : detail.webpage_url
  };
}

export function mapEntryToVideo(entry: YtDlpEntry, channelId: string): VideoRecord | null {
  if (!isVideoEntry(entry)) {
    return null;
  }

  const id = pickString(entry.id);

  if (!id) {
    return null;
  }

  const publishedAt = getPublishedDate(entry);
  const durationSeconds = getDurationSeconds(entry);
  const webpageUrl = getVideoUrl(entry);
  const title = pickString(entry.title) ?? id;

  return {
    id,
    channelId,
    title,
    publishedAt,
    weekday: publishedAt ? getWeekday(publishedAt) : null,
    durationMinutes: durationSeconds === null ? null : Math.max(1, Math.round(durationSeconds / 60)),
    type: inferVideoType(entry, durationSeconds, webpageUrl),
    subtitleStatus: 'Indirilecek' satisfies SubtitleStatus,
    language: 'tr + original',
    thumbnailUrl: getThumbnailUrl(entry),
    density: 0,
    webpageUrl
  };
}

export function getEntries(payload: YtDlpChannelPayload): YtDlpEntry[] {
  return Array.isArray(payload.entries) ? (payload.entries as YtDlpEntry[]) : [];
}

export function isVideoEntry(entry: YtDlpEntry): boolean {
  const entryType = pickString(entry._type);
  if (entryType === 'playlist' || entryType === 'multi_video') {
    return false;
  }

  const ieKey = pickString(entry.ie_key);
  const webpageUrl = pickString(entry.webpage_url);
  const url = pickString(entry.url);

  if (webpageUrl?.includes('/watch?v=') || webpageUrl?.includes('/shorts/')) {
    return true;
  }

  if (url?.includes('/watch?v=') || url?.includes('/shorts/')) {
    return true;
  }

  return ieKey === 'Youtube' && pickString(entry.id) !== null;
}

export function getArchiveTabUrls(
  entries: YtDlpEntry[],
  payload: YtDlpChannelPayload,
  sourceUrl: string,
  filters?: ScanChannelFilters
): string[] {
  const tabUrlsFromEntries = entries
    .map((entry) => pickString(entry.webpage_url, entry.url))
    .filter((entryUrl): entryUrl is string => entryUrl !== null)
    .filter((entryUrl) => /youtube\.com\/.+\/(videos|shorts|streams)(?:[/?#]|$)/i.test(entryUrl))
    .filter((entryUrl) => !(filters?.excludeShorts && /\/shorts(?:[/?#]|$)/i.test(entryUrl)));
  const tabUrlsFromChannelUrls = [
    pickString(payload.channel_url, payload.uploader_url, payload.webpage_url),
    sourceUrl
  ].flatMap((candidate) => buildArchiveTabUrls(candidate, filters));

  return [...new Set([...tabUrlsFromEntries, ...tabUrlsFromChannelUrls])];
}

export function buildArchiveTabUrls(url: string | null, filters?: ScanChannelFilters): string[] {
  const channelBaseUrl = getChannelBaseUrl(url);
  if (!channelBaseUrl) {
    return [];
  }

  const tabs = filters?.excludeShorts ? ['videos', 'streams'] : ['videos', 'streams', 'shorts'];
  return tabs.map((tab) => `${channelBaseUrl}/${tab}`);
}

export function getChannelBaseUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  const normalizedUrl = url.split(/[?#]/)[0]?.replace(/\/+$/, '') ?? '';
  const match = normalizedUrl.match(
    /^(https?:\/\/(?:www\.)?youtube\.com\/(?:channel\/[^/]+|@[^/]+|c\/[^/]+|user\/[^/]+))(?:\/(?:videos|shorts|streams|featured|about|community|playlists|live))?$/i
  );

  return match?.[1] ?? null;
}

export function dedupeEntries(entries: YtDlpEntry[]): YtDlpEntry[] {
  const seen = new Set<string>();
  const deduped: YtDlpEntry[] = [];

  for (const entry of entries) {
    const id = pickString(entry.id) ?? pickString(entry.webpage_url, entry.url);
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    deduped.push(entry);
  }

  return deduped;
}

export function inferHandle(payload: YtDlpChannelPayload, fallbackUrl: string): string {
  const handleFromId = pickString(payload.uploader_id);
  if (handleFromId?.startsWith('@')) {
    return handleFromId;
  }

  const url = pickString(payload.channel_url, payload.uploader_url, payload.webpage_url) ?? fallbackUrl;
  const match = url.match(/youtube\.com\/(@[^/?#]+)/i);

  return match?.[1] ?? handleFromId ?? '-';
}

export function getPublishedDate(entry: YtDlpEntry): string | null {
  const uploadDate = pickString(entry.upload_date);
  if (uploadDate?.match(/^\d{8}$/)) {
    return `${uploadDate.slice(0, 4)}-${uploadDate.slice(4, 6)}-${uploadDate.slice(6, 8)}`;
  }

  const timestamp = pickNumber(entry.timestamp) ?? pickNumber(entry.release_timestamp);
  if (timestamp !== null) {
    return new Date(timestamp * 1000).toISOString().slice(0, 10);
  }

  return null;
}

export function getDurationSeconds(entry: YtDlpEntry): number | null {
  const duration = pickNumber(entry.duration);
  if (duration !== null) {
    return duration;
  }

  const durationString = pickString(entry.duration_string);
  if (!durationString) {
    return null;
  }

  const parts = durationString.split(':').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function inferVideoType(entry: YtDlpEntry, durationSeconds: number | null, webpageUrl: string | null): VideoType {
  if (entry.is_live === true || entry.was_live === true || pickString(entry.live_status) === 'was_live') {
    return 'Canli yayin';
  }

  if (pickString(entry.live_status) === 'is_upcoming') {
    return 'Premiere';
  }

  if (webpageUrl?.includes('/shorts/') || (durationSeconds !== null && durationSeconds <= 60)) {
    return 'Shorts';
  }

  return 'Uzun video';
}

export function getVideoUrl(entry: YtDlpEntry): string | null {
  const directUrl = pickString(entry.webpage_url);
  if (directUrl) {
    return directUrl;
  }

  const url = pickString(entry.url);
  if (!url) {
    return null;
  }

  if (url.startsWith('http')) {
    return url;
  }

  return `https://www.youtube.com/watch?v=${url}`;
}

export function getThumbnailUrl(entry: YtDlpEntry): string | null {
  const thumbnail = pickString(entry.thumbnail);
  if (thumbnail) {
    return thumbnail;
  }

  if (!Array.isArray(entry.thumbnails)) {
    return null;
  }

  const thumbnails = (entry.thumbnails as YtDlpThumbnail[])
    .map((candidate) => ({
      url: pickString(candidate.url),
      width: pickNumber(candidate.width) ?? 0
    }))
    .filter((candidate): candidate is { url: string; width: number } => Boolean(candidate.url));

  thumbnails.sort((left, right) => right.width - left.width);
  return thumbnails[0]?.url ?? null;
}

export function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function stableIdFromUrl(url: string): string {
  return `channel-${Math.abs(hashString(url))}`;
}

export function hashString(value: string): number {
  let hash = 0;

  for (const char of value) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }

  return hash;
}

function getWeekday(dateText: string): WeekdayLabel | null {
  const date = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return weekdayLabels[date.getUTCDay()] ?? null;
}

function pickNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
