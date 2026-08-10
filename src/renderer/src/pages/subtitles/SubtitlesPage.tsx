import { memo, type ReactElement, type UIEvent } from 'react';
import type {
  AnalysisSourceSummary,
  AnalysisSourceType,
  PreviewSubtitleBulkEditResult,
  SubtitleBulkEditOperation,
  SubtitleEditOperationType,
  SubtitleExportFormat,
  SubtitleListItem,
  SubtitleWorkspace,
  VideoRecord,
  WeekdayLabel
} from '../../../../shared/archive';
import type { DurationBucket, SubtitleSortOrder } from '../../constants/archiveOptions';
import { SubtitleLibraryPanel } from './SubtitleLibraryPanel';
import { TranscriptEditorPanel } from './TranscriptEditorPanel';

interface SubtitlesPageProps {
  checkedSubtitleIds: string[];
  checkedVisibleSubtitleCount: number;
  exportFormat: SubtitleExportFormat;
  hasMoreRenderedSubtitles: boolean;
  includeExportMetadata: boolean;
  isBusy: boolean;
  isTranscriptDirty: boolean;
  mergeExport: boolean;
  mergedSubtitleSources: AnalysisSourceSummary[];
  onApplyBulkEdit: (operation: SubtitleBulkEditOperation, excludedVideoIds: string[]) => Promise<boolean>;
  onClearSelection: () => void;
  onDeleteMergedSubtitle: (source: AnalysisSourceSummary) => void;
  onDownloadMergedSubtitle: (source: AnalysisSourceSummary) => void;
  onExport: () => void;
  onExportFormatChange: (value: SubtitleExportFormat) => void;
  onIncludeExportMetadataChange: (value: boolean) => void;
  onLoadMoreSubtitles: () => void;
  onMergeExportChange: (value: boolean) => void;
  onPreviewBulkEdit: (operation: SubtitleBulkEditOperation) => Promise<PreviewSubtitleBulkEditResult | null>;
  onSaveTranscript: (cleanedText: string, operationType?: SubtitleEditOperationType) => void;
  onSelectAllVisible: () => void;
  onSelectSubtitle: (videoId: string) => void;
  onSortMergedExportByDateChange: (value: boolean) => void;
  onSubtitleSourceTypeChange: (value: AnalysisSourceType) => void;
  onSubtitleListScroll: (event: UIEvent<HTMLDivElement>) => void;
  onToggleSubtitleDayFilter: (value: string) => void;
  onToggleSubtitleDurationFilter: (value: string) => void;
  onToggleSubtitleSelection: (videoId: string) => void;
  onUndoLastBulk: () => void;
  onUndoSelected: () => void;
  renderedSubtitleItems: SubtitleListItem[];
  selectedVideo: VideoRecord | null;
  setShowRawTimestamps: (value: boolean) => void;
  setSubtitleDateFrom: (value: string) => void;
  setSubtitleDateTo: (value: string) => void;
  setSubtitleQuery: (value: string) => void;
  setSubtitleSortOrder: (value: SubtitleSortOrder) => void;
  setTranscriptDraft: (value: string) => void;
  showRawTimestamps: boolean;
  sortMergedExportByDate: boolean;
  subtitleSourceType: AnalysisSourceType;
  subtitleDateFrom: string;
  subtitleDateTo: string;
  subtitleDayFilters: WeekdayLabel[];
  subtitleDurationFilters: DurationBucket[];
  subtitleQuery: string;
  subtitleSortOrder: SubtitleSortOrder;
  transcriptSourceCount: number;
  totalSubtitleCount: number;
  transcriptDraft: string;
  workspace: SubtitleWorkspace | null;
}

export const SubtitlesPage = memo(function SubtitlesPage({
  checkedSubtitleIds,
  checkedVisibleSubtitleCount,
  exportFormat,
  hasMoreRenderedSubtitles,
  includeExportMetadata,
  isBusy,
  isTranscriptDirty,
  mergeExport,
  mergedSubtitleSources,
  onApplyBulkEdit,
  onClearSelection,
  onDeleteMergedSubtitle,
  onDownloadMergedSubtitle,
  onExport,
  onExportFormatChange,
  onIncludeExportMetadataChange,
  onLoadMoreSubtitles,
  onMergeExportChange,
  onPreviewBulkEdit,
  onSaveTranscript,
  onSelectAllVisible,
  onSelectSubtitle,
  onSortMergedExportByDateChange,
  onSubtitleSourceTypeChange,
  onSubtitleListScroll,
  onToggleSubtitleDayFilter,
  onToggleSubtitleDurationFilter,
  onToggleSubtitleSelection,
  onUndoLastBulk,
  onUndoSelected,
  renderedSubtitleItems,
  selectedVideo,
  setShowRawTimestamps,
  setSubtitleDateFrom,
  setSubtitleDateTo,
  setSubtitleQuery,
  setSubtitleSortOrder,
  setTranscriptDraft,
  showRawTimestamps,
  sortMergedExportByDate,
  subtitleSourceType,
  subtitleDateFrom,
  subtitleDateTo,
  subtitleDayFilters,
  subtitleDurationFilters,
  subtitleQuery,
  subtitleSortOrder,
  transcriptSourceCount,
  totalSubtitleCount,
  transcriptDraft,
  workspace
}: SubtitlesPageProps): ReactElement {
  return (
    <section className="subtitle-workbench">
      <SubtitleLibraryPanel
        checkedSubtitleIds={checkedSubtitleIds}
        checkedVisibleSubtitleCount={checkedVisibleSubtitleCount}
        exportFormat={exportFormat}
        hasMoreRenderedSubtitles={hasMoreRenderedSubtitles}
        includeExportMetadata={includeExportMetadata}
        isBusy={isBusy}
        mergeExport={mergeExport}
        mergedSubtitleSources={mergedSubtitleSources}
        onApplyBulkEdit={onApplyBulkEdit}
        onClearSelection={onClearSelection}
        onDeleteMergedSubtitle={onDeleteMergedSubtitle}
        onDownloadMergedSubtitle={onDownloadMergedSubtitle}
        onExport={onExport}
        onExportFormatChange={onExportFormatChange}
        onIncludeExportMetadataChange={onIncludeExportMetadataChange}
        onLoadMoreSubtitles={onLoadMoreSubtitles}
        onMergeExportChange={onMergeExportChange}
        onPreviewBulkEdit={onPreviewBulkEdit}
        onSelectAllVisible={onSelectAllVisible}
        onSelectSubtitle={onSelectSubtitle}
        onSortMergedExportByDateChange={onSortMergedExportByDateChange}
        onSubtitleSourceTypeChange={onSubtitleSourceTypeChange}
        onSubtitleListScroll={onSubtitleListScroll}
        onToggleSubtitleDayFilter={onToggleSubtitleDayFilter}
        onToggleSubtitleDurationFilter={onToggleSubtitleDurationFilter}
        onToggleSubtitleSelection={onToggleSubtitleSelection}
        onUndoLastBulk={onUndoLastBulk}
        renderedSubtitleItems={renderedSubtitleItems}
        selectedVideo={selectedVideo}
        setSubtitleDateFrom={setSubtitleDateFrom}
        setSubtitleDateTo={setSubtitleDateTo}
        setSubtitleQuery={setSubtitleQuery}
        setSubtitleSortOrder={setSubtitleSortOrder}
        sortMergedExportByDate={sortMergedExportByDate}
        subtitleSourceType={subtitleSourceType}
        subtitleDateFrom={subtitleDateFrom}
        subtitleDateTo={subtitleDateTo}
        subtitleDayFilters={subtitleDayFilters}
        subtitleDurationFilters={subtitleDurationFilters}
        subtitleQuery={subtitleQuery}
        subtitleSortOrder={subtitleSortOrder}
        transcriptSourceCount={transcriptSourceCount}
        totalSubtitleCount={totalSubtitleCount}
      />

      <TranscriptEditorPanel
        isBusy={isBusy}
        isTranscriptDirty={isTranscriptDirty}
        onSaveTranscript={onSaveTranscript}
        onUndoSelected={onUndoSelected}
        selectedVideo={selectedVideo}
        setShowRawTimestamps={setShowRawTimestamps}
        setTranscriptDraft={setTranscriptDraft}
        showRawTimestamps={showRawTimestamps}
        transcriptDraft={transcriptDraft}
        workspace={workspace}
      />
    </section>
  );
});
