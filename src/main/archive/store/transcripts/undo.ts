import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { UndoTranscriptEditResult, TranscriptUndoChangeRow } from '../types.js';
import { upsertTranscriptDocument } from './documents.js';

export function undoLastTranscriptEdit(db: DatabaseSync, videoId?: string): UndoTranscriptEditResult {
  const batch = (
    videoId
      ? db
          .prepare(
            `
            SELECT b.id
            FROM transcript_edit_batches b
            JOIN transcript_edit_changes c ON c.batch_id = b.id
            WHERE b.undone_at IS NULL AND c.video_id = ?
            ORDER BY b.created_at DESC
            LIMIT 1
          `
          )
          .get(videoId)
      : db
          .prepare(
            `
            SELECT id
            FROM transcript_edit_batches
            WHERE undone_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
          `
          )
          .get()
  ) as { id: string } | undefined;

  if (!batch) {
    return {
      batchId: null,
      videoIds: [],
      undone: false,
      message: 'Geri alinacak transcript islemi yok.'
    };
  }

  const rows = db
    .prepare(
      `
      SELECT
        change_id,
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
        old_word_count,
        old_segment_count,
        old_subtitle_status,
        old_density
      FROM transcript_edit_changes
      WHERE batch_id = ?
      ORDER BY change_id DESC
    `
    )
    .all(batch.id) as unknown as TranscriptUndoChangeRow[];

  if (rows.length === 0) {
    return {
      batchId: batch.id,
      videoIds: [],
      undone: false,
      message: 'Geri alinacak degisiklik kaydi bulunamadi.'
    };
  }

  const now = new Date().toISOString();
  const videoIds = [...new Set(rows.map((row) => row.video_id))];

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const row of rows) {
      db.prepare(
        `
        DELETE FROM transcript_documents
        WHERE video_id = ? AND language_code = ? AND source_type = ? AND format = ?
      `
      ).run(row.video_id, row.language_code, row.source_type, row.format);

      if (row.had_document > 0 && row.old_cleaned_path && row.old_language_code && row.old_source_type && row.old_format) {
        fs.mkdirSync(path.dirname(row.old_cleaned_path), { recursive: true });
        fs.writeFileSync(row.old_cleaned_path, normalizeTranscriptFileText(row.old_text ?? ''), 'utf8');

        upsertTranscriptDocument(db, {
          videoId: row.video_id,
          language: row.old_language_code,
          source: row.old_source_type,
          format: row.old_format,
          cleanedPath: row.old_cleaned_path,
          wordCount: row.old_word_count ?? 0,
          segmentCount: row.old_segment_count ?? 0,
          timestamp: now
        });
      }

      db.prepare(
        `
        UPDATE videos
        SET subtitle_status = ?, density = ?, updated_at = ?
        WHERE id = ?
      `
      ).run(row.old_subtitle_status, row.old_density, now, row.video_id);
    }

    db.prepare('UPDATE transcript_edit_batches SET undone_at = ? WHERE id = ?').run(now, batch.id);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return {
    batchId: batch.id,
    videoIds,
    undone: true,
    message: `${videoIds.length} kayitta son transcript islemi geri alindi.`
  };
}

function normalizeTranscriptFileText(value: string): string {
  return `${value.replace(/\s+$/g, '')}\n`;
}
