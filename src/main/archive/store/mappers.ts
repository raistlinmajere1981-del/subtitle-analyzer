import type {
  ChannelSummary,
  SubtitleAssetSummary,
  SubtitleEditHistoryItem,
  SubtitleListItem,
  VideoRecord
} from '../../../shared/archive.js';
import type {
  ChannelRow,
  SubtitleAssetRow,
  SubtitleListRow,
  TranscriptEditChangeRow,
  VideoRow
} from './types.js';

export function mapChannelRow(row: ChannelRow): ChannelSummary {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    name: row.name,
    handle: row.handle,
    videos: Number(row.video_count),
    archivedSubtitles: Number(row.archived_subtitle_count ?? 0),
    lastScan: row.last_scan_at,
    status: row.status,
    accent: row.accent,
    lastError: row.last_error
  };
}

export function mapVideoRow(row: VideoRow): VideoRecord {
  return {
    id: row.id,
    channelId: row.channel_id,
    title: row.title,
    publishedAt: row.published_at,
    weekday: row.weekday,
    durationMinutes: row.duration_minutes,
    type: row.video_type,
    subtitleStatus: row.subtitle_status,
    language: row.language_label,
    thumbnailUrl: row.thumbnail_url,
    density: row.density,
    webpageUrl: row.webpage_url
  };
}

export function mapSubtitleAssetRow(row: SubtitleAssetRow): SubtitleAssetSummary {
  return {
    videoId: row.video_id,
    language: row.language_code,
    source: row.source_type,
    format: row.format,
    rawPath: row.raw_path,
    downloadedAt: row.downloaded_at
  };
}

export function mapSubtitleListRow(row: SubtitleListRow): SubtitleListItem {
  return {
    videoId: row.id,
    channelId: row.channel_id,
    title: row.title,
    publishedAt: row.published_at,
    weekday: row.weekday,
    durationMinutes: row.duration_minutes,
    type: row.video_type,
    subtitleStatus: row.subtitle_status,
    language: row.language_label,
    thumbnailUrl: row.thumbnail_url,
    assetCount: Number(row.asset_count ?? 0),
    hasCleaned: Number(row.has_cleaned ?? 0) > 0,
    wordCount: Number(row.word_count ?? row.density ?? 0),
    segmentCount: Number(row.segment_count ?? 0),
    downloadedAt: row.downloaded_at,
    cleanedAt: row.cleaned_at
  };
}

export function mapTranscriptEditChangeRow(row: TranscriptEditChangeRow): SubtitleEditHistoryItem {
  return {
    id: String(row.change_id),
    batchId: row.batch_id,
    videoId: row.video_id,
    operationType: row.operation_type,
    source: row.source,
    actor: row.actor,
    oldPreview: previewText(row.old_text ?? ''),
    newPreview: previewText(row.new_text ?? ''),
    oldWordCount: Number(row.old_word_count ?? 0),
    newWordCount: Number(row.new_word_count ?? 0),
    createdAt: row.created_at,
    undoneAt: row.undone_at
  };
}

function previewText(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact;
}
