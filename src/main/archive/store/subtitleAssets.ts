import type { DatabaseSync } from 'node:sqlite';
import type { SubtitleAssetSummary, SubtitleListItem } from '../../../shared/archive.js';
import type { DownloadedSubtitleAsset } from '../subtitles.js';
import { mapSubtitleAssetRow, mapSubtitleListRow } from './mappers.js';
import type { SubtitleAssetRow, SubtitleListRow } from './types.js';
import { summarizeSubtitleLanguages } from './utils.js';

export function getSubtitleAssets(db: DatabaseSync, videoId: string): SubtitleAssetSummary[] {
  const rows = db
    .prepare(
      `
      SELECT
        video_id,
        language_code,
        source_type,
        format,
        raw_path,
        downloaded_at
      FROM subtitle_assets
      WHERE video_id = ?
      ORDER BY
        CASE
          WHEN language_code = 'tr' OR language_code LIKE 'tr-%' THEN 0
          ELSE 1
        END,
        CASE source_type
          WHEN 'manual' THEN 0
          ELSE 1
        END,
        downloaded_at DESC
    `
    )
    .all(videoId) as unknown as SubtitleAssetRow[];

  return rows.map(mapSubtitleAssetRow);
}

export function getSubtitleListItems(db: DatabaseSync, channelId?: string | null): SubtitleListItem[] {
  const params = channelId ? [channelId] : [];
  const rows = db
    .prepare(
      `
      SELECT
        v.id,
        v.channel_id,
        v.title,
        v.published_at,
        v.weekday,
        v.duration_minutes,
        v.video_type,
        v.subtitle_status,
        v.language_label,
        v.thumbnail_url,
        v.density,
        v.webpage_url,
        COUNT(DISTINCT sa.language_code || ':' || sa.source_type || ':' || sa.format) AS asset_count,
        CASE WHEN COUNT(DISTINCT td.language_code || ':' || td.source_type || ':' || td.format) > 0 THEN 1 ELSE 0 END AS has_cleaned,
        MAX(td.word_count) AS word_count,
        MAX(td.segment_count) AS segment_count,
        MAX(sa.downloaded_at) AS downloaded_at,
        MAX(td.cleaned_at) AS cleaned_at
      FROM videos v
      LEFT JOIN subtitle_assets sa ON sa.video_id = v.id
      LEFT JOIN transcript_documents td ON td.video_id = v.id
      ${channelId ? 'WHERE v.channel_id = ?' : ''}
      GROUP BY v.id
      HAVING asset_count > 0 OR has_cleaned = 1 OR v.subtitle_status IN ('Hazir', 'Temizlendi')
      ORDER BY COALESCE(v.published_at, '0000-00-00') DESC, v.title ASC
    `
    )
    .all(...params) as unknown as SubtitleListRow[];

  return rows.map(mapSubtitleListRow);
}

export function saveSubtitleDownloadResult(db: DatabaseSync, videoId: string, assets: DownloadedSubtitleAsset[]): void {
  const now = new Date().toISOString();
  const languageLabel = assets.length > 0 ? summarizeSubtitleLanguages(assets) : '-';

  db.exec('BEGIN IMMEDIATE');
  try {
    const insertAsset = db.prepare(
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(video_id, language_code, source_type, format) DO UPDATE SET
        raw_path = excluded.raw_path,
        downloaded_at = excluded.downloaded_at,
        updated_at = excluded.updated_at
    `
    );

    for (const asset of assets) {
      insertAsset.run(videoId, asset.language, asset.source, asset.format, asset.rawPath, now, now, now);
    }

    if (assets.length > 0) {
      db.prepare(
        `
        UPDATE videos
        SET
          subtitle_status = CASE
            WHEN subtitle_status = 'Temizlendi' THEN 'Temizlendi'
            ELSE 'Hazir'
          END,
          language_label = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(languageLabel, now, videoId);
    } else {
      db.prepare(
        `
        UPDATE videos
        SET
          subtitle_status = CASE
            WHEN subtitle_status = 'Temizlendi' THEN 'Temizlendi'
            ELSE 'Eksik'
          END,
          language_label = CASE
            WHEN subtitle_status = 'Temizlendi' THEN language_label
            ELSE '-'
          END,
          updated_at = ?
        WHERE id = ?
      `
      ).run(now, videoId);
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
