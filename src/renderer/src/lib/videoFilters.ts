import type { VideoRecord } from '../../../shared/archive';
import type { DurationBucket } from '../constants/archiveOptions';

export function matchesDuration(video: VideoRecord, buckets: DurationBucket[]): boolean {
  return matchesDurationValue(video.durationMinutes, buckets);
}

export function matchesDurationValue(minutes: number | null, buckets: DurationBucket[]): boolean {
  if (buckets.length === 0) {
    return true;
  }

  if (minutes === null) {
    return false;
  }

  return buckets.some((bucket) => matchesDurationBucket(minutes, bucket));
}

export function videoNeedsSubtitleDownload(video: VideoRecord): boolean {
  return video.subtitleStatus === 'Indirilecek' || video.subtitleStatus === 'Eksik';
}

function matchesDurationBucket(minutes: number, bucket: DurationBucket): boolean {
  if (bucket === 'short') {
    return minutes < 10;
  }

  if (bucket === 'medium') {
    return minutes >= 10 && minutes <= 30;
  }

  if (bucket === 'long') {
    return minutes > 30 && minutes <= 60;
  }

  return minutes > 60;
}
