import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { SubtitleStatus } from '../../../shared/archive.js';
import type { ChannelScanResult } from '../ytDlp.js';
import { hashString, sanitizePathPart } from './utils.js';

export function saveSuccessfulScan(db: DatabaseSync, result: ChannelScanResult): void {
  const now = new Date().toISOString();

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
      result.channel.id,
      result.channel.sourceUrl,
      result.channel.name,
      result.channel.handle,
      now,
      result.channel.accent,
      now,
      now
    );

    const existingVideo = db.prepare(
      `
      SELECT subtitle_status, language_label, density
      FROM videos
      WHERE id = ?
    `
    );

    db.prepare(
      `
      DELETE FROM videos
      WHERE channel_id = ?
        AND id = ?
        AND (
          webpage_url LIKE '%/videos%'
          OR webpage_url LIKE '%/shorts%'
          OR webpage_url LIKE '%/streams%'
        )
    `
    ).run(result.channel.id, result.channel.id);

    const upsertVideo = db.prepare(
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        channel_id = excluded.channel_id,
        title = excluded.title,
        published_at = excluded.published_at,
        weekday = excluded.weekday,
        duration_minutes = excluded.duration_minutes,
        video_type = excluded.video_type,
        thumbnail_url = excluded.thumbnail_url,
        webpage_url = excluded.webpage_url,
        updated_at = excluded.updated_at
    `
    );

    for (const video of result.videos) {
      const existing = existingVideo.get(video.id) as
        | { subtitle_status: SubtitleStatus; language_label: string; density: number }
        | undefined;

      upsertVideo.run(
        video.id,
        result.channel.id,
        video.title,
        video.publishedAt,
        video.weekday,
        video.durationMinutes,
        video.type,
        existing?.subtitle_status ?? video.subtitleStatus,
        existing?.language_label ?? video.language,
        video.thumbnailUrl,
        existing?.density ?? video.density,
        video.webpageUrl,
        now,
        now
      );
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function saveFailedScan(db: DatabaseSync, sourceUrl: string, error: Error, existingChannelId?: string): void {
  const now = new Date().toISOString();
  const channelId = existingChannelId ?? `failed-${Math.abs(hashString(sourceUrl))}`;

  db.prepare(
    `
    INSERT INTO channels (id, source_url, name, handle, last_scan_at, status, accent, last_error, created_at, updated_at)
    VALUES (?, ?, 'Taranamayan kanal', '-', ?, 'Hata', '#be123c', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      last_scan_at = excluded.last_scan_at,
      status = 'Hata',
      last_error = excluded.last_error,
      updated_at = excluded.updated_at
  `
  ).run(channelId, sourceUrl, now, error.message, now, now);
}

export function deleteChannel(db: DatabaseSync, archivePath: string, channelId: string): boolean {
  const normalizedChannelId = channelId.trim();
  if (normalizedChannelId.length === 0) {
    throw new Error('Silinecek kanal bulunamadi.');
  }

  const existing = db.prepare('SELECT id FROM channels WHERE id = ?').get(normalizedChannelId) as
    | { id: string }
    | undefined;

  if (!existing) {
    return false;
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM channels WHERE id = ?').run(normalizedChannelId);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  fs.rmSync(path.join(archivePath, 'subtitles', sanitizePathPart(normalizedChannelId)), {
    recursive: true,
    force: true
  });
  fs.rmSync(path.join(archivePath, 'thumbnails', sanitizePathPart(normalizedChannelId)), {
    recursive: true,
    force: true
  });

  return true;
}
