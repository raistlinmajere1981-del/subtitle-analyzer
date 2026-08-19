import type { DatabaseSync } from 'node:sqlite';
import type { ArchiveSnapshot } from '../../../shared/archive.js';
import { mapChannelRow, mapVideoRow } from './mappers.js';
import type { ChannelRow, VideoRow } from './types.js';

export function getArchiveSnapshot(db: DatabaseSync, archivePath: string): ArchiveSnapshot {
  const channels = db
    .prepare(
      `
      SELECT
        c.id,
        c.source_url,
        c.name,
        c.handle,
        c.last_scan_at,
        c.status,
        c.accent,
        c.last_error,
        COUNT(v.id) AS video_count,
        SUM(CASE WHEN v.subtitle_status IN ('Hazir', 'Temizlendi') THEN 1 ELSE 0 END) AS archived_subtitle_count
      FROM channels c
      LEFT JOIN videos v ON v.channel_id = c.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC, c.name ASC
    `
    )
    .all() as unknown as ChannelRow[];

  const videos = db
    .prepare(
      `
      SELECT
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
        webpage_url
      FROM videos
      ORDER BY COALESCE(published_at, '0000-00-00') DESC, title ASC
    `
    )
    .all() as unknown as VideoRow[];

  return {
    archivePath,
    channels: channels.map(mapChannelRow),
    videos: videos.map(mapVideoRow)
  };
}
