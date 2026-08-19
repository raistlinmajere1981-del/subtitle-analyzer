import fs from 'node:fs';
import path from 'node:path';
import type { ExportSubtitlesInput, ExportSubtitlesResult, VideoRecord } from '../../shared/archive.js';
import type { ArchiveStore } from './store.js';
import { buildSubtitleTextFileName, createSubtitleWorkspace } from './transcripts.js';

interface MergedSubtitleExportMetadata {
  version: 1;
  title: string;
  createdAt: string;
  sourceCount: number;
  sourceVideoIds: string[];
  channels: Array<{
    id: string;
    name: string;
  }>;
  includeMetadata: boolean;
  sortByPublishedAt: boolean;
}

export function exportSubtitles(store: ArchiveStore, input: ExportSubtitlesInput): ExportSubtitlesResult {
  const requestedVideoIds = [...new Set(input.videoIds)].filter((videoId) => videoId.trim().length > 0);
  const videos = store.getVideosByIds(requestedVideoIds);
  const exportPath = path.join(store.archivePath, 'exports', `subtitles-${formatExportDate(new Date())}`);
  fs.mkdirSync(exportPath, { recursive: true });

  if (input.merge) {
    return exportMergedSubtitles(store, videos, exportPath, {
      includeMetadata: input.includeMetadata === true,
      sortByPublishedAt: input.sortByPublishedAt !== false
    });
  }

  let exported = 0;
  let skipped = 0;
  let failed = 0;
  const files: string[] = [];
  const jsonRows: unknown[] = [];

  for (const video of videos) {
    try {
      const assets = store.getSubtitleAssets(video.id);
      const document = store.getTranscriptDocument(video.id);
      const workspace = createSubtitleWorkspace(video.id, assets, document);
      const textFileName = buildSubtitleTextFileName({
        publishedAt: video.publishedAt,
        title: video.title,
        fallbackName: video.id
      });
      const baseName = textFileName.replace(/\.txt$/i, '');

      if (input.format === 'json') {
        if (!workspace.hasSubtitle && !workspace.hasCleaned) {
          skipped += 1;
          continue;
        }

        jsonRows.push({
          video,
          assets: workspace.assets,
          cleanedText: workspace.cleanedText,
          rawText: workspace.rawText,
          stats: {
            segmentCount: workspace.segmentCount,
            wordCount: workspace.wordCount
          }
        });
        exported += 1;
        continue;
      }

      if (input.format === 'txt') {
        if (!workspace.cleanedText.trim()) {
          skipped += 1;
          continue;
        }

        const outputPath = getUniquePath(path.join(exportPath, `${baseName}.txt`));
        fs.writeFileSync(outputPath, `${workspace.cleanedText.trim()}\n`, 'utf8');
        files.push(outputPath);
        exported += 1;
        continue;
      }

      const asset = workspace.selectedAsset;
      if (!asset || !fs.existsSync(asset.rawPath)) {
        skipped += 1;
        continue;
      }

      const outputPath = getUniquePath(path.join(exportPath, `${baseName}.${asset.language}.${asset.format}`));
      fs.copyFileSync(asset.rawPath, outputPath);
      files.push(outputPath);
      exported += 1;
    } catch {
      failed += 1;
    }
  }

  if (input.format === 'json') {
    const outputPath = path.join(exportPath, 'subtitles.json');
    fs.writeFileSync(outputPath, `${JSON.stringify(jsonRows, null, 2)}\n`, 'utf8');
    files.push(outputPath);
  }

  return {
    exportPath,
    files,
    merged: false,
    mergedFilePath: null,
    mergedCount: 0,
    exported,
    skipped,
    failed
  };
}

function exportMergedSubtitles(
  store: ArchiveStore,
  videos: VideoRecord[],
  exportPath: string,
  options: {
    includeMetadata: boolean;
    sortByPublishedAt: boolean;
  }
): ExportSubtitlesResult {
  let skipped = 0;
  let failed = 0;
  const sections: string[] = [];
  const includedVideos: VideoRecord[] = [];

  const exportVideos = options.sortByPublishedAt ? sortVideosByPublishedAt(videos) : videos;

  for (const video of exportVideos) {
    try {
      const assets = store.getSubtitleAssets(video.id);
      const document = store.getTranscriptDocument(video.id);
      const workspace = createSubtitleWorkspace(video.id, assets, document);
      const cleanedText = workspace.cleanedText.trim();

      if (!cleanedText) {
        skipped += 1;
        continue;
      }

      sections.push(formatMergedSubtitleSection(video, cleanedText, options.includeMetadata));
      includedVideos.push(video);
    } catch {
      failed += 1;
    }
  }

  const mergedFilePath =
    sections.length > 0 ? getUniquePath(path.join(exportPath, 'birlesik-altyazilar.txt')) : null;

  if (mergedFilePath) {
    fs.writeFileSync(mergedFilePath, `${sections.join('\n\n---\n\n')}\n`, 'utf8');
    fs.writeFileSync(
      getMergedMetadataPath(mergedFilePath),
      `${JSON.stringify(buildMergedSubtitleMetadata(store, includedVideos, options), null, 2)}\n`,
      'utf8'
    );
  }

  return {
    exportPath,
    files: mergedFilePath ? [mergedFilePath] : [],
    merged: true,
    mergedFilePath,
    mergedCount: sections.length,
    exported: mergedFilePath ? 1 : 0,
    skipped,
    failed
  };
}

function sortVideosByPublishedAt(videos: VideoRecord[]): VideoRecord[] {
  return [...videos].sort((first, second) => {
    if (first.publishedAt === second.publishedAt) {
      return 0;
    }

    if (first.publishedAt === null) {
      return 1;
    }

    if (second.publishedAt === null) {
      return -1;
    }

    return first.publishedAt.localeCompare(second.publishedAt);
  });
}

function formatMergedSubtitleSection(video: VideoRecord, cleanedText: string, includeMetadata: boolean): string {
  if (!includeMetadata) {
    return cleanedText;
  }

  return [`# ${video.title}`, `Yayin tarihi: ${video.publishedAt ?? '-'}`, '', cleanedText].join('\n');
}

function buildMergedSubtitleMetadata(
  store: ArchiveStore,
  videos: VideoRecord[],
  options: {
    includeMetadata: boolean;
    sortByPublishedAt: boolean;
  }
): MergedSubtitleExportMetadata {
  const channelById = new Map(store.getSnapshot().channels.map((channel) => [channel.id, channel]));
  const channels = [...new Set(videos.map((video) => video.channelId))].map((channelId) => ({
    id: channelId,
    name: channelById.get(channelId)?.name ?? channelId
  }));
  const [singleChannel] = channels;
  const title =
    channels.length === 1 && singleChannel
      ? `${singleChannel.name} - Birlestirilmis`
      : 'Birlestirilmis altyazilar';

  return {
    version: 1,
    title,
    createdAt: new Date().toISOString(),
    sourceCount: videos.length,
    sourceVideoIds: videos.map((video) => video.id),
    channels,
    includeMetadata: options.includeMetadata,
    sortByPublishedAt: options.sortByPublishedAt
  };
}

function formatExportDate(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function getMergedMetadataPath(filePath: string): string {
  const parsedPath = path.parse(filePath);
  return path.join(parsedPath.dir, `${parsedPath.name}.meta.json`);
}

function getUniquePath(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return filePath;
  }

  const parsedPath = path.parse(filePath);
  let index = 2;

  while (true) {
    const candidatePath = path.join(parsedPath.dir, `${parsedPath.name} (${index})${parsedPath.ext}`);
    if (!fs.existsSync(candidatePath)) {
      return candidatePath;
    }

    index += 1;
  }
}
