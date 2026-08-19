import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  ArchiveSnapshot,
  ImportManualTextsInput,
  ImportManualTextsResult,
  SubtitleAssetSummary,
  SubtitleEditHistoryItem,
  SubtitleEditOperationType,
  SubtitleEditSource,
  SubtitleListItem,
  VideoRecord
} from '../../shared/archive.js';
import type { DownloadedSubtitleAsset } from './subtitles.js';
import type { ChannelScanResult } from './ytDlp.js';
import * as scanRepository from './store/scans.js';
import { initializeArchiveStoreSchema } from './store/schema.js';
import * as manualTextRepository from './store/manualTexts.js';
import * as snapshotRepository from './store/snapshot.js';
import * as subtitleAssetRepository from './store/subtitleAssets.js';
import * as transcriptRepository from './store/transcripts.js';
import type {
  SaveCleanedTranscriptEditInput,
  TranscriptDocumentRecord,
  UndoTranscriptEditResult
} from './store/types.js';
import * as videoRepository from './store/videos.js';

export type { SaveCleanedTranscriptEditInput, TranscriptDocumentRecord, UndoTranscriptEditResult } from './store/types.js';

export class ArchiveStore {
  readonly archivePath: string;
  private readonly db: DatabaseSync;

  constructor(archivePath: string) {
    this.archivePath = archivePath;
    fs.mkdirSync(this.archivePath, { recursive: true });

    this.db = new DatabaseSync(path.join(this.archivePath, 'subtitle-analyzer.sqlite'));
    initializeArchiveStoreSchema(this.db);
  }

  getSnapshot(): ArchiveSnapshot {
    return snapshotRepository.getArchiveSnapshot(this.db, this.archivePath);
  }

  saveSuccessfulScan(result: ChannelScanResult): ArchiveSnapshot {
    scanRepository.saveSuccessfulScan(this.db, result);
    return this.getSnapshot();
  }

  saveFailedScan(sourceUrl: string, error: Error, existingChannelId?: string): ArchiveSnapshot {
    scanRepository.saveFailedScan(this.db, sourceUrl, error, existingChannelId);
    return this.getSnapshot();
  }

  getVideosByIds(videoIds: string[]): VideoRecord[] {
    return videoRepository.getVideosByIds(this.db, videoIds);
  }

  getVideosByChannelId(channelId: string): VideoRecord[] {
    return videoRepository.getVideosByChannelId(this.db, channelId);
  }

  deleteChannel(channelId: string): ArchiveSnapshot {
    scanRepository.deleteChannel(this.db, this.archivePath, channelId);
    return this.getSnapshot();
  }

  importManualTextFiles(input: ImportManualTextsInput): ImportManualTextsResult {
    const result = manualTextRepository.importManualTextFiles(this.db, this.archivePath, input);
    const message =
      result.imported > 0
        ? `${result.imported} metin manuel arsive eklendi.`
        : 'Manuel arsive eklenecek metin bulunamadi.';

    return {
      snapshot: this.getSnapshot(),
      cancelled: false,
      message,
      ...result
    };
  }

  getSubtitleAssets(videoId: string): SubtitleAssetSummary[] {
    return subtitleAssetRepository.getSubtitleAssets(this.db, videoId);
  }

  getSubtitleListItems(channelId?: string | null): SubtitleListItem[] {
    return subtitleAssetRepository.getSubtitleListItems(this.db, channelId);
  }

  getTranscriptDocument(videoId: string): TranscriptDocumentRecord | null {
    return transcriptRepository.getTranscriptDocument(this.db, videoId);
  }

  getTranscriptEditHistory(videoId: string, limit = 8): SubtitleEditHistoryItem[] {
    return transcriptRepository.getTranscriptEditHistory(this.db, videoId, limit);
  }

  createTranscriptEditBatch(
    operationType: SubtitleEditOperationType,
    source: SubtitleEditSource,
    itemCount: number,
    actor = 'local user'
  ): string {
    return transcriptRepository.createTranscriptEditBatch(this.db, operationType, source, itemCount, actor);
  }

  saveCleanedTranscriptEdit(input: SaveCleanedTranscriptEditInput): string {
    return transcriptRepository.saveCleanedTranscriptEdit(this.db, input);
  }

  undoLastTranscriptEdit(videoId?: string): UndoTranscriptEditResult {
    return transcriptRepository.undoLastTranscriptEdit(this.db, videoId);
  }

  saveCleanedTranscript(
    videoId: string,
    asset: SubtitleAssetSummary,
    cleanedPath: string,
    stats: { wordCount: number; segmentCount: number }
  ): void {
    transcriptRepository.saveCleanedTranscript(this.db, videoId, asset, cleanedPath, stats);
  }

  saveSubtitleDownloadResult(videoId: string, assets: DownloadedSubtitleAsset[]): void {
    subtitleAssetRepository.saveSubtitleDownloadResult(this.db, videoId, assets);
  }
}
