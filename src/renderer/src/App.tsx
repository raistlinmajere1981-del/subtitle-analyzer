import {
  Archive,
  BarChart3,
  FilePlus2,
  FileText,
  RefreshCcw,
  Settings,
  Subtitles,
  Search
} from 'lucide-react';
import type { ReactElement, UIEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type {
  AnalysisScope,
  AnalysisSourceSummary,
  AnalysisSourceType,
  ExportSubtitlesResult,
  ScanChannelFilters,
  SubtitleExportFormat,
  SubtitleLanguageMode,
  SubtitleListItem,
  SubtitleStatus,
  VideoType,
  WeekdayLabel
} from '../../shared/archive';
import type { NavKey } from './app/navigation';
import { useArchiveRuntime } from './app/useArchiveRuntime';
import { useNavigationGuard } from './app/useNavigationGuard';
import { NavButton } from './components/NavButton';
import { ScanProgressPanel, SubtitleDownloadProgressPanel } from './components/ProgressPanels';
import { type DurationBucket, type SubtitleSortOrder } from './constants/archiveOptions';
import { errorToMessage } from './lib/errors';
import { AnalysisPage } from './pages/analysis/AnalysisPage';
import { ArchivePage } from './pages/archive/ArchivePage';
import { useArchiveActions } from './pages/archive/useArchiveActions';
import { useArchiveViewState } from './pages/archive/useArchiveViewState';
import { SettingsPage } from './pages/settings/SettingsPage';
import { SubtitlesPage } from './pages/subtitles/SubtitlesPage';
import { useSubtitleActions } from './pages/subtitles/useSubtitleActions';
import { useSubtitleListView } from './pages/subtitles/useSubtitleListView';
import { useSubtitleWorkspaceRuntime } from './pages/subtitles/useSubtitleWorkspaceRuntime';

const initialRenderedVideoCount = 80;
const renderedVideoBatchSize = 80;
const initialRenderedSubtitleCount = 60;
const renderedSubtitleBatchSize = 60;

function App(): ReactElement {
  const [activeNav, setActiveNav] = useState<NavKey>('archive');
  const [query, setQuery] = useState('');
  const [durationFilters, setDurationFilters] = useState<DurationBucket[]>([]);
  const [typeFilters, setTypeFilters] = useState<VideoType[]>([]);
  const [dayFilters, setDayFilters] = useState<WeekdayLabel[]>([]);
  const [subtitleFilters, setSubtitleFilters] = useState<SubtitleStatus[]>([]);
  const [subtitleLanguageMode, setSubtitleLanguageMode] = useState<SubtitleLanguageMode>('tr-original');
  const [renderedVideoLimit, setRenderedVideoLimit] = useState(initialRenderedVideoCount);
  const [checkedVideoIds, setCheckedVideoIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [isManualArchiveOpen, setIsManualArchiveOpen] = useState(false);
  const [channelInput, setChannelInput] = useState('');
  const [channelPlaylistInput, setChannelPlaylistInput] = useState('');
  const [scanFilters, setScanFilters] = useState<ScanChannelFilters>({});
  const [manualArchiveName, setManualArchiveName] = useState('');
  const [subtitleItems, setSubtitleItems] = useState<SubtitleListItem[]>([]);
  const [subtitleSourceType, setSubtitleSourceType] = useState<AnalysisSourceType>('video-transcript');
  const [mergedSubtitleSources, setMergedSubtitleSources] = useState<AnalysisSourceSummary[]>([]);
  const [subtitleQuery, setSubtitleQuery] = useState('');
  const [subtitleDateFrom, setSubtitleDateFrom] = useState('');
  const [subtitleDateTo, setSubtitleDateTo] = useState('');
  const [subtitleDayFilters, setSubtitleDayFilters] = useState<WeekdayLabel[]>([]);
  const [subtitleDurationFilters, setSubtitleDurationFilters] = useState<DurationBucket[]>([]);
  const [subtitleSortOrder, setSubtitleSortOrder] = useState<SubtitleSortOrder>('newest');
  const [renderedSubtitleLimit, setRenderedSubtitleLimit] = useState(initialRenderedSubtitleCount);
  const [checkedSubtitleIds, setCheckedSubtitleIds] = useState<string[]>([]);
  const [subtitleExportFormat, setSubtitleExportFormat] = useState<SubtitleExportFormat>('txt');
  const [mergeSubtitleExport, setMergeSubtitleExport] = useState(false);
  const [includeExportMetadata, setIncludeExportMetadata] = useState(false);
  const [sortMergedExportByDate, setSortMergedExportByDate] = useState(true);
  const {
    busyLabel,
    errorMessage,
    scanProgress,
    selectedChannelId,
    selectedVideoId,
    setBusyLabel,
    setErrorMessage,
    setScanProgress,
    setSelectedChannelId,
    setSelectedVideoId,
    setSnapshot,
    setSubtitleProgress,
    snapshot,
    subtitleProgress,
    tools
  } = useArchiveRuntime();

  const {
    channelStatsById,
    checkedVisibleVideoIds,
    downloadableVideoIds,
    hasMoreRenderedVideos,
    renderedVideos,
    selectedChannel,
    selectedVideo,
    visibleVideos
  } = useArchiveViewState({
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
  });

  const {
    checkedVisibleSubtitleIds,
    hasMoreRenderedSubtitles,
    renderedSubtitleItems,
    visibleSubtitleItems
  } = useSubtitleListView({
    checkedSubtitleIds,
    renderedSubtitleLimit,
    subtitleDateFrom,
    subtitleDateTo,
    subtitleDayFilters,
    subtitleDurationFilters,
    subtitleItems,
    subtitleQuery,
    subtitleSortOrder
  });

  const isBusy = busyLabel !== null;
  const isScanning = scanProgress !== null && ['starting', 'listing', 'details', 'saving'].includes(scanProgress.phase);
  const isSubtitleDownloading = subtitleProgress !== null && subtitleProgress.canCancel;
  const {
    isSubtitleWorkspaceBusy,
    isTranscriptDirty,
    setIsSubtitleWorkspaceBusy,
    setShowRawTimestamps,
    setSubtitleWorkspace,
    setTranscriptDraft,
    showRawTimestamps,
    subtitleWorkspace,
    transcriptDraft
  } = useSubtitleWorkspaceRuntime({ activeNav, selectedVideo, setErrorMessage });
  const { confirmDiscardTranscriptChanges, handleNavigate, handleSelectSubtitle } = useNavigationGuard({
    isTranscriptDirty,
    setActiveNav,
    setSelectedVideoId
  });
  const {
    handleAddChannel,
    handleAddManualArchive,
    handleCancelScan,
    handleCancelSubtitleDownload,
    handleDeleteChannel,
    handleDownloadSubtitles,
    handleRefreshChannel,
    handleSubmitManualArchive,
    handleSubmitChannel,
    refreshSnapshot
  } = useArchiveActions({
    channelInput,
    channelPlaylistInput,
    confirmDiscardTranscriptChanges,
    manualArchiveName,
    scanFilters,
    selectedChannel,
    setActiveNav,
    setBusyLabel,
    setChannelInput,
    setChannelPlaylistInput,
    setCheckedVideoIds,
    setErrorMessage,
    setIsAddChannelOpen,
    setIsManualArchiveOpen,
    setManualArchiveName,
    setNotice,
    setScanProgress,
    setSelectedChannelId,
    setSelectedVideoId,
    setSnapshot,
    setSubtitleProgress,
    subtitleLanguageMode
  });

  const refreshSubtitleItems = useCallback(async function refreshSubtitleItems(): Promise<SubtitleListItem[]> {
    const items =
      (await window.subtitleAnalyzer?.archive.getSubtitleList({ channelId: selectedChannel?.id ?? null })) ?? [];

    setSubtitleItems(items);
    setCheckedSubtitleIds((current) => current.filter((videoId) => items.some((item) => item.videoId === videoId)));
    setSelectedVideoId((current) => {
      if (current && items.some((item) => item.videoId === current)) {
        return current;
      }

      return items[0]?.videoId ?? null;
    });

    return items;
  }, [selectedChannel?.id]);

  const refreshMergedSubtitleSources = useCallback(async function refreshMergedSubtitleSources(): Promise<AnalysisSourceSummary[]> {
    const scope: AnalysisScope = selectedChannel?.id
      ? { mode: 'channel', channelId: selectedChannel.id }
      : { mode: 'archive' };
    const result = await window.subtitleAnalyzer?.analysis.listSources({ scope });
    const sources = (result?.sources ?? []).filter((source) => source.type === 'merged-file');

    setMergedSubtitleSources(sources);
    return sources;
  }, [selectedChannel?.id]);

  const handleMergedSubtitleCreated = useCallback(async function handleMergedSubtitleCreated(_result: ExportSubtitlesResult): Promise<void> {
    await refreshMergedSubtitleSources();
    setSubtitleSourceType('merged-file');
  }, [refreshMergedSubtitleSources]);

  const {
    handleApplySubtitleBulkEdit,
    handleCleanSelectedSubtitles,
    handleCleanSubtitle,
    handleExportSelectedSubtitles,
    handlePreviewSubtitleBulkEdit,
    handleSaveTranscriptEdit,
    handleUndoSubtitleEdit
  } = useSubtitleActions({
    checkedVisibleSubtitleIds,
    includeExportMetadata,
    mergeSubtitleExport,
    refreshSubtitleItems,
    selectedVideo,
    setBusyLabel,
    setErrorMessage,
    setIsSubtitleWorkspaceBusy,
    setNotice,
    setSnapshot,
    setSubtitleItems,
    setSubtitleWorkspace,
    onMergedExportCreated: handleMergedSubtitleCreated,
    sortMergedExportByDate,
    subtitleExportFormat
  });

  const handleUndoSelected = useCallback(function handleUndoSelected(): void {
    void handleUndoSubtitleEdit(selectedVideo?.id);
  }, [handleUndoSubtitleEdit, selectedVideo?.id]);

  useEffect(() => {
    setRenderedVideoLimit(initialRenderedVideoCount);
  }, [dayFilters, durationFilters, query, selectedChannelId, subtitleFilters, typeFilters]);

  useEffect(() => {
    setRenderedSubtitleLimit(initialRenderedSubtitleCount);
  }, [subtitleDateFrom, subtitleDateTo, subtitleDayFilters, subtitleDurationFilters, subtitleQuery, subtitleSortOrder, selectedChannelId]);

  useEffect(() => {
    if (activeNav === 'subtitles') {
      void refreshSubtitleItems();
      void refreshMergedSubtitleSources();
    }
  }, [activeNav, selectedChannelId]);

  const handleDeleteMergedSubtitle = useCallback(async function handleDeleteMergedSubtitle(source: AnalysisSourceSummary): Promise<void> {
    if (!window.confirm(`"${source.title}" birlestirilmis altyazisi silinsin mi?`)) {
      return;
    }

    setBusyLabel('Birlestirilmis altyazi siliniyor');
    setErrorMessage(null);
    setNotice(null);

    try {
      const result = await window.subtitleAnalyzer?.analysis.deleteMergedSource({ path: source.path });
      if (!result) {
        throw new Error('Birlestirilmis altyazi silme sonucu alinamadi.');
      }

      if (!result.deleted) {
        throw new Error(result.error ?? 'Birlestirilmis altyazi silinemedi.');
      }

      await refreshMergedSubtitleSources();
      setNotice('Birlestirilmis altyazi silindi.');
    } catch (error) {
      setErrorMessage(errorToMessage(error));
    } finally {
      setBusyLabel(null);
    }
  }, [refreshMergedSubtitleSources]);

  const handleDownloadMergedSubtitle = useCallback(async function handleDownloadMergedSubtitle(source: AnalysisSourceSummary): Promise<void> {
    setBusyLabel('Birlestirilmis altyazi indiriliyor');
    setErrorMessage(null);
    setNotice(null);

    try {
      const result = await window.subtitleAnalyzer?.system.savePathAs({
        path: source.path,
        defaultFileName: `${sanitizeFileName(source.title)}.txt`
      });
      if (!result) {
        throw new Error('Indirme sonucu alinamadi.');
      }

      if (result.cancelled) {
        setNotice('Indirme iptal edildi.');
        return;
      }

      if (!result.saved) {
        throw new Error(result.error ?? 'Birlestirilmis altyazi indirilemedi.');
      }

      setNotice('Birlestirilmis altyazi kaydedildi.');
    } catch (error) {
      setErrorMessage(errorToMessage(error));
    } finally {
      setBusyLabel(null);
    }
  }, []);

  const toggleFilterValue = useCallback(function toggleFilterValue<T extends string>(
    values: T[],
    value: string,
    setValues: (nextValues: T[]) => void
  ): void {
    const typedValue = value as T;
    setValues(values.includes(typedValue) ? values.filter((item) => item !== typedValue) : [...values, typedValue]);
  }, []);

  const toggleVideoSelection = useCallback(function toggleVideoSelection(videoId: string): void {
    setCheckedVideoIds((current) =>
      current.includes(videoId) ? current.filter((item) => item !== videoId) : [...current, videoId]
    );
  }, []);

  const selectAllVisibleVideos = useCallback(function selectAllVisibleVideos(): void {
    setCheckedVideoIds((current) => [...new Set([...current, ...downloadableVideoIds])]);
  }, [downloadableVideoIds]);

  const clearVideoSelection = useCallback(function clearVideoSelection(): void {
    setCheckedVideoIds([]);
  }, []);

  const setScanFilterFlag = useCallback(function setScanFilterFlag(key: 'excludeMembersOnly' | 'excludeShorts', checked: boolean): void {
    setScanFilters((current) => ({
      ...current,
      [key]: checked ? true : undefined
    }));
  }, []);

  const setScanMinimumDuration = useCallback(function setScanMinimumDuration(checked: boolean): void {
    setScanFilters((current) => ({
      ...current,
      minDurationMinutes: checked ? 10 : null
    }));
  }, []);

  const toggleSubtitleSelection = useCallback(function toggleSubtitleSelection(videoId: string): void {
    setCheckedSubtitleIds((current) =>
      current.includes(videoId) ? current.filter((item) => item !== videoId) : [...current, videoId]
    );
  }, []);

  const selectAllVisibleSubtitles = useCallback(function selectAllVisibleSubtitles(): void {
    setCheckedSubtitleIds((current) => [...new Set([...current, ...visibleSubtitleItems.map((item) => item.videoId)])]);
  }, [visibleSubtitleItems]);

  const clearSubtitleSelection = useCallback(function clearSubtitleSelection(): void {
    setCheckedSubtitleIds([]);
  }, []);

  const loadMoreRenderedVideos = useCallback(function loadMoreRenderedVideos(): void {
    setRenderedVideoLimit((current) => Math.min(current + renderedVideoBatchSize, visibleVideos.length));
  }, [visibleVideos.length]);

  const loadMoreRenderedSubtitles = useCallback(function loadMoreRenderedSubtitles(): void {
    setRenderedSubtitleLimit((current) => Math.min(current + renderedSubtitleBatchSize, visibleSubtitleItems.length));
  }, [visibleSubtitleItems.length]);

  const handleVideoListScroll = useCallback(function handleVideoListScroll(event: UIEvent<HTMLDivElement>): void {
    const element = event.currentTarget;
    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

    if (distanceToBottom < 320 && hasMoreRenderedVideos) {
      loadMoreRenderedVideos();
    }
  }, [hasMoreRenderedVideos, loadMoreRenderedVideos]);

  const handleSubtitleListScroll = useCallback(function handleSubtitleListScroll(event: UIEvent<HTMLDivElement>): void {
    const element = event.currentTarget;
    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

    if (distanceToBottom < 220 && hasMoreRenderedSubtitles) {
      loadMoreRenderedSubtitles();
    }
  }, [hasMoreRenderedSubtitles, loadMoreRenderedSubtitles]);

  return (
    <div className="app-shell">
      <header className="app-tabbar">
        <div className="brand-block app-brand">
          <div className="brand-mark">
            <Subtitles size={20} />
          </div>
          <div>
            <strong>Subtitle Analyzer</strong>
            <span>local archive</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Ana bolumler">
          <NavButton icon={Archive} label="Arsiv" active={activeNav === 'archive'} onClick={() => handleNavigate('archive')} />
          <NavButton
            icon={FileText}
            label="Altyazilar"
            active={activeNav === 'subtitles'}
            onClick={() => handleNavigate('subtitles')}
          />
          <NavButton
            icon={BarChart3}
            label="Analiz"
            active={activeNav === 'analysis'}
            onClick={() => handleNavigate('analysis')}
          />
          <NavButton
            icon={Settings}
            label="Ayarlar"
            active={activeNav === 'settings'}
            onClick={() => handleNavigate('settings')}
          />
        </nav>
      </header>

      <main className="workspace">
        {isScanning && scanProgress ? (
          <ScanProgressPanel progress={scanProgress} onCancel={() => void handleCancelScan()} />
        ) : isSubtitleDownloading && subtitleProgress ? (
          <SubtitleDownloadProgressPanel
            progress={subtitleProgress}
            onCancel={() => void handleCancelSubtitleDownload()}
          />
        ) : (
          (notice || errorMessage || busyLabel) && (
            <div className={`action-banner ${errorMessage ? 'error' : ''}`}>
              {errorMessage ?? (busyLabel ? subtitleProgress?.message ?? busyLabel : notice)}
            </div>
          )
        )}

        {activeNav === 'archive' && isAddChannelOpen && (
          <form className="add-channel-form" onSubmit={handleSubmitChannel}>
            <label>
              Kanal URL veya @handle
              <input
                autoFocus
                disabled={isBusy}
                onChange={(event) => setChannelInput(event.target.value)}
                placeholder="https://www.youtube.com/@kanal veya @kanal"
                value={channelInput}
              />
            </label>
            <label className="playlist-url-field">
              Oynatma listesi URL <small>Opsiyonel · sadece bu listedeki videolar</small>
              <input
                disabled={isBusy}
                onChange={(event) => setChannelPlaylistInput(event.target.value)}
                placeholder="https://www.youtube.com/playlist?list=..."
                value={channelPlaylistInput}
              />
            </label>
            <fieldset className="scan-filter-group">
              <legend>Tarama filtreleri</legend>
              <label>
                <input
                  checked={Boolean(scanFilters.excludeMembersOnly)}
                  disabled={isBusy}
                  onChange={(event) => setScanFilterFlag('excludeMembersOnly', event.target.checked)}
                  type="checkbox"
                />
                <span>Members only atla</span>
              </label>
              <label>
                <input
                  checked={Boolean(scanFilters.excludeShorts)}
                  disabled={isBusy}
                  onChange={(event) => setScanFilterFlag('excludeShorts', event.target.checked)}
                  type="checkbox"
                />
                <span>Shorts atla</span>
              </label>
              <label>
                <input
                  checked={scanFilters.minDurationMinutes === 10}
                  disabled={isBusy}
                  onChange={(event) => setScanMinimumDuration(event.target.checked)}
                  type="checkbox"
                />
                <span>10 dk alti atla</span>
              </label>
            </fieldset>
            <div className="add-channel-actions">
              <button className="secondary-button" disabled={isBusy} onClick={() => setIsAddChannelOpen(false)} type="button">
                Vazgec
              </button>
              <button className="primary-button" disabled={isBusy} type="submit">
                <RefreshCcw size={17} />
                Tara
              </button>
            </div>
          </form>
        )}

        {activeNav === 'archive' && isManualArchiveOpen && (
          <form className="add-channel-form manual-archive-form" onSubmit={handleSubmitManualArchive}>
            <label>
              Manuel arsiv adi
              <input
                autoFocus
                disabled={isBusy}
                onChange={(event) => setManualArchiveName(event.target.value)}
                placeholder="Ornek: Notlarim, Senaryo metinleri"
                value={manualArchiveName}
              />
            </label>
            <div className="add-channel-actions">
              <button className="secondary-button" disabled={isBusy} onClick={() => setIsManualArchiveOpen(false)} type="button">
                Vazgec
              </button>
              <button className="primary-button" disabled={isBusy} type="submit">
                <FilePlus2 size={17} />
                Metin ekle
              </button>
            </div>
          </form>
        )}

        {activeNav === 'archive' && (
          <ArchivePage
            channels={snapshot.channels}
            channelStatsById={channelStatsById}
            selectedChannel={selectedChannel}
            selectedChannelId={selectedChannel?.id ?? null}
            onSelectChannel={(channelId) => {
              setSelectedChannelId(channelId);
              setSelectedVideoId(snapshot.videos.find((video) => video.channelId === channelId)?.id ?? null);
              setCheckedVideoIds([]);
            }}
            onDeleteChannel={handleDeleteChannel}
            visibleVideos={visibleVideos}
            renderedVideos={renderedVideos}
            selectedVideoId={selectedVideo?.id ?? null}
            onSelectVideo={setSelectedVideoId}
            checkedVideoIds={checkedVideoIds}
            checkedVisibleCount={checkedVisibleVideoIds.length}
            downloadableCount={downloadableVideoIds.length}
            onToggleVideoSelection={toggleVideoSelection}
            onSelectAllVisible={selectAllVisibleVideos}
            onClearVideoSelection={clearVideoSelection}
            onDownloadFiltered={() => void handleDownloadSubtitles(downloadableVideoIds, 'Liste')}
            onDownloadSelected={() => void handleDownloadSubtitles(checkedVisibleVideoIds, 'Secili videolar')}
            subtitleLanguageMode={subtitleLanguageMode}
            onSubtitleLanguageModeChange={setSubtitleLanguageMode}
            onLoadMoreVideos={loadMoreRenderedVideos}
            onVideoListScroll={handleVideoListScroll}
            hasMoreRenderedVideos={hasMoreRenderedVideos}
            query={query}
            setQuery={setQuery}
            durationFilters={durationFilters}
            onToggleDurationFilter={(value) => toggleFilterValue(durationFilters, value, setDurationFilters)}
            typeFilters={typeFilters}
            onToggleTypeFilter={(value) => toggleFilterValue(typeFilters, value, setTypeFilters)}
            dayFilters={dayFilters}
            onToggleDayFilter={(value) => toggleFilterValue(dayFilters, value, setDayFilters)}
            subtitleFilters={subtitleFilters}
            onToggleSubtitleFilter={(value) => toggleFilterValue(subtitleFilters, value, setSubtitleFilters)}
            onAddChannel={handleAddChannel}
            onAddManualArchive={handleAddManualArchive}
            onRefreshChannel={() => void handleRefreshChannel()}
            isBusy={isBusy}
          />
        )}

        {activeNav === 'subtitles' && (
          <SubtitlesPage
            checkedSubtitleIds={checkedSubtitleIds}
            checkedVisibleSubtitleCount={checkedVisibleSubtitleIds.length}
            exportFormat={subtitleExportFormat}
            hasMoreRenderedSubtitles={hasMoreRenderedSubtitles}
            includeExportMetadata={includeExportMetadata}
            isBusy={isBusy || isSubtitleWorkspaceBusy}
            mergeExport={mergeSubtitleExport}
            mergedSubtitleSources={mergedSubtitleSources}
            onClearSelection={clearSubtitleSelection}
            onDeleteMergedSubtitle={handleDeleteMergedSubtitle}
            onDownloadMergedSubtitle={handleDownloadMergedSubtitle}
            onExport={() => void handleExportSelectedSubtitles(checkedVisibleSubtitleIds)}
            onExportFormatChange={setSubtitleExportFormat}
            onIncludeExportMetadataChange={setIncludeExportMetadata}
            onLoadMoreSubtitles={loadMoreRenderedSubtitles}
            onMergeExportChange={(checked: boolean) => {
              setMergeSubtitleExport(checked);
              if (checked) {
                setSubtitleExportFormat('txt');
              }
            }}
            onSortMergedExportByDateChange={setSortMergedExportByDate}
            onApplyBulkEdit={handleApplySubtitleBulkEdit}
            onPreviewBulkEdit={handlePreviewSubtitleBulkEdit}
            onSaveTranscript={handleSaveTranscriptEdit}
            onSelectAllVisible={selectAllVisibleSubtitles}
            onSelectSubtitle={handleSelectSubtitle}
            onSubtitleListScroll={handleSubtitleListScroll}
            onToggleSubtitleSelection={toggleSubtitleSelection}
            onUndoLastBulk={handleUndoSubtitleEdit}
            onUndoSelected={handleUndoSelected}
            renderedSubtitleItems={renderedSubtitleItems}
            selectedVideo={selectedVideo}
            showRawTimestamps={showRawTimestamps}
            sortMergedExportByDate={sortMergedExportByDate}
            subtitleSourceType={subtitleSourceType}
            subtitleDateFrom={subtitleDateFrom}
            subtitleDateTo={subtitleDateTo}
            subtitleDayFilters={subtitleDayFilters}
            subtitleDurationFilters={subtitleDurationFilters}
            subtitleQuery={subtitleQuery}
            subtitleSortOrder={subtitleSortOrder}
            transcriptSourceCount={subtitleItems.length}
            totalSubtitleCount={visibleSubtitleItems.length}
            onSubtitleSourceTypeChange={setSubtitleSourceType}
            setSubtitleDateFrom={setSubtitleDateFrom}
            setSubtitleDateTo={setSubtitleDateTo}
            setSubtitleQuery={setSubtitleQuery}
            setSubtitleSortOrder={setSubtitleSortOrder}
            setShowRawTimestamps={setShowRawTimestamps}
            setTranscriptDraft={setTranscriptDraft}
            transcriptDraft={transcriptDraft}
            isTranscriptDirty={isTranscriptDirty}
            onToggleSubtitleDayFilter={(value: string) => toggleFilterValue(subtitleDayFilters, value, setSubtitleDayFilters)}
            onToggleSubtitleDurationFilter={(value: string) => toggleFilterValue(subtitleDurationFilters, value, setSubtitleDurationFilters)}
            workspace={subtitleWorkspace}
          />
        )}
        {activeNav === 'analysis' && (
          <AnalysisPage
            onArchiveChanged={refreshSnapshot}
            onOpenSubtitles={() => handleNavigate('subtitles')}
            selectedChannel={selectedChannel}
          />
        )}
        {activeNav === 'settings' && <SettingsPage archivePath={snapshot.archivePath} tools={tools.tools} />}
      </main>
    </div>
  );
}

function sanitizeFileName(value: string): string {
  const normalizedValue = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '');

  return normalizedValue.length > 0 ? normalizedValue : 'birlestirilmis-altyazi';
}


export default App;
