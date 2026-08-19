import fs from 'node:fs';
import path from 'node:path';
import type {
  ApplySubtitleBulkEditInput,
  BulkCleanSubtitlesInput,
  CleanSubtitleInput,
  PreviewSubtitleBulkEditInput,
  PreviewSubtitleBulkEditResult,
  SaveTranscriptEditInput,
  SubtitleBulkEditOperation,
  SubtitleBulkPreviewItem,
  VideoRecord
} from '../../shared/archive.js';
import type { ArchiveStore } from './store.js';
import {
  buildSubtitleTextFileName,
  cleanRawSubtitleText,
  cleanSubtitleAsset,
  createSubtitleWorkspace,
  getTranscriptStats,
  pickPreferredAsset
} from './transcripts.js';

export function getSubtitleWorkspace(store: ArchiveStore, videoId: string) {
  const assets = store.getSubtitleAssets(videoId);
  const document = store.getTranscriptDocument(videoId);
  const history = store.getTranscriptEditHistory(videoId);

  return createSubtitleWorkspace(videoId, assets, document, history);
}

export function cleanSubtitle(store: ArchiveStore, input: CleanSubtitleInput) {
  const assets = store.getSubtitleAssets(input.videoId);
  const asset = pickPreferredAsset(assets);

  if (!asset) {
    throw new Error('Bu video icin indirilen altyazi yok.');
  }

  const video = store.getVideosByIds([input.videoId])[0];
  const cleaned = cleanSubtitleAsset(asset, {
    title: video?.title,
    publishedAt: video?.publishedAt
  });
  store.saveCleanedTranscriptEdit({
    videoId: input.videoId,
    asset: cleaned.asset,
    cleanedPath: cleaned.cleanedPath,
    newText: cleaned.cleanedText,
    stats: {
      wordCount: cleaned.wordCount,
      segmentCount: cleaned.segmentCount
    },
    operationType: 'clean-from-raw',
    source: 'single'
  });

  return {
    snapshot: store.getSnapshot(),
    workspace: getSubtitleWorkspace(store, input.videoId)
  };
}

export function cleanSubtitles(store: ArchiveStore, input: BulkCleanSubtitlesInput) {
  const requestedVideoIds = [...new Set(input.videoIds)].filter((videoId) => videoId.trim().length > 0);
  let cleaned = 0;
  let skipped = 0;
  let failed = 0;
  let batchId: string | null = null;

  for (const videoId of requestedVideoIds) {
    try {
      const assets = store.getSubtitleAssets(videoId);
      const asset = pickPreferredAsset(assets);

      if (!asset) {
        skipped += 1;
        continue;
      }

      const video = store.getVideosByIds([videoId])[0];
      const result = cleanSubtitleAsset(asset, {
        title: video?.title,
        publishedAt: video?.publishedAt
      });
      batchId ??= store.createTranscriptEditBatch('clean-from-raw', 'bulk', requestedVideoIds.length);
      store.saveCleanedTranscriptEdit({
        videoId,
        asset: result.asset,
        cleanedPath: result.cleanedPath,
        newText: result.cleanedText,
        stats: {
          wordCount: result.wordCount,
          segmentCount: result.segmentCount
        },
        operationType: 'clean-from-raw',
        source: 'bulk',
        batchId
      });
      cleaned += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    snapshot: store.getSnapshot(),
    items: store.getSubtitleListItems(),
    cleaned,
    skipped,
    failed
  };
}

export function ensureAllDownloadedSubtitlesHaveTranscripts(store: ArchiveStore): number {
  let created = 0;

  for (const item of store.getSubtitleListItems()) {
    const video = store.getVideosByIds([item.videoId])[0];
    if (video && ensureCleanedTranscript(store, video)) {
      created += 1;
    }
  }

  return created;
}

export function ensureCleanedTranscript(store: ArchiveStore, video: VideoRecord): boolean {
  const document = store.getTranscriptDocument(video.id);
  if (document && fs.existsSync(document.cleanedPath)) {
    return false;
  }

  const asset = pickPreferredAsset(store.getSubtitleAssets(video.id));
  if (!asset) {
    return false;
  }

  try {
    const cleaned = cleanSubtitleAsset(asset, {
      title: video.title,
      publishedAt: video.publishedAt
    });
    store.saveCleanedTranscript(video.id, cleaned.asset, cleaned.cleanedPath, {
      wordCount: cleaned.wordCount,
      segmentCount: cleaned.segmentCount
    });
    return true;
  } catch {
    return false;
  }
}

export function saveTranscriptEdit(store: ArchiveStore, input: SaveTranscriptEditInput): { batchId: string } {
  const video = store.getVideosByIds([input.videoId])[0];
  if (!video) {
    throw new Error('Duzenecek video kaydi bulunamadi.');
  }

  const asset = pickPreferredAsset(store.getSubtitleAssets(input.videoId));
  if (!asset) {
    throw new Error('Temiz transcript kaydi icin raw altyazi gerekli.');
  }

  const cleanedText = input.cleanedText;
  const cleanedPath = writeCleanedTranscript(video, asset, cleanedText);
  const stats = getTranscriptStats(cleanedText);
  const batchId = store.saveCleanedTranscriptEdit({
    videoId: input.videoId,
    asset,
    cleanedPath,
    newText: cleanedText,
    stats,
    operationType: input.operationType ?? 'manual-edit',
    source: 'single'
  });

  return { batchId };
}

export function previewSubtitleBulkEdit(
  store: ArchiveStore,
  input: PreviewSubtitleBulkEditInput
): PreviewSubtitleBulkEditResult {
  validateBulkOperation(input.operation);

  const requestedVideoIds = [...new Set(input.videoIds)].filter((videoId) => videoId.trim().length > 0);
  const videos = store.getVideosByIds(requestedVideoIds);
  const items = videos.map((video) => {
    const change = prepareSubtitleBulkChange(store, video, input.operation);

    return {
      videoId: video.id,
      title: video.title,
      status: change.status,
      reason: change.reason,
      oldPreview: previewText(change.oldText),
      newPreview: previewText(change.newText),
      oldWordCount: getTranscriptStats(change.oldText).wordCount,
      newWordCount: getTranscriptStats(change.newText).wordCount,
      changeCount: change.changeCount
    } satisfies SubtitleBulkPreviewItem;
  });
  const affected = items.filter((item) => item.status === 'changed').length;
  const skipped = items.length - affected;

  return {
    operation: input.operation,
    affected,
    skipped,
    items,
    summary: [
      `${affected} kayit etkilenecek`,
      `${skipped} kayit atlanacak`,
      summarizeBulkOperation(input.operation)
    ]
  };
}

export function applySubtitleBulkEdit(store: ArchiveStore, input: ApplySubtitleBulkEditInput) {
  const excludedVideoIds = new Set(input.excludedVideoIds ?? []);
  const requestedVideoIds = input.videoIds.filter((videoId) => !excludedVideoIds.has(videoId));
  const preview = previewSubtitleBulkEdit(store, {
    videoIds: requestedVideoIds,
    operation: input.operation
  });
  const changedVideoIds = preview.items.filter((item) => item.status === 'changed').map((item) => item.videoId);
  const videos = store.getVideosByIds(changedVideoIds);
  const batchId =
    changedVideoIds.length > 0 ? store.createTranscriptEditBatch(input.operation.type, 'bulk', changedVideoIds.length) : null;
  let applied = 0;
  let failed = 0;

  for (const video of videos) {
    try {
      const asset = pickPreferredAsset(store.getSubtitleAssets(video.id));
      if (!asset || !batchId) {
        failed += 1;
        continue;
      }

      const change = prepareSubtitleBulkChange(store, video, input.operation);
      if (change.status !== 'changed') {
        continue;
      }

      const cleanedPath = writeCleanedTranscript(video, asset, change.newText);
      store.saveCleanedTranscriptEdit({
        videoId: video.id,
        asset,
        cleanedPath,
        newText: change.newText,
        stats: getTranscriptStats(change.newText),
        operationType: input.operation.type,
        source: 'bulk',
        batchId
      });
      applied += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    snapshot: store.getSnapshot(),
    items: store.getSubtitleListItems(),
    batchId,
    applied,
    skipped: preview.skipped + excludedVideoIds.size,
    failed,
    preview
  };
}

export function normalizeExistingCleanedTranscriptNames(store: ArchiveStore): void {
  for (const item of store.getSubtitleListItems()) {
    if (!item.hasCleaned) {
      continue;
    }

    const document = store.getTranscriptDocument(item.videoId);
    if (!document || !fs.existsSync(document.cleanedPath)) {
      continue;
    }

    const cleanedPath = path.join(
      path.dirname(document.cleanedPath),
      buildSubtitleTextFileName({
        publishedAt: item.publishedAt,
        title: item.title,
        fallbackName: item.videoId
      })
    );

    if (path.resolve(cleanedPath) === path.resolve(document.cleanedPath)) {
      continue;
    }

    if (!fs.existsSync(cleanedPath)) {
      fs.renameSync(document.cleanedPath, cleanedPath);
    }

    const asset =
      store
        .getSubtitleAssets(item.videoId)
        .find((candidate) => {
          return (
            candidate.language === document.language &&
            candidate.source === document.source &&
            candidate.format === document.format
          );
        }) ?? null;

    if (!asset) {
      continue;
    }

    store.saveCleanedTranscript(item.videoId, asset, cleanedPath, {
      wordCount: document.wordCount,
      segmentCount: document.segmentCount
    });
  }
}

function prepareSubtitleBulkChange(
  store: ArchiveStore,
  video: VideoRecord,
  operation: SubtitleBulkEditOperation
): { status: 'changed' | 'skipped'; reason: string | null; oldText: string; newText: string; changeCount: number } {
  const assets = store.getSubtitleAssets(video.id);
  const asset = pickPreferredAsset(assets);
  const document = store.getTranscriptDocument(video.id);
  const workspace = createSubtitleWorkspace(video.id, assets, document);

  if (!asset || (!workspace.hasSubtitle && !workspace.cleanedText.trim())) {
    return {
      status: 'skipped',
      reason: 'Raw altyazi veya temiz transcript yok.',
      oldText: '',
      newText: '',
      changeCount: 0
    };
  }

  const oldText = operation.type === 'clean-from-raw' && !workspace.hasCleaned ? '' : workspace.cleanedText;
  const transformed = transformTranscriptText(oldText, workspace.rawText, operation);

  if (transformed.text.trim() === oldText.trim()) {
    return {
      status: 'skipped',
      reason: 'Degisiklik yok.',
      oldText,
      newText: transformed.text,
      changeCount: 0
    };
  }

  return {
    status: 'changed',
    reason: null,
    oldText,
    newText: transformed.text,
    changeCount: transformed.changeCount
  };
}

function transformTranscriptText(
  currentText: string,
  rawText: string,
  operation: SubtitleBulkEditOperation
): { text: string; changeCount: number } {
  if (operation.type === 'clean-from-raw') {
    const cleaned = cleanRawSubtitleText(rawText);
    return { text: cleaned.text, changeCount: cleaned.segmentCount };
  }

  if (operation.type === 'trim-empty-lines') {
    const text = trimEmptyTranscriptLines(currentText);
    return { text, changeCount: text === currentText ? 0 : 1 };
  }

  if (operation.type === 'dedupe-repeats') {
    const text = dedupeAdjacentTranscriptLines(currentText);
    return { text, changeCount: text === currentText ? 0 : 1 };
  }

  if (operation.type === 'lowercase') {
    const text = currentText.toLocaleLowerCase('tr-TR');
    return { text, changeCount: text === currentText ? 0 : 1 };
  }

  if (operation.type === 'uppercase') {
    const text = currentText.toLocaleUpperCase('tr-TR');
    return { text, changeCount: text === currentText ? 0 : 1 };
  }

  const findText = operation.findText ?? '';
  const flags = operation.caseSensitive ? 'g' : 'gi';
  const pattern = new RegExp(escapeRegExp(findText), flags);
  const matches = currentText.match(pattern) ?? [];

  return {
    text: currentText.replace(pattern, operation.replaceText ?? ''),
    changeCount: matches.length
  };
}

function writeCleanedTranscript(video: VideoRecord, asset: NonNullable<ReturnType<typeof pickPreferredAsset>>, text: string): string {
  const cleanedDir = path.join(path.dirname(path.dirname(asset.rawPath)), 'cleaned');
  fs.mkdirSync(cleanedDir, { recursive: true });

  const cleanedPath = path.join(
    cleanedDir,
    buildSubtitleTextFileName({
      publishedAt: video.publishedAt,
      title: video.title,
      fallbackName: video.id
    })
  );
  fs.writeFileSync(cleanedPath, normalizeTranscriptFileText(text), 'utf8');

  return cleanedPath;
}

function validateBulkOperation(operation: SubtitleBulkEditOperation): void {
  if (operation.type === 'find-replace' && !operation.findText?.trim()) {
    throw new Error('Bul/degistir icin aranacak metin bos olamaz.');
  }
}

function summarizeBulkOperation(operation: SubtitleBulkEditOperation): string {
  if (operation.type === 'find-replace') {
    return `"${operation.findText ?? ''}" metni "${operation.replaceText ?? ''}" ile degisecek`;
  }

  const labels: Record<SubtitleBulkEditOperation['type'], string> = {
    'clean-from-raw': 'Raw altyazidan temiz transcript uretilecek',
    'trim-empty-lines': 'Bos satirlar temizlenecek',
    'dedupe-repeats': 'Ardisik tekrar satirlari azaltilacak',
    lowercase: 'Metin kucuk harfe donusturulecek',
    uppercase: 'Metin buyuk harfe donusturulecek',
    'find-replace': 'Bul/degistir uygulanacak'
  };

  return labels[operation.type];
}

function trimEmptyTranscriptLines(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => line.trim().length > 0 || (index > 0 && lines[index - 1]?.trim().length !== 0))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function dedupeAdjacentTranscriptLines(text: string): string {
  const result: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const normalizedLine = line.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
    const previous = result.at(-1)?.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');

    if (normalizedLine.length > 0 && normalizedLine === previous) {
      continue;
    }

    result.push(line);
  }

  return result.join('\n').trim();
}

function normalizeTranscriptFileText(value: string): string {
  return `${value.replace(/\s+$/g, '')}\n`;
}

function previewText(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
