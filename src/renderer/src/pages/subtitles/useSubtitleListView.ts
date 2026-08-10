import { useMemo } from 'react';
import type { SubtitleListItem, WeekdayLabel } from '../../../../shared/archive';
import type { DurationBucket, SubtitleSortOrder } from '../../constants/archiveOptions';
import { matchesDurationValue } from '../../lib/videoFilters';

interface UseSubtitleListViewInput {
  checkedSubtitleIds: string[];
  renderedSubtitleLimit: number;
  subtitleDateFrom: string;
  subtitleDateTo: string;
  subtitleDayFilters: WeekdayLabel[];
  subtitleDurationFilters: DurationBucket[];
  subtitleItems: SubtitleListItem[];
  subtitleQuery: string;
  subtitleSortOrder: SubtitleSortOrder;
}

export interface SubtitleListViewState {
  checkedVisibleSubtitleIds: string[];
  hasMoreRenderedSubtitles: boolean;
  renderedSubtitleItems: SubtitleListItem[];
  visibleSubtitleItems: SubtitleListItem[];
}

export function useSubtitleListView({
  checkedSubtitleIds,
  renderedSubtitleLimit,
  subtitleDateFrom,
  subtitleDateTo,
  subtitleDayFilters,
  subtitleDurationFilters,
  subtitleItems,
  subtitleQuery,
  subtitleSortOrder
}: UseSubtitleListViewInput): SubtitleListViewState {
  const visibleSubtitleItems = useMemo(() => {
    const normalizedQuery = subtitleQuery.trim().toLocaleLowerCase('tr-TR');

    return subtitleItems.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 || item.title.toLocaleLowerCase('tr-TR').includes(normalizedQuery);
      const matchesDay =
        subtitleDayFilters.length === 0 || (item.weekday !== null && subtitleDayFilters.includes(item.weekday));
      const matchesDateFrom =
        subtitleDateFrom.length === 0 || (item.publishedAt !== null && item.publishedAt >= subtitleDateFrom);
      const matchesDateTo =
        subtitleDateTo.length === 0 || (item.publishedAt !== null && item.publishedAt <= subtitleDateTo);
      const matchesDuration = matchesDurationValue(item.durationMinutes, subtitleDurationFilters);

      return matchesQuery && matchesDay && matchesDateFrom && matchesDateTo && matchesDuration;
    }).sort((first, second) => compareSubtitleDates(first, second, subtitleSortOrder));
  }, [subtitleDateFrom, subtitleDateTo, subtitleDayFilters, subtitleDurationFilters, subtitleItems, subtitleQuery, subtitleSortOrder]);

  const renderedSubtitleItems = useMemo(
    () => visibleSubtitleItems.slice(0, Math.min(renderedSubtitleLimit, visibleSubtitleItems.length)),
    [renderedSubtitleLimit, visibleSubtitleItems]
  );
  const visibleSubtitleIdSet = useMemo(
    () => new Set(visibleSubtitleItems.map((item) => item.videoId)),
    [visibleSubtitleItems]
  );
  const checkedVisibleSubtitleIds = useMemo(
    () => checkedSubtitleIds.filter((videoId) => visibleSubtitleIdSet.has(videoId)),
    [checkedSubtitleIds, visibleSubtitleIdSet]
  );

  return {
    checkedVisibleSubtitleIds,
    hasMoreRenderedSubtitles: renderedSubtitleItems.length < visibleSubtitleItems.length,
    renderedSubtitleItems,
    visibleSubtitleItems
  };
}

function compareSubtitleDates(
  first: SubtitleListItem,
  second: SubtitleListItem,
  sortOrder: SubtitleSortOrder
): number {
  if (first.publishedAt === second.publishedAt) {
    return first.title.localeCompare(second.title, 'tr-TR');
  }

  if (first.publishedAt === null) {
    return 1;
  }

  if (second.publishedAt === null) {
    return -1;
  }

  const dateComparison = first.publishedAt.localeCompare(second.publishedAt);
  return sortOrder === 'oldest' ? dateComparison : -dateComparison;
}
