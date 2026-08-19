import { useMemo } from 'react';
import type {
  ArchiveSnapshot,
  ChannelSummary,
  SubtitleStatus,
  VideoRecord,
  VideoType,
  WeekdayLabel
} from '../../../../shared/archive';
import type { DurationBucket } from '../../constants/archiveOptions';
import { matchesDuration, videoNeedsSubtitleDownload } from '../../lib/videoFilters';
import type { ChannelStats } from './types';

interface UseArchiveViewStateInput {
  checkedVideoIds: string[];
  dayFilters: WeekdayLabel[];
  durationFilters: DurationBucket[];
  query: string;
  renderedVideoLimit: number;
  selectedChannelId: string | null;
  selectedVideoId: string | null;
  snapshot: ArchiveSnapshot;
  subtitleFilters: SubtitleStatus[];
  typeFilters: VideoType[];
}

export interface ArchiveViewState {
  channelStatsById: Map<string, ChannelStats>;
  channelVideos: VideoRecord[];
  checkedVisibleVideoIds: string[];
  downloadableVideoIds: string[];
  hasMoreRenderedVideos: boolean;
  renderedVideos: VideoRecord[];
  selectedChannel: ChannelSummary | null;
  selectedVideo: VideoRecord | null;
  visibleVideos: VideoRecord[];
}

export function useArchiveViewState({
  checkedVideoIds,
  dayFilters,
  durationFilters,
  query,
  renderedVideoLimit,
  selectedChannelId,
  selectedVideoId,
  snapshot,
  subtitleFilters,
  typeFilters
}: UseArchiveViewStateInput): ArchiveViewState {
  const selectedChannel = useMemo(
    () => snapshot.channels.find((channel) => channel.id === selectedChannelId) ?? snapshot.channels[0] ?? null,
    [selectedChannelId, snapshot.channels]
  );

  const channelVideos = useMemo(
    () => (selectedChannel ? snapshot.videos.filter((video) => video.channelId === selectedChannel.id) : []),
    [selectedChannel, snapshot.videos]
  );

  const channelStatsById = useMemo(() => {
    const stats = new Map<string, ChannelStats>();

    for (const channel of snapshot.channels) {
      stats.set(channel.id, { ready: 0, cleaned: 0, missing: 0 });
    }

    for (const video of snapshot.videos) {
      const current = stats.get(video.channelId) ?? { ready: 0, cleaned: 0, missing: 0 };

      if (video.subtitleStatus === 'Temizlendi') {
        current.cleaned += 1;
        current.ready += 1;
      } else if (video.subtitleStatus === 'Hazir') {
        current.ready += 1;
      } else if (video.subtitleStatus === 'Eksik') {
        current.missing += 1;
      }

      stats.set(video.channelId, current);
    }

    return stats;
  }, [snapshot.channels, snapshot.videos]);

  const visibleVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');

    return channelVideos.filter((video) => {
      const matchesQuery =
        normalizedQuery.length === 0 || video.title.toLocaleLowerCase('tr-TR').includes(normalizedQuery);
      const matchesType = typeFilters.length === 0 || typeFilters.includes(video.type);
      const matchesDay = dayFilters.length === 0 || (video.weekday !== null && dayFilters.includes(video.weekday));
      const matchesSubtitle = subtitleFilters.length === 0 || subtitleFilters.includes(video.subtitleStatus);

      return matchesQuery && matchesType && matchesDay && matchesSubtitle && matchesDuration(video, durationFilters);
    });
  }, [channelVideos, dayFilters, durationFilters, query, subtitleFilters, typeFilters]);

  const selectedVideo = useMemo(
    () =>
      snapshot.videos.find((video) => video.id === selectedVideoId) ??
      visibleVideos[0] ??
      channelVideos[0] ??
      null,
    [channelVideos, selectedVideoId, snapshot.videos, visibleVideos]
  );

  const renderedVideos = useMemo(
    () => visibleVideos.slice(0, Math.min(renderedVideoLimit, visibleVideos.length)),
    [renderedVideoLimit, visibleVideos]
  );

  const downloadableVideoIds = useMemo(
    () => visibleVideos.filter(videoNeedsSubtitleDownload).map((video) => video.id),
    [visibleVideos]
  );
  const downloadableVideoIdSet = useMemo(() => new Set(downloadableVideoIds), [downloadableVideoIds]);
  const checkedVisibleVideoIds = useMemo(
    () => checkedVideoIds.filter((videoId) => downloadableVideoIdSet.has(videoId)),
    [checkedVideoIds, downloadableVideoIdSet]
  );

  return {
    channelStatsById,
    channelVideos,
    checkedVisibleVideoIds,
    downloadableVideoIds,
    hasMoreRenderedVideos: renderedVideos.length < visibleVideos.length,
    renderedVideos,
    selectedChannel,
    selectedVideo,
    visibleVideos
  };
}
