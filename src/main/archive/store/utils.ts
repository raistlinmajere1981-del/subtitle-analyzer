import type { DownloadedSubtitleAsset } from '../subtitles.js';

export function hashString(value: string): number {
  let hash = 0;

  for (const char of value) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }

  return hash;
}

export function summarizeSubtitleLanguages(assets: DownloadedSubtitleAsset[]): string {
  const languages = [...new Set(assets.map((asset) => asset.language))];
  const ordered = [
    ...languages.filter((language) => language === 'tr' || language.startsWith('tr-')),
    ...languages.filter((language) => language !== 'tr' && !language.startsWith('tr-'))
  ];

  return ordered.join(' + ');
}

export function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}
