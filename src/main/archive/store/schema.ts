import type { DatabaseSync } from 'node:sqlite';

export function initializeArchiveStoreSchema(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      source_url TEXT NOT NULL,
      name TEXT NOT NULL,
      handle TEXT NOT NULL,
      last_scan_at TEXT,
      status TEXT NOT NULL,
      accent TEXT NOT NULL,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      published_at TEXT,
      weekday TEXT,
      duration_minutes INTEGER,
      video_type TEXT NOT NULL,
      subtitle_status TEXT NOT NULL,
      language_label TEXT NOT NULL,
      thumbnail_url TEXT,
      density INTEGER NOT NULL DEFAULT 0,
      webpage_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subtitle_assets (
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      language_code TEXT NOT NULL,
      source_type TEXT NOT NULL,
      format TEXT NOT NULL,
      raw_path TEXT NOT NULL,
      downloaded_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (video_id, language_code, source_type, format)
    );

    CREATE TABLE IF NOT EXISTS transcript_documents (
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      language_code TEXT NOT NULL,
      source_type TEXT NOT NULL,
      format TEXT NOT NULL,
      cleaned_path TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      segment_count INTEGER NOT NULL DEFAULT 0,
      cleaned_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (video_id, language_code, source_type, format)
    );

    CREATE TABLE IF NOT EXISTS transcript_edit_batches (
      id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      source TEXT NOT NULL,
      actor TEXT NOT NULL,
      item_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      undone_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transcript_edit_changes (
      change_id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL REFERENCES transcript_edit_batches(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      language_code TEXT NOT NULL,
      source_type TEXT NOT NULL,
      format TEXT NOT NULL,
      old_language_code TEXT,
      old_source_type TEXT,
      old_format TEXT,
      old_cleaned_path TEXT,
      new_cleaned_path TEXT NOT NULL,
      had_document INTEGER NOT NULL DEFAULT 0,
      old_text TEXT,
      new_text TEXT NOT NULL,
      old_word_count INTEGER NOT NULL DEFAULT 0,
      new_word_count INTEGER NOT NULL DEFAULT 0,
      old_segment_count INTEGER NOT NULL DEFAULT 0,
      new_segment_count INTEGER NOT NULL DEFAULT 0,
      old_subtitle_status TEXT NOT NULL,
      old_density INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
    CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at);
    CREATE INDEX IF NOT EXISTS idx_videos_type ON videos(video_type);
    CREATE INDEX IF NOT EXISTS idx_videos_subtitle_status ON videos(subtitle_status);
    CREATE INDEX IF NOT EXISTS idx_subtitle_assets_video_id ON subtitle_assets(video_id);
    CREATE INDEX IF NOT EXISTS idx_transcript_documents_video_id ON transcript_documents(video_id);
    CREATE INDEX IF NOT EXISTS idx_transcript_edit_changes_video_id ON transcript_edit_changes(video_id);
    CREATE INDEX IF NOT EXISTS idx_transcript_edit_changes_batch_id ON transcript_edit_changes(batch_id);

    DROP INDEX IF EXISTS idx_transcript_notes_video_id;
    DROP TABLE IF EXISTS transcript_notes;
  `);
}
