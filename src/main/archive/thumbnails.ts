import fs from 'node:fs';
import path from 'node:path';
import type { ChannelScanResult } from './ytDlp.js';

const thumbnailCacheConcurrency = 8;

export async function cacheChannelThumbnails(
  result: ChannelScanResult,
  archivePath: string,
  signal: AbortSignal,
  onProgress: (processedVideos: number, currentTitle: string | null) => void
): Promise<ChannelScanResult> {
  const thumbnailDir = path.join(archivePath, 'thumbnails', sanitizePathPart(result.channel.id));
  fs.mkdirSync(thumbnailDir, { recursive: true });

  let processedVideos = 0;
  const videos = await mapWithConcurrency(result.videos, thumbnailCacheConcurrency, async (video) => {
    throwIfAborted(signal, 'Kanal taramasi iptal edildi.');

    const thumbnailUrl = await cacheThumbnail(thumbnailDir, video.id, video.thumbnailUrl, signal);
    processedVideos += 1;

    if (processedVideos % 10 === 0 || processedVideos === result.videos.length) {
      onProgress(processedVideos, video.title);
    }

    return {
      ...video,
      thumbnailUrl
    };
  });

  return {
    ...result,
    videos
  };
}

async function cacheThumbnail(
  thumbnailDir: string,
  videoId: string,
  thumbnailUrl: string | null,
  signal: AbortSignal
): Promise<string | null> {
  if (!thumbnailUrl) {
    return null;
  }

  if (thumbnailUrl.startsWith('file://') || path.isAbsolute(thumbnailUrl)) {
    return thumbnailUrl;
  }

  if (!/^https?:\/\//i.test(thumbnailUrl)) {
    return thumbnailUrl;
  }

  const thumbnailPath = path.join(thumbnailDir, `${sanitizePathPart(videoId)}.${getThumbnailExtension(thumbnailUrl)}`);

  if (fs.existsSync(thumbnailPath)) {
    return thumbnailPath;
  }

  try {
    throwIfAborted(signal, 'Kanal taramasi iptal edildi.');
    const response = await fetch(thumbnailUrl, { signal });

    if (!response.ok) {
      return thumbnailUrl;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    throwIfAborted(signal, 'Kanal taramasi iptal edildi.');
    fs.writeFileSync(thumbnailPath, buffer);
    return thumbnailPath;
  } catch (error) {
    if (signal.aborted) {
      throw new Error('Kanal taramasi iptal edildi.');
    }

    return thumbnailUrl;
  }
}

function getThumbnailExtension(thumbnailUrl: string): string {
  try {
    const extension = path.extname(new URL(thumbnailUrl).pathname).slice(1).toLocaleLowerCase('en-US');
    if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
      return extension;
    }
  } catch {
    return 'jpg';
  }

  return 'jpg';
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<U>
): Promise<U[]> {
  const results = new Array<U>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index] as T, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function throwIfAborted(signal: AbortSignal, message: string): void {
  if (signal.aborted) {
    throw new Error(message);
  }
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'subtitle';
}
