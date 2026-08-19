import type { DatabaseSync } from 'node:sqlite';

export function initializeArchiveAnalysisSchema(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS analysis_documents (
      video_id TEXT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      cleaned_path TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      segment_count INTEGER NOT NULL DEFAULT 0,
      source_cleaned_at TEXT NOT NULL,
      indexed_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS analysis_document_index USING fts5(
      video_id UNINDEXED,
      channel_id UNINDEXED,
      title,
      transcript,
      tokenize = 'unicode61 remove_diacritics 0'
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_documents_channel_id ON analysis_documents(channel_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_documents_indexed_at ON analysis_documents(indexed_at);

    CREATE TABLE IF NOT EXISTS analysis_fingerprints (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
      source_ids_json TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      result_json TEXT NOT NULL,
      document_count INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_fingerprints_channel_id ON analysis_fingerprints(channel_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_fingerprints_lookup
      ON analysis_fingerprints(channel_id, source_ids_json, provider, model, prompt_version, created_at);
    CREATE INDEX IF NOT EXISTS idx_analysis_fingerprints_content_hash ON analysis_fingerprints(content_hash);

    CREATE TABLE IF NOT EXISTS analysis_continuity_reports (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
      source_ids_json TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      result_json TEXT NOT NULL,
      document_count INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_continuity_reports_channel_id
      ON analysis_continuity_reports(channel_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_continuity_reports_lookup
      ON analysis_continuity_reports(channel_id, source_ids_json, provider, model, prompt_version, created_at);
    CREATE INDEX IF NOT EXISTS idx_analysis_continuity_reports_content_hash
      ON analysis_continuity_reports(content_hash);

    CREATE TABLE IF NOT EXISTS analysis_mythology_reports (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
      source_ids_json TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      result_json TEXT NOT NULL,
      document_count INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_mythology_reports_channel_id
      ON analysis_mythology_reports(channel_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_mythology_reports_lookup
      ON analysis_mythology_reports(channel_id, source_ids_json, provider, model, prompt_version, created_at);
    CREATE INDEX IF NOT EXISTS idx_analysis_mythology_reports_content_hash
      ON analysis_mythology_reports(content_hash);

    CREATE TABLE IF NOT EXISTS analysis_reality_index_reports (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
      source_ids_json TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      result_json TEXT NOT NULL,
      document_count INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_reality_index_reports_channel_id
      ON analysis_reality_index_reports(channel_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_reality_index_reports_lookup
      ON analysis_reality_index_reports(channel_id, source_ids_json, provider, model, prompt_version, created_at);
    CREATE INDEX IF NOT EXISTS idx_analysis_reality_index_reports_content_hash
      ON analysis_reality_index_reports(content_hash);

    CREATE TABLE IF NOT EXISTS analysis_character_graph_reports (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
      source_ids_json TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      result_json TEXT NOT NULL,
      document_count INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_character_graph_reports_channel_id
      ON analysis_character_graph_reports(channel_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_character_graph_reports_lookup
      ON analysis_character_graph_reports(channel_id, source_ids_json, provider, model, prompt_version, created_at);
    CREATE INDEX IF NOT EXISTS idx_analysis_character_graph_reports_content_hash
      ON analysis_character_graph_reports(content_hash);

    CREATE TABLE IF NOT EXISTS analysis_semantic_drift_reports (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
      source_ids_json TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      result_json TEXT NOT NULL,
      document_count INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_semantic_drift_reports_channel_id
      ON analysis_semantic_drift_reports(channel_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_semantic_drift_reports_lookup
      ON analysis_semantic_drift_reports(channel_id, source_ids_json, provider, model, prompt_version, created_at);
    CREATE INDEX IF NOT EXISTS idx_analysis_semantic_drift_reports_content_hash
      ON analysis_semantic_drift_reports(content_hash);

    CREATE TABLE IF NOT EXISTS analysis_believability_reports (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
      source_ids_json TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      result_json TEXT NOT NULL,
      document_count INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analysis_believability_reports_channel_id
      ON analysis_believability_reports(channel_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_believability_reports_lookup
      ON analysis_believability_reports(channel_id, source_ids_json, provider, model, prompt_version, created_at);
    CREATE INDEX IF NOT EXISTS idx_analysis_believability_reports_content_hash
      ON analysis_believability_reports(content_hash);
  `);
}
