import type { CSSProperties } from 'react';
import type { VideoRecord } from '../../../shared/archive';

const fallbackThumbnails = [
  'linear-gradient(135deg, #1f2937, #2563eb 58%, #f59e0b)',
  'linear-gradient(135deg, #0f766e, #38bdf8 62%, #f8fafc)',
  'linear-gradient(135deg, #dc2626, #f97316 58%, #fde68a)',
  'linear-gradient(135deg, #451a03, #b45309 55%, #fef3c7)',
  'linear-gradient(135deg, #064e3b, #10b981 60%, #ccfbf1)',
  'linear-gradient(135deg, #312e81, #7c3aed 54%, #e0e7ff)'
];

export function getThumbnailStyle(video: Pick<VideoRecord, 'thumbnailUrl'>, index: number): CSSProperties {
  return getThumbnailStyleFromUrl(video.thumbnailUrl, index);
}

export function getThumbnailStyleFromUrl(thumbnailUrl: string | null, index: number): CSSProperties {
  if (thumbnailUrl) {
    const assetUrl = normalizeThumbnailAssetUrl(thumbnailUrl);
    return { backgroundImage: `url("${assetUrl.replaceAll('"', '%22')}")` };
  }

  return { background: fallbackThumbnails[index % fallbackThumbnails.length] };
}

function normalizeThumbnailAssetUrl(thumbnailUrl: string): string {
  if (/^(https?:|data:|subtitle-asset:)/i.test(thumbnailUrl)) {
    return thumbnailUrl;
  }

  if (/^file:/i.test(thumbnailUrl)) {
    try {
      return toArchiveAssetUrl(new URL(thumbnailUrl).pathname);
    } catch {
      return thumbnailUrl;
    }
  }

  if (thumbnailUrl.startsWith('/')) {
    return toArchiveAssetUrl(thumbnailUrl);
  }

  return thumbnailUrl;
}

function toArchiveAssetUrl(filePath: string): string {
  return `subtitle-asset://local/?path=${encodeURIComponent(filePath)}`;
}
