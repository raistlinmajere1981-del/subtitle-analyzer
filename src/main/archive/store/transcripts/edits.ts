import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import type {
  SubtitleEditHistoryItem,
  SubtitleEditOperationType,
  SubtitleEditSource,
  SubtitleStatus
} from '../../../../shared/archive.js';
import { mapTranscriptEditChangeRow } from '../mappers.js';
import type { SaveCleanedTranscriptEditInput, TranscriptEditChangeRow } from '../types.js';
import { getTranscriptDocument, markVideoCleaned, upsertTranscriptDocument } from './documents.js';

export function getTranscriptEditHistory(
  db: DatabaseSync,
  videoId: string,
  limit = 8
): SubtitleEditHistoryItem[] {
  const rows = db
    .prepare(
      `
      SELECT
        c.change_id,
        c.batch_id,
        c.video_id,
        b.operation_type,
        b.source,
        b.actor,
        c.old_text,
        c.new_text,
        c.old_word_count,
        c.new_word_count,
        c.created_at,
        b.undone_at
      FROM transcript_edit_changes c
      JOIN transcript_edit_batches b ON b.id = c.batch_id
      WHERE c.video_id = ?
      ORDER BY c.created_at DESC, c.change_id DESC
      LIMIT ?
    `
    )
    .all(videoId, limit) as unknown as TranscriptEditChangeRow[];

  return rows.map(mapTranscriptEditChangeRow);
}

export function createTranscriptEditBatch(
  db: DatabaseSync,
  operationType: SubtitleEditOperationType,
  source: SubtitleEditSource,
  itemCount: number,
  actor = 'local user'
): string {
  const batchId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO transcript_edit_batches (id, operation_type, source, actor, item_count, created_at, undone_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `
  ).run(batchId, operationType, source, actor, itemCount, now);

  return batchId;
}

export function saveCleanedTranscriptEdit(db: DatabaseSync, input: SaveCleanedTranscriptEditInput): string {
  const now = new Date().toISOString();
  const batchId = input.batchId ?? createTranscriptEditBatch(db, input.operationType, input.source, 1);
  const oldDocument = getTranscriptDocument(db, input.videoId);
  const oldText = oldDocument && fs.existsSync(oldDocument.cleanedPath) ? readTextFile(oldDocument.cleanedPath) : '';
  const oldVideo = db.prepare('SELECT subtitle_status, density FROM videos WHERE id = ?').get(input.videoId) as
    | { subtitle_status: SubtitleStatus; density: number }
    | undefined;

  db.exec('BEGIN IMMEDIATE');
  try {
    upsertTranscriptDocument(db, {
      videoId: input.videoId,
      language: input.asset.language,
      source: input.asset.source,
      format: input.asset.format,
      cleanedPath: input.cleanedPath,
      wordCount: input.stats.wordCount,
      segmentCount: input.stats.segmentCount,
      timestamp: now
    });
    markVideoCleaned(db, input.videoId, input.stats.wordCount, now);

    db.prepare(
      `
      INSERT INTO transcript_edit_changes (
        batch_id,
        video_id,
        language_code,
        source_type,
        format,
        old_language_code,
        old_source_type,
        old_format,
        old_cleaned_path,
        new_cleaned_path,
        had_document,
        old_text,
        new_text,
        old_word_count,
        new_word_count,
        old_segment_count,
        new_segment_count,
        old_subtitle_status,
        old_density,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      batchId,
      input.videoId,
      input.asset.language,
      input.asset.source,
      input.asset.format,
      oldDocument?.language ?? null,
      oldDocument?.source ?? null,
      oldDocument?.format ?? null,
      oldDocument?.cleanedPath ?? null,
      input.cleanedPath,
      oldDocument ? 1 : 0,
      oldText,
      input.newText,
      oldDocument?.wordCount ?? 0,
      input.stats.wordCount,
      oldDocument?.segmentCount ?? 0,
      input.stats.segmentCount,
      oldVideo?.subtitle_status ?? 'Hazir',
      oldVideo?.density ?? 0,
      now
    );

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return batchId;
}

function readTextFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}
