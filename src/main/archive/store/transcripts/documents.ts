import type { DatabaseSync } from 'node:sqlite';
import type { SubtitleAssetSummary } from '../../../../shared/archive.js';
import type { TranscriptDocumentRecord } from '../types.js';

export interface TranscriptDocumentWrite {
  videoId: string;
  language: string;
  source: SubtitleAssetSummary['source'];
  format: string;
  cleanedPath: string;
  wordCount: number;
  segmentCount: number;
  timestamp: string;
}

export function getTranscriptDocument(db: DatabaseSync, videoId: string): TranscriptDocumentRecord | null {
  const row = db
    .prepare(
      `
      SELECT
        video_id,
        language_code,
        source_type,
        format,
        cleaned_path,
        word_count,
        segment_count,
        cleaned_at
      FROM transcript_documents
      WHERE video_id = ?
      ORDER BY
        CASE
          WHEN language_code = 'tr' OR language_code LIKE 'tr-%' THEN 0
          ELSE 1
        END,
        cleaned_at DESC
      LIMIT 1
    `
    )
    .get(videoId) as
    | {
        video_id: string;
        language_code: string;
        source_type: SubtitleAssetSummary['source'];
        format: string;
        cleaned_path: string;
        word_count: number;
        segment_count: number;
        cleaned_at: string;
      }
    | undefined;

  return row
    ? {
        videoId: row.video_id,
        language: row.language_code,
        source: row.source_type,
        format: row.format,
        cleanedPath: row.cleaned_path,
        wordCount: Number(row.word_count),
        segmentCount: Number(row.segment_count),
        cleanedAt: row.cleaned_at
      }
    : null;
}

export function saveCleanedTranscript(
  db: DatabaseSync,
  videoId: string,
  asset: SubtitleAssetSummary,
  cleanedPath: string,
  stats: { wordCount: number; segmentCount: number }
): void {
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE');
  try {
    upsertTranscriptDocument(db, {
      videoId,
      language: asset.language,
      source: asset.source,
      format: asset.format,
      cleanedPath,
      wordCount: stats.wordCount,
      segmentCount: stats.segmentCount,
      timestamp: now
    });
    markVideoCleaned(db, videoId, stats.wordCount, now);

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function upsertTranscriptDocument(db: DatabaseSync, document: TranscriptDocumentWrite): void {
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(video_id, language_code, source_type, format) DO UPDATE SET
      cleaned_path = excluded.cleaned_path,
      word_count = excluded.word_count,
      segment_count = excluded.segment_count,
      cleaned_at = excluded.cleaned_at,
      updated_at = excluded.updated_at
  `
  ).run(
    document.videoId,
    document.language,
    document.source,
    document.format,
    document.cleanedPath,
    document.wordCount,
    document.segmentCount,
    document.timestamp,
    document.timestamp,
    document.timestamp
  );
}

export function markVideoCleaned(db: DatabaseSync, videoId: string, density: number, updatedAt: string): void {
  db.prepare(
    `
    UPDATE videos
    SET
      subtitle_status = 'Temizlendi',
      density = ?,
      updated_at = ?
    WHERE id = ?
  `
  ).run(density, updatedAt, videoId);
}
