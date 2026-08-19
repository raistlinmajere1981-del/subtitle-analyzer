import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { ImportManualTextsInput, ImportManualTextsResult, WeekdayLabel } from '../../../shared/archive.js';
import { buildSubtitleTextFileName, cleanRawSubtitleText, getTranscriptStats } from '../transcripts.js';
import { hashString, sanitizePathPart } from './utils.js';

const supportedTextExtensions = new Set(['.txt', '.text', '.md', '.markdown', '.srt', '.vtt']);
const accentColors = ['#2563eb', '#059669', '#7c3aed', '#c2410c', '#0891b2', '#be123c', '#4f46e5'];
const weekdayLabels: WeekdayLabel[] = [
  'Pazar',
  'Pazartesi',
  'Sali',
  'Carsamba',
  'Persembe',
  'Cuma',
  'Cumartesi'
];

export function importManualTextFiles(
  db: DatabaseSync,
  archivePath: string,
  input: ImportManualTextsInput
): Omit<ImportManualTextsResult, 'snapshot' | 'cancelled' | 'message'> {
  const archiveName = input.archiveName.trim();
  const sourcePaths = [...new Set(input.sourcePaths ?? [])].map((sourcePath) => path.resolve(sourcePath));

  if (archiveName.length === 0) {
    throw new Error('Manuel arsiv adi gerekli.');
  }

  if (sourcePaths.length === 0) {
    return {
      channelId: null,
      imported: 0,
      skipped: 0,
      failed: 0
    };
  }

  const channelId = buildManualChannelId(archiveName);
  const now = new Date().toISOString();
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `
      INSERT INTO channels (id, source_url, name, handle, last_scan_at, status, accent, last_error, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'Guncel', ?, NULL, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        source_url = excluded.source_url,
        name = excluded.name,
        handle = excluded.handle,
        last_scan_at = excluded.last_scan_at,
        status = 'Guncel',
        accent = excluded.accent,
        last_error = NULL,
        updated_at = excluded.updated_at
    `
    ).run(
      channelId,
      `manual://${channelId}`,
      archiveName,
      'Manuel arsiv',
      now,
      pickAccentColor(channelId),
      now,
      now
    );

    for (const sourcePath of sourcePaths) {
      try {
        const extension = path.extname(sourcePath).toLocaleLowerCase('tr-TR');
        if (!supportedTextExtensions.has(extension)) {
          skipped += 1;
          continue;
        }

        const stats = fs.statSync(sourcePath);
        if (!stats.isFile()) {
          skipped += 1;
          continue;
        }

        const rawText = fs.readFileSync(sourcePath, 'utf8');
        const cleaned = cleanRawSubtitleText(rawText);
        if (rawText.trim().length === 0 || cleaned.text.trim().length === 0) {
          skipped += 1;
          continue;
        }

        const videoId = buildManualVideoId(channelId, sourcePath);
        const title = buildManualTitle(sourcePath);
        const publishedAt = stats.mtime.toISOString();
        const rawFormat = normalizeRawFormat(extension);
        const rawDir = path.join(archivePath, 'subtitles', sanitizePathPart(channelId), sanitizePathPart(videoId), 'raw');
        const cleanedDir = path.join(path.dirname(rawDir), 'cleaned');
        const rawPath = path.join(rawDir, `${sanitizePathPart(videoId)}.${rawFormat}`);
        const cleanedPath = path.join(
          cleanedDir,
          buildSubtitleTextFileName({
            publishedAt,
            title,
            fallbackName: videoId
          })
        );
        const transcriptStats = getTranscriptStats(cleaned.text);

        fs.mkdirSync(rawDir, { recursive: true });
        fs.mkdirSync(cleanedDir, { recursive: true });
        fs.writeFileSync(rawPath, normalizeTextFile(rawText), 'utf8');
        fs.writeFileSync(cleanedPath, normalizeTextFile(cleaned.text), 'utf8');

        db.prepare(
          `
          INSERT INTO videos (
            id,
            channel_id,
            title,
            published_at,
            weekday,
            duration_minutes,
            video_type,
            subtitle_status,
            language_label,
            thumbnail_url,
            density,
            webpage_url,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, NULL, 'Uzun video', 'Temizlendi', ?, NULL, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            channel_id = excluded.channel_id,
            title = excluded.title,
            published_at = excluded.published_at,
            weekday = excluded.weekday,
            duration_minutes = excluded.duration_minutes,
            video_type = excluded.video_type,
            subtitle_status = excluded.subtitle_status,
            language_label = excluded.language_label,
            thumbnail_url = excluded.thumbnail_url,
            density = excluded.density,
            webpage_url = excluded.webpage_url,
            updated_at = excluded.updated_at
        `
        ).run(
          videoId,
          channelId,
          title,
          publishedAt,
          getWeekdayLabel(stats.mtime),
          input.language?.trim() || 'tr',
          transcriptStats.wordCount,
          `manual://${channelId}/${videoId}`,
          now,
          now
        );

        db.prepare(
          `
          INSERT INTO subtitle_assets (
            video_id,
            language_code,
            source_type,
            format,
            raw_path,
            downloaded_at,
            created_at,
            updated_at
          )
          VALUES (?, ?, 'manual', ?, ?, ?, ?, ?)
          ON CONFLICT(video_id, language_code, source_type, format) DO UPDATE SET
            raw_path = excluded.raw_path,
            downloaded_at = excluded.downloaded_at,
            updated_at = excluded.updated_at
        `
        ).run(videoId, input.language?.trim() || 'tr', rawFormat, rawPath, now, now, now);

        db.prepare(
          `
          INSERT INTO transcript_documents (
            video_id,
            language_code,
            source_type,
            format,
            cleaned_path,
            word_count,
            segment_count,
            cleaned_at,
            created_at,
            updated_at
          )
          VALUES (?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(video_id, language_code, source_type, format) DO UPDATE SET
            cleaned_path = excluded.cleaned_path,
            word_count = excluded.word_count,
            segment_count = excluded.segment_count,
            cleaned_at = excluded.cleaned_at,
            updated_at = excluded.updated_at
        `
        ).run(
          videoId,
          input.language?.trim() || 'tr',
          rawFormat,
          cleanedPath,
          transcriptStats.wordCount,
          transcriptStats.segmentCount,
          now,
          now,
          now
        );

        imported += 1;
      } catch {
        failed += 1;
      }
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return {
    channelId,
    imported,
    skipped,
    failed
  };
}

function buildManualChannelId(archiveName: string): string {
  const normalizedName = archiveName.replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR');
  const slug = sanitizePathPart(normalizedName).replace(/_+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'arsiv';
  return `manual-${slug}-${Math.abs(hashString(normalizedName))}`;
}

function buildManualVideoId(channelId: string, sourcePath: string): string {
  const normalizedPath = path.resolve(sourcePath).toLocaleLowerCase('tr-TR');
  return `manual-${Math.abs(hashString(`${channelId}\n${normalizedPath}`))}`;
}

function buildManualTitle(sourcePath: string): string {
  return path.basename(sourcePath, path.extname(sourcePath)).replace(/\s+/g, ' ').trim() || path.basename(sourcePath);
}

function normalizeRawFormat(extension: string): string {
  const normalized = extension.replace(/^\./, '').toLocaleLowerCase('tr-TR');
  return normalized === 'text' || normalized.length === 0 ? 'txt' : normalized;
}

function normalizeTextFile(value: string): string {
  return `${value.replace(/\s+$/g, '')}\n`;
}

function getWeekdayLabel(date: Date): WeekdayLabel {
  return weekdayLabels[date.getDay()] ?? 'Pazartesi';
}

function pickAccentColor(value: string): string {
  const fallbackColor = '#2563eb';
  return accentColors[Math.abs(hashString(value)) % accentColors.length] ?? fallbackColor;
}
