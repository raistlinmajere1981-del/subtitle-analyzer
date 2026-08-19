import type { DatabaseSync } from 'node:sqlite';
import type { VideoRecord } from '../../../shared/archive.js';
import { mapVideoRow } from './mappers.js';
import type { VideoRow } from './types.js';

export function getVideosByIds(db: DatabaseSync, videoIds: string[]): VideoRecord[] {
  if (videoIds.length === 0) {
    return [];
  }

  const placeholders = videoIds.map(() => '?').join(', ');
  const rows = db
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
      WHERE id IN (${placeholders})
    `
    )
    .all(...videoIds) as unknown as VideoRow[];
  const byId = new Map(rows.map((row) => [row.id, mapVideoRow(row)]));

  return videoIds.map((videoId) => byId.get(videoId)).filter((video): video is VideoRecord => video !== undefined);
}

export function getVideosByChannelId(db: DatabaseSync, channelId: string): VideoRecord[] {
  const rows = db
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
      WHERE channel_id = ?
      ORDER BY COALESCE(published_at, '0000-00-00') DESC, title ASC
    `
    )
    .all(channelId) as unknown as VideoRow[];

  return rows.map(mapVideoRow);
}
