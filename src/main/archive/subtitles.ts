import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { SubtitleLanguageMode, VideoRecord } from '../../shared/archive.js';

const execFileAsync = promisify(execFile);
const subtitleFormat = 'vtt/best';
const subtitleTimeoutMs = 1000 * 60 * 3;

interface YtDlpSubtitleFormat {
  ext?: unknown;
  url?: unknown;
}

interface YtDlpSubtitlePayload {
  id?: unknown;
  title?: unknown;
  language?: unknown;
  subtitles?: unknown;
  automatic_captions?: unknown;
}

export interface DownloadedSubtitleAsset {
  videoId: string;
  language: string;
  source: 'manual' | 'auto';
  format: string;
  rawPath: string;
}

export interface VideoSubtitleDownloadResult {
  videoId: string;
  assets: DownloadedSubtitleAsset[];
}

export interface DownloadVideoSubtitlesOptions {
  languageMode?: SubtitleLanguageMode;
  signal?: AbortSignal;
}

export async function downloadVideoSubtitles(
  video: VideoRecord,
  archivePath: string,
  options: DownloadVideoSubtitlesOptions = {}
): Promise<VideoSubtitleDownloadResult> {
  throwIfAborted(options.signal);

  const languageMode = options.languageMode ?? 'tr-original';
  const url = video.webpageUrl ?? `https://www.youtube.com/watch?v=${video.id}`;
  const info = await fetchSubtitleInfo(url, options.signal);
  const languages = chooseSubtitleLanguages(info, languageMode);

  if (languages.length === 0) {
    return {
      videoId: video.id,
      assets: []
    };
  }

  const safeVideoId = sanitizePathPart(video.id);
  const rawDir = path.join(archivePath, 'subtitles', sanitizePathPart(video.channelId), safeVideoId, 'raw');
  fs.mkdirSync(rawDir, { recursive: true });
  throwIfAborted(options.signal);

  await execFileAsync(
    'yt-dlp',
    [
      '--skip-download',
      '--no-playlist',
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs',
      languages.join(','),
      '--sub-format',
      subtitleFormat,
      '--no-overwrites',
      '--no-warnings',
      '--no-progress',
      '-o',
      path.join(rawDir, `${safeVideoId}.%(ext)s`),
      url
    ],
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 8,
      timeout: subtitleTimeoutMs,
      signal: options.signal
    }
  );

  return {
    videoId: video.id,
    assets: discoverDownloadedAssets(rawDir, safeVideoId, video.id, info)
  };
}

async function fetchSubtitleInfo(url: string, signal?: AbortSignal): Promise<YtDlpSubtitlePayload> {
  throwIfAborted(signal);

  const { stdout } = await execFileAsync(
    'yt-dlp',
    ['--dump-single-json', '--skip-download', '--no-playlist', '--ignore-no-formats-error', '--no-warnings', url],
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 16,
      timeout: subtitleTimeoutMs,
      signal
    }
  );

  try {
    return JSON.parse(stdout) as YtDlpSubtitlePayload;
  } catch (error) {
    throw new Error(`Altyazi metadata JSON ciktisi okunamadi: ${error instanceof Error ? error.message : 'bilinmeyen hata'}`);
  }
}

function chooseSubtitleLanguages(info: YtDlpSubtitlePayload, languageMode: SubtitleLanguageMode): string[] {
  const manualSubtitles = getSubtitleMap(info.subtitles);
  const automaticCaptions = getSubtitleMap(info.automatic_captions);
  const availableLanguages = [...manualSubtitles.keys(), ...automaticCaptions.keys()];
  const languages = new Set<string>();
  const trLanguage = findLanguage(availableLanguages, 'tr');

  if ((languageMode === 'tr' || languageMode === 'tr-original') && trLanguage) {
    languages.add(trLanguage);
  }

  const originalLanguage = pickString(info.language);
  const availableOriginal = originalLanguage
    ? findLanguage(availableLanguages, originalLanguage)
    : null;

  if ((languageMode === 'original' || languageMode === 'tr-original') && availableOriginal) {
    languages.add(availableOriginal);
  }

  const directAutoLanguage = [...automaticCaptions.entries()].find(([language, formats]) => {
    return !isTurkish(language) && formats.some((format) => !pickString(format.url)?.includes('tlang='));
  })?.[0];

  if ((languageMode === 'original' || languageMode === 'tr-original') && !availableOriginal && directAutoLanguage) {
    languages.add(directAutoLanguage);
  }

  const firstManualLanguage = [...manualSubtitles.keys()].find((language) => !isTurkish(language));
  if (
    (languageMode === 'original' || languageMode === 'tr-original') &&
    !availableOriginal &&
    !directAutoLanguage &&
    firstManualLanguage
  ) {
    languages.add(firstManualLanguage);
  }

  return [...languages].filter((language) => language !== 'live_chat');
}

function discoverDownloadedAssets(
  rawDir: string,
  safeVideoId: string,
  videoId: string,
  info: YtDlpSubtitlePayload
): DownloadedSubtitleAsset[] {
  const manualSubtitles = getSubtitleMap(info.subtitles);
  const automaticCaptions = getSubtitleMap(info.automatic_captions);
  const prefix = `${safeVideoId}.`;

  return fs
    .readdirSync(rawDir)
    .filter((fileName) => fileName.startsWith(prefix))
    .map((fileName) => {
      const parsed = parseSubtitleFileName(fileName, prefix);
      if (!parsed) {
        return null;
      }

      return {
        videoId,
        language: parsed.language,
        source: manualSubtitles.has(parsed.language) ? 'manual' : automaticCaptions.has(parsed.language) ? 'auto' : 'auto',
        format: parsed.format,
        rawPath: path.join(rawDir, fileName)
      } satisfies DownloadedSubtitleAsset;
    })
    .filter((asset): asset is DownloadedSubtitleAsset => asset !== null);
}

function parseSubtitleFileName(fileName: string, prefix: string): { language: string; format: string } | null {
  const rest = fileName.slice(prefix.length);
  const extensionIndex = rest.lastIndexOf('.');

  if (extensionIndex <= 0 || extensionIndex === rest.length - 1) {
    return null;
  }

  return {
    language: rest.slice(0, extensionIndex),
    format: rest.slice(extensionIndex + 1)
  };
}

function getSubtitleMap(value: unknown): Map<string, YtDlpSubtitleFormat[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return new Map();
  }

  const result = new Map<string, YtDlpSubtitleFormat[]>();

  for (const [language, formats] of Object.entries(value)) {
    if (language === 'live_chat' || !Array.isArray(formats)) {
      continue;
    }

    result.set(language, formats as YtDlpSubtitleFormat[]);
  }

  return result;
}

function findLanguage(languages: string[], target: string): string | null {
  const normalizedTarget = target.toLocaleLowerCase('en-US');
  const exact = languages.find((language) => language.toLocaleLowerCase('en-US') === normalizedTarget);
  if (exact) {
    return exact;
  }

  return (
    languages.find((language) => language.toLocaleLowerCase('en-US').startsWith(`${normalizedTarget}-`)) ??
    null
  );
}

function isTurkish(language: string): boolean {
  return language === 'tr' || language.startsWith('tr-');
}

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Altyazi indirme iptal edildi.');
  }
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}
