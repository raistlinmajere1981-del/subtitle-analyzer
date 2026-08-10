import { ArrowDownUp, CalendarDays, Clock3, Download, FileText, Replace, Save, Search, Subtitles, Trash2, Undo2, X } from 'lucide-react';
import { memo, type ReactElement, type UIEvent } from 'react';
import { useMemo, useState } from 'react';
import type {
  AnalysisSourceSummary,
  AnalysisSourceType,
  PreviewSubtitleBulkEditResult,
  SubtitleBulkEditOperation,
  SubtitleExportFormat,
  SubtitleListItem,
  VideoRecord,
  WeekdayLabel
} from '../../../../shared/archive';
import { CheckboxFilterGroup } from '../../components/CheckboxFilterGroup';
import { ThumbnailPreview } from '../../components/ThumbnailPreview';
import {
  dayOptions,
  durationOptions,
  subtitleBulkOperationOptions,
  subtitleExportOptions,
  subtitleSortOptions,
  type DurationBucket,
  type SubtitleSortOrder
} from '../../constants/archiveOptions';
import { formatCompactNumber, formatDateTime, formatDuration } from '../../lib/format';
import { getThumbnailStyleFromUrl } from '../../lib/thumbnail';

interface SubtitleLibraryPanelProps {
  checkedSubtitleIds: string[];
  checkedVisibleSubtitleCount: number;
  exportFormat: SubtitleExportFormat;
  hasMoreRenderedSubtitles: boolean;
  includeExportMetadata: boolean;
  isBusy: boolean;
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
  onSelectAllVisible: () => void;
  onSelectSubtitle: (videoId: string) => void;
  onSortMergedExportByDateChange: (value: boolean) => void;
  onSubtitleSourceTypeChange: (value: AnalysisSourceType) => void;
  onSubtitleListScroll: (event: UIEvent<HTMLDivElement>) => void;
  onToggleSubtitleDayFilter: (value: string) => void;
  onToggleSubtitleDurationFilter: (value: string) => void;
  onToggleSubtitleSelection: (videoId: string) => void;
  onUndoLastBulk: () => void;
  renderedSubtitleItems: SubtitleListItem[];
  selectedVideo: VideoRecord | null;
  setSubtitleDateFrom: (value: string) => void;
  setSubtitleDateTo: (value: string) => void;
  setSubtitleQuery: (value: string) => void;
  setSubtitleSortOrder: (value: SubtitleSortOrder) => void;
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
}

export const SubtitleLibraryPanel = memo(function SubtitleLibraryPanel({
  checkedSubtitleIds,
  checkedVisibleSubtitleCount,
  exportFormat,
  hasMoreRenderedSubtitles,
  includeExportMetadata,
  isBusy,
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
  onSelectAllVisible,
  onSelectSubtitle,
  onSortMergedExportByDateChange,
  onSubtitleSourceTypeChange,
  onSubtitleListScroll,
  onToggleSubtitleDayFilter,
  onToggleSubtitleDurationFilter,
  onToggleSubtitleSelection,
  onUndoLastBulk,
  renderedSubtitleItems,
  selectedVideo,
  setSubtitleDateFrom,
  setSubtitleDateTo,
  setSubtitleQuery,
  setSubtitleSortOrder,
  sortMergedExportByDate,
  subtitleSourceType,
  subtitleDateFrom,
  subtitleDateTo,
  subtitleDayFilters,
  subtitleDurationFilters,
  subtitleQuery,
  subtitleSortOrder,
  transcriptSourceCount,
  totalSubtitleCount
}: SubtitleLibraryPanelProps): ReactElement {
  const checkedSubtitleIdSet = useMemo(() => new Set(checkedSubtitleIds), [checkedSubtitleIds]);
  const allVisibleSelected = totalSubtitleCount > 0 && checkedVisibleSubtitleCount >= totalSubtitleCount;
  const activeSubtitleFilterCount =
    (subtitleDateFrom ? 1 : 0) + (subtitleDateTo ? 1 : 0) + subtitleDayFilters.length + subtitleDurationFilters.length;
  const canMergeExport = checkedVisibleSubtitleCount > 1;
  const mergeExportActive = mergeExport && canMergeExport;
  const [bulkOperation, setBulkOperation] = useState<SubtitleBulkEditOperation>({
    type: 'trim-empty-lines',
    findText: '',
    replaceText: '',
    caseSensitive: false
  });
  const [bulkPreview, setBulkPreview] = useState<PreviewSubtitleBulkEditResult | null>(null);
  const [excludedPreviewIds, setExcludedPreviewIds] = useState<string[]>([]);
  const visibleMergedSubtitleSources = useMemo(() => {
    const normalizedQuery = subtitleQuery.trim().toLocaleLowerCase('tr-TR');

    return mergedSubtitleSources.filter((source) => {
      return (
        normalizedQuery.length === 0 ||
        source.title.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
        source.detail.toLocaleLowerCase('tr-TR').includes(normalizedQuery)
      );
    });
  }, [mergedSubtitleSources, subtitleQuery]);

  return (
    <div className="panel subtitle-library-panel">
      <div className="section-heading">
        <Subtitles size={18} />
        <span>Mevcut altyazilar</span>
      </div>

      <div className="subtitle-library-filters">
        <div className="subtitle-source-tabs">
          <button
            className={subtitleSourceType === 'video-transcript' ? 'active' : ''}
            onClick={() => onSubtitleSourceTypeChange('video-transcript')}
            type="button"
          >
            Transcriptler
            <span>{transcriptSourceCount}</span>
          </button>
          <button
            className={subtitleSourceType === 'merged-file' ? 'active' : ''}
            onClick={() => onSubtitleSourceTypeChange('merged-file')}
            type="button"
          >
            Birlestirilmis
            <span>{mergedSubtitleSources.length}</span>
          </button>
        </div>
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Altyazi listesinde ara"
            onChange={(event) => setSubtitleQuery(event.target.value)}
            placeholder={subtitleSourceType === 'merged-file' ? 'Birlestirilmis dosya ara' : 'Altyazida video ara'}
            type="search"
            value={subtitleQuery}
          />
        </label>
        {subtitleSourceType === 'video-transcript' && (
          <details className="subtitle-advanced-filters" open={activeSubtitleFilterCount > 0 ? true : undefined}>
            <summary>
              <span>
                <CalendarDays size={15} />
                Tarih ve gun filtreleri
              </span>
              <small>{activeSubtitleFilterCount === 0 ? 'Tum' : activeSubtitleFilterCount}</small>
            </summary>
            <div className="date-filter-row compact">
              <label>
                Baslangic
                <input onChange={(event) => setSubtitleDateFrom(event.target.value)} type="date" value={subtitleDateFrom} />
              </label>
              <label>
                Bitis
                <input onChange={(event) => setSubtitleDateTo(event.target.value)} type="date" value={subtitleDateTo} />
              </label>
            </div>
            <CheckboxFilterGroup
              icon={Clock3}
              label="Sure"
              onToggle={onToggleSubtitleDurationFilter}
              options={durationOptions}
              values={subtitleDurationFilters}
            />
            <label className="subtitle-sort-select">
              <span>
                <ArrowDownUp size={15} />
                Tarihe gore sirala
              </span>
              <select
                aria-label="Altyazilari tarihe gore sirala"
                onChange={(event) => setSubtitleSortOrder(event.target.value as SubtitleSortOrder)}
                value={subtitleSortOrder}
              >
                {subtitleSortOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <CheckboxFilterGroup
              icon={CalendarDays}
              label="Yayin gunu"
              onToggle={onToggleSubtitleDayFilter}
              options={dayOptions}
              values={subtitleDayFilters}
            />
          </details>
        )}
      </div>

      {subtitleSourceType === 'video-transcript' && (
      <div className="subtitle-bulk-toolbar">
        <div className="subtitle-selection-row">
          <div className="selection-summary compact">
            <strong>{totalSubtitleCount}</strong>
            <span>sonuc</span>
            <strong>{renderedSubtitleItems.length}</strong>
            <span>listede</span>
            <strong>{checkedVisibleSubtitleCount}</strong>
            <span>secili</span>
          </div>
          <div className="subtitle-bulk-actions compact">
            <button
              className="secondary-button compact"
              disabled={isBusy || allVisibleSelected || totalSubtitleCount === 0}
              onClick={onSelectAllVisible}
              type="button"
            >
              Tumunu sec
            </button>
            <button
              className="secondary-button compact"
              disabled={isBusy || checkedSubtitleIds.length === 0}
              onClick={onClearSelection}
              type="button"
            >
              Temizle
            </button>
            <button className="secondary-button compact" disabled={isBusy} onClick={onUndoLastBulk} type="button">
              <Undo2 size={15} />
              Geri al
            </button>
          </div>
        </div>
        <details className="subtitle-batch-tools" open={bulkPreview ? true : undefined}>
          <summary>
            <span>
              <Replace size={15} />
              Toplu transcript islemleri
            </span>
            <small>{checkedVisibleSubtitleCount === 0 ? 'Secim yok' : `${checkedVisibleSubtitleCount} secili`}</small>
          </summary>
          <div className="subtitle-batch-tools-body">
            <div className="bulk-edit-box">
              <label className="bulk-operation-select">
                Islem
                <select
                  disabled={isBusy}
                  onChange={(event) => {
                    setBulkPreview(null);
                    setBulkOperation((current) => ({ ...current, type: event.target.value as SubtitleBulkEditOperation['type'] }));
                  }}
                  value={bulkOperation.type}
                >
                  {subtitleBulkOperationOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {bulkOperation.type === 'find-replace' && (
                <>
                  <label>
                    Bul
                    <input
                      disabled={isBusy}
                      onChange={(event) => {
                        setBulkPreview(null);
                        setBulkOperation((current) => ({ ...current, findText: event.target.value }));
                      }}
                      value={bulkOperation.findText ?? ''}
                    />
                  </label>
                  <label>
                    Degistir
                    <input
                      disabled={isBusy}
                      onChange={(event) => {
                        setBulkPreview(null);
                        setBulkOperation((current) => ({ ...current, replaceText: event.target.value }));
                      }}
                      value={bulkOperation.replaceText ?? ''}
                    />
                  </label>
                  <label className="inline-check">
                    <input
                      checked={bulkOperation.caseSensitive === true}
                      disabled={isBusy}
                      onChange={(event) => {
                        setBulkPreview(null);
                        setBulkOperation((current) => ({ ...current, caseSensitive: event.target.checked }));
                      }}
                      type="checkbox"
                    />
                    Harf duyarlidir
                  </label>
                </>
              )}
              <button
                className="secondary-button compact"
                disabled={isBusy || checkedVisibleSubtitleCount === 0}
                onClick={() => {
                  void onPreviewBulkEdit(bulkOperation).then((result) => {
                    setBulkPreview(result);
                    setExcludedPreviewIds([]);
                  });
                }}
                type="button"
              >
                <Replace size={15} />
                Onizle
              </button>
            </div>
            {bulkPreview && (
              <div className="bulk-preview-panel">
                <div className="bulk-preview-head">
                  <strong>{bulkPreview.affected} kayit etkilenecek</strong>
                  <span>{bulkPreview.skipped} atlanacak</span>
                </div>
                <div className="bulk-preview-list">
                  {bulkPreview.items.map((item) => {
                    const excluded = excludedPreviewIds.includes(item.videoId);
                    return (
                      <div className={`bulk-preview-item ${item.status} ${excluded ? 'excluded' : ''}`} key={item.videoId}>
                        <label>
                          <input
                            checked={!excluded}
                            disabled={item.status !== 'changed'}
                            onChange={() =>
                              setExcludedPreviewIds((current) =>
                                current.includes(item.videoId)
                                  ? current.filter((videoId) => videoId !== item.videoId)
                                  : [...current, item.videoId]
                              )
                            }
                            type="checkbox"
                          />
                          <span>
                            <strong>{item.title}</strong>
                            <small>
                              {item.status === 'changed'
                                ? `${item.oldWordCount} -> ${item.newWordCount} kelime`
                                : item.reason ?? 'Atlandi'}
                            </small>
                          </span>
                        </label>
                        {item.status === 'changed' && (
                          <p>
                            <span>{item.oldPreview || '-'}</span>
                            <span>{item.newPreview || '-'}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="bulk-preview-actions">
                  <button className="secondary-button" onClick={() => setBulkPreview(null)} type="button">
                    <X size={16} />
                    Iptal
                  </button>
                  <button
                    className="primary-button"
                    disabled={isBusy || bulkPreview.affected - excludedPreviewIds.length <= 0}
                    onClick={() => {
                      void onApplyBulkEdit(bulkOperation, excludedPreviewIds).then((applied) => {
                        if (applied) {
                          setBulkPreview(null);
                          setExcludedPreviewIds([]);
                        }
                      });
                    }}
                    type="button"
                  >
                    <Save size={16} />
                    Onayla ve uygula
                  </button>
                </div>
              </div>
            )}
            <div className="subtitle-export-row">
              <label className="language-select">
                <Download size={16} />
                <span>Disari</span>
                <select
                  aria-label="Export formati"
                  disabled={isBusy || mergeExportActive}
                  onChange={(event) => onExportFormatChange(event.target.value as SubtitleExportFormat)}
                  value={mergeExportActive ? 'txt' : exportFormat}
                >
                  {subtitleExportOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="primary-button compact"
                disabled={isBusy || checkedVisibleSubtitleCount === 0}
                onClick={onExport}
                type="button"
              >
                <Download size={16} />
                {mergeExportActive ? 'Birlestir' : 'Export'}
              </button>
              <div className="subtitle-export-options">
                <label className="export-check-option">
                  <input
                    checked={mergeExportActive}
                    disabled={isBusy || !canMergeExport}
                    onChange={(event) => onMergeExportChange(event.target.checked)}
                    type="checkbox"
                  />
                  Birlestir
                </label>
                {mergeExportActive && (
                  <>
                    <label className="export-check-option">
                      <input
                        checked={sortMergedExportByDate}
                        disabled={isBusy}
                        onChange={(event) => onSortMergedExportByDateChange(event.target.checked)}
                        type="checkbox"
                      />
                      Tarihe gore sirala
                    </label>
                    <label className="export-check-option">
                      <input
                        checked={includeExportMetadata}
                        disabled={isBusy}
                        onChange={(event) => onIncludeExportMetadataChange(event.target.checked)}
                        type="checkbox"
                      />
                      Baslik ve yayin tarihi
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        </details>
      </div>
      )}

      {subtitleSourceType === 'video-transcript' ? (
        <div className="subtitle-item-list" onScroll={onSubtitleListScroll}>
          {renderedSubtitleItems.map((item, index) => (
            <div
              className={`subtitle-item ${selectedVideo?.id === item.videoId ? 'selected' : ''} ${checkedSubtitleIdSet.has(item.videoId) ? 'checked' : ''}`}
              key={item.videoId}
              onClick={() => onSelectSubtitle(item.videoId)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectSubtitle(item.videoId);
                }
              }}
            >
              <input
                aria-label={`${item.title} altyazisini sec`}
                checked={checkedSubtitleIdSet.has(item.videoId)}
                onChange={() => onToggleSubtitleSelection(item.videoId)}
                onClick={(event) => event.stopPropagation()}
                type="checkbox"
              />
              <ThumbnailPreview alt={`${item.title} thumbnail`} style={getThumbnailStyleFromUrl(item.thumbnailUrl, index)} />
              <span className="subtitle-item-copy">
                <strong>{item.title}</strong>
                <small className="subtitle-item-date">
                  <CalendarDays size={12} />
                  <span>{item.publishedAt ?? 'Tarih yok'}</span>
                  <span>{item.weekday ?? 'Gun yok'}</span>
                </small>
                <small className="subtitle-item-meta">
                  <span>{formatDuration(item.durationMinutes)}</span>
                  <span>{item.assetCount} raw</span>
                  <span>{item.hasCleaned ? 'Temiz' : 'Raw'}</span>
                </small>
              </span>
            </div>
          ))}
          {totalSubtitleCount === 0 && <div className="empty-state">Bu filtrelerle eslesen mevcut altyazi yok.</div>}
          {hasMoreRenderedSubtitles && (
            <div className="lazy-load-footer">
              <span>
                {renderedSubtitleItems.length} / {totalSubtitleCount} altyazi gosteriliyor
              </span>
              <button className="secondary-button" onClick={onLoadMoreSubtitles} type="button">
                Daha fazla yukle
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="subtitle-item-list merged-subtitle-list">
          {visibleMergedSubtitleSources.map((source) => (
            <div className="merged-subtitle-item" key={source.id}>
              <FileText size={17} />
              <span className="subtitle-item-copy">
                <strong>{source.title}</strong>
                <small>
                  {source.detail} · {formatCompactNumber(source.wordCount)} kelime
                </small>
                <small>{formatDateTime(source.updatedAt)}</small>
              </span>
              <button
                aria-label={`${source.title} birlestirilmis altyazisini indir`}
                className="merged-subtitle-action download"
                disabled={isBusy}
                onClick={() => onDownloadMergedSubtitle(source)}
                title="Indir"
                type="button"
              >
                <Download size={15} />
              </button>
              <button
                aria-label={`${source.title} birlestirilmis altyazisini sil`}
                className="merged-subtitle-action delete"
                disabled={isBusy}
                onClick={() => onDeleteMergedSubtitle(source)}
                title="Sil"
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {visibleMergedSubtitleSources.length === 0 && (
            <div className="empty-state">Birlestirilmis altyazi yok.</div>
          )}
        </div>
      )}
    </div>
  );
});
