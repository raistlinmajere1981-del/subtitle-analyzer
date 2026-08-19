import fs from 'node:fs';
import path from 'node:path';
import type { SubtitleAssetSummary } from '../../../shared/archive.js';
import { cleanRawSubtitleText } from './text.js';
import type { SubtitleTextFileNaming } from './types.js';
import { readTextFile } from './utils.js';

export function cleanSubtitleAsset(asset: SubtitleAssetSummary, naming: SubtitleTextFileNaming = {}): {
  asset: SubtitleAssetSummary;
  cleanedPath: string;
  cleanedText: string;
  segmentCount: number;
  wordCount: number;
} {
  const rawText = readTextFile(asset.rawPath);
  if (rawText.trim().length === 0) {
    throw new Error('Temizlenecek raw altyazi dosyasi okunamadi.');
  }

  const cleaned = cleanRawSubtitleText(rawText);
  if (cleaned.text.trim().length === 0) {
    throw new Error('Raw altyazidan temiz transcript uretilemedi.');
  }

  const cleanedDir = path.join(path.dirname(path.dirname(asset.rawPath)), 'cleaned');
  fs.mkdirSync(cleanedDir, { recursive: true });

  const cleanedPath = path.join(cleanedDir, buildSubtitleTextFileName({ ...naming, fallbackName: asset.videoId }));
  fs.writeFileSync(cleanedPath, `${cleaned.text.trim()}\n`, 'utf8');

  return {
    asset,
    cleanedPath,
    cleanedText: cleaned.text,
    segmentCount: cleaned.segmentCount,
    wordCount: cleaned.wordCount
  };
}

export function buildSubtitleTextFileName(naming: SubtitleTextFileNaming): string {
  const date = normalizeDatePart(naming.publishedAt);
  const title = sanitizeReadableFileName(naming.title ?? naming.fallbackName ?? 'baslik-yok');

  return `${date} - ${title}.txt`;
}

function normalizeDatePart(value: string | null | undefined): string {
  if (!value) {
    return 'tarih-yok';
  }

  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : 'tarih-yok';
}

function sanitizeReadableFileName(value: string): string {
  return (
    value
      .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\.+$/g, '')
      .slice(0, 140) || 'baslik-yok'
  );
}
