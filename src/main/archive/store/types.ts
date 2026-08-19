import type {
  ChannelStatus,
  SubtitleAssetSummary,
  SubtitleEditOperationType,
  SubtitleEditSource,
  SubtitleStatus,
  VideoRecord,
  VideoType
} from '../../../shared/archive.js';

export interface ChannelRow {
  id: string;
  source_url: string;
  name: string;
  handle: string;
  last_scan_at: string | null;
  status: ChannelStatus;
  accent: string;
  last_error: string | null;
  video_count: number;
  archived_subtitle_count: number;
}

export interface VideoRow {
  id: string;
  channel_id: string;
  title: string;
  published_at: string | null;
  weekday: VideoRecord['weekday'];
  duration_minutes: number | null;
  video_type: VideoType;
  subtitle_status: SubtitleStatus;
  language_label: string;
  thumbnail_url: string | null;
  density: number;
  webpage_url: string | null;
}

export interface SubtitleAssetRow {
  video_id: string;
  language_code: string;
  source_type: SubtitleAssetSummary['source'];
  format: string;
  raw_path: string;
  downloaded_at: string;
}

export interface SubtitleListRow extends VideoRow {
  asset_count: number;
  has_cleaned: number;
  word_count: number | null;
  segment_count: number | null;
  downloaded_at: string | null;
  cleaned_at: string | null;
}

export interface TranscriptEditChangeRow {
  change_id: number;
  batch_id: string;
  video_id: string;
  operation_type: SubtitleEditOperationType;
  source: SubtitleEditSource;
  actor: string;
  old_text: string | null;
  new_text: string | null;
  old_word_count: number | null;
  new_word_count: number | null;
  created_at: string;
  undone_at: string | null;
}

export interface TranscriptUndoChangeRow {
  change_id: number;
  batch_id: string;
  video_id: string;
  language_code: string;
  source_type: SubtitleAssetSummary['source'];
  format: string;
  old_language_code: string | null;
  old_source_type: SubtitleAssetSummary['source'] | null;
  old_format: string | null;
  old_cleaned_path: string | null;
  new_cleaned_path: string;
  had_document: number;
  old_text: string | null;
  old_word_count: number | null;
  old_segment_count: number | null;
  old_subtitle_status: SubtitleStatus;
  old_density: number;
}

export interface TranscriptDocumentRecord {
  videoId: string;
  language: string;
  source: SubtitleAssetSummary['source'];
  format: string;
  cleanedPath: string;
  wordCount: number;
  segmentCount: number;
  cleanedAt: string;
}

export interface SaveCleanedTranscriptEditInput {
  videoId: string;
  asset: SubtitleAssetSummary;
  cleanedPath: string;
  newText: string;
  stats: { wordCount: number; segmentCount: number };
  operationType: SubtitleEditOperationType;
  source: SubtitleEditSource;
  batchId?: string | null;
}

export interface UndoTranscriptEditResult {
  batchId: string | null;
  videoIds: string[];
  undone: boolean;
  message: string;
}
