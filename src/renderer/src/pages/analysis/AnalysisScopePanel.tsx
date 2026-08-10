import { AlertTriangle, Brain, CheckCircle2, Circle, FileText, Gauge, GitBranch, Landmark, Play, Search, SlidersHorizontal, Sparkles, Square, Users, Waves } from 'lucide-react';
import type { ComponentType, CSSProperties, ReactElement } from 'react';
import type {
  AnalysisBelievabilityRecord,
  AnalysisCharacterGraphRecord,
  AnalysisContinuityRecord,
  AnalysisFingerprintRecord,
  AnalysisIndexSummary,
  AnalysisMythologyRecord,
  AnalysisRealityIndexRecord,
  AnalysisSemanticDriftRecord,
  AnalysisSourceType,
  AnalysisSourceSummary,
  ChannelSummary
} from '../../../../shared/archive';
import { formatCompactNumber } from '../../lib/format';
import { AnalysisReportDownloads } from './AnalysisMainPanel';
import { analysisRunDefinitions, getAnalysisRunDefinition, type AnalysisRunKey } from './analysisRunConfig';
import type { AnalysisRunQueueState } from './useAnalysisRuntime';

interface AnalysisScopePanelProps {
  selectedChannel: ChannelSummary | null;
  summary: AnalysisIndexSummary;
  analysisSources: AnalysisSourceSummary[];
  analysisSourceType: AnalysisSourceType;
  analysisSourceTypeCounts: Record<AnalysisSourceType, number>;
  activeAnalysisSourceCount: number;
  visibleAnalysisSources: AnalysisSourceSummary[];
  selectedAnalysisSourceIds: string[];
  selectedAnalysisSourceSet: Set<string>;
  analysisSourceQuery: string;
  selectedAnalysisWordCount: number;
  semanticFingerprint: AnalysisFingerprintRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  mythologyReport: AnalysisMythologyRecord | null;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
  believabilityReport: AnalysisBelievabilityRecord | null;
  isAnalysisLoading: boolean;
  selectedAnalysisRunKeys: AnalysisRunKey[];
  analysisRunQueue: AnalysisRunQueueState;
  onAnalysisSourceTypeChange: (value: AnalysisSourceType) => void;
  onAnalysisSourceQueryChange: (value: string) => void;
  onSelectVisibleSources: () => void;
  onClearSelectedSources: () => void;
  onToggleSource: (sourceId: string) => void;
  onToggleAnalysisRun: (key: AnalysisRunKey) => void;
  onSelectAllAnalysisRuns: () => void;
  onClearAnalysisRuns: () => void;
  handleStartSelectedAnalyses: () => Promise<void>;
  handleCancelSelectedAnalyses: () => void;
}

export function AnalysisScopePanel({
  selectedChannel,
  summary,
  analysisSources,
  analysisSourceType,
  analysisSourceTypeCounts,
  activeAnalysisSourceCount,
  visibleAnalysisSources,
  selectedAnalysisSourceIds,
  selectedAnalysisSourceSet,
  analysisSourceQuery,
  selectedAnalysisWordCount,
  semanticFingerprint,
  continuityReport,
  mythologyReport,
  realityIndexReport,
  characterGraphReport,
  semanticDriftReport,
  believabilityReport,
  isAnalysisLoading,
  selectedAnalysisRunKeys,
  analysisRunQueue,
  onAnalysisSourceTypeChange,
  onAnalysisSourceQueryChange,
  onSelectVisibleSources,
  onClearSelectedSources,
  onToggleSource,
  onToggleAnalysisRun,
  onSelectAllAnalysisRuns,
  onClearAnalysisRuns,
  handleStartSelectedAnalyses,
  handleCancelSelectedAnalyses
}: AnalysisScopePanelProps): ReactElement {
  const selectedRunSet = new Set(selectedAnalysisRunKeys);
  const selectedSourceCount = selectedAnalysisSourceIds.length;
  const canStartRuns =
    selectedSourceCount > 0 && selectedAnalysisRunKeys.length > 0 && !analysisRunQueue.isRunning && !isAnalysisLoading;
  const completedCount = analysisRunQueue.completedKeys.length;
  const progressBase = Math.max(1, selectedAnalysisRunKeys.length);
  const progressPercent = Math.min(100, (completedCount / progressBase) * 100);

  return (
    <aside className="panel analysis-side">
      <div className="section-heading">
        <SlidersHorizontal size={18} />
        <span>Analiz kapsami</span>
      </div>
      <div className="analysis-scope-card">
        <strong>{selectedChannel?.name ?? 'Kanal yok'}</strong>
        <span>{formatCompactNumber(summary.totalVideos)} video</span>
        <span>{formatCompactNumber(summary.readyVideos)} altyazi hazir</span>
        <span>{formatCompactNumber(summary.channelsWithIndexedDocuments)} kanal indeksli</span>
      </div>
      <AnalysisReportDownloads
        activeAnalysisSourceCount={activeAnalysisSourceCount}
        analysisSourceType={analysisSourceType}
        believabilityReport={believabilityReport}
        characterGraphReport={characterGraphReport}
        continuityReport={continuityReport}
        mythologyReport={mythologyReport}
        realityIndexReport={realityIndexReport}
        selectedChannel={selectedChannel}
        selectedSourceCount={selectedAnalysisSourceIds.length}
        selectedWordCount={selectedAnalysisWordCount}
        semanticDriftReport={semanticDriftReport}
        semanticFingerprint={semanticFingerprint}
        summary={summary}
      />
      <div className="analysis-source-panel">
        <div className="analysis-subheading">
          <FileText size={15} />
          <span>Analiz kaynaklari</span>
        </div>
        <div className="analysis-source-tabs">
          <button
            className={analysisSourceType === 'video-transcript' ? 'active' : ''}
            onClick={() => onAnalysisSourceTypeChange('video-transcript')}
            type="button"
          >
            Transcriptler
            <span>{analysisSourceTypeCounts['video-transcript']}</span>
          </button>
          <button
            className={analysisSourceType === 'merged-file' ? 'active' : ''}
            onClick={() => onAnalysisSourceTypeChange('merged-file')}
            type="button"
          >
            Birlestirilmis
            <span>{analysisSourceTypeCounts['merged-file']}</span>
          </button>
        </div>
        <label className="analysis-source-search">
          <Search size={14} />
          <input
            onChange={(event) => onAnalysisSourceQueryChange(event.target.value)}
            placeholder="Kaynak filtrele"
            value={analysisSourceQuery}
          />
        </label>
        <div className="analysis-source-actions">
          <button className="secondary-button compact" disabled={visibleAnalysisSources.length === 0} onClick={onSelectVisibleSources} type="button">
            Tumunu sec
          </button>
          <button className="secondary-button compact" disabled={selectedAnalysisSourceIds.length === 0} onClick={onClearSelectedSources} type="button">
            Temizle
          </button>
        </div>
        <div className="analysis-source-list">
          {visibleAnalysisSources.map((source) => (
            <label className="analysis-source-item" key={source.id}>
              <input checked={selectedAnalysisSourceSet.has(source.id)} onChange={() => onToggleSource(source.id)} type="checkbox" />
              <span>
                <strong>{source.title}</strong>
                <small>
                  {source.type === 'merged-file' ? source.detail : source.publishedAt ?? 'Tarih yok'} ·{' '}
                  {formatCompactNumber(source.wordCount)} kelime
                </small>
              </span>
            </label>
          ))}
          {visibleAnalysisSources.length === 0 && <p className="empty-mini">Kaynak yok.</p>}
        </div>
        <small className="analysis-source-summary">
          {selectedAnalysisSourceIds.length} / {activeAnalysisSourceCount} secili · {formatCompactNumber(selectedAnalysisWordCount)} kelime
        </small>
      </div>
      <div className="analysis-run-panel">
        <div className="analysis-subheading">
          <Sparkles size={15} />
          <span>Analiz kuyrugu</span>
        </div>
        <div className="analysis-run-actions">
          <button className="secondary-button compact" disabled={analysisRunQueue.isRunning} onClick={onSelectAllAnalysisRuns} type="button">
            Tumunu sec
          </button>
          <button className="secondary-button compact" disabled={analysisRunQueue.isRunning || selectedAnalysisRunKeys.length === 0} onClick={onClearAnalysisRuns} type="button">
            Temizle
          </button>
        </div>
        <div className="analysis-run-list">
          {analysisRunDefinitions.map((definition) => {
            const selected = selectedRunSet.has(definition.key);
            const status = getRunStatus(definition.key, {
              analysisRunQueue,
              believabilityReport,
              characterGraphReport,
              continuityReport,
              mythologyReport,
              realityIndexReport,
              semanticDriftReport,
              semanticFingerprint
            });
            const Icon = getRunIcon(definition.key);
            return (
              <label className={`analysis-run-option ${selected ? 'selected' : ''}`} key={definition.key}>
                <input
                  checked={selected}
                  disabled={analysisRunQueue.isRunning}
                  onChange={() => onToggleAnalysisRun(definition.key)}
                  type="checkbox"
                />
                <Icon size={15} />
                <span>
                  <strong>{definition.label}</strong>
                  <small>{definition.description}</small>
                  {definition.dependsOn.length > 0 && (
                    <em>Once: {definition.dependsOn.map((dependency) => getAnalysisRunDefinition(dependency).shortLabel).join(', ')}</em>
                  )}
                </span>
                <RunStatusBadge status={status} />
              </label>
            );
          })}
          <div className="analysis-run-option disabled">
            <input checked={false} disabled type="checkbox" />
            <Sparkles size={15} />
            <span>
              <strong>Cross AI examination</strong>
              <small>Coklu model calistirma simdilik taslak; sonraki sistemle baglanacak.</small>
            </span>
            <strong className="analysis-run-badge draft">Taslak</strong>
          </div>
        </div>
        <div className="analysis-run-progress">
          <div>
            <span>Surec</span>
            <strong>{getQueueLabel(analysisRunQueue)}</strong>
          </div>
          <i style={{ '--bar-width': `${Math.max(3, progressPercent)}%` } as CSSProperties} />
          <small>
            {completedCount} / {selectedAnalysisRunKeys.length} tamamlandi · {selectedSourceCount} kaynak secili
          </small>
          {analysisRunQueue.cancelRequested && <small>Iptal istendi; aktif Codex islemi bitince kuyruk duracak.</small>}
        </div>
        <div className="analysis-run-controls">
          <button className="primary-button compact" disabled={!canStartRuns} onClick={() => void handleStartSelectedAnalyses()} type="button">
            <Play size={15} />
            Analiz baslat
          </button>
          <button className="secondary-button compact" disabled={!analysisRunQueue.isRunning || analysisRunQueue.cancelRequested} onClick={handleCancelSelectedAnalyses} type="button">
            <Square size={14} />
            Iptal
          </button>
        </div>
      </div>
      {isAnalysisLoading && <p className="analysis-loading">Hazirlaniyor...</p>}
    </aside>
  );
}

type RunStatus = 'running' | 'done' | 'failed' | 'pending' | 'ready' | 'stale' | 'missing';

function getRunStatus(
  key: AnalysisRunKey,
  context: {
    analysisRunQueue: AnalysisRunQueueState;
    semanticFingerprint: AnalysisFingerprintRecord | null;
    continuityReport: AnalysisContinuityRecord | null;
    mythologyReport: AnalysisMythologyRecord | null;
    realityIndexReport: AnalysisRealityIndexRecord | null;
    characterGraphReport: AnalysisCharacterGraphRecord | null;
    semanticDriftReport: AnalysisSemanticDriftRecord | null;
    believabilityReport: AnalysisBelievabilityRecord | null;
  }
): RunStatus {
  if (context.analysisRunQueue.currentKey === key) {
    return 'running';
  }

  if (context.analysisRunQueue.failedKey === key) {
    return 'failed';
  }

  if (context.analysisRunQueue.completedKeys.includes(key)) {
    return 'done';
  }

  if (context.analysisRunQueue.isRunning && context.analysisRunQueue.pendingKeys.includes(key)) {
    return 'pending';
  }

  const record = getRunRecord(key, context);
  if (!record) {
    return 'missing';
  }

  return record.stale ? 'stale' : 'ready';
}

function getRunRecord(
  key: AnalysisRunKey,
  context: {
    semanticFingerprint: AnalysisFingerprintRecord | null;
    continuityReport: AnalysisContinuityRecord | null;
    mythologyReport: AnalysisMythologyRecord | null;
    realityIndexReport: AnalysisRealityIndexRecord | null;
    characterGraphReport: AnalysisCharacterGraphRecord | null;
    semanticDriftReport: AnalysisSemanticDriftRecord | null;
    believabilityReport: AnalysisBelievabilityRecord | null;
  }
): { stale: boolean } | null {
  if (key === 'fingerprint') return context.semanticFingerprint;
  if (key === 'realityIndex') return context.realityIndexReport;
  if (key === 'continuity') return context.continuityReport;
  if (key === 'mythology') return context.mythologyReport;
  if (key === 'characterGraph') return context.characterGraphReport;
  if (key === 'semanticDrift') return context.semanticDriftReport;
  return context.believabilityReport;
}

function RunStatusBadge({ status }: { status: RunStatus }): ReactElement {
  const icon = status === 'running' ? <Sparkles size={12} /> : status === 'failed' ? <AlertTriangle size={12} /> : status === 'missing' ? <Circle size={12} /> : <CheckCircle2 size={12} />;
  return <strong className={`analysis-run-badge ${status}`}>{icon}{getRunStatusLabel(status)}</strong>;
}

function getRunStatusLabel(status: RunStatus): string {
  if (status === 'running') return 'Calisiyor';
  if (status === 'done') return 'Bitti';
  if (status === 'failed') return 'Hata';
  if (status === 'pending') return 'Sirada';
  if (status === 'ready') return 'Hazir';
  if (status === 'stale') return 'Eski';
  return 'Yok';
}

function getQueueLabel(queue: AnalysisRunQueueState): string {
  if (queue.currentKey) {
    return `${getAnalysisRunDefinition(queue.currentKey).shortLabel} calisiyor`;
  }

  if (queue.failedKey) {
    return `${getAnalysisRunDefinition(queue.failedKey).shortLabel} hata verdi`;
  }

  if (queue.cancelRequested) {
    return 'Iptal edildi';
  }

  if (queue.completedKeys.length > 0) {
    return 'Tamamlandi';
  }

  return 'Beklemede';
}

function getRunIcon(key: AnalysisRunKey): ComponentType<{ size?: number }> {
  if (key === 'fingerprint') return Sparkles;
  if (key === 'realityIndex') return Gauge;
  if (key === 'continuity') return GitBranch;
  if (key === 'mythology') return Landmark;
  if (key === 'characterGraph') return Users;
  if (key === 'semanticDrift') return Waves;
  return Brain;
}
