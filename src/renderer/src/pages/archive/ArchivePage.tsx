import {
  CalendarDays,
  Clock3,
  Download,
  Filter,
  FilePlus2,
  Languages,
  Library,
  Plus,
  RefreshCcw,
  Search,
  Tags,
  Trash2
} from 'lucide-react';
import type { CSSProperties, ReactElement, UIEvent } from 'react';
import { useMemo } from 'react';
import type {
  ChannelSummary,
  SubtitleLanguageMode,
  SubtitleStatus,
  VideoRecord,
  VideoType,
  WeekdayLabel
} from '../../../../shared/archive';
import { CheckboxFilterGroup } from '../../components/CheckboxFilterGroup';
import { StatusPill, SubtitlePill } from '../../components/Pills';
import { ThumbnailPreview } from '../../components/ThumbnailPreview';
import {
  dayOptions,
  durationOptions,
  subtitleLanguageOptions,
  subtitleOptions,
  type DurationBucket,
  typeOptions
} from '../../constants/archiveOptions';
import { formatDuration } from '../../lib/format';
import { getThumbnailStyle } from '../../lib/thumbnail';
import type { ChannelStats } from './types';

interface ArchivePageProps {
  channels: ChannelSummary[];
  channelStatsById: Map<string, ChannelStats>;
  selectedChannel: ChannelSummary | null;
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onDeleteChannel: (channel: ChannelSummary) => void;
  visibleVideos: VideoRecord[];
  renderedVideos: VideoRecord[];
  selectedVideoId: string | null;
  onSelectVideo: (videoId: string) => void;
  checkedVideoIds: string[];
  checkedVisibleCount: number;
  downloadableCount: number;
  onToggleVideoSelection: (videoId: string) => void;
  onSelectAllVisible: () => void;
  onClearVideoSelection: () => void;
  onDownloadFiltered: () => void;
  onDownloadSelected: () => void;
  subtitleLanguageMode: SubtitleLanguageMode;
  onSubtitleLanguageModeChange: (value: SubtitleLanguageMode) => void;
  onLoadMoreVideos: () => void;
  onVideoListScroll: (event: UIEvent<HTMLDivElement>) => void;
  hasMoreRenderedVideos: boolean;
  query: string;
  setQuery: (value: string) => void;
  durationFilters: DurationBucket[];
  onToggleDurationFilter: (value: string) => void;
  typeFilters: VideoType[];
  onToggleTypeFilter: (value: string) => void;
  dayFilters: WeekdayLabel[];
  onToggleDayFilter: (value: string) => void;
  subtitleFilters: SubtitleStatus[];
  onToggleSubtitleFilter: (value: string) => void;
  onAddChannel: () => void;
  onAddManualArchive: () => void;
  onRefreshChannel: () => void;
  isBusy: boolean;
}

export function ArchivePage({
  channels,
  channelStatsById,
  selectedChannel,
  selectedChannelId,
  onSelectChannel,
  onDeleteChannel,
  visibleVideos,
  renderedVideos,
  selectedVideoId,
  onSelectVideo,
  checkedVideoIds,
  checkedVisibleCount,
  downloadableCount,
  onToggleVideoSelection,
  onSelectAllVisible,
  onClearVideoSelection,
  onDownloadFiltered,
  onDownloadSelected,
  subtitleLanguageMode,
  onSubtitleLanguageModeChange,
  onLoadMoreVideos,
  onVideoListScroll,
  hasMoreRenderedVideos,
  query,
  setQuery,
  durationFilters,
  onToggleDurationFilter,
  typeFilters,
  onToggleTypeFilter,
  dayFilters,
  onToggleDayFilter,
  subtitleFilters,
  onToggleSubtitleFilter,
  onAddChannel,
  onAddManualArchive,
  onRefreshChannel,
  isBusy
}: ArchivePageProps): ReactElement {
  const checkedVideoIdSet = useMemo(() => new Set(checkedVideoIds), [checkedVideoIds]);
  const allVisibleSelected = downloadableCount > 0 && checkedVisibleCount >= downloadableCount;
  const isManualArchive = selectedChannel?.sourceUrl.startsWith('manual://') ?? false;

  return (
    <section className="archive-page">
      <header className="archive-page-header">
        <div>
          <p className="eyebrow">Kanal arsivi</p>
          <h1>{selectedChannel?.name ?? 'Kanal ekle'}</h1>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" disabled={isBusy} onClick={onAddChannel} title="Kanal ekle" type="button">
            <Plus size={18} />
          </button>
          <button
            className="icon-button"
            disabled={isBusy}
            onClick={onAddManualArchive}
            title="Manuel arsiv olustur"
            type="button"
          >
            <FilePlus2 size={18} />
          </button>
          <button
            className="secondary-button"
            disabled={isBusy || isManualArchive}
            onClick={onRefreshChannel}
            title={isManualArchive ? 'Manuel arsivler YouTube taramasi kullanmaz' : 'Yeni videolari tara'}
            type="button"
          >
            <RefreshCcw size={17} />
            Yeni videolari tara
          </button>
          <button
            className="primary-button"
            disabled={isBusy || downloadableCount === 0}
            onClick={onDownloadFiltered}
            title={`${downloadableCount} filtrelenmis video icin altyazi indir`}
            type="button"
          >
            <Download size={17} />
            Altyazi indir
          </button>
        </div>
      </header>

      <div className="archive-grid">
        <aside className="archive-side-panel">
        <div className="channel-pane">
          <div className="section-heading">
            <Library size={18} />
            <span>Kanallar</span>
          </div>
          <div className="channel-list">
            {channels.map((channel) => {
              const stats = channelStatsById.get(channel.id) ?? { ready: channel.archivedSubtitles, cleaned: 0, missing: 0 };

              return (
                <div
                  className={`channel-card ${channel.id === selectedChannelId ? 'selected' : ''}`}
                  key={channel.id}
                  style={{ '--accent': channel.accent } as CSSProperties}
                >
                  <button className="channel-select-button" onClick={() => onSelectChannel(channel.id)} type="button">
                    <div className="channel-card-top">
                      <strong>{channel.name}</strong>
                      <StatusPill status={channel.status} />
                    </div>
                    <span className="channel-handle">{channel.handle}</span>
                    <div className="channel-metrics">
                      <span>
                        <strong>{channel.videos}</strong>
                        video
                      </span>
                      <span>
                        <strong>{stats.ready}</strong>
                        altyazi
                      </span>
                      <span>
                        <strong>{stats.cleaned}</strong>
                        temiz
                      </span>
                      <span>
                        <strong>{stats.missing}</strong>
                        eksik
                      </span>
                    </div>
                    {channel.lastError && <small className="channel-error">{channel.lastError}</small>}
                  </button>
                  <button
                    aria-label={`${channel.name} kanalini sil`}
                    className="channel-delete-button"
                    disabled={isBusy}
                    onClick={() => onDeleteChannel(channel)}
                    title="Kanali sil"
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            {channels.length === 0 && (
              <div className="empty-channel-list">
                <strong>Arsiv bos</strong>
                <span>Bir YouTube kanali ekleyerek veya manuel metin arsivi olusturarak basla.</span>
                <button className="secondary-button" disabled={isBusy} onClick={onAddChannel} type="button">
                  <Plus size={16} />
                  Kanal ekle
                </button>
                <button className="secondary-button" disabled={isBusy} onClick={onAddManualArchive} type="button">
                  <FilePlus2 size={16} />
                  Manuel arsiv
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="filter-pane">
          <div className="section-heading">
            <Filter size={18} />
            <span>Filtreler</span>
          </div>
          <div className="toolbar">
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Video ara"
                disabled={!selectedChannel}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Baslikta ara"
                type="search"
                value={query}
              />
            </label>
            <CheckboxFilterGroup
              icon={Clock3}
              label="Sure"
              onToggle={onToggleDurationFilter}
              options={durationOptions}
              values={durationFilters}
            />
            <CheckboxFilterGroup
              icon={Tags}
              label="Tur"
              onToggle={onToggleTypeFilter}
              options={typeOptions}
              values={typeFilters}
            />
            <CheckboxFilterGroup
              icon={CalendarDays}
              label="Gun"
              onToggle={onToggleDayFilter}
              options={dayOptions}
              values={dayFilters}
            />
            <CheckboxFilterGroup
              icon={Filter}
              label="Altyazi"
              onToggle={onToggleSubtitleFilter}
              options={subtitleOptions}
              values={subtitleFilters}
            />
          </div>
        </div>
        </aside>

        <div className="content-column">
        <div className="table-panel">
          <div className="selection-toolbar">
            <div className="selection-summary">
              <strong>{visibleVideos.length}</strong>
              <span>filtre sonucu</span>
              <strong>{renderedVideos.length}</strong>
              <span>gosteriliyor</span>
              <strong>{downloadableCount}</strong>
              <span>indirilecek</span>
              <strong>{checkedVisibleCount}</strong>
              <span>secili</span>
            </div>
            <div className="selection-controls">
              <label className="language-select">
                <Languages size={16} />
                <span>Dil</span>
                <select
                  aria-label="Altyazi dili"
                  disabled={isBusy}
                  onChange={(event) => onSubtitleLanguageModeChange(event.target.value as SubtitleLanguageMode)}
                  value={subtitleLanguageMode}
                >
                  {subtitleLanguageOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="selection-actions">
                <button className="secondary-button" disabled={isBusy || allVisibleSelected || downloadableCount === 0} onClick={onSelectAllVisible} type="button">
                  Tumunu sec
                </button>
                <button className="secondary-button" disabled={isBusy || checkedVideoIds.length === 0} onClick={onClearVideoSelection} type="button">
                  Secimleri temizle
                </button>
                <button className="primary-button" disabled={isBusy || checkedVisibleCount === 0} onClick={onDownloadSelected} type="button">
                  <Download size={16} />
                  Secili indir
                </button>
              </div>
            </div>
          </div>
          <div className="table-header">
            <span>Sec</span>
            <span>Video</span>
            <span>Tarih</span>
            <span>Sure</span>
            <span>Tur</span>
            <span>Altyazi</span>
          </div>
          <div className="video-list" onScroll={onVideoListScroll}>
            {renderedVideos.map((video, index) => (
              <div
                className={`video-row ${video.id === selectedVideoId ? 'selected' : ''} ${checkedVideoIdSet.has(video.id) ? 'checked' : ''}`}
                key={video.id}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectVideo(video.id);
                  }
                }}
                onClick={() => onSelectVideo(video.id)}
                role="button"
                tabIndex={0}
              >
                <span className="video-check-cell">
                  <input
                    aria-label={`${video.title} sec`}
                    checked={checkedVideoIdSet.has(video.id)}
                    onChange={() => onToggleVideoSelection(video.id)}
                    onClick={(event) => event.stopPropagation()}
                    type="checkbox"
                  />
                </span>
                <span className="video-title-cell">
                  <ThumbnailPreview alt={`${video.title} thumbnail`} style={getThumbnailStyle(video, index)} />
                  <span>
                    <strong>{video.title}</strong>
                    <small>{video.language}</small>
                  </span>
                </span>
                <span>
                  {video.publishedAt ?? '-'}
                  <small>{video.weekday ?? 'Tarih yok'}</small>
                </span>
                <span>{formatDuration(video.durationMinutes)}</span>
                <span>{video.type}</span>
                <span>
                  <SubtitlePill status={video.subtitleStatus} />
                </span>
              </div>
            ))}
            {visibleVideos.length === 0 && (
              <div className="empty-state">
                {selectedChannel ? 'Bu filtrelerle eslesen video yok.' : 'Kanal eklenince videolar burada gorunecek.'}
              </div>
            )}
            {hasMoreRenderedVideos && (
              <div className="lazy-load-footer">
                <span>
                  {renderedVideos.length} / {visibleVideos.length} video gosteriliyor
                </span>
                <button className="secondary-button" onClick={onLoadMoreVideos} type="button">
                  Daha fazla yukle
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
