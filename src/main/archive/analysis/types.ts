import type { AnalysisSourceType, SubtitleAssetSummary, VideoType } from '../../../shared/archive.js';

export interface CleanedFileCandidate {
  videoId: string;
  channelId: string;
  cleanedPath: string;
  cleanedAt: string;
}

export interface PreferredAssetRow {
  language_code: string;
  source_type: SubtitleAssetSummary['source'];
  format: string;
}

export interface TranscriptDocumentRow {
  video_id: string;
  channel_id: string;
  title: string;
  published_at: string | null;
  video_type: VideoType;
  cleaned_path: string;
  word_count: number;
  segment_count: number;
  cleaned_at: string;
}

export interface IndexedDocumentRow extends TranscriptDocumentRow {
  transcript: string;
}

export interface AnalysisTextDocument {
  sourceId: string;
  sourceType: AnalysisSourceType;
  videoId: string | null;
  channelId: string | null;
  channelName: string;
  title: string;
  publishedAt: string | null;
  videoType: VideoType | null;
  wordCount: number;
  transcript: string;
}
