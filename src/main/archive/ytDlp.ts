import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  ChannelSummary,
  ScanChannelFilters,
  ScanChannelProgress,
  VideoRecord
} from '../../shared/archive.js';
import {
  dedupeEntries,
  getArchiveTabUrls,
  getChannelBaseUrl,
  getDurationSeconds,
  getEntries,
  getVideoUrl,
  hashString,
  inferHandle,
  inferVideoType,
  isVideoEntry,
  mapEntryToVideo,
  mergeEntryDetails,
  needsDetailedMetadata,
  pickString,
  stableIdFromUrl
} from './ytDlp/entry.js';
import type { YtDlpChannelPayload, YtDlpEntry } from './ytDlp/types.js';

const execFileAsync = promisify(execFile);

const accentPalette = ['#2563eb', '#b45309', '#047857', '#be123c', '#7c3aed', '#0f766e', '#c2410c'];
const detailLookupConcurrency = 3;
const detailLookupTimeoutMs = 1000 * 60 * 2;
const detailPrintTemplate = [
  '%(id)j',
  '%(upload_date)j',
  '%(timestamp)j',
  '%(release_timestamp)j',
  '%(duration)j',
  '%(duration_string)j',
  '%(availability)j',
  '%(webpage_url)j',
  '%(title)j'
].join('\t');
const youtubeExtractorArgs = ['--extractor-args', 'youtube:lang=tr'];
const youtubeTabExtractorArgs = ['--extractor-args', 'youtubetab:approximate_date'];

export interface ChannelScanResult {
  channel: Omit<ChannelSummary, 'videos' | 'archivedSubtitles' | 'lastScan' | 'status' | 'lastError'>;
  videos: VideoRecord[];
}

export interface ChannelScanOptions {
  existingVideoIds?: string[];
  filters?: ScanChannelFilters;
  playlistUrl?: string | null;
  signal?: AbortSignal;
  onProgress?: (progress: ScanChannelProgress) => void;
}

export async function scanChannelWithYtDlp(url: string, options: ChannelScanOptions = {}): Promise<ChannelScanResult> {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    throw new Error('Kanal URL bos olamaz.');
  }

  emitProgress(options, {
    phase: 'starting',
    totalVideos: 0,
    processedVideos: 0,
    currentVideoId: null,
    currentTitle: null,
    message: options.playlistUrl ? 'Kanal ve oynatma listesi bilgisi aliniyor' : 'Kanal bilgisi aliniyor'
  });

  const payload = await fetchInitialYtDlpPayload(trimmedUrl, options.signal);
  const archiveEntries = options.playlistUrl
    ? await getPlaylistEntries(options.playlistUrl, options)
    : await getArchiveEntries(payload, trimmedUrl, options);
  const entriesToProcess = filterNewEntries(archiveEntries, options.existingVideoIds);
  const filteredEntriesToProcess = filterEntriesByScanFilters(entriesToProcess, options.filters);
  const isIncrementalScan = Array.isArray(options.existingVideoIds);
  const filterSummary = formatScanFilterSummary(options.filters, Boolean(options.playlistUrl));

  emitProgress(options, {
    phase: 'listing',
    totalVideos: filteredEntriesToProcess.length,
    processedVideos: 0,
    currentVideoId: null,
    currentTitle: null,
    message: formatListingMessage(
      filteredEntriesToProcess.length,
      entriesToProcess.length,
      isIncrementalScan,
      filterSummary,
      Boolean(options.playlistUrl)
    )
  });

  const entries = await enrichEntriesWithDetails(filteredEntriesToProcess, options);
  const filteredEntries = filterEntriesByScanFilters(entries, options.filters);
  const channelId = pickString(payload.channel_id, payload.uploader_id, payload.id) ?? stableIdFromUrl(trimmedUrl);
  const name = pickString(payload.channel, payload.uploader, payload.title) ?? 'Adsiz kanal';
  const handle = inferHandle(payload, trimmedUrl);
  const sourceUrl = pickString(payload.channel_url, payload.uploader_url, payload.webpage_url) ?? trimmedUrl;
  const accent = accentPalette[Math.abs(hashString(channelId)) % accentPalette.length]!;

  return {
    channel: {
      id: channelId,
      sourceUrl,
      name,
      handle,
      accent
    },
    videos: filteredEntries.map((entry) => mapEntryToVideo(entry, channelId)).filter((video) => video !== null)
  };
}

function filterNewEntries(entries: YtDlpEntry[], existingVideoIds: string[] | undefined): YtDlpEntry[] {
  if (!existingVideoIds) {
    return entries;
  }

  const existingIdSet = new Set(existingVideoIds);
  return entries.filter((entry) => {
    const id = pickString(entry.id);
    return id !== null && !existingIdSet.has(id);
  });
}

function filterEntriesByScanFilters(entries: YtDlpEntry[], filters: ScanChannelFilters | undefined): YtDlpEntry[] {
  if (!hasScanFilters(filters)) {
    return entries;
  }

  return entries.filter((entry) => matchesScanFilters(entry, filters));
}

function matchesScanFilters(entry: YtDlpEntry, filters: ScanChannelFilters): boolean {
  if (filters.excludeMembersOnly && isMembersOnlyEntry(entry)) {
    return false;
  }

  if (filters.excludeShorts && isShortsEntry(entry)) {
    return false;
  }

  const minDurationSeconds = getMinDurationSeconds(filters);
  const durationSeconds = getDurationSeconds(entry);
  if (minDurationSeconds !== null && durationSeconds !== null && durationSeconds < minDurationSeconds) {
    return false;
  }

  return true;
}

function needsDetailedMetadataForScan(entry: YtDlpEntry, filters: ScanChannelFilters | undefined): boolean {
  if (needsDetailedMetadata(entry)) {
    return true;
  }

  return filters?.excludeMembersOnly === true && getAvailability(entry) === null;
}

function isShortsEntry(entry: YtDlpEntry): boolean {
  const durationSeconds = getDurationSeconds(entry);
  return inferVideoType(entry, durationSeconds, getVideoUrl(entry)) === 'Shorts';
}

function isMembersOnlyEntry(entry: YtDlpEntry): boolean {
  const availability = getAvailability(entry);
  if (!availability) {
    return false;
  }

  return /member|subscriber|premium/.test(availability.toLocaleLowerCase('en-US'));
}

function getAvailability(entry: YtDlpEntry): string | null {
  return pickString(entry.availability);
}

function getMinDurationSeconds(filters: ScanChannelFilters): number | null {
  const minutes = filters.minDurationMinutes;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }

  return minutes * 60;
}

function hasScanFilters(filters: ScanChannelFilters | undefined): filters is ScanChannelFilters {
  return Boolean(filters?.excludeMembersOnly || filters?.excludeShorts || getMinDurationSeconds(filters ?? {}) !== null);
}

function formatScanFilterSummary(filters: ScanChannelFilters | undefined, isPlaylistScan: boolean): string | null {
  if (!hasScanFilters(filters) && !isPlaylistScan) {
    return null;
  }

  const labels: string[] = [];

  if (isPlaylistScan) {
    labels.push('sadece oynatma listesi');
  }

  if (filters?.excludeMembersOnly) {
    labels.push('members only atla');
  }

  if (filters?.excludeShorts) {
    labels.push('shorts atla');
  }

  if (getMinDurationSeconds(filters ?? {}) !== null) {
    labels.push(`${filters?.minDurationMinutes} dk+`);
  }

  return labels.join(', ');
}

function formatListingMessage(
  filteredCount: number,
  totalCount: number,
  isIncrementalScan: boolean,
  filterSummary: string | null,
  isPlaylistScan: boolean
): string {
  const noun = isIncrementalScan ? 'yeni video' : isPlaylistScan ? 'oynatma listesi videosu' : 'video';

  if (!filterSummary) {
    return `${filteredCount} ${noun} bulundu`;
  }

  if (filteredCount === totalCount) {
    return `${filteredCount} ${noun} bulundu (${filterSummary})`;
  }

  return `${filteredCount}/${totalCount} ${noun} filtreden gecti (${filterSummary})`;
}

async function getPlaylistEntries(playlistUrl: string, options: ChannelScanOptions): Promise<YtDlpEntry[]> {
  throwIfAborted(options.signal);

  emitProgress(options, {
    phase: 'listing',
    totalVideos: 0,
    processedVideos: 0,
    currentVideoId: null,
    currentTitle: null,
    message: 'Oynatma listesi videolari okunuyor'
  });

  const playlistPayload = await fetchYtDlpPayload(playlistUrl, options.signal);
  const playlistEntries = getEntries(playlistPayload).filter(isVideoEntry);

  return dedupeEntries(playlistEntries);
}

async function fetchYtDlpPayload(url: string, signal?: AbortSignal): Promise<YtDlpChannelPayload> {
  throwIfAborted(signal);

  const { stdout } = await execFileAsync(
    'yt-dlp',
    [
      '--dump-single-json',
      '--flat-playlist',
      '--ignore-no-formats-error',
      '--no-warnings',
      ...youtubeExtractorArgs,
      ...youtubeTabExtractorArgs,
      url
    ],
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 96,
      timeout: 1000 * 60 * 8,
      signal
    }
  );

  return parsePayload(stdout);
}

async function fetchInitialYtDlpPayload(url: string, signal?: AbortSignal): Promise<YtDlpChannelPayload> {
  try {
    return await fetchYtDlpPayload(url, signal);
  } catch (error) {
    if (signal?.aborted || !isMissingYoutubeTabError(error)) {
      throw error;
    }

    const channelBaseUrl = getChannelBaseUrl(url);
    if (!channelBaseUrl || channelBaseUrl === url.replace(/\/+$/, '')) {
      throw error;
    }

    return fetchYtDlpPayload(`${channelBaseUrl}/videos`, signal);
  }
}

async function fetchArchiveTabPayload(tabUrl: string, signal?: AbortSignal): Promise<YtDlpChannelPayload | null> {
  try {
    return await fetchYtDlpPayload(tabUrl, signal);
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    if (isMissingYoutubeTabError(error)) {
      return null;
    }

    throw error;
  }
}

async function getArchiveEntries(
  payload: YtDlpChannelPayload,
  sourceUrl: string,
  options: ChannelScanOptions
): Promise<YtDlpEntry[]> {
  throwIfAborted(options.signal);
  const entries = getEntries(payload);
  const videoEntries = entries.filter(isVideoEntry);
  const tabUrls = getArchiveTabUrls(entries, payload, sourceUrl, options.filters);

  if (tabUrls.length === 0) {
    return dedupeEntries(videoEntries);
  }

  emitProgress(options, {
    phase: 'listing',
    totalVideos: videoEntries.length,
    processedVideos: 0,
    currentVideoId: null,
    currentTitle: null,
    message: 'Kanal video sekmeleri okunuyor'
  });

  const tabPayloads = (await Promise.all(tabUrls.map((tabUrl) => fetchArchiveTabPayload(tabUrl, options.signal)))).filter(
    (tabPayload): tabPayload is YtDlpChannelPayload => tabPayload !== null
  );
  const tabVideoEntries = tabPayloads.flatMap((tabPayload) => getEntries(tabPayload).filter(isVideoEntry));
  return dedupeEntries([...videoEntries, ...tabVideoEntries]);
}

async function enrichEntriesWithDetails(entries: YtDlpEntry[], options: ChannelScanOptions): Promise<YtDlpEntry[]> {
  throwIfAborted(options.signal);
  const entriesNeedingDetails = entries.filter((entry) => needsDetailedMetadataForScan(entry, options.filters));
  if (entriesNeedingDetails.length === 0) {
    emitProgress(options, {
      phase: 'details',
      totalVideos: entries.length,
      processedVideos: entries.length,
      currentVideoId: null,
      currentTitle: null,
      message: 'Video metadata hazir'
    });
    return entries;
  }

  let processedVideos = 0;
  const detailEntries = await mapWithConcurrency(entriesNeedingDetails, detailLookupConcurrency, async (entry) => {
    throwIfAborted(options.signal);

    emitProgress(options, {
      phase: 'details',
      totalVideos: entriesNeedingDetails.length,
      processedVideos,
      currentVideoId: pickString(entry.id),
      currentTitle: pickString(entry.title),
      message: pickString(entry.title) ?? 'Video metadata tamamlanıyor'
    });

    const detail = await fetchEntryDetailsSafely(entry, options.signal);
    processedVideos += 1;

    emitProgress(options, {
      phase: 'details',
      totalVideos: entriesNeedingDetails.length,
      processedVideos,
      currentVideoId: pickString(entry.id),
      currentTitle: pickString(entry.title),
      message: `${processedVideos}/${entriesNeedingDetails.length} video islendi`
    });

    return detail;
  }, options.signal);
  const detailsById = new Map<string, YtDlpEntry>();

  for (const detail of detailEntries) {
    const id = detail ? pickString(detail.id) : null;
    if (detail && id) {
      detailsById.set(id, detail);
    }
  }

  return entries.map((entry) => {
    const id = pickString(entry.id);
    const detail = id ? detailsById.get(id) : undefined;
    return detail ? mergeEntryDetails(entry, detail) : entry;
  });
}

async function fetchEntryDetailsSafely(entry: YtDlpEntry, signal?: AbortSignal): Promise<YtDlpEntry | null> {
  try {
    return await fetchEntryDetails(entry, signal);
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    return null;
  }
}

async function fetchEntryDetails(entry: YtDlpEntry, signal?: AbortSignal): Promise<YtDlpEntry | null> {
  throwIfAborted(signal);
  const id = pickString(entry.id);
  const url = getVideoUrl(entry) ?? (id ? `https://www.youtube.com/watch?v=${id}` : null);

  if (!url) {
    return null;
  }

  const { stdout } = await execFileAsync(
    'yt-dlp',
    [
      '--skip-download',
      '--no-playlist',
      '--ignore-no-formats-error',
      '--no-warnings',
      ...youtubeExtractorArgs,
      '--print',
      detailPrintTemplate,
      url
    ],
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 256,
      timeout: detailLookupTimeoutMs,
      signal
    }
  );

  return parseDetailPrint(stdout);
}

function parseDetailPrint(stdout: string): YtDlpEntry | null {
  const line = stdout
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.length > 0);

  if (!line) {
    return null;
  }

  const [id, uploadDate, timestamp, releaseTimestamp, duration, durationString, availability, webpageUrl, title] = line
    .split('\t')
    .map(parsePrintedValue);

  return {
    id,
    upload_date: uploadDate,
    timestamp,
    release_timestamp: releaseTimestamp,
    duration,
    duration_string: durationString,
    availability,
    webpage_url: webpageUrl,
    title
  };
}

function parsePrintedValue(value: string | undefined): unknown {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === 'NA') {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<U>,
  signal?: AbortSignal
): Promise<U[]> {
  const results = new Array<U>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      throwIfAborted(signal);
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]!);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function emitProgress(options: ChannelScanOptions, progress: Omit<ScanChannelProgress, 'canCancel'>): void {
  options.onProgress?.({
    ...progress,
    canCancel: options.signal?.aborted !== true && progress.phase !== 'done'
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Kanal tarama iptal edildi.');
  }
}

function parsePayload(stdout: string): YtDlpChannelPayload {
  try {
    return JSON.parse(stdout) as YtDlpChannelPayload;
  } catch (error) {
    throw new Error(`yt-dlp JSON ciktisi okunamadi: ${error instanceof Error ? error.message : 'bilinmeyen hata'}`);
  }
}

function isMissingYoutubeTabError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /This channel does not have a [^.\n]+ tab/i.test(message);
}
