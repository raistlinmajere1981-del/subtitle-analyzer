import fs from 'node:fs';
import type {
  SubtitleAssetSummary,
  SubtitleEditHistoryItem,
  SubtitleQualityWarning,
  SubtitleWorkspace
} from '../../../shared/archive.js';
import type { TranscriptDocumentRecord } from '../store/types.js';
import { pickPreferredAsset } from './selection.js';
import { cleanRawSubtitleText } from './text.js';
import { readTextFile } from './utils.js';

export function createSubtitleWorkspace(
  videoId: string,
  assets: SubtitleAssetSummary[],
  document: TranscriptDocumentRecord | null,
  history: SubtitleEditHistoryItem[] = []
): SubtitleWorkspace {
  const selectedAsset = pickPreferredAsset(assets);

  if (!selectedAsset) {
    return {
      videoId,
      hasSubtitle: false,
      hasCleaned: false,
      assets,
      selectedAsset: null,
      rawText: '',
      cleanedText: '',
      suggestedCleanedText: '',
      cleanedPath: null,
      cleanedAt: null,
      segmentCount: 0,
      wordCount: 0,
      message: 'Bu video icin indirilen altyazi yok.',
      qualityWarnings: [
        {
          code: 'raw-missing',
          message: 'Bu video icin indirilen raw altyazi yok.',
          severity: 'warning'
        }
      ],
      history
    };
  }

  const rawText = readTextFile(selectedAsset.rawPath);
  const cleanedDocumentExists = document !== null && fs.existsSync(document.cleanedPath);

  if (cleanedDocumentExists) {
    const cleanedText = readTextFile(document.cleanedPath);
    const qualityWarnings = getWorkspaceQualityWarnings(selectedAsset, document, rawText, cleanedText, cleanedDocumentExists);
    return {
      videoId,
      hasSubtitle: rawText.trim().length > 0,
      hasCleaned: cleanedDocumentExists,
      assets,
      selectedAsset,
      rawText,
      cleanedText,
      suggestedCleanedText: cleanedText,
      cleanedPath: document.cleanedPath,
      cleanedAt: document.cleanedAt,
      segmentCount: document.segmentCount,
      wordCount: document.wordCount,
      message: rawText.trim().length > 0 ? null : 'Raw altyazi dosyasi okunamadi.',
      qualityWarnings,
      history
    };
  }

  const preview = cleanRawSubtitleText(rawText);
  const cleanedText = preview.text;
  const qualityWarnings = getWorkspaceQualityWarnings(selectedAsset, document, rawText, cleanedText, cleanedDocumentExists);

  return {
    videoId,
    hasSubtitle: rawText.trim().length > 0,
    hasCleaned: cleanedDocumentExists,
    assets,
    selectedAsset,
    rawText,
    cleanedText,
    suggestedCleanedText: preview.text,
    cleanedPath: null,
    cleanedAt: null,
    segmentCount: preview.segmentCount,
    wordCount: preview.wordCount,
    message: rawText.trim().length > 0 ? null : 'Raw altyazi dosyasi okunamadi.',
    qualityWarnings,
    history
  };
}

function getWorkspaceQualityWarnings(
  asset: SubtitleAssetSummary,
  document: TranscriptDocumentRecord | null,
  rawText: string,
  cleanedText: string,
  cleanedDocumentExists: boolean
): SubtitleQualityWarning[] {
  const warnings: SubtitleQualityWarning[] = [];

  if (!fs.existsSync(asset.rawPath)) {
    warnings.push({
      code: 'raw-path-missing',
      message: 'Raw altyazi dosyasi belirtilen yolda bulunamadi.',
      severity: 'warning'
    });
  }

  if (rawText.trim().length === 0) {
    warnings.push({
      code: 'raw-empty',
      message: 'Raw altyazi okunamadi veya bos.',
      severity: 'warning'
    });
  }

  if (!cleanedDocumentExists) {
    warnings.push({
      code: 'cleaned-missing',
      message: 'Temiz transcript henuz kaydedilmedi.',
      severity: 'warning'
    });
  }

  if (cleanedDocumentExists && cleanedText.trim().length === 0) {
    warnings.push({
      code: 'cleaned-empty',
      message: 'Temiz transcript bos gorunuyor.',
      severity: 'warning'
    });
  }

  if (document && asset.downloadedAt > document.cleanedAt) {
    warnings.push({
      code: 'cleaned-stale',
      message: 'Raw altyazi temiz transcript kaydindan daha yeni.',
      severity: 'warning'
    });
  }

  return warnings;
}
