import type { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type { AnalysisScope, AnalysisSourceSummary, VideoType } from '../../../shared/archive.js';
import { getTranscriptStats } from '../transcripts.js';
import { getMtimeMs, readTextFile, safeReadDirectory, walkFiles } from './files.js';
import {
  buildInWhere,
  buildScopeWhere,
  getMergedSourceId,
  getSelectedMergedIds,
  getSelectedVideoIds,
  getVideoSourceId
} from './scope.js';
import type {
  AnalysisTextDocument,
  CleanedFileCandidate,
  IndexedDocumentRow,
  PreferredAssetRow,
  TranscriptDocumentRow
} from './types.js';

interface MergedSubtitleMetadata {
  title?: unknown;
  createdAt?: unknown;
  sourceCount?: unknown;
  sourceVideoIds?: unknown;
  channels?: unknown;
}

interface MergedSubtitleChannel {
  id: string;
  name: string;
}

export function findCleanedFileCandidates(db: DatabaseSync, archivePath: string): CleanedFileCandidate[] {
  const subtitleRoot = path.join(archivePath, 'subtitles');
  if (!fs.existsSync(subtitleRoot)) {
    return [];
  }

  const candidates: CleanedFileCandidate[] = [];
  const channelDirs = safeReadDirectory(subtitleRoot);

  for (const channelDir of channelDirs) {
    if (!channelDir.isDirectory()) {
      continue;
    }

    const channelId = channelDir.name;
    const channelPath = path.join(subtitleRoot, channelId);
    for (const videoDir of safeReadDirectory(channelPath)) {
      if (!videoDir.isDirectory()) {
        continue;
      }

      const videoId = videoDir.name;
      if (!videoExists(db, videoId, channelId)) {
        continue;
      }

      const cleanedDir = path.join(channelPath, videoId, 'cleaned');
      const cleanedFiles = safeReadDirectory(cleanedDir)
        .filter((item) => item.isFile() && item.name.toLocaleLowerCase('en-US').endsWith('.txt'))
        .map((item) => path.join(cleanedDir, item.name))
        .sort((first, second) => getMtimeMs(second) - getMtimeMs(first));

      if (cleanedFiles[0]) {
        candidates.push({
          videoId,
          channelId,
          cleanedPath: cleanedFiles[0],
          cleanedAt: new Date(getMtimeMs(cleanedFiles[0])).toISOString()
        });
      }
    }
  }

  return candidates;
}

export function getPreferredAsset(db: DatabaseSync, videoId: string): PreferredAssetRow | null {
  const row = db
    .prepare(
      `
      SELECT language_code, source_type, format
      FROM subtitle_assets
      WHERE video_id = ?
      ORDER BY
        CASE WHEN language_code = 'tr' OR language_code LIKE 'tr-%' THEN 0 ELSE 1 END,
        CASE source_type WHEN 'manual' THEN 0 ELSE 1 END,
        downloaded_at DESC
      LIMIT 1
    `
    )
    .get(videoId) as PreferredAssetRow | undefined;

  return row ?? null;
}

export function getExistingTranscriptDocument(
  db: DatabaseSync,
  videoId: string
): { cleaned_path: string; word_count: number; segment_count: number } | null {
  const row = db
    .prepare(
      `
      SELECT cleaned_path, word_count, segment_count
      FROM transcript_documents
      WHERE video_id = ?
      ORDER BY
        CASE WHEN language_code = 'tr' OR language_code LIKE 'tr-%' THEN 0 ELSE 1 END,
        cleaned_at DESC
      LIMIT 1
    `
    )
    .get(videoId) as { cleaned_path: string; word_count: number; segment_count: number } | undefined;

  return row ?? null;
}

export function getTranscriptDocuments(db: DatabaseSync): TranscriptDocumentRow[] {
  const rows = db
    .prepare(
      `
      SELECT
        td.video_id,
        v.channel_id,
        v.title,
        v.published_at,
        v.video_type,
        td.cleaned_path,
        td.word_count,
        td.segment_count,
        td.cleaned_at
      FROM transcript_documents td
      JOIN videos v ON v.id = td.video_id
      ORDER BY COALESCE(v.published_at, '0000-00-00') ASC, v.title ASC
    `
    )
    .all() as unknown as TranscriptDocumentRow[];

  return rows;
}

export function getAnalysisDocuments(
  db: DatabaseSync,
  archivePath: string,
  scope: AnalysisScope
): AnalysisTextDocument[] {
  return [...getIndexedDocuments(db, scope), ...getMergedFileDocuments(db, archivePath, scope)];
}

export function getTranscriptSources(db: DatabaseSync, scope: AnalysisScope): AnalysisSourceSummary[] {
  const scopeWhere = buildScopeWhere(scope, 'v');
  const rows = db
    .prepare(
      `
      SELECT
        ad.video_id,
        ad.channel_id,
        c.name AS channel_name,
        v.title,
        v.published_at,
        v.video_type,
        ad.cleaned_path,
        ad.word_count,
        ad.updated_at
      FROM analysis_documents ad
      JOIN videos v ON v.id = ad.video_id
      JOIN channels c ON c.id = ad.channel_id
      WHERE 1 = 1
        ${scopeWhere.sql}
      ORDER BY COALESCE(v.published_at, '0000-00-00') DESC, v.title ASC
    `
    )
    .all(...scopeWhere.params) as unknown as Array<{
    video_id: string;
    channel_id: string;
    channel_name: string;
    title: string;
    published_at: string | null;
    video_type: VideoType;
    cleaned_path: string;
    word_count: number;
    updated_at: string;
  }>;

  return rows.map((row) => ({
    id: getVideoSourceId(row.video_id),
    type: 'video-transcript',
    title: row.title,
    detail: `${row.channel_name} · ${row.published_at ?? 'Tarih yok'}`,
    channelId: row.channel_id,
    channelName: row.channel_name,
    publishedAt: row.published_at,
    videoType: row.video_type,
    wordCount: Number(row.word_count),
    path: row.cleaned_path,
    updatedAt: row.updated_at
  }));
}

export function getMergedFileSources(db: DatabaseSync, archivePath: string, scope: AnalysisScope): AnalysisSourceSummary[] {
  return getMergedFileCandidates(archivePath).flatMap((filePath) => {
    const text = readTextFile(filePath);
    const metadata = readMergedFileMetadata(filePath);
    const metadataChannels = getMergedFileMetadataChannels(metadata);
    const scopedMetadataChannel =
      scope.mode === 'channel' && scope.channelId
        ? metadataChannels.find((channel) => channel.id === scope.channelId)
        : null;
    const inferredChannel = metadataChannels.length === 0 ? inferMergedFileChannel(db, text) : null;

    if (scope.mode === 'channel' && scope.channelId) {
      if (metadataChannels.length > 0 && !scopedMetadataChannel) {
        return [];
      }

      if (metadataChannels.length === 0 && inferredChannel?.channelId !== scope.channelId) {
        return [];
      }
    }

    const [singleMetadataChannel] = metadataChannels;
    const channel = scopedMetadataChannel
      ? { channelId: scopedMetadataChannel.id, channelName: scopedMetadataChannel.name }
      : metadataChannels.length === 1 && singleMetadataChannel
        ? { channelId: singleMetadataChannel.id, channelName: singleMetadataChannel.name }
        : inferredChannel;
    const relativePath = path.relative(archivePath, filePath);

    return [{
      id: getMergedSourceId(filePath),
      type: 'merged-file',
      title: getMergedFileTitle(metadata, filePath),
      detail: formatMergedFileDetail(metadata, metadataChannels, channel, relativePath),
      channelId: channel?.channelId ?? null,
      channelName: channel?.channelName ?? null,
      publishedAt: null,
      videoType: null,
      wordCount: getTranscriptStats(text).wordCount,
      path: filePath,
      updatedAt: new Date(getMtimeMs(filePath)).toISOString()
    }];
  });
}

function videoExists(db: DatabaseSync, videoId: string, channelId: string): boolean {
  const row = db
    .prepare('SELECT id FROM videos WHERE id = ? AND channel_id = ?')
    .get(videoId, channelId) as { id: string } | undefined;

  return Boolean(row);
}

function getIndexedDocuments(db: DatabaseSync, scope: AnalysisScope): AnalysisTextDocument[] {
  const scopeWhere = buildScopeWhere(scope, 'v');
  const selectedVideoIds = getSelectedVideoIds(scope);
  if (scope.sourceIds && selectedVideoIds.length === 0) {
    return [];
  }
  const sourceWhere = selectedVideoIds.length > 0 ? buildInWhere('analysis_document_index.video_id', selectedVideoIds) : null;

  const rows = db
    .prepare(
      `
      SELECT
        analysis_document_index.video_id,
        analysis_document_index.channel_id,
        c.name AS channel_name,
        v.title,
        v.published_at,
        v.video_type,
        ad.cleaned_path,
        ad.word_count,
        ad.segment_count,
        ad.source_cleaned_at AS cleaned_at,
        analysis_document_index.transcript
      FROM analysis_document_index
      JOIN videos v ON v.id = analysis_document_index.video_id
      JOIN channels c ON c.id = v.channel_id
      JOIN analysis_documents ad ON ad.video_id = analysis_document_index.video_id
      WHERE 1 = 1
        ${scopeWhere.sql}
        ${sourceWhere?.sql ?? ''}
      ORDER BY COALESCE(v.published_at, '0000-00-00') ASC, v.title ASC
    `
    )
    .all(...scopeWhere.params, ...(sourceWhere?.params ?? [])) as unknown as Array<
    IndexedDocumentRow & { channel_name: string }
  >;

  return rows.map((row) => ({
    sourceId: getVideoSourceId(row.video_id),
    sourceType: 'video-transcript',
    videoId: row.video_id,
    channelId: row.channel_id,
    channelName: row.channel_name,
    title: row.title,
    publishedAt: row.published_at,
    videoType: row.video_type,
    wordCount: Number(row.word_count),
    transcript: row.transcript
  }));
}

function getMergedFileDocuments(db: DatabaseSync, archivePath: string, scope: AnalysisScope): AnalysisTextDocument[] {
  const selectedMergedIds = getSelectedMergedIds(scope);
  if (!scope.sourceIds || selectedMergedIds.length === 0) {
    return [];
  }

  return getMergedFileSources(db, archivePath, scope)
    .filter((source) => selectedMergedIds.includes(source.id))
    .map((source) => ({
      sourceId: source.id,
      sourceType: 'merged-file',
      videoId: null,
      channelId: source.channelId,
      channelName: source.channelName ?? 'Birlesik dosya',
      title: source.title,
      publishedAt: null,
      videoType: null,
      wordCount: source.wordCount,
      transcript: readTextFile(source.path)
    }));
}

function inferMergedFileChannel(db: DatabaseSync, text: string): { channelId: string; channelName: string } | null {
  const titles = [...new Set(text
    .split(/\r?\n/)
    .map((line) => line.match(/^#\s+(.+)$/)?.[1]?.trim() ?? '')
    .filter(Boolean))];

  if (titles.length === 0) {
    return null;
  }

  const channelIds = new Set<string>();
  const channelNames = new Map<string, string>();

  for (const title of titles) {
    const row = db
      .prepare(
        `
        SELECT v.channel_id, c.name AS channel_name
        FROM videos v
        JOIN channels c ON c.id = v.channel_id
        WHERE v.title = ?
        LIMIT 1
      `
      )
      .get(title) as { channel_id: string; channel_name: string } | undefined;

    if (!row) {
      return null;
    }

    channelIds.add(row.channel_id);
    channelNames.set(row.channel_id, row.channel_name);
  }

  if (channelIds.size !== 1) {
    return null;
  }

  const channelId = [...channelIds][0];
  if (!channelId) {
    return null;
  }

  return {
    channelId,
    channelName: channelNames.get(channelId) ?? channelId
  };
}

function getMergedFileCandidates(archivePath: string): string[] {
  const exportRoot = path.join(archivePath, 'exports');
  if (!fs.existsSync(exportRoot)) {
    return [];
  }

  return walkFiles(exportRoot)
    .filter((filePath) => {
      const name = path.basename(filePath).toLocaleLowerCase('tr-TR');
      return name.endsWith('.txt') && name.includes('birlesik');
    })
    .sort((first, second) => getMtimeMs(second) - getMtimeMs(first));
}

function readMergedFileMetadata(filePath: string): MergedSubtitleMetadata | null {
  const metadataText = readTextFile(getMergedMetadataPath(filePath)).trim();
  if (!metadataText) {
    return null;
  }

  try {
    const metadata = JSON.parse(metadataText) as unknown;
    return metadata !== null && typeof metadata === 'object' ? (metadata as MergedSubtitleMetadata) : null;
  } catch {
    return null;
  }
}

function getMergedFileMetadataChannels(metadata: MergedSubtitleMetadata | null): MergedSubtitleChannel[] {
  if (!metadata || !Array.isArray(metadata.channels)) {
    return [];
  }

  return metadata.channels.flatMap((channel) => {
    if (channel === null || typeof channel !== 'object') {
      return [];
    }

    const candidate = channel as { id?: unknown; name?: unknown };
    if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
      return [];
    }

    return [{
      id: candidate.id,
      name: candidate.name
    }];
  });
}

function getMergedFileTitle(metadata: MergedSubtitleMetadata | null, filePath: string): string {
  return typeof metadata?.title === 'string' && metadata.title.trim().length > 0
    ? metadata.title
    : path.basename(filePath);
}

function formatMergedFileDetail(
  metadata: MergedSubtitleMetadata | null,
  metadataChannels: MergedSubtitleChannel[],
  channel: { channelId: string; channelName: string } | null,
  relativePath: string
): string {
  const sourceCount = typeof metadata?.sourceCount === 'number' ? `${metadata.sourceCount} altyazi` : null;
  const channelLabel = channel?.channelName ?? (metadataChannels.length > 1 ? `${metadataChannels.length} kanal` : null);

  return [channelLabel, sourceCount, relativePath].filter((item): item is string => Boolean(item)).join(' · ');
}

function getMergedMetadataPath(filePath: string): string {
  const parsedPath = path.parse(filePath);
  return path.join(parsedPath.dir, `${parsedPath.name}.meta.json`);
}
