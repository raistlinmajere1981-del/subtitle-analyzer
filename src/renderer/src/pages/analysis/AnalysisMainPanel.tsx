import { Activity, BarChart3, Brain, CalendarDays, ChevronDown, Download, FileJson, FileText, Gauge, GitBranch, Landmark, RefreshCcw, Search, SlidersHorizontal, Sparkles, Subtitles, Tags, Users, Waves } from 'lucide-react';
import { useState } from 'react';
import type { ComponentType, CSSProperties, FormEvent, ReactElement } from 'react';
import type {
  AnalysisAiProviderStatus,
  AnalysisBelievabilityRecord,
  AnalysisCharacterGraphRecord,
  AnalysisContinuityRecord,
  AnalysisEmotionalSignal,
  AnalysisFingerprintRecord,
  AnalysisFrequencyResult,
  AnalysisIndexSummary,
  AnalysisMythologyRecord,
  AnalysisNgramSize,
  AnalysisRealityMechanic,
  AnalysisRealityIndexRecord,
  AnalysisSemanticEvidence,
  AnalysisSemanticDriftRecord,
  AnalysisSearchResult,
  AnalysisSourceType,
  AnalysisSourceSummary,
  AnalysisTimelineResult,
  ChannelSummary
} from '../../../../shared/archive';
import { formatCompactNumber, formatDateTime } from '../../lib/format';
import { AnalysisMetricCard } from './AnalysisMetricCard';
import { SnippetText } from './SnippetText';

const crossAiModelOptions = [
  { value: 'codex-default', label: 'Codex CLI' },
  { value: 'claude-placeholder', label: 'Claude taslak' },
  { value: 'gemini-placeholder', label: 'Gemini taslak' },
  { value: 'local-placeholder', label: 'Local model taslak' }
] as const;

const crossAiDefaultSlots = ['codex-default', 'claude-placeholder', 'gemini-placeholder'];

const crossAiSlotLabels = ['Forensic reviewer', 'Symbolic reviewer', 'Narrative reviewer'] as const;

const evidenceMatrixModules = [
  { label: 'AI fingerprint', shortLabel: 'Finger' },
  { label: 'Reality index', shortLabel: 'RMI' },
  { label: 'Continuity', shortLabel: 'Cont' },
  { label: 'Mythology', shortLabel: 'Myth' },
  { label: 'Character graph', shortLabel: 'Graph' },
  { label: 'Semantic drift', shortLabel: 'Drift' },
  { label: 'Believability', shortLabel: 'Belief' }
] as const;

type AnalysisDrawerId =
  | 'overview'
  | 'consensus'
  | 'fingerprint'
  | 'reality-index'
  | 'continuity'
  | 'mythology'
  | 'character-graph'
  | 'semantic-drift'
  | 'believability'
  | 'cross-ai'
  | 'kwic'
  | 'frequency'
  | 'timeline';

interface AnalysisMainPanelProps {
  selectedChannel: ChannelSummary | null;
  summary: AnalysisIndexSummary;
  analysisSources: AnalysisSourceSummary[];
  analysisSourceType: AnalysisSourceType;
  activeAnalysisSourceCount: number;
  selectedAnalysisSourceIds: string[];
  selectedAnalysisWordCount: number;
  searchResult: AnalysisSearchResult | null;
  frequency: AnalysisFrequencyResult | null;
  timeline: AnalysisTimelineResult | null;
  aiProviderStatus: AnalysisAiProviderStatus | null;
  semanticFingerprint: AnalysisFingerprintRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  mythologyReport: AnalysisMythologyRecord | null;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
  believabilityReport: AnalysisBelievabilityRecord | null;
  analysisQuery: string;
  ngramSize: AnalysisNgramSize;
  analysisError: string | null;
  analysisMessage: string | null;
  isAnalysisLoading: boolean;
  isFingerprintRunning: boolean;
  isContinuityRunning: boolean;
  isMythologyRunning: boolean;
  isRealityIndexRunning: boolean;
  isCharacterGraphRunning: boolean;
  isSemanticDriftRunning: boolean;
  isBelievabilityRunning: boolean;
  isAnalysisUnavailable: boolean;
  onOpenSubtitles: () => void;
  onAnalysisQueryChange: (value: string) => void;
  onNgramSizeChange: (value: AnalysisNgramSize) => void;
  handleRebuildAnalysis: () => Promise<void>;
  handleSearch: (event?: FormEvent<HTMLFormElement>) => Promise<void>;
  handleRunFingerprint: () => Promise<void>;
  handleRunContinuity: () => Promise<void>;
  handleRunMythology: () => Promise<void>;
  handleRunRealityIndex: () => Promise<void>;
  handleRunCharacterGraph: () => Promise<void>;
  handleRunSemanticDrift: () => Promise<void>;
  handleRunBelievability: () => Promise<void>;
}

export function AnalysisMainPanel({
  selectedChannel,
  summary,
  analysisSources,
  analysisSourceType,
  activeAnalysisSourceCount,
  selectedAnalysisSourceIds,
  selectedAnalysisWordCount,
  searchResult,
  frequency,
  timeline,
  aiProviderStatus,
  semanticFingerprint,
  continuityReport,
  mythologyReport,
  realityIndexReport,
  characterGraphReport,
  semanticDriftReport,
  believabilityReport,
  analysisQuery,
  ngramSize,
  analysisError,
  analysisMessage,
  isAnalysisLoading,
  isFingerprintRunning,
  isContinuityRunning,
  isMythologyRunning,
  isRealityIndexRunning,
  isCharacterGraphRunning,
  isSemanticDriftRunning,
  isBelievabilityRunning,
  isAnalysisUnavailable,
  onOpenSubtitles,
  onAnalysisQueryChange,
  onNgramSizeChange,
  handleRebuildAnalysis,
  handleSearch,
  handleRunFingerprint,
  handleRunContinuity,
  handleRunMythology,
  handleRunRealityIndex,
  handleRunCharacterGraph,
  handleRunSemanticDrift,
  handleRunBelievability
}: AnalysisMainPanelProps): ReactElement {
  const [openDrawerId, setOpenDrawerId] = useState<AnalysisDrawerId | null>(null);
  const maxFrequencyCount = Math.max(...(frequency?.terms.map((term) => term.count) ?? [1]));
  const maxTimelineValue = Math.max(
    ...(timeline?.points.map((point) => (timeline.query ? point.matchCount : point.wordCount)) ?? [1])
  );
  const readyAnalysisReportCount = [
    semanticFingerprint,
    realityIndexReport,
    continuityReport,
    mythologyReport,
    characterGraphReport,
    semanticDriftReport,
    believabilityReport
  ].filter((report) => report && !report.stale).length;
  const sourceTypeLabel = analysisSourceType === 'merged-file' ? 'birlestirilmis dosya' : 'transcript';
  const hasAnyAnalysisSource = analysisSources.length > 0;
  const emptyTitle = !selectedChannel
    ? 'Kanal sec'
    : activeAnalysisSourceCount > 0
      ? 'Analiz kaynagi sec'
      : 'Bu kaynak turunde veri yok';
  const emptyMessage = !selectedChannel
    ? 'Analiz icin once Arsiv sayfasindan aktif bir kanal sec.'
    : activeAnalysisSourceCount > 0
      ? `Sag taraftaki ${sourceTypeLabel} listesinden analize dahil edilecek kaynaklari sec.`
      : analysisSourceType === 'merged-file'
        ? 'Bu kanal icin birlestirilmis dosya bulunamadi. Altyazilar sayfasindan secili altyazilari birlestirerek export edebilirsin.'
        : `${selectedChannel.name} kanalinda analiz edilecek transcript bulunamadi.`;
  const toggleDrawer = (drawerId: AnalysisDrawerId): void => {
    setOpenDrawerId((current) => (current === drawerId ? null : drawerId));
  };

  return (
    <div className="analysis-main panel">
      <div className="section-heading">
        <BarChart3 size={18} />
        <span>Analiz masasi</span>
      </div>
      {analysisError && <div className="analysis-alert error">{analysisError}</div>}
      {analysisMessage && <div className="analysis-alert">{analysisMessage}</div>}
      {isAnalysisUnavailable ? (
        <div className="analysis-disabled-panel">
          <div>
            <SlidersHorizontal size={22} />
            <strong>{emptyTitle}</strong>
            <p>{emptyMessage}</p>
            {hasAnyAnalysisSource && <small>Ayni analizde yalnizca aktif kaynak turundeki secimler kullanilir.</small>}
          </div>
          <div className="analysis-disabled-actions">
            {!hasAnyAnalysisSource && (
              <button className="primary-button" onClick={onOpenSubtitles} type="button">
                <Subtitles size={16} />
                Altyazilara git
              </button>
            )}
            <button className="secondary-button" disabled={isAnalysisLoading} onClick={() => void handleRebuildAnalysis()} type="button">
              <RefreshCcw size={15} />
              {isAnalysisLoading ? 'Kontrol ediliyor' : 'Indeksi kontrol et'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="analysis-toolbar">
            <label className="analysis-ngram-select">
              <span>Ngram</span>
              <select value={ngramSize} onChange={(event) => onNgramSizeChange(Number(event.target.value) as AnalysisNgramSize)}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <button className="secondary-button" disabled={isAnalysisLoading} onClick={() => void handleRebuildAnalysis()} type="button">
              <RefreshCcw size={15} />
              Indeks
            </button>
          </div>
          <form className="analysis-search" onSubmit={(event) => void handleSearch(event)}>
            <Search size={18} />
            <input
              aria-label="Analiz aramasi"
              onChange={(event) => onAnalysisQueryChange(event.target.value)}
              placeholder="Kavram veya ifade ara"
              value={analysisQuery}
            />
            <button disabled={isAnalysisLoading || analysisQuery.trim().length === 0 || !selectedChannel} type="submit">
              Ara
            </button>
          </form>
          <div className="metric-strip compact">
            <AnalysisMetricCard label="Transcript" value={formatCompactNumber(summary.transcriptDocuments)} note="temiz kayit" />
            <AnalysisMetricCard label="Indeks" value={formatCompactNumber(summary.indexedDocuments)} note="aranabilir" />
            <AnalysisMetricCard label="Kelime" value={formatCompactNumber(summary.totalIndexedWords)} note="toplam" />
            <AnalysisMetricCard
              label="Durum"
              value={summary.staleDocuments > 0 ? formatCompactNumber(summary.staleDocuments) : 'Guncel'}
              note={summary.lastIndexedAt ? formatDateTime(summary.lastIndexedAt) : 'hazir degil'}
            />
          </div>
          <div className="analysis-result-grid">
            <AnalysisDrawer
              badge={`${readyAnalysisReportCount}/7 rapor`}
              icon={Activity}
              id="overview"
              isOpen={openDrawerId === 'overview'}
              onToggle={toggleDrawer}
              title="Analiz ozeti"
            >
              <AnalysisOverviewPanel
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
            </AnalysisDrawer>
            <AnalysisDrawer
              badge={readyAnalysisReportCount > 0 ? 'Hazir' : 'Yok'}
              icon={GitBranch}
              id="consensus"
              isOpen={openDrawerId === 'consensus'}
              onToggle={toggleDrawer}
              title="Ortak kanit ve gerilimler"
            >
              <EvidenceConsensusPanel
                believabilityReport={believabilityReport}
                characterGraphReport={characterGraphReport}
                continuityReport={continuityReport}
                mythologyReport={mythologyReport}
                realityIndexReport={realityIndexReport}
                semanticDriftReport={semanticDriftReport}
                semanticFingerprint={semanticFingerprint}
              />
            </AnalysisDrawer>
            <AnalysisDrawer
              badge={getAnalysisPanelBadge(semanticFingerprint, isFingerprintRunning)}
              icon={Sparkles}
              id="fingerprint"
              isOpen={openDrawerId === 'fingerprint'}
              onToggle={toggleDrawer}
              title="AI fingerprint"
            >
              <SemanticFingerprintPanel
                aiProviderStatus={aiProviderStatus}
                fingerprint={semanticFingerprint}
                isAnalysisLoading={isAnalysisLoading}
                isContinuityRunning={isContinuityRunning}
                isFingerprintRunning={isFingerprintRunning}
                isCharacterGraphRunning={isCharacterGraphRunning}
                isMythologyRunning={isMythologyRunning}
                isRealityIndexRunning={isRealityIndexRunning}
                isSemanticDriftRunning={isSemanticDriftRunning}
                isBelievabilityRunning={isBelievabilityRunning}
                onRunFingerprint={handleRunFingerprint}
              />
            </AnalysisDrawer>
            <AnalysisDrawer
              badge={getAnalysisPanelBadge(realityIndexReport, isRealityIndexRunning)}
              icon={Gauge}
              id="reality-index"
              isOpen={openDrawerId === 'reality-index'}
              onToggle={toggleDrawer}
              title="Reality Manipulation Index"
            >
              <RealityManipulationIndexPanel
                aiProviderStatus={aiProviderStatus}
                isAnalysisLoading={isAnalysisLoading}
                isContinuityRunning={isContinuityRunning}
                isFingerprintRunning={isFingerprintRunning}
                isCharacterGraphRunning={isCharacterGraphRunning}
                isMythologyRunning={isMythologyRunning}
                isRealityIndexRunning={isRealityIndexRunning}
                isSemanticDriftRunning={isSemanticDriftRunning}
                isBelievabilityRunning={isBelievabilityRunning}
                onRunRealityIndex={handleRunRealityIndex}
                realityIndex={realityIndexReport}
              />
            </AnalysisDrawer>
            <AnalysisDrawer
              badge={getAnalysisPanelBadge(continuityReport, isContinuityRunning)}
              icon={GitBranch}
              id="continuity"
              isOpen={openDrawerId === 'continuity'}
              onToggle={toggleDrawer}
              title="Narrative continuity"
            >
              <NarrativeContinuityPanel
                aiProviderStatus={aiProviderStatus}
                continuity={continuityReport}
                isAnalysisLoading={isAnalysisLoading}
                isContinuityRunning={isContinuityRunning}
                isFingerprintRunning={isFingerprintRunning}
                isCharacterGraphRunning={isCharacterGraphRunning}
                isMythologyRunning={isMythologyRunning}
                isRealityIndexRunning={isRealityIndexRunning}
                isSemanticDriftRunning={isSemanticDriftRunning}
                isBelievabilityRunning={isBelievabilityRunning}
                onRunContinuity={handleRunContinuity}
              />
            </AnalysisDrawer>
            <AnalysisDrawer
              badge={getAnalysisPanelBadge(mythologyReport, isMythologyRunning)}
              icon={Landmark}
              id="mythology"
              isOpen={openDrawerId === 'mythology'}
              onToggle={toggleDrawer}
              title="Mythology mapping"
            >
              <MythologyMappingPanel
                aiProviderStatus={aiProviderStatus}
                isAnalysisLoading={isAnalysisLoading}
                isContinuityRunning={isContinuityRunning}
                isFingerprintRunning={isFingerprintRunning}
                isCharacterGraphRunning={isCharacterGraphRunning}
                isMythologyRunning={isMythologyRunning}
                isRealityIndexRunning={isRealityIndexRunning}
                isSemanticDriftRunning={isSemanticDriftRunning}
                isBelievabilityRunning={isBelievabilityRunning}
                mythology={mythologyReport}
                onRunMythology={handleRunMythology}
              />
            </AnalysisDrawer>
            <AnalysisDrawer
              badge={getAnalysisPanelBadge(characterGraphReport, isCharacterGraphRunning)}
              icon={Users}
              id="character-graph"
              isOpen={openDrawerId === 'character-graph'}
              onToggle={toggleDrawer}
              title="Character graph"
            >
              <CharacterGraphPanel
                aiProviderStatus={aiProviderStatus}
                characterGraph={characterGraphReport}
                isAnalysisLoading={isAnalysisLoading}
                isCharacterGraphRunning={isCharacterGraphRunning}
                isContinuityRunning={isContinuityRunning}
                isFingerprintRunning={isFingerprintRunning}
                isMythologyRunning={isMythologyRunning}
                isRealityIndexRunning={isRealityIndexRunning}
                isSemanticDriftRunning={isSemanticDriftRunning}
                isBelievabilityRunning={isBelievabilityRunning}
                onRunCharacterGraph={handleRunCharacterGraph}
              />
            </AnalysisDrawer>
            <AnalysisDrawer
              badge={getAnalysisPanelBadge(semanticDriftReport, isSemanticDriftRunning)}
              icon={Waves}
              id="semantic-drift"
              isOpen={openDrawerId === 'semantic-drift'}
              onToggle={toggleDrawer}
              title="Semantic drift"
            >
              <SemanticDriftPanel
                aiProviderStatus={aiProviderStatus}
                isAnalysisLoading={isAnalysisLoading}
                isCharacterGraphRunning={isCharacterGraphRunning}
                isContinuityRunning={isContinuityRunning}
                isFingerprintRunning={isFingerprintRunning}
                isMythologyRunning={isMythologyRunning}
                isRealityIndexRunning={isRealityIndexRunning}
                isSemanticDriftRunning={isSemanticDriftRunning}
                isBelievabilityRunning={isBelievabilityRunning}
                onRunSemanticDrift={handleRunSemanticDrift}
                semanticDrift={semanticDriftReport}
              />
            </AnalysisDrawer>
            <AnalysisDrawer
              badge={getAnalysisPanelBadge(believabilityReport, isBelievabilityRunning)}
              icon={Brain}
              id="believability"
              isOpen={openDrawerId === 'believability'}
              onToggle={toggleDrawer}
              title="Human believability"
            >
              <BelievabilityPanel
                aiProviderStatus={aiProviderStatus}
                believability={believabilityReport}
                isAnalysisLoading={isAnalysisLoading}
                isBelievabilityRunning={isBelievabilityRunning}
                isCharacterGraphRunning={isCharacterGraphRunning}
                isContinuityRunning={isContinuityRunning}
                isFingerprintRunning={isFingerprintRunning}
                isMythologyRunning={isMythologyRunning}
                isRealityIndexRunning={isRealityIndexRunning}
                isSemanticDriftRunning={isSemanticDriftRunning}
                onRunBelievability={handleRunBelievability}
              />
            </AnalysisDrawer>
            <AnalysisDrawer
              badge="Taslak"
              icon={Sparkles}
              id="cross-ai"
              isOpen={openDrawerId === 'cross-ai'}
              onToggle={toggleDrawer}
              title="Cross AI examination"
            >
              <CrossAiExaminationDraftPanel />
            </AnalysisDrawer>
            <AnalysisDrawer
              badge={searchResult ? `${searchResult.hits.length} sonuc` : 'Bekliyor'}
              icon={Search}
              id="kwic"
              isOpen={openDrawerId === 'kwic'}
              onToggle={toggleDrawer}
              title="KWIC"
            >
              <div className="analysis-result-section">
                <div className="analysis-subheading">
                  <Search size={15} />
                  <span>KWIC</span>
                </div>
                <div className="analysis-hit-list">
                  {searchResult?.hits.map((hit) => (
                    <div className="analysis-hit" key={`${hit.videoId}-${hit.rank}`}>
                      <div>
                        <strong>{hit.title}</strong>
                        <small>
                          {hit.channelName} · {hit.publishedAt ?? 'Tarih yok'} · {hit.videoType ?? 'Birlesik dosya'}
                        </small>
                      </div>
                      <p>
                        <SnippetText value={hit.snippet} />
                      </p>
                    </div>
                  ))}
                  {searchResult && searchResult.hits.length === 0 && <p className="empty-mini">Sonuc yok.</p>}
                  {!searchResult && <p className="empty-mini">Arama bekleniyor.</p>}
                </div>
              </div>
            </AnalysisDrawer>
            <AnalysisDrawer
              badge={frequency ? `${frequency.terms.length} terim` : 'Bekliyor'}
              icon={Tags}
              id="frequency"
              isOpen={openDrawerId === 'frequency'}
              onToggle={toggleDrawer}
              title="Frekans"
            >
              <div className="analysis-result-section">
                <div className="analysis-subheading">
                  <Tags size={15} />
                  <span>Frekans</span>
                </div>
                <div className="topic-list">
                  {frequency?.terms.map((term) => (
                    <div className="topic-row" key={term.term}>
                      <span>{term.term}</span>
                      <div className="topic-bar">
                        <i
                          style={
                            {
                              '--bar-width': `${Math.max(4, (term.count / maxFrequencyCount) * 100)}%`,
                              '--bar-color': '#2563eb'
                            } as CSSProperties
                          }
                        />
                      </div>
                      <strong>{term.count}</strong>
                    </div>
                  ))}
                  {frequency && frequency.terms.length === 0 && <p className="empty-mini">Frekans verisi yok.</p>}
                </div>
              </div>
            </AnalysisDrawer>
            <AnalysisDrawer
              badge={timeline ? `${timeline.points.length} nokta` : 'Bekliyor'}
              icon={CalendarDays}
              id="timeline"
              isOpen={openDrawerId === 'timeline'}
              onToggle={toggleDrawer}
              title="Zaman cizgisi"
            >
              <div className="analysis-result-section wide">
                <div className="analysis-subheading">
                  <CalendarDays size={15} />
                  <span>Zaman cizgisi</span>
                </div>
                <div className="analysis-timeline">
                  {timeline?.points.map((point) => {
                    const value = timeline.query ? point.matchCount : point.wordCount;
                    return (
                      <div className="timeline-row" key={point.bucket}>
                        <span>{point.label}</span>
                        <div className="timeline-bar">
                          <i style={{ '--bar-width': `${Math.max(3, (value / maxTimelineValue) * 100)}%` } as CSSProperties} />
                        </div>
                        <strong>{formatCompactNumber(value)}</strong>
                        <small>{point.videoCount} video</small>
                      </div>
                    );
                  })}
                  {timeline && timeline.points.length === 0 && <p className="empty-mini">Zaman verisi yok.</p>}
                </div>
              </div>
            </AnalysisDrawer>
          </div>
        </>
      )}
    </div>
  );
}

function AnalysisDrawer({
  badge,
  children,
  icon: Icon,
  id,
  isOpen,
  onToggle,
  title
}: {
  badge?: string;
  children: ReactElement;
  icon: ComponentType<{ size?: number }>;
  id: AnalysisDrawerId;
  isOpen: boolean;
  onToggle: (drawerId: AnalysisDrawerId) => void;
  title: string;
}): ReactElement {
  return (
    <section className={`analysis-drawer ${isOpen ? 'open' : ''}`}>
      <button aria-expanded={isOpen} className="analysis-drawer-trigger" onClick={() => onToggle(id)} type="button">
        <span>
          <Icon size={15} />
          <strong>{title}</strong>
        </span>
        {badge && <small>{badge}</small>}
        <ChevronDown size={16} />
      </button>
      {isOpen && <div className="analysis-drawer-body">{children}</div>}
    </section>
  );
}

function getAnalysisPanelBadge(record: { stale: boolean } | null, isRunning: boolean): string {
  if (isRunning) {
    return 'Calisiyor';
  }

  if (!record) {
    return 'Yok';
  }

  return record.stale ? 'Eski' : 'Hazir';
}

interface OverviewModule {
  label: string;
  ready: boolean;
  stale: boolean;
  draft?: boolean;
  detail: string;
  createdAt?: string | null;
}

interface OverviewScore {
  label: string;
  value: number | null;
  detail: string;
}

interface OverviewFinding {
  label: string;
  detail: string;
  tone: 'info' | 'warning' | 'ready';
}

interface EvidenceModuleEntry {
  moduleLabel: string;
  evidence: AnalysisSemanticEvidence;
}

interface EvidenceSourceCluster {
  sourceId: string;
  title: string;
  moduleLabels: string[];
  entries: EvidenceModuleEntry[];
}

interface CrossReportTension {
  label: string;
  detail: string;
  tone: 'info' | 'warning' | 'ready';
  leftLabel?: string;
  leftScore?: number;
  rightLabel?: string;
  rightScore?: number;
}

interface EvidenceMatrixCell {
  moduleLabel: string;
  shortLabel: string;
  count: number;
  quotes: string[];
}

interface EvidenceMatrixRow {
  sourceId: string;
  title: string;
  coverageCount: number;
  evidenceCount: number;
  readingLabel: string;
  signalLabels: string[];
  cells: EvidenceMatrixCell[];
}

interface AnalysisReportScore {
  label: string;
  value: number | null;
  detail: string;
}

interface AnalysisReportModel {
  title: string;
  generatedAt: string;
  schemaVersion: string;
  sourceSummary: string;
  readyModuleCount: number;
  totalModuleCount: number;
  scores: AnalysisReportScore[];
  findings: OverviewFinding[];
  tensions: CrossReportTension[];
  evidenceClusters: EvidenceSourceCluster[];
  matrixRows: EvidenceMatrixRow[];
  moduleReports: AnalysisReportModulePayload[];
}

interface AnalysisReportModulePayload {
  key: string;
  label: string;
  status: 'ready' | 'stale' | 'missing';
  metadata: {
    id: string | null;
    sourceIds: string[];
    provider: string | null;
    model: string | null;
    promptVersion: string | null;
    createdAt: string | null;
    documentCount: number;
    wordCount: number;
  };
  report: unknown;
}

export function AnalysisReportDownloads({
  activeAnalysisSourceCount,
  analysisSourceType,
  believabilityReport,
  characterGraphReport,
  continuityReport,
  mythologyReport,
  realityIndexReport,
  selectedChannel,
  selectedSourceCount,
  selectedWordCount,
  semanticDriftReport,
  semanticFingerprint,
  summary
}: {
  activeAnalysisSourceCount: number;
  analysisSourceType: AnalysisSourceType;
  believabilityReport: AnalysisBelievabilityRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  mythologyReport: AnalysisMythologyRecord | null;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  selectedChannel: ChannelSummary | null;
  selectedSourceCount: number;
  selectedWordCount: number;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
  semanticFingerprint: AnalysisFingerprintRecord | null;
  summary: AnalysisIndexSummary;
}): ReactElement {
  const report = buildAnalysisReportModel({
    activeAnalysisSourceCount,
    analysisSourceType,
    believabilityReport,
    characterGraphReport,
    continuityReport,
    mythologyReport,
    realityIndexReport,
    selectedChannel,
    selectedSourceCount,
    selectedWordCount,
    semanticDriftReport,
    semanticFingerprint,
    summary
  });
  const canExport = report.readyModuleCount > 0;

  return (
    <div className="analysis-report-downloads">
      <div className="analysis-report-downloads-header">
        <div className="analysis-subheading">
          <FileText size={15} />
          <span>Indirilebilir raporlar</span>
        </div>
        <span className={`fingerprint-status ${canExport ? 'ready' : 'missing'}`}>
          {report.readyModuleCount}/{report.totalModuleCount} modul
        </span>
      </div>
      <div className="analysis-report-sidebar-summary">
        <strong>{report.title}</strong>
        <p>{report.sourceSummary}</p>
      </div>
      <div className="analysis-report-download-actions">
        <button className="secondary-button compact" disabled={!canExport} onClick={() => exportAnalysisReport(report, 'ai-md')} type="button">
          <Brain size={14} />
          AI teknik
        </button>
        <button className="secondary-button compact" disabled={!canExport} onClick={() => exportAnalysisReport(report, 'md')} type="button">
          <Download size={14} />
          Markdown
        </button>
        <button className="secondary-button compact" disabled={!canExport} onClick={() => exportAnalysisReport(report, 'json')} type="button">
          <FileJson size={14} />
          JSON
        </button>
        <button className="secondary-button compact" disabled={!canExport} onClick={() => exportAnalysisReport(report, 'html')} type="button">
          <Download size={14} />
          HTML
        </button>
      </div>
    </div>
  );
}

function AnalysisOverviewPanel({
  activeAnalysisSourceCount,
  analysisSourceType,
  believabilityReport,
  characterGraphReport,
  continuityReport,
  mythologyReport,
  realityIndexReport,
  selectedChannel,
  selectedSourceCount,
  selectedWordCount,
  semanticDriftReport,
  semanticFingerprint,
  summary
}: {
  activeAnalysisSourceCount: number;
  analysisSourceType: AnalysisSourceType;
  believabilityReport: AnalysisBelievabilityRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  mythologyReport: AnalysisMythologyRecord | null;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  selectedChannel: ChannelSummary | null;
  selectedSourceCount: number;
  selectedWordCount: number;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
  semanticFingerprint: AnalysisFingerprintRecord | null;
  summary: AnalysisIndexSummary;
}): ReactElement {
  const topMythologyAffinity = getTopMythologyAffinity(mythologyReport);
  const modules: OverviewModule[] = [
    buildOverviewModule('AI fingerprint', semanticFingerprint),
    buildOverviewModule('Reality index', realityIndexReport),
    buildOverviewModule('Continuity', continuityReport),
    buildOverviewModule('Mythology', mythologyReport),
    buildOverviewModule('Character graph', characterGraphReport),
    buildOverviewModule('Semantic drift', semanticDriftReport),
    buildOverviewModule('Believability', believabilityReport),
    { label: 'Cross AI', ready: false, stale: false, draft: true, detail: 'taslak' }
  ];
  const executableModules = modules.filter((module) => !module.draft);
  const readyCount = executableModules.filter((module) => module.ready && !module.stale).length;
  const staleCount = executableModules.filter((module) => module.stale).length;
  const missingModules = executableModules.filter((module) => !module.ready);
  const latestUpdate = getLatestOverviewUpdate(executableModules);
  const sourceTypeLabel = analysisSourceType === 'merged-file' ? 'birlestirilmis dosya' : 'transcript';
  const scores: OverviewScore[] = [
    {
      label: 'RMI',
      value: realityIndexReport?.report.indexScore ?? null,
      detail: realityIndexReport?.report.riskLevel ?? 'bekliyor'
    },
    {
      label: 'Believability',
      value: believabilityReport?.report.believabilityScore ?? null,
      detail: believabilityReport ? 'insan-inanilirlik hissi' : 'bekliyor'
    },
    {
      label: 'Continuity',
      value: continuityReport?.report.continuityScore ?? null,
      detail: continuityReport ? `retcon ${Math.round(continuityReport.report.retconRisk * 100)}` : 'bekliyor'
    },
    {
      label: 'Semantic drift',
      value: semanticDriftReport?.report.driftIndex ?? null,
      detail: semanticDriftReport ? 'kavram kaymasi' : 'bekliyor'
    },
    {
      label: 'Role graph',
      value: characterGraphReport?.report.fictionalitySignal ?? null,
      detail: characterGraphReport ? 'rol duzeni sinyali' : 'bekliyor'
    },
    {
      label: 'Mythic frame',
      value: topMythologyAffinity?.score ?? null,
      detail: topMythologyAffinity?.label ?? 'bekliyor'
    }
  ];
  const findings = buildOverviewFindings({
    believabilityReport,
    characterGraphReport,
    continuityReport,
    missingModules,
    readyCount,
    realityIndexReport,
    semanticDriftReport,
    totalCount: executableModules.length
  });

  return (
    <div className="analysis-result-section wide analysis-overview-panel">
      <div className="fingerprint-header">
        <div className="analysis-subheading">
          <Activity size={15} />
          <span>Analiz ozeti</span>
        </div>
        <div className="fingerprint-actions">
          <span className={`fingerprint-status ${readyCount > 0 ? 'ready' : 'missing'}`}>
            {readyCount}/{executableModules.length} rapor
          </span>
          {staleCount > 0 && <span className="fingerprint-status missing">{staleCount} kaynak degisti</span>}
          {latestUpdate && <span className="fingerprint-status">Son {formatDateTime(latestUpdate)}</span>}
        </div>
      </div>
      <div className="overview-summary">
        <strong>{selectedChannel?.name ?? 'Kanal secilmedi'}</strong>
        <p>
          {formatCompactNumber(selectedSourceCount)} / {formatCompactNumber(activeAnalysisSourceCount)} {sourceTypeLabel} kaynagi secili;{' '}
          {formatCompactNumber(selectedWordCount)} kelime analiz kapsaminda. Indekste toplam {formatCompactNumber(summary.totalIndexedWords)} kelime var.
          Bu panel mevcut AI raporlarini tek bakista kontrol etmek icin deterministik olarak uretilir.
        </p>
      </div>
      <div className="overview-score-grid">
        {scores.map((score) => (
          <OverviewScoreCard key={score.label} score={score} />
        ))}
      </div>
      <div className="overview-readout-grid">
        {findings.map((finding) => (
          <div className={`overview-finding-card ${finding.tone}`} key={finding.label}>
            <span>{finding.label}</span>
            <p>{finding.detail}</p>
          </div>
        ))}
      </div>
      <div className="overview-module-grid">
        {modules.map((module) => (
          <div className={`overview-module-card ${getOverviewModuleClass(module)}`} key={module.label}>
            <span>{module.label}</span>
            <strong>{getOverviewModuleStatus(module)}</strong>
            <small>{module.detail}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewScoreCard({ score }: { score: OverviewScore }): ReactElement {
  const value = score.value === null ? null : normalizeScoreValue(score.value);
  return (
    <div className={`overview-score-card ${value === null ? 'missing' : getOverviewScoreClass(value)}`}>
      <span>{score.label}</span>
      <strong>{value === null ? '-' : Math.round(value * 100)}</strong>
      <i style={{ '--bar-width': `${value === null ? 0 : Math.max(3, value * 100)}%` } as CSSProperties} />
      <small>{score.detail}</small>
    </div>
  );
}

function buildOverviewModule(label: string, record: { createdAt: string; stale: boolean } | null): OverviewModule {
  return {
    label,
    ready: Boolean(record),
    stale: Boolean(record?.stale),
    detail: record ? formatDateTime(record.createdAt) : 'bekliyor',
    createdAt: record?.createdAt ?? null
  };
}

function getOverviewModuleStatus(module: OverviewModule): string {
  if (module.draft) {
    return 'Taslak';
  }

  if (module.stale) {
    return 'Eski';
  }

  return module.ready ? 'Hazir' : 'Yok';
}

function getOverviewModuleClass(module: OverviewModule): string {
  if (module.draft) {
    return 'draft';
  }

  if (module.stale) {
    return 'stale';
  }

  return module.ready ? 'ready' : 'missing';
}

function getOverviewScoreClass(value: number): string {
  if (value >= 0.72) {
    return 'high';
  }

  if (value >= 0.45) {
    return 'medium';
  }

  return 'low';
}

function getTopMythologyAffinity(
  mythology: AnalysisMythologyRecord | null
): { label: string; score: number } | null {
  const affinities = mythology?.report.traditionAffinities ?? [];
  if (affinities.length === 0) {
    return null;
  }

  const firstAffinity = affinities[0];
  if (!firstAffinity) {
    return null;
  }

  const top = affinities.reduce((best, current) => (current.affinityScore > best.affinityScore ? current : best), firstAffinity);
  return {
    label: top.tradition,
    score: top.affinityScore
  };
}

function getLatestOverviewUpdate(modules: OverviewModule[]): string | null {
  const updates = modules
    .map((module) => module.createdAt)
    .filter((createdAt): createdAt is string => Boolean(createdAt))
    .sort();

  return updates.length > 0 ? (updates[updates.length - 1] ?? null) : null;
}

function buildOverviewFindings({
  believabilityReport,
  characterGraphReport,
  continuityReport,
  missingModules,
  readyCount,
  realityIndexReport,
  semanticDriftReport,
  totalCount
}: {
  believabilityReport: AnalysisBelievabilityRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  missingModules: OverviewModule[];
  readyCount: number;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
  totalCount: number;
}): OverviewFinding[] {
  const findings: OverviewFinding[] = [];
  const frictionSeverity = Math.max(0, ...(believabilityReport?.report.frictionPoints.map((point) => point.severity) ?? []));
  const anomalySeverity = Math.max(0, ...(continuityReport?.report.anomalies.map((anomaly) => anomaly.severity) ?? []));

  if ((realityIndexReport?.report.indexScore ?? 0) >= 0.72 && (believabilityReport?.report.believabilityScore ?? 0) >= 0.72) {
    findings.push({
      label: 'Ana okuma',
      detail: 'Gerceklik etkisi ile insan-inanilirlik hissi birlikte yuksek; bu ikili, anlatinin izleyicide tutunma gucunu aciklayan ana eksen gibi gorunuyor.',
      tone: 'warning'
    });
  }

  if ((semanticDriftReport?.report.controlledExpansionScore ?? 0) >= 0.7 && (characterGraphReport?.report.roleStabilityScore ?? 0) >= 0.7) {
    findings.push({
      label: 'Yapi sinyali',
      detail: 'Kavram genislemesi kontrollu ilerlerken karakter/rol dagilimi de stabil kaliyor; bu, spontane metinden cok duzenli anlatim iskeleti okumasi verir.',
      tone: 'info'
    });
  }

  if (frictionSeverity >= 0.65 || anomalySeverity >= 0.65) {
    findings.push({
      label: 'Surtunme',
      detail: 'Believability surtunmeleri veya continuity anomalileri yuksek; kesin hukum yerine bu noktalar kanit kesitleriyle tek tek incelenmeli.',
      tone: 'warning'
    });
  }

  if (readyCount === totalCount) {
    findings.push({
      label: 'Kapsam',
      detail: 'Ana AI analizlerinin tamami secili kaynaklar icin hazir. Bundan sonraki verimli adim raporlar arasi ortak kanit ve celiski haritasi olur.',
      tone: 'ready'
    });
  } else if (missingModules.length > 0) {
    findings.push({
      label: 'Eksik katman',
      detail: `${missingModules.map((module) => module.label).slice(0, 3).join(', ')} henuz uretilmedi; ozet tamamlanmadan once bu katmanlar bos kalacak.`,
      tone: 'info'
    });
  }

  if (findings.length === 0) {
    findings.push({
      label: 'Durum',
      detail: 'Henuz guclu bir meta sinyal yok; kaynak secimi ve temel AI raporlari arttikca bu panel daha anlamli hale gelecek.',
      tone: 'info'
    });
  }

  return findings.slice(0, 4);
}

function buildAnalysisReportModel({
  activeAnalysisSourceCount,
  analysisSourceType,
  believabilityReport,
  characterGraphReport,
  continuityReport,
  mythologyReport,
  realityIndexReport,
  selectedChannel,
  selectedSourceCount,
  selectedWordCount,
  semanticDriftReport,
  semanticFingerprint,
  summary
}: {
  activeAnalysisSourceCount: number;
  analysisSourceType: AnalysisSourceType;
  believabilityReport: AnalysisBelievabilityRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  mythologyReport: AnalysisMythologyRecord | null;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  selectedChannel: ChannelSummary | null;
  selectedSourceCount: number;
  selectedWordCount: number;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
  semanticFingerprint: AnalysisFingerprintRecord | null;
  summary: AnalysisIndexSummary;
}): AnalysisReportModel {
  const topMythologyAffinity = getTopMythologyAffinity(mythologyReport);
  const modules = [
    buildOverviewModule('AI fingerprint', semanticFingerprint),
    buildOverviewModule('Reality index', realityIndexReport),
    buildOverviewModule('Continuity', continuityReport),
    buildOverviewModule('Mythology', mythologyReport),
    buildOverviewModule('Character graph', characterGraphReport),
    buildOverviewModule('Semantic drift', semanticDriftReport),
    buildOverviewModule('Believability', believabilityReport)
  ];
  const readyModuleCount = modules.filter((module) => module.ready && !module.stale).length;
  const missingModules = modules.filter((module) => !module.ready);
  const scores: AnalysisReportScore[] = [
    { label: 'RMI', value: realityIndexReport?.report.indexScore ?? null, detail: realityIndexReport?.report.riskLevel ?? 'bekliyor' },
    { label: 'Believability', value: believabilityReport?.report.believabilityScore ?? null, detail: 'insan-inanilirlik hissi' },
    { label: 'Continuity', value: continuityReport?.report.continuityScore ?? null, detail: continuityReport ? `retcon ${Math.round(continuityReport.report.retconRisk * 100)}` : 'bekliyor' },
    { label: 'Semantic drift', value: semanticDriftReport?.report.driftIndex ?? null, detail: 'kavram kaymasi' },
    { label: 'Role graph', value: characterGraphReport?.report.fictionalitySignal ?? null, detail: 'rol duzeni sinyali' },
    { label: 'Mythic frame', value: topMythologyAffinity?.score ?? null, detail: topMythologyAffinity?.label ?? 'bekliyor' }
  ];
  const entries = collectEvidenceEntries({
    believabilityReport,
    characterGraphReport,
    continuityReport,
    mythologyReport,
    realityIndexReport,
    semanticDriftReport,
    semanticFingerprint
  });
  const clusters = buildEvidenceClusters(entries);
  const signalMap = buildSignalSourceMap({
    believabilityReport,
    characterGraphReport,
    continuityReport,
    mythologyReport,
    realityIndexReport,
    semanticDriftReport
  });
  const matrixRows = buildEvidenceMatrixRows(clusters, signalMap);
  const sourceTypeLabel = analysisSourceType === 'merged-file' ? 'birlestirilmis dosya' : 'transcript';

  return {
    title: `${selectedChannel?.name ?? 'Secili kanal'} analiz raporu`,
    generatedAt: new Date().toISOString(),
    schemaVersion: 'subtitle-analyzer-ai-technical-report-v1',
    sourceSummary: `${formatCompactNumber(selectedSourceCount)} / ${formatCompactNumber(activeAnalysisSourceCount)} ${sourceTypeLabel} kaynagi, ${formatCompactNumber(selectedWordCount)} kelime analiz kapsaminda. Indekste toplam ${formatCompactNumber(summary.totalIndexedWords)} kelime var.`,
    readyModuleCount,
    totalModuleCount: modules.length,
    scores,
    findings: buildOverviewFindings({
      believabilityReport,
      characterGraphReport,
      continuityReport,
      missingModules,
      readyCount: readyModuleCount,
      realityIndexReport,
      semanticDriftReport,
      totalCount: modules.length
    }),
    tensions: buildCrossReportTensions({
      believabilityReport,
      characterGraphReport,
      continuityReport,
      mythologyReport,
      realityIndexReport,
      semanticDriftReport
    }),
    evidenceClusters: clusters,
    matrixRows,
    moduleReports: buildAnalysisReportModulePayloads({
      believabilityReport,
      characterGraphReport,
      continuityReport,
      mythologyReport,
      realityIndexReport,
      semanticDriftReport,
      semanticFingerprint
    })
  };
}

function buildAnalysisReportModulePayloads({
  believabilityReport,
  characterGraphReport,
  continuityReport,
  mythologyReport,
  realityIndexReport,
  semanticDriftReport,
  semanticFingerprint
}: {
  believabilityReport: AnalysisBelievabilityRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  mythologyReport: AnalysisMythologyRecord | null;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
  semanticFingerprint: AnalysisFingerprintRecord | null;
}): AnalysisReportModulePayload[] {
  return [
    buildModulePayload('fingerprint', 'AI fingerprint', semanticFingerprint, semanticFingerprint?.fingerprint ?? null),
    buildModulePayload('realityIndex', 'Reality Manipulation Index', realityIndexReport, realityIndexReport?.report ?? null),
    buildModulePayload('continuity', 'Narrative continuity', continuityReport, continuityReport?.report ?? null),
    buildModulePayload('mythology', 'Mythology mapping', mythologyReport, mythologyReport?.report ?? null),
    buildModulePayload('characterGraph', 'Character graph', characterGraphReport, characterGraphReport?.report ?? null),
    buildModulePayload('semanticDrift', 'Semantic drift', semanticDriftReport, semanticDriftReport?.report ?? null),
    buildModulePayload('believability', 'Human believability', believabilityReport, believabilityReport?.report ?? null)
  ];
}

function buildModulePayload(
  key: string,
  label: string,
  record: {
    id: string;
    sourceIds: string[];
    provider: string;
    model: string;
    promptVersion: string;
    createdAt: string;
    documentCount: number;
    wordCount: number;
    stale: boolean;
  } | null,
  report: unknown
): AnalysisReportModulePayload {
  return {
    key,
    label,
    status: record ? (record.stale ? 'stale' : 'ready') : 'missing',
    metadata: {
      id: record?.id ?? null,
      sourceIds: record?.sourceIds ?? [],
      provider: record?.provider ?? null,
      model: record?.model ?? null,
      promptVersion: record?.promptVersion ?? null,
      createdAt: record?.createdAt ?? null,
      documentCount: record?.documentCount ?? 0,
      wordCount: record?.wordCount ?? 0
    },
    report
  };
}

function exportAnalysisReport(report: AnalysisReportModel, format: 'md' | 'json' | 'html' | 'ai-md'): void {
  const content =
    format === 'ai-md'
      ? renderTechnicalAiReportMarkdown(report)
      : format === 'json'
      ? JSON.stringify(report, null, 2)
      : format === 'html'
        ? renderAnalysisReportHtml(report)
        : renderAnalysisReportMarkdown(report);
  const extension = format === 'html' ? 'html' : format === 'json' ? 'json' : 'md';
  const mimeType = format === 'json' ? 'application/json' : format === 'html' ? 'text/html' : 'text/markdown';
  const suffix = format === 'ai-md' ? '-ai-teknik' : '';

  downloadTextFile(`${slugifyFileName(report.title)}${suffix}-${formatDateForFile(report.generatedAt)}.${extension}`, content, mimeType);
}

function renderAnalysisReportMarkdown(report: AnalysisReportModel): string {
  const lines = [
    `# ${report.title}`,
    '',
    `Uretim: ${formatDateTime(report.generatedAt)}`,
    '',
    report.sourceSummary,
    '',
    '## Skorlar',
    '',
    ...report.scores.map((score) => `- ${score.label}: ${score.value === null ? '-' : Math.round(score.value * 100)} (${score.detail})`),
    '',
    '## Rapor Notlari',
    '',
    ...report.findings.map((finding) => `- ${finding.label}: ${finding.detail}`),
    '',
    '## Skor Gerilimleri',
    '',
    ...report.tensions.map((tension) => `- ${tension.label}: ${tension.detail}`),
    '',
    '## Ortak Kanit Kaynaklari',
    '',
    ...report.evidenceClusters.slice(0, 10).map((cluster) => `- ${cluster.title}: ${cluster.moduleLabels.join(', ')}`),
    '',
    '## Anomali / Kanit Matrisi',
    '',
    '| Kaynak | Kapsam | Okuma |',
    '| --- | --- | --- |',
    ...report.matrixRows.map((row) => `| ${escapeMarkdownCell(row.title)} | ${row.coverageCount}/${evidenceMatrixModules.length} modul, ${row.evidenceCount} kesit | ${escapeMarkdownCell(row.readingLabel)} |`)
  ];

  return `${lines.join('\n')}\n`;
}

function renderTechnicalAiReportMarkdown(report: AnalysisReportModel): string {
  const technicalPayload = {
    schemaVersion: report.schemaVersion,
    generatedAt: report.generatedAt,
    title: report.title,
    sourceSummary: report.sourceSummary,
    readyModuleCount: report.readyModuleCount,
    totalModuleCount: report.totalModuleCount,
    scores: report.scores,
    findings: report.findings,
    tensions: report.tensions,
    evidenceClusters: report.evidenceClusters.map((cluster) => ({
      sourceId: cluster.sourceId,
      title: cluster.title,
      moduleLabels: cluster.moduleLabels,
      evidenceCount: cluster.entries.length,
      evidence: cluster.entries.map((entry) => ({
        moduleLabel: entry.moduleLabel,
        quote: entry.evidence.quote,
        relevance: entry.evidence.relevance
      }))
    })),
    matrixRows: report.matrixRows,
    moduleReports: report.moduleReports
  };
  const lines = [
    `# ${report.title} - AI teknik analiz paketi`,
    '',
    '## Kullanim Talimati',
    '',
    'Bu dosya baska bir AI modeline ikinci seviye yorum yaptirmak icin hazirlanmistir.',
    'Metindeki raporlar ham transkript degil, Subtitle Analyzer tarafindan uretilmis analiz ciktisidir.',
    'Gercek/yalan karari verme; kanit gucu, anlati yapisi, metodolojik riskler, raporlar arasi tutarlilik ve eksik veri acisindan incele.',
    'Yorum yaparken kaynak idlerini, modul adlarini ve kanit kesitlerini ayri ayri referansla. Kesin hukum yerine hipotez ve kontrol noktasi uret.',
    '',
    '## Kapsam',
    '',
    `- Uretim: ${formatDateTime(report.generatedAt)}`,
    `- Semasi: ${report.schemaVersion}`,
    `- Kaynak ozeti: ${report.sourceSummary}`,
    `- Hazir modul: ${report.readyModuleCount}/${report.totalModuleCount}`,
    '',
    '## Modul Durumu',
    '',
    ...report.moduleReports.map((module) => {
      return `- ${module.label}: ${module.status}; ${module.metadata.documentCount} dokuman; ${module.metadata.wordCount} kelime; model=${module.metadata.model ?? 'yok'}; prompt=${module.metadata.promptVersion ?? 'yok'}`;
    }),
    '',
    '## Skorlar',
    '',
    ...report.scores.map((score) => `- ${score.label}: ${score.value === null ? 'null' : score.value.toFixed(3)} (${score.detail})`),
    '',
    '## Meta Bulgular',
    '',
    ...report.findings.map((finding) => `- [${finding.tone}] ${finding.label}: ${finding.detail}`),
    '',
    '## Raporlar Arasi Gerilimler',
    '',
    ...report.tensions.map((tension) => {
      const scoreText =
        typeof tension.leftScore === 'number' && typeof tension.rightScore === 'number'
          ? ` (${tension.leftLabel}=${tension.leftScore.toFixed(3)}, ${tension.rightLabel}=${tension.rightScore.toFixed(3)})`
          : '';
      return `- [${tension.tone}] ${tension.label}${scoreText}: ${tension.detail}`;
    }),
    '',
    '## Ortak Kanit Kaynaklari',
    '',
    ...report.evidenceClusters.map((cluster) => {
      return `- ${cluster.sourceId} | ${cluster.title} | moduller=${cluster.moduleLabels.join(', ')} | kesit=${cluster.entries.length}`;
    }),
    '',
    '## Yapilandirilmis Teknik Veri',
    '',
    '```json',
    JSON.stringify(technicalPayload, null, 2),
    '```',
    '',
    '## Beklenen Cikti Formati',
    '',
    '1. Kisa metodolojik degerlendirme',
    '2. Raporlar arasi en guclu ortak bulgular',
    '3. Raporlar arasi celiskiler veya zayif halkalar',
    '4. Kaynak bazli kontrol edilmesi gereken ilk 5 nokta',
    '5. Model yanliligi ve veri siniri uyarilari',
    ''
  ];

  return `${lines.join('\n')}\n`;
}

function renderAnalysisReportHtml(report: AnalysisReportModel): string {
  const scoreHtml = report.scores
    .map((score) => `<li><strong>${escapeHtml(score.label)}</strong>: ${score.value === null ? '-' : Math.round(score.value * 100)} <span>${escapeHtml(score.detail)}</span></li>`)
    .join('');
  const findingHtml = report.findings
    .map((finding) => `<li><strong>${escapeHtml(finding.label)}</strong>: ${escapeHtml(finding.detail)}</li>`)
    .join('');
  const tensionHtml = report.tensions
    .map((tension) => `<li><strong>${escapeHtml(tension.label)}</strong>: ${escapeHtml(tension.detail)}</li>`)
    .join('');
  const evidenceHtml = report.evidenceClusters
    .slice(0, 10)
    .map((cluster) => `<li><strong>${escapeHtml(cluster.title)}</strong>: ${escapeHtml(cluster.moduleLabels.join(', '))}</li>`)
    .join('');

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; color: #1f2937; line-height: 1.5; }
    h1, h2 { color: #111827; }
    section { margin: 24px 0; }
    li { margin: 8px 0; }
    span { color: #6b7280; }
  </style>
</head>
<body>
  <h1>${escapeHtml(report.title)}</h1>
  <p><strong>Uretim:</strong> ${escapeHtml(formatDateTime(report.generatedAt))}</p>
  <p>${escapeHtml(report.sourceSummary)}</p>
  <section><h2>Skorlar</h2><ul>${scoreHtml}</ul></section>
  <section><h2>Rapor Notlari</h2><ul>${findingHtml}</ul></section>
  <section><h2>Skor Gerilimleri</h2><ul>${tensionHtml}</ul></section>
  <section><h2>Ortak Kanit Kaynaklari</h2><ul>${evidenceHtml}</ul></section>
</body>
</html>
`;
}

function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function slugifyFileName(value: string): string {
  const slug = normalizeForTermMatch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'analiz-raporu';
}

function formatDateForFile(value: string): string {
  return value.replace(/[:.]/g, '-').slice(0, 19);
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function EvidenceConsensusPanel({
  believabilityReport,
  characterGraphReport,
  continuityReport,
  mythologyReport,
  realityIndexReport,
  semanticDriftReport,
  semanticFingerprint
}: {
  believabilityReport: AnalysisBelievabilityRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  mythologyReport: AnalysisMythologyRecord | null;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
  semanticFingerprint: AnalysisFingerprintRecord | null;
}): ReactElement {
  const entries = collectEvidenceEntries({
    believabilityReport,
    characterGraphReport,
    continuityReport,
    mythologyReport,
    realityIndexReport,
    semanticDriftReport,
    semanticFingerprint
  });
  const clusters = buildEvidenceClusters(entries);
  const sharedClusters = clusters.filter((cluster) => cluster.moduleLabels.length > 1);
  const topClusters = (sharedClusters.length > 0 ? sharedClusters : clusters).slice(0, 6);
  const signalMap = buildSignalSourceMap({
    believabilityReport,
    characterGraphReport,
    continuityReport,
    mythologyReport,
    realityIndexReport,
    semanticDriftReport
  });
  const matrixRows = buildEvidenceMatrixRows(clusters, signalMap);
  const tensions = buildCrossReportTensions({
    believabilityReport,
    characterGraphReport,
    continuityReport,
    mythologyReport,
    realityIndexReport,
    semanticDriftReport
  });

  return (
    <div className="analysis-result-section wide evidence-map-panel">
      <div className="fingerprint-header">
        <div className="analysis-subheading">
          <GitBranch size={15} />
          <span>Kanit ve celiski haritasi</span>
        </div>
        <div className="fingerprint-actions">
          <span className={`fingerprint-status ${sharedClusters.length > 0 ? 'ready' : 'missing'}`}>
            {sharedClusters.length} ortak kaynak
          </span>
          <span className="fingerprint-status">{entries.length} kanit kesiti</span>
        </div>
      </div>
      <div className="evidence-map-summary">
        <strong>Raporlar arasi okuma</strong>
        <p>
          Ayni kaynak farkli analiz katmanlarinda tekrar kanit olarak geciyorsa, o kaynak anlatinin merkezindeki dugumlerden biri olabilir.
          Buradaki celiski kartlari kesin hukum degil; skorlarin beraber okunmasi icin kontrol noktasi uretir.
        </p>
      </div>
      <div className="evidence-map-grid">
        <div className="evidence-map-block">
          <strong>Ortak kanit kaynaklari</strong>
          {topClusters.length > 0 ? (
            <div className="evidence-cluster-list">
              {topClusters.map((cluster) => (
                <EvidenceClusterCard cluster={cluster} key={cluster.sourceId} />
              ))}
            </div>
          ) : (
            <p className="empty-mini">Kanit kesiti yok.</p>
          )}
        </div>
        <div className="evidence-map-block">
          <strong>Skor gerilimleri</strong>
          <div className="evidence-tension-list">
            {tensions.map((tension) => (
              <CrossReportTensionCard key={tension.label} tension={tension} />
            ))}
          </div>
        </div>
      </div>
      <div className="evidence-matrix-block">
        <div className="evidence-matrix-heading">
          <strong>Ortak anomali / kanit matrisi</strong>
          <small>Kaynak satirlari, analiz modulleri sutunlari; sayilar o modüldeki kanit kesiti adedini gosterir.</small>
        </div>
        {matrixRows.length > 0 ? (
          <div className="evidence-matrix-scroll">
            <div className="evidence-matrix">
              <div className="evidence-matrix-row header">
                <span>Kaynak</span>
                {evidenceMatrixModules.map((module) => (
                  <span key={module.label}>{module.shortLabel}</span>
                ))}
                <span>Okuma</span>
              </div>
              {matrixRows.map((row) => (
                <EvidenceMatrixRowView key={row.sourceId} row={row} />
              ))}
            </div>
          </div>
        ) : (
          <p className="empty-mini">Matris icin kanit kesiti yok.</p>
        )}
      </div>
    </div>
  );
}

function EvidenceClusterCard({ cluster }: { cluster: EvidenceSourceCluster }): ReactElement {
  const previewEntries = cluster.entries.slice(0, 2);

  return (
    <div className="evidence-cluster-card">
      <div>
        <span>{cluster.title || cluster.sourceId}</span>
        <small>{cluster.moduleLabels.length} modul</small>
      </div>
      <div className="evidence-module-row">
        {cluster.moduleLabels.map((label) => (
          <i key={label}>{label}</i>
        ))}
      </div>
      {previewEntries.map((entry, index) => (
        <blockquote key={`${entry.moduleLabel}-${entry.evidence.quote}-${index}`}>
          <p>{entry.evidence.quote}</p>
          <cite>{entry.moduleLabel}</cite>
        </blockquote>
      ))}
    </div>
  );
}

function CrossReportTensionCard({ tension }: { tension: CrossReportTension }): ReactElement {
  return (
    <div className={`evidence-tension-card ${tension.tone}`}>
      <span>{tension.label}</span>
      <p>{tension.detail}</p>
      {typeof tension.leftScore === 'number' && typeof tension.rightScore === 'number' && (
        <div className="evidence-tension-scores">
          <small>
            {tension.leftLabel}: {Math.round(tension.leftScore * 100)}
          </small>
          <small>
            {tension.rightLabel}: {Math.round(tension.rightScore * 100)}
          </small>
        </div>
      )}
    </div>
  );
}

function EvidenceMatrixRowView({ row }: { row: EvidenceMatrixRow }): ReactElement {
  return (
    <div className="evidence-matrix-row">
      <div className="evidence-matrix-source">
        <strong>{row.title}</strong>
        <small>
          {row.coverageCount}/{evidenceMatrixModules.length} modul · {row.evidenceCount} kesit
        </small>
      </div>
      {row.cells.map((cell) => (
        <div className={`evidence-matrix-cell ${cell.count > 0 ? 'active' : 'missing'}`} key={cell.moduleLabel}>
          <strong>{cell.count > 0 ? cell.count : '-'}</strong>
          {cell.quotes[0] && <small title={cell.quotes[0]}>{cell.quotes[0]}</small>}
        </div>
      ))}
      <div className="evidence-matrix-reading">
        <strong>{row.readingLabel}</strong>
        {row.signalLabels.length > 0 && (
          <div>
            {row.signalLabels.slice(0, 3).map((signal) => (
              <i key={signal}>{signal}</i>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function collectEvidenceEntries({
  believabilityReport,
  characterGraphReport,
  continuityReport,
  mythologyReport,
  realityIndexReport,
  semanticDriftReport,
  semanticFingerprint
}: {
  believabilityReport: AnalysisBelievabilityRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  mythologyReport: AnalysisMythologyRecord | null;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
  semanticFingerprint: AnalysisFingerprintRecord | null;
}): EvidenceModuleEntry[] {
  return [
    ...mapEvidenceEntries('AI fingerprint', semanticFingerprint?.fingerprint.evidence ?? []),
    ...mapEvidenceEntries('Reality index', realityIndexReport?.report.evidence ?? []),
    ...mapEvidenceEntries('Continuity', continuityReport?.report.evidence ?? []),
    ...mapEvidenceEntries('Mythology', mythologyReport?.report.evidence ?? []),
    ...mapEvidenceEntries('Character graph', characterGraphReport?.report.evidence ?? []),
    ...mapEvidenceEntries('Semantic drift', semanticDriftReport?.report.evidence ?? []),
    ...mapEvidenceEntries('Believability', believabilityReport?.report.evidence ?? [])
  ];
}

function mapEvidenceEntries(moduleLabel: string, evidenceList: AnalysisSemanticEvidence[]): EvidenceModuleEntry[] {
  return evidenceList
    .filter((evidence) => evidence.sourceId && evidence.quote)
    .map((evidence) => ({
      moduleLabel,
      evidence
    }));
}

function buildEvidenceClusters(entries: EvidenceModuleEntry[]): EvidenceSourceCluster[] {
  const groups = new Map<string, EvidenceModuleEntry[]>();
  entries.forEach((entry) => {
    const current = groups.get(entry.evidence.sourceId) ?? [];
    current.push(entry);
    groups.set(entry.evidence.sourceId, current);
  });

  return Array.from(groups.entries())
    .map(([sourceId, sourceEntries]) => {
      const moduleLabels = Array.from(new Set(sourceEntries.map((entry) => entry.moduleLabel))).sort();
      const firstTitle = sourceEntries.find((entry) => entry.evidence.title)?.evidence.title ?? sourceId;

      return {
        sourceId,
        title: firstTitle,
        moduleLabels,
        entries: dedupeEvidenceEntries(sourceEntries)
      };
    })
    .sort((left, right) => {
      if (right.moduleLabels.length !== left.moduleLabels.length) {
        return right.moduleLabels.length - left.moduleLabels.length;
      }

      return right.entries.length - left.entries.length;
    });
}

function dedupeEvidenceEntries(entries: EvidenceModuleEntry[]): EvidenceModuleEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.moduleLabel}:${normalizeForTermMatch(entry.evidence.quote)}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildEvidenceMatrixRows(
  clusters: EvidenceSourceCluster[],
  signalMap: Map<string, string[]>
): EvidenceMatrixRow[] {
  return clusters.slice(0, 10).map((cluster) => {
    const cells = evidenceMatrixModules.map((module): EvidenceMatrixCell => {
      const moduleEntries = cluster.entries.filter((entry) => entry.moduleLabel === module.label);
      return {
        moduleLabel: module.label,
        shortLabel: module.shortLabel,
        count: moduleEntries.length,
        quotes: moduleEntries.map((entry) => trimMatrixQuote(entry.evidence.quote)).filter(Boolean).slice(0, 2)
      };
    });
    const evidenceCount = cells.reduce((total, cell) => total + cell.count, 0);
    const signalLabels = signalMap.get(cluster.sourceId) ?? [];

    return {
      sourceId: cluster.sourceId,
      title: cluster.title || cluster.sourceId,
      coverageCount: cluster.moduleLabels.length,
      evidenceCount,
      readingLabel: getEvidenceMatrixReading(cluster.moduleLabels.length, signalLabels.length),
      signalLabels,
      cells
    };
  });
}

function buildSignalSourceMap({
  believabilityReport,
  characterGraphReport,
  continuityReport,
  mythologyReport,
  realityIndexReport,
  semanticDriftReport
}: {
  believabilityReport: AnalysisBelievabilityRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  mythologyReport: AnalysisMythologyRecord | null;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
}): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const addSignal = (sourceIds: string[], label: string): void => {
    sourceIds.forEach((sourceId) => {
      const current = map.get(sourceId) ?? [];
      if (!current.includes(label)) {
        current.push(label);
      }
      map.set(sourceId, current);
    });
  };

  continuityReport?.report.anomalies.forEach((anomaly) => addSignal(anomaly.sourceIds, `Continuity: ${anomaly.label}`));
  believabilityReport?.report.frictionPoints.forEach((point) => addSignal(point.sourceIds, `Surtunme: ${point.label}`));
  realityIndexReport?.report.dominantMechanisms.forEach((mechanism) => addSignal(mechanism.sourceIds, `RMI: ${mechanism.label}`));
  semanticDriftReport?.report.expansionSignals.forEach((signal) => addSignal(signal.sourceIds, `Drift: ${signal.label}`));
  mythologyReport?.report.archetypes.forEach((archetype) => addSignal(archetype.sourceIds, `Mitoloji: ${archetype.label}`));
  characterGraphReport?.report.nodes.forEach((node) => addSignal(node.sourceIds, `Rol: ${node.role}`));

  return map;
}

function getEvidenceMatrixReading(coverageCount: number, signalCount: number): string {
  if (coverageCount >= 6 && signalCount >= 3) {
    return 'Cekirdek anomali';
  }

  if (coverageCount >= 6) {
    return 'Cekirdek kanit';
  }

  if (coverageCount >= 3) {
    return signalCount > 0 ? 'Ortak sinyal' : 'Ortak kanit';
  }

  return signalCount > 0 ? 'Tekil sinyal' : 'Tekil kanit';
}

function trimMatrixQuote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 72) {
    return trimmed;
  }

  return `${trimmed.slice(0, 69).trim()}...`;
}

function buildCrossReportTensions({
  believabilityReport,
  characterGraphReport,
  continuityReport,
  mythologyReport,
  realityIndexReport,
  semanticDriftReport
}: {
  believabilityReport: AnalysisBelievabilityRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  mythologyReport: AnalysisMythologyRecord | null;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
}): CrossReportTension[] {
  const tensions: CrossReportTension[] = [];
  const maxFriction = Math.max(0, ...(believabilityReport?.report.frictionPoints.map((point) => point.severity) ?? []));
  const rmiScore = realityIndexReport?.report.indexScore ?? 0;
  const believabilityScore = believabilityReport?.report.believabilityScore ?? 0;
  const topMythologyAffinity = getTopMythologyAffinity(mythologyReport);

  if (rmiScore >= 0.72 && maxFriction >= 0.65) {
    tensions.push({
      label: 'Etkili ama surtunmeli',
      detail: 'Gerceklik etkisi yuksek; ayni anda inanilirligi zayiflatan noktalar da belirgin. Bu, ikna gucu ile kontrol edilmesi gereken iddia sicramalarinin birlikte calistigini gosterir.',
      tone: 'warning',
      leftLabel: 'RMI',
      leftScore: rmiScore,
      rightLabel: 'Surtunme',
      rightScore: maxFriction
    });
  }

  if ((continuityReport?.report.continuityScore ?? 0) >= 0.64 && (continuityReport?.report.retconRisk ?? 0) >= 0.6) {
    tensions.push({
      label: 'Sureklilik + retcon riski',
      detail: 'Anlati omurgasi tutarli gorunurken sonradan eklenmis hissi veren baglanti riskleri de orta-yuksek. Burada tek tek kanit kesitleriyle kavram tarihcesi okunmali.',
      tone: 'warning',
      leftLabel: 'Sureklilik',
      leftScore: continuityReport?.report.continuityScore ?? 0,
      rightLabel: 'Retcon',
      rightScore: continuityReport?.report.retconRisk ?? 0
    });
  }

  if ((semanticDriftReport?.report.controlledExpansionScore ?? 0) >= 0.7 && (semanticDriftReport?.report.organicMessinessScore ?? 0) >= 0.6) {
    tensions.push({
      label: 'Kontrollu ama daginik',
      detail: 'Kavramlar kontrollu genisliyor, fakat organik daginiklik de kaybolmuyor. Bu ikili, hem planli lore hissi hem de spontane anlatim dokusu uretir.',
      tone: 'info',
      leftLabel: 'Kontrollu',
      leftScore: semanticDriftReport?.report.controlledExpansionScore ?? 0,
      rightLabel: 'Organik',
      rightScore: semanticDriftReport?.report.organicMessinessScore ?? 0
    });
  }

  if ((characterGraphReport?.report.fictionalitySignal ?? 0) >= 0.75 && (continuityReport?.report.naturalnessScore ?? 0) >= 0.6) {
    tensions.push({
      label: 'Rol duzeni + dogal akış',
      detail: 'Karakter/rol fonksiyonlari belirgin, ama anlatinin dogal akisi tamamen kopmuyor. Bu, kurgusal iskelet sinyali ile spontane konusma hissinin ayni anda bulunabildigi bolge.',
      tone: 'info',
      leftLabel: 'Rol duzeni',
      leftScore: characterGraphReport?.report.fictionalitySignal ?? 0,
      rightLabel: 'Dogallik',
      rightScore: continuityReport?.report.naturalnessScore ?? 0
    });
  }

  if ((topMythologyAffinity?.score ?? 0) >= 0.8 && (realityIndexReport?.report.secrecyPressure ?? 0) >= 0.7) {
    tensions.push({
      label: 'Mitik cerceve + gizli bilgi',
      detail: 'Mitolojik benzerlik ile gizli/sakli bilgi baskisi birbirini besliyor. Bu nokta, sembolik okuma ile epistemik baskinin ayrilmasi gereken yer.',
      tone: 'warning',
      leftLabel: topMythologyAffinity?.label ?? 'Mitoloji',
      leftScore: topMythologyAffinity?.score ?? 0,
      rightLabel: 'Gizli bilgi',
      rightScore: realityIndexReport?.report.secrecyPressure ?? 0
    });
  }

  if (believabilityScore >= 0.72 && (believabilityReport?.report.detailAuthenticityScore ?? 0) >= 0.8) {
    tensions.push({
      label: 'Detay gercekligi',
      detail: 'Inanilirlik hissi ozellikle somut detay, tarih, nesne ve kurum referanslariyla yukseliyor. Bu kart kanit gucu degil, gerceklik hissi ureten retorik yogunlugu okur.',
      tone: 'ready',
      leftLabel: 'Believability',
      leftScore: believabilityScore,
      rightLabel: 'Detay',
      rightScore: believabilityReport?.report.detailAuthenticityScore ?? 0
    });
  }

  if (tensions.length === 0) {
    tensions.push({
      label: 'Gerilim yok',
      detail: 'Mevcut raporlar arasinda belirgin skor gerilimi olusmadi. Daha fazla kaynak veya eksik AI katmanlari eklendikce bu harita zenginlesir.',
      tone: 'info'
    });
  }

  return tensions.slice(0, 6);
}

function SemanticFingerprintPanel({
  aiProviderStatus,
  fingerprint,
  isAnalysisLoading,
  isCharacterGraphRunning,
  isContinuityRunning,
  isFingerprintRunning,
  isMythologyRunning,
  isRealityIndexRunning,
  isSemanticDriftRunning,
  isBelievabilityRunning,
  onRunFingerprint
}: {
  aiProviderStatus: AnalysisAiProviderStatus | null;
  fingerprint: AnalysisFingerprintRecord | null;
  isAnalysisLoading: boolean;
  isCharacterGraphRunning: boolean;
  isContinuityRunning: boolean;
  isFingerprintRunning: boolean;
  isMythologyRunning: boolean;
  isRealityIndexRunning: boolean;
  isSemanticDriftRunning: boolean;
  isBelievabilityRunning: boolean;
  onRunFingerprint: () => Promise<void>;
}): ReactElement {
  const canRun =
    Boolean(aiProviderStatus?.configured) &&
    !isAnalysisLoading &&
    !isFingerprintRunning &&
    !isCharacterGraphRunning &&
    !isContinuityRunning &&
    !isMythologyRunning &&
    !isRealityIndexRunning &&
    !isSemanticDriftRunning &&
    !isBelievabilityRunning;
  const data = fingerprint?.fingerprint ?? null;
  const providerLabel = aiProviderStatus?.configured
    ? `Codex CLI - ${aiProviderStatus.model ?? aiProviderStatus.version ?? 'varsayilan model'}`
    : 'Codex CLI yok';
  const realityIndex = data ? buildRealityIndex(data.emotionalSignature, data.realityMechanics, data.continuitySignals.length) : null;

  return (
    <div className="analysis-result-section wide semantic-fingerprint">
      <div className="fingerprint-header">
        <div className="analysis-subheading">
          <Sparkles size={15} />
          <span>AI fingerprint</span>
        </div>
        <div className="fingerprint-actions">
          <span className={`fingerprint-status ${aiProviderStatus?.configured ? 'ready' : 'missing'}`}>
            {providerLabel}
          </span>
          <button className="primary-button compact" disabled={!canRun} onClick={() => void onRunFingerprint()} type="button">
            <Sparkles size={15} />
            {isFingerprintRunning ? 'Calisiyor' : fingerprint ? 'Yenile' : 'Uret'}
          </button>
        </div>
      </div>
      {!aiProviderStatus?.configured && <p className="fingerprint-empty">{aiProviderStatus?.detail ?? 'AI saglayicisi hazir degil.'}</p>}
      {fingerprint && data ? (
        <div className="fingerprint-content">
          <div className="fingerprint-summary">
            <p>{data.summary}</p>
            <div className="fingerprint-meta">
              <span>{fingerprint.documentCount} kaynak</span>
              <span>{formatCompactNumber(fingerprint.wordCount)} kelime</span>
              <span>{formatDateTime(fingerprint.createdAt)}</span>
              {fingerprint.stale && <span className="stale">Kaynak degisti</span>}
            </div>
          </div>
          {realityIndex && <RealityIndexPanel index={realityIndex} />}
          <div className="fingerprint-chip-grid">
            <FingerprintChipGroup title="Semboller" values={data.dominantSymbols} />
            <FingerprintChipGroup title="Kavramlar" values={data.dominantConcepts} />
            <FingerprintChipGroup title="Ton" values={[data.narrativeTone]} />
          </div>
          <div className="fingerprint-signal-grid">
            <FingerprintSignalList title="Duygusal imza" values={data.emotionalSignature} />
            <FingerprintSignalList title="Gerceklik mekanikleri" values={data.realityMechanics} />
          </div>
          {data.continuitySignals.length > 0 && (
            <div className="fingerprint-continuity">
              <strong>Sureklilik sinyalleri</strong>
              <ul>
                {data.continuitySignals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
          )}
          {data.evidence.length > 0 && (
            <div className="fingerprint-evidence">
              <strong>Kanit kesitleri</strong>
              <div>
                {data.evidence.map((evidence, index) => (
                  <blockquote key={`${evidence.sourceId}-${index}`}>
                    <p>{evidence.quote}</p>
                    <cite>
                      {evidence.title}
                      {evidence.relevance ? ` - ${evidence.relevance}` : ''}
                    </cite>
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        aiProviderStatus?.configured && <p className="fingerprint-empty">Secili kaynaklar icin kayitli fingerprint yok.</p>
      )}
    </div>
  );
}

function RealityManipulationIndexPanel({
  aiProviderStatus,
  realityIndex,
  isAnalysisLoading,
  isCharacterGraphRunning,
  isContinuityRunning,
  isFingerprintRunning,
  isMythologyRunning,
  isRealityIndexRunning,
  isSemanticDriftRunning,
  isBelievabilityRunning,
  onRunRealityIndex
}: {
  aiProviderStatus: AnalysisAiProviderStatus | null;
  realityIndex: AnalysisRealityIndexRecord | null;
  isAnalysisLoading: boolean;
  isCharacterGraphRunning: boolean;
  isContinuityRunning: boolean;
  isFingerprintRunning: boolean;
  isMythologyRunning: boolean;
  isRealityIndexRunning: boolean;
  isSemanticDriftRunning: boolean;
  isBelievabilityRunning: boolean;
  onRunRealityIndex: () => Promise<void>;
}): ReactElement {
  const canRun =
    Boolean(aiProviderStatus?.configured) &&
    !isAnalysisLoading &&
    !isCharacterGraphRunning &&
    !isContinuityRunning &&
    !isFingerprintRunning &&
    !isMythologyRunning &&
    !isRealityIndexRunning &&
    !isSemanticDriftRunning &&
    !isBelievabilityRunning;
  const data = realityIndex?.report ?? null;
  const providerLabel = aiProviderStatus?.configured
    ? `Codex CLI - ${aiProviderStatus.model ?? aiProviderStatus.version ?? 'varsayilan model'}`
    : 'Codex CLI yok';
  const dimensions = data
    ? [
        { label: 'Belirsizlik', value: data.uncertaintyDensity },
        { label: 'Otorite baskisi', value: data.authorityPressure },
        { label: 'Gizli bilgi', value: data.secrecyPressure },
        { label: 'Epistemik izolasyon', value: data.epistemicIsolation },
        { label: 'Cliffhanger', value: data.cliffhangerPressure },
        { label: 'Korku + bilgi', value: data.fearKnowledgeBlend }
      ]
    : [];

  return (
    <div className="analysis-result-section wide rmi-panel">
      <div className="fingerprint-header">
        <div className="analysis-subheading">
          <Gauge size={15} />
          <span>Reality Manipulation Index</span>
        </div>
        <div className="fingerprint-actions">
          <span className={`fingerprint-status ${aiProviderStatus?.configured ? 'ready' : 'missing'}`}>
            {providerLabel}
          </span>
          <button className="primary-button compact" disabled={!canRun} onClick={() => void onRunRealityIndex()} type="button">
            <Gauge size={15} />
            {isRealityIndexRunning ? 'Calisiyor' : realityIndex ? 'Yenile' : 'Uret'}
          </button>
        </div>
      </div>
      {!aiProviderStatus?.configured && <p className="fingerprint-empty">{aiProviderStatus?.detail ?? 'AI saglayicisi hazir degil.'}</p>}
      {realityIndex && data ? (
        <div className="rmi-content">
          <div className="fingerprint-summary">
            <p>{data.summary}</p>
            <div className="fingerprint-meta">
              <span>{realityIndex.documentCount} kaynak</span>
              <span>{formatCompactNumber(realityIndex.wordCount)} kelime</span>
              <span>{formatDateTime(realityIndex.createdAt)}</span>
              {realityIndex.stale && <span className="stale">Kaynak degisti</span>}
            </div>
          </div>
          <div className="rmi-score-panel">
            <div className="rmi-score">
              <span>RMI</span>
              <strong>{Math.round(data.indexScore * 100)}</strong>
              <small>{data.riskLevel}</small>
            </div>
            <div className="rmi-dimensions">
              {dimensions.map((dimension) => (
                <RealityIndexScoreCard key={dimension.label} label={dimension.label} value={dimension.value} />
              ))}
            </div>
          </div>
          {data.dominantMechanisms.length > 0 && (
            <div className="rmi-block">
              <strong>Baskin mekanizmalar</strong>
              <div className="rmi-mechanism-list">
                {data.dominantMechanisms.map((mechanism) => (
                  <div className="rmi-mechanism" key={mechanism.label}>
                    <div>
                      <span>{mechanism.label}</span>
                      <small>{Math.round(mechanism.score * 100)}%</small>
                    </div>
                    <i style={{ '--bar-width': `${Math.max(3, mechanism.score * 100)}%` } as CSSProperties} />
                    <p>{mechanism.rationale}</p>
                    {mechanism.sourceIds.length > 0 && <em>{mechanism.sourceIds.join(', ')}</em>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.stabilizers.length > 0 && (
            <div className="rmi-block">
              <strong>Dengeleyici sinyaller</strong>
              <ul className="rmi-stabilizer-list">
                {data.stabilizers.map((stabilizer) => (
                  <li key={stabilizer}>{stabilizer}</li>
                ))}
              </ul>
            </div>
          )}
          {data.evidence.length > 0 && (
            <div className="fingerprint-evidence">
              <strong>Kanit kesitleri</strong>
              <div>
                {data.evidence.map((evidence, index) => (
                  <blockquote key={`${evidence.sourceId}-${index}`}>
                    <p>{evidence.quote}</p>
                    <cite>
                      {evidence.title}
                      {evidence.relevance ? ` - ${evidence.relevance}` : ''}
                    </cite>
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        aiProviderStatus?.configured && <p className="fingerprint-empty">Secili kaynaklar icin kayitli Reality Manipulation Index yok.</p>
      )}
    </div>
  );
}

function RealityIndexScoreCard({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div className="rmi-dimension-card">
      <span>{label}</span>
      <strong>{Math.round(value * 100)}%</strong>
      <i style={{ '--bar-width': `${Math.max(3, value * 100)}%` } as CSSProperties} />
    </div>
  );
}

function NarrativeContinuityPanel({
  aiProviderStatus,
  continuity,
  isAnalysisLoading,
  isCharacterGraphRunning,
  isContinuityRunning,
  isFingerprintRunning,
  isMythologyRunning,
  isRealityIndexRunning,
  isSemanticDriftRunning,
  isBelievabilityRunning,
  onRunContinuity
}: {
  aiProviderStatus: AnalysisAiProviderStatus | null;
  continuity: AnalysisContinuityRecord | null;
  isAnalysisLoading: boolean;
  isCharacterGraphRunning: boolean;
  isContinuityRunning: boolean;
  isFingerprintRunning: boolean;
  isMythologyRunning: boolean;
  isRealityIndexRunning: boolean;
  isSemanticDriftRunning: boolean;
  isBelievabilityRunning: boolean;
  onRunContinuity: () => Promise<void>;
}): ReactElement {
  const canRun =
    Boolean(aiProviderStatus?.configured) &&
    !isAnalysisLoading &&
    !isCharacterGraphRunning &&
    !isContinuityRunning &&
    !isFingerprintRunning &&
    !isMythologyRunning &&
    !isRealityIndexRunning &&
    !isSemanticDriftRunning &&
    !isBelievabilityRunning;
  const data = continuity?.report ?? null;
  const providerLabel = aiProviderStatus?.configured
    ? `Codex CLI - ${aiProviderStatus.model ?? aiProviderStatus.version ?? 'varsayilan model'}`
    : 'Codex CLI yok';

  return (
    <div className="analysis-result-section wide continuity-panel">
      <div className="fingerprint-header">
        <div className="analysis-subheading">
          <GitBranch size={15} />
          <span>Narrative continuity</span>
        </div>
        <div className="fingerprint-actions">
          <span className={`fingerprint-status ${aiProviderStatus?.configured ? 'ready' : 'missing'}`}>
            {providerLabel}
          </span>
          <button className="primary-button compact" disabled={!canRun} onClick={() => void onRunContinuity()} type="button">
            <GitBranch size={15} />
            {isContinuityRunning ? 'Calisiyor' : continuity ? 'Yenile' : 'Uret'}
          </button>
        </div>
      </div>
      {!aiProviderStatus?.configured && <p className="fingerprint-empty">{aiProviderStatus?.detail ?? 'AI saglayicisi hazir degil.'}</p>}
      {continuity && data ? (
        <div className="continuity-content">
          <div className="fingerprint-summary">
            <p>{data.summary}</p>
            <div className="fingerprint-meta">
              <span>{continuity.documentCount} kaynak</span>
              <span>{formatCompactNumber(continuity.wordCount)} kelime</span>
              <span>{formatDateTime(continuity.createdAt)}</span>
              {continuity.stale && <span className="stale">Kaynak degisti</span>}
            </div>
          </div>
          <div className="continuity-score-grid">
            <ContinuityScoreCard label="Sureklilik" value={data.continuityScore} />
            <ContinuityScoreCard label="Dogallik" value={data.naturalnessScore} />
            <ContinuityScoreCard label="Retcon riski" value={data.retconRisk} />
            <ContinuityScoreCard label="On isaret" value={data.foreshadowingScore} />
          </div>
          {data.conceptEvolution.length > 0 && (
            <div className="continuity-block">
              <strong>Kavram evrimi</strong>
              <div className="continuity-concept-list">
                {data.conceptEvolution.map((concept) => (
                  <div className="continuity-concept" key={concept.concept}>
                    <div>
                      <span>{concept.concept}</span>
                      <small>{concept.firstSeen ?? 'ilk gorunum belirsiz'}</small>
                    </div>
                    <i style={{ '--bar-width': `${Math.max(3, concept.stabilityScore * 100)}%` } as CSSProperties} />
                    <p>{concept.evolution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="continuity-two-column">
            <div className="continuity-block">
              <strong>Anomali sinyalleri</strong>
              {data.anomalies.length > 0 ? (
                <div className="continuity-anomaly-list">
                  {data.anomalies.map((issue) => (
                    <div className="continuity-anomaly" key={issue.label}>
                      <div>
                        <span>{issue.label}</span>
                        <small>{Math.round(issue.severity * 100)}%</small>
                      </div>
                      <p>{issue.rationale}</p>
                      {issue.sourceIds.length > 0 && <em>{issue.sourceIds.join(', ')}</em>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-mini">Belirgin anomali yok.</p>
              )}
            </div>
            <div className="continuity-block">
              <strong>Kronoloji notlari</strong>
              {data.chronologyNotes.length > 0 ? (
                <ul className="continuity-note-list">
                  {data.chronologyNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : (
                <p className="empty-mini">Not yok.</p>
              )}
            </div>
          </div>
          {data.evidence.length > 0 && (
            <div className="fingerprint-evidence">
              <strong>Kanit kesitleri</strong>
              <div>
                {data.evidence.map((evidence, index) => (
                  <blockquote key={`${evidence.sourceId}-${index}`}>
                    <p>{evidence.quote}</p>
                    <cite>
                      {evidence.title}
                      {evidence.relevance ? ` - ${evidence.relevance}` : ''}
                    </cite>
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        aiProviderStatus?.configured && <p className="fingerprint-empty">Secili kaynaklar icin kayitli continuity raporu yok.</p>
      )}
    </div>
  );
}

function ContinuityScoreCard({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div className="continuity-score-card">
      <span>{label}</span>
      <strong>{Math.round(value * 100)}</strong>
      <i style={{ '--bar-width': `${Math.max(3, value * 100)}%` } as CSSProperties} />
    </div>
  );
}

function MythologyMappingPanel({
  aiProviderStatus,
  mythology,
  isAnalysisLoading,
  isCharacterGraphRunning,
  isContinuityRunning,
  isFingerprintRunning,
  isMythologyRunning,
  isRealityIndexRunning,
  isSemanticDriftRunning,
  isBelievabilityRunning,
  onRunMythology
}: {
  aiProviderStatus: AnalysisAiProviderStatus | null;
  mythology: AnalysisMythologyRecord | null;
  isAnalysisLoading: boolean;
  isCharacterGraphRunning: boolean;
  isContinuityRunning: boolean;
  isFingerprintRunning: boolean;
  isMythologyRunning: boolean;
  isRealityIndexRunning: boolean;
  isSemanticDriftRunning: boolean;
  isBelievabilityRunning: boolean;
  onRunMythology: () => Promise<void>;
}): ReactElement {
  const canRun =
    Boolean(aiProviderStatus?.configured) &&
    !isAnalysisLoading &&
    !isCharacterGraphRunning &&
    !isContinuityRunning &&
    !isFingerprintRunning &&
    !isMythologyRunning &&
    !isRealityIndexRunning &&
    !isSemanticDriftRunning &&
    !isBelievabilityRunning;
  const data = mythology?.report ?? null;
  const providerLabel = aiProviderStatus?.configured
    ? `Codex CLI - ${aiProviderStatus.model ?? aiProviderStatus.version ?? 'varsayilan model'}`
    : 'Codex CLI yok';

  return (
    <div className="analysis-result-section wide mythology-panel">
      <div className="fingerprint-header">
        <div className="analysis-subheading">
          <Landmark size={15} />
          <span>Mythology mapping</span>
        </div>
        <div className="fingerprint-actions">
          <span className={`fingerprint-status ${aiProviderStatus?.configured ? 'ready' : 'missing'}`}>
            {providerLabel}
          </span>
          <button className="primary-button compact" disabled={!canRun} onClick={() => void onRunMythology()} type="button">
            <Landmark size={15} />
            {isMythologyRunning ? 'Calisiyor' : mythology ? 'Yenile' : 'Uret'}
          </button>
        </div>
      </div>
      {!aiProviderStatus?.configured && <p className="fingerprint-empty">{aiProviderStatus?.detail ?? 'AI saglayicisi hazir degil.'}</p>}
      {mythology && data ? (
        <div className="mythology-content">
          <div className="fingerprint-summary">
            <p>{data.summary}</p>
            <div className="fingerprint-meta">
              <span>{mythology.documentCount} kaynak</span>
              <span>{formatCompactNumber(mythology.wordCount)} kelime</span>
              <span>{formatDateTime(mythology.createdAt)}</span>
              {mythology.stale && <span className="stale">Kaynak degisti</span>}
            </div>
          </div>
          <div className="mythology-frame">
            <span>Baskin mitik cerceve</span>
            <strong>{data.dominantMythicFrame}</strong>
          </div>
          {data.traditionAffinities.length > 0 && (
            <div className="mythology-block">
              <strong>Gelenek benzerlikleri</strong>
              <div className="mythology-affinity-grid">
                {data.traditionAffinities.map((affinity) => (
                  <div className="mythology-affinity" key={affinity.tradition}>
                    <div>
                      <span>{affinity.tradition}</span>
                      <small>{Math.round(affinity.affinityScore * 100)}%</small>
                    </div>
                    <i style={{ '--bar-width': `${Math.max(3, affinity.affinityScore * 100)}%` } as CSSProperties} />
                    <p>{affinity.rationale}</p>
                    {affinity.caveat && <em>{affinity.caveat}</em>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mythology-two-column">
            <div className="mythology-block">
              <strong>Arketip rolleri</strong>
              {data.archetypes.length > 0 ? (
                <div className="mythology-card-list">
                  {data.archetypes.map((archetype) => (
                    <div className="mythology-card" key={archetype.label}>
                      <div>
                        <span>{archetype.label}</span>
                        <small>{Math.round(archetype.score * 100)}%</small>
                      </div>
                      <b>{archetype.role}</b>
                      <p>{archetype.rationale}</p>
                      {archetype.sourceIds.length > 0 && <em>{archetype.sourceIds.join(', ')}</em>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-mini">Arketip sinyali yok.</p>
              )}
            </div>
            <div className="mythology-block">
              <strong>Sembol kumeleri</strong>
              {data.symbolClusters.length > 0 ? (
                <div className="mythology-card-list">
                  {data.symbolClusters.map((cluster) => (
                    <div className="mythology-card" key={cluster.label}>
                      <span>{cluster.label}</span>
                      <div className="mythology-symbols">
                        {cluster.symbols.map((symbol) => (
                          <i key={symbol}>{symbol}</i>
                        ))}
                      </div>
                      <p>{cluster.interpretation}</p>
                      {cluster.sourceIds.length > 0 && <em>{cluster.sourceIds.join(', ')}</em>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-mini">Sembol kumesi yok.</p>
              )}
            </div>
          </div>
          {data.cautions.length > 0 && (
            <div className="mythology-block">
              <strong>Yorum uyarilari</strong>
              <ul className="mythology-caution-list">
                {data.cautions.map((caution) => (
                  <li key={caution}>{caution}</li>
                ))}
              </ul>
            </div>
          )}
          {data.evidence.length > 0 && (
            <div className="fingerprint-evidence">
              <strong>Kanit kesitleri</strong>
              <div>
                {data.evidence.map((evidence, index) => (
                  <blockquote key={`${evidence.sourceId}-${index}`}>
                    <p>{evidence.quote}</p>
                    <cite>
                      {evidence.title}
                      {evidence.relevance ? ` - ${evidence.relevance}` : ''}
                    </cite>
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        aiProviderStatus?.configured && <p className="fingerprint-empty">Secili kaynaklar icin kayitli mythology mapping yok.</p>
      )}
    </div>
  );
}

function CharacterGraphPanel({
  aiProviderStatus,
  characterGraph,
  isAnalysisLoading,
  isCharacterGraphRunning,
  isContinuityRunning,
  isFingerprintRunning,
  isMythologyRunning,
  isRealityIndexRunning,
  isSemanticDriftRunning,
  isBelievabilityRunning,
  onRunCharacterGraph
}: {
  aiProviderStatus: AnalysisAiProviderStatus | null;
  characterGraph: AnalysisCharacterGraphRecord | null;
  isAnalysisLoading: boolean;
  isCharacterGraphRunning: boolean;
  isContinuityRunning: boolean;
  isFingerprintRunning: boolean;
  isMythologyRunning: boolean;
  isRealityIndexRunning: boolean;
  isSemanticDriftRunning: boolean;
  isBelievabilityRunning: boolean;
  onRunCharacterGraph: () => Promise<void>;
}): ReactElement {
  const canRun =
    Boolean(aiProviderStatus?.configured) &&
    !isAnalysisLoading &&
    !isCharacterGraphRunning &&
    !isContinuityRunning &&
    !isFingerprintRunning &&
    !isMythologyRunning &&
    !isRealityIndexRunning &&
    !isSemanticDriftRunning &&
    !isBelievabilityRunning;
  const data = characterGraph?.report ?? null;
  const providerLabel = aiProviderStatus?.configured
    ? `Codex CLI - ${aiProviderStatus.model ?? aiProviderStatus.version ?? 'varsayilan model'}`
    : 'Codex CLI yok';
  const nodeLabelById = new Map(data?.nodes.map((node) => [node.id, node.label]) ?? []);

  return (
    <div className="analysis-result-section wide character-graph-panel">
      <div className="fingerprint-header">
        <div className="analysis-subheading">
          <Users size={15} />
          <span>Character graph</span>
        </div>
        <div className="fingerprint-actions">
          <span className={`fingerprint-status ${aiProviderStatus?.configured ? 'ready' : 'missing'}`}>
            {providerLabel}
          </span>
          <button className="primary-button compact" disabled={!canRun} onClick={() => void onRunCharacterGraph()} type="button">
            <Users size={15} />
            {isCharacterGraphRunning ? 'Calisiyor' : characterGraph ? 'Yenile' : 'Uret'}
          </button>
        </div>
      </div>
      {!aiProviderStatus?.configured && <p className="fingerprint-empty">{aiProviderStatus?.detail ?? 'AI saglayicisi hazir degil.'}</p>}
      {characterGraph && data ? (
        <div className="character-graph-content">
          <div className="fingerprint-summary">
            <p>{data.summary}</p>
            <div className="fingerprint-meta">
              <span>{characterGraph.documentCount} kaynak</span>
              <span>{formatCompactNumber(characterGraph.wordCount)} kelime</span>
              <span>{formatDateTime(characterGraph.createdAt)}</span>
              {characterGraph.stale && <span className="stale">Kaynak degisti</span>}
            </div>
          </div>
          <div className="character-score-grid">
            <CharacterGraphScoreCard label="Graph dengesi" value={data.graphBalanceScore} />
            <CharacterGraphScoreCard label="Rol stabilitesi" value={data.roleStabilityScore} />
            <CharacterGraphScoreCard label="Kurgu sinyali" value={data.fictionalitySignal} />
          </div>
          <div className="character-carrier">
            <span>Reality carrier</span>
            <strong>{data.dominantCarrier}</strong>
          </div>
          <div className="character-two-column">
            <div className="character-block">
              <strong>Node rolleri</strong>
              {data.nodes.length > 0 ? (
                <div className="character-node-grid">
                  {data.nodes.map((node) => (
                    <div className="character-node" key={node.id}>
                      <div>
                        <span>{node.label}</span>
                        <small>{Math.round(node.salience * 100)}%</small>
                      </div>
                      <b>{node.role}</b>
                      <em>{node.stance}</em>
                      <p>{node.rationale}</p>
                      {node.sourceIds.length > 0 && <small>{node.sourceIds.join(', ')}</small>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-mini">Node yok.</p>
              )}
            </div>
            <div className="character-block">
              <strong>Iliski kenarlari</strong>
              {data.edges.length > 0 ? (
                <div className="character-edge-list">
                  {data.edges.map((edge, index) => (
                    <div className="character-edge" key={`${edge.source}-${edge.target}-${index}`}>
                      <div>
                        <span>
                          {nodeLabelById.get(edge.source) ?? edge.source} {'->'} {nodeLabelById.get(edge.target) ?? edge.target}
                        </span>
                        <small>{Math.round(edge.weight * 100)}%</small>
                      </div>
                      <b>{edge.relation}</b>
                      <p>{edge.rationale}</p>
                      {edge.sourceIds.length > 0 && <em>{edge.sourceIds.join(', ')}</em>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-mini">Iliski yok.</p>
              )}
            </div>
          </div>
          {data.roleSignals.length > 0 && (
            <div className="character-block">
              <strong>Rol sinyalleri</strong>
              <ul className="character-signal-list">
                {data.roleSignals.map((signal, index) => (
                  <li key={`${signal}-${index}`}>{signal}</li>
                ))}
              </ul>
            </div>
          )}
          {data.evidence.length > 0 && (
            <div className="fingerprint-evidence">
              <strong>Kanit kesitleri</strong>
              <div>
                {data.evidence.map((evidence, index) => (
                  <blockquote key={`${evidence.sourceId}-${index}`}>
                    <p>{evidence.quote}</p>
                    <cite>
                      {evidence.title}
                      {evidence.relevance ? ` - ${evidence.relevance}` : ''}
                    </cite>
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        aiProviderStatus?.configured && <p className="fingerprint-empty">Secili kaynaklar icin kayitli character graph yok.</p>
      )}
    </div>
  );
}

function CharacterGraphScoreCard({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div className="character-score-card">
      <span>{label}</span>
      <strong>{Math.round(value * 100)}</strong>
      <i style={{ '--bar-width': `${Math.max(3, value * 100)}%` } as CSSProperties} />
    </div>
  );
}

function SemanticDriftPanel({
  aiProviderStatus,
  semanticDrift,
  isAnalysisLoading,
  isCharacterGraphRunning,
  isContinuityRunning,
  isFingerprintRunning,
  isMythologyRunning,
  isRealityIndexRunning,
  isSemanticDriftRunning,
  isBelievabilityRunning,
  onRunSemanticDrift
}: {
  aiProviderStatus: AnalysisAiProviderStatus | null;
  semanticDrift: AnalysisSemanticDriftRecord | null;
  isAnalysisLoading: boolean;
  isCharacterGraphRunning: boolean;
  isContinuityRunning: boolean;
  isFingerprintRunning: boolean;
  isMythologyRunning: boolean;
  isRealityIndexRunning: boolean;
  isSemanticDriftRunning: boolean;
  isBelievabilityRunning: boolean;
  onRunSemanticDrift: () => Promise<void>;
}): ReactElement {
  const canRun =
    Boolean(aiProviderStatus?.configured) &&
    !isAnalysisLoading &&
    !isCharacterGraphRunning &&
    !isContinuityRunning &&
    !isFingerprintRunning &&
    !isMythologyRunning &&
    !isRealityIndexRunning &&
    !isSemanticDriftRunning &&
    !isBelievabilityRunning;
  const data = semanticDrift?.report ?? null;
  const providerLabel = aiProviderStatus?.configured
    ? `Codex CLI - ${aiProviderStatus.model ?? aiProviderStatus.version ?? 'varsayilan model'}`
    : 'Codex CLI yok';

  return (
    <div className="analysis-result-section wide semantic-drift-panel">
      <div className="fingerprint-header">
        <div className="analysis-subheading">
          <Waves size={15} />
          <span>Semantic drift</span>
        </div>
        <div className="fingerprint-actions">
          <span className={`fingerprint-status ${aiProviderStatus?.configured ? 'ready' : 'missing'}`}>
            {providerLabel}
          </span>
          <button className="primary-button compact" disabled={!canRun} onClick={() => void onRunSemanticDrift()} type="button">
            <Waves size={15} />
            {isSemanticDriftRunning ? 'Calisiyor' : semanticDrift ? 'Yenile' : 'Uret'}
          </button>
        </div>
      </div>
      {!aiProviderStatus?.configured && <p className="fingerprint-empty">{aiProviderStatus?.detail ?? 'AI saglayicisi hazir degil.'}</p>}
      {semanticDrift && data ? (
        <div className="semantic-drift-content">
          <div className="fingerprint-summary">
            <p>{data.summary}</p>
            <div className="fingerprint-meta">
              <span>{semanticDrift.documentCount} kaynak</span>
              <span>{formatCompactNumber(semanticDrift.wordCount)} kelime</span>
              <span>{formatDateTime(semanticDrift.createdAt)}</span>
              {semanticDrift.stale && <span className="stale">Kaynak degisti</span>}
            </div>
          </div>
          <div className="drift-score-grid">
            <SemanticDriftScoreCard label="Drift index" value={data.driftIndex} />
            <SemanticDriftScoreCard label="Kontrollu genisleme" value={data.controlledExpansionScore} />
            <SemanticDriftScoreCard label="Organik daginiklik" value={data.organicMessinessScore} />
            <SemanticDriftScoreCard label="Cipa stabilitesi" value={data.anchorStabilityScore} />
          </div>
          {data.concepts.length > 0 && (
            <div className="drift-block">
              <strong>Kavram kaymalari</strong>
              <div className="drift-concept-list">
                {data.concepts.map((concept) => (
                  <div className="drift-concept" key={concept.concept}>
                    <div>
                      <span>{concept.concept}</span>
                      <small>{Math.round(concept.driftScore * 100)}%</small>
                    </div>
                    <b>{concept.driftType}</b>
                    <p>
                      <strong>Ilk:</strong> {concept.earlyMeaning || 'belirsiz'}
                    </p>
                    <p>
                      <strong>Sonra:</strong> {concept.laterMeaning || 'belirsiz'}
                    </p>
                    <em>
                      {[concept.firstSeen, concept.latestSeen].filter(Boolean).join(' -> ') || 'zaman baglami belirsiz'}
                    </em>
                    <p>{concept.rationale}</p>
                    {concept.sourceIds.length > 0 && <small>{concept.sourceIds.join(', ')}</small>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="drift-two-column">
            <div className="drift-block">
              <strong>Kronolojik fazlar</strong>
              {data.phases.length > 0 ? (
                <div className="drift-phase-list">
                  {data.phases.map((phase) => (
                    <div className="drift-phase" key={`${phase.label}-${phase.period}`}>
                      <div>
                        <span>{phase.label}</span>
                        <small>{phase.period}</small>
                      </div>
                      <p>{phase.summary}</p>
                      {phase.dominantConcepts.length > 0 && (
                        <div className="drift-chip-row">
                          {phase.dominantConcepts.map((concept) => (
                            <i key={concept}>{concept}</i>
                          ))}
                        </div>
                      )}
                      {phase.sourceIds.length > 0 && <em>{phase.sourceIds.join(', ')}</em>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-mini">Faz yok.</p>
              )}
            </div>
            <div className="drift-block">
              <strong>Expansion sinyalleri</strong>
              {data.expansionSignals.length > 0 ? (
                <div className="drift-signal-list">
                  {data.expansionSignals.map((signal) => (
                    <div className="drift-signal" key={signal.label}>
                      <div>
                        <span>{signal.label}</span>
                        <small>{Math.round(signal.score * 100)}%</small>
                      </div>
                      <i style={{ '--bar-width': `${Math.max(3, signal.score * 100)}%` } as CSSProperties} />
                      <p>{signal.rationale}</p>
                      {signal.sourceIds.length > 0 && <em>{signal.sourceIds.join(', ')}</em>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-mini">Expansion sinyali yok.</p>
              )}
            </div>
          </div>
          {data.stableAnchors.length > 0 && (
            <div className="drift-block">
              <strong>Sabit cipalar</strong>
              <div className="drift-chip-row">
                {data.stableAnchors.map((anchor) => (
                  <i key={anchor}>{anchor}</i>
                ))}
              </div>
            </div>
          )}
          {data.evidence.length > 0 && (
            <div className="fingerprint-evidence">
              <strong>Kanit kesitleri</strong>
              <div>
                {data.evidence.map((evidence, index) => (
                  <blockquote key={`${evidence.sourceId}-${index}`}>
                    <p>{evidence.quote}</p>
                    <cite>
                      {evidence.title}
                      {evidence.relevance ? ` - ${evidence.relevance}` : ''}
                    </cite>
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        aiProviderStatus?.configured && <p className="fingerprint-empty">Secili kaynaklar icin kayitli semantic drift yok.</p>
      )}
    </div>
  );
}

function SemanticDriftScoreCard({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div className="drift-score-card">
      <span>{label}</span>
      <strong>{Math.round(value * 100)}</strong>
      <i style={{ '--bar-width': `${Math.max(3, value * 100)}%` } as CSSProperties} />
    </div>
  );
}

function BelievabilityPanel({
  aiProviderStatus,
  believability,
  isAnalysisLoading,
  isBelievabilityRunning,
  isCharacterGraphRunning,
  isContinuityRunning,
  isFingerprintRunning,
  isMythologyRunning,
  isRealityIndexRunning,
  isSemanticDriftRunning,
  onRunBelievability
}: {
  aiProviderStatus: AnalysisAiProviderStatus | null;
  believability: AnalysisBelievabilityRecord | null;
  isAnalysisLoading: boolean;
  isBelievabilityRunning: boolean;
  isCharacterGraphRunning: boolean;
  isContinuityRunning: boolean;
  isFingerprintRunning: boolean;
  isMythologyRunning: boolean;
  isRealityIndexRunning: boolean;
  isSemanticDriftRunning: boolean;
  onRunBelievability: () => Promise<void>;
}): ReactElement {
  const canRun =
    Boolean(aiProviderStatus?.configured) &&
    !isAnalysisLoading &&
    !isBelievabilityRunning &&
    !isCharacterGraphRunning &&
    !isContinuityRunning &&
    !isFingerprintRunning &&
    !isMythologyRunning &&
    !isRealityIndexRunning &&
    !isSemanticDriftRunning;
  const data = believability?.report ?? null;
  const providerLabel = aiProviderStatus?.configured
    ? `Codex CLI - ${aiProviderStatus.model ?? aiProviderStatus.version ?? 'varsayilan model'}`
    : 'Codex CLI yok';
  const dimensions = data
    ? [
        { label: 'Guven mimarisi', value: data.trustArchitectureScore },
        { label: 'Detay gercekligi', value: data.detailAuthenticityScore },
        { label: 'Kusur hissi', value: data.imperfectionSimulationScore },
        { label: 'Zihinsel tutunma', value: data.cognitiveGripScore }
      ]
    : [];

  return (
    <div className="analysis-result-section wide believability-panel">
      <div className="fingerprint-header">
        <div className="analysis-subheading">
          <Brain size={15} />
          <span>Human believability</span>
        </div>
        <div className="fingerprint-actions">
          <span className={`fingerprint-status ${aiProviderStatus?.configured ? 'ready' : 'missing'}`}>
            {providerLabel}
          </span>
          <button className="primary-button compact" disabled={!canRun} onClick={() => void onRunBelievability()} type="button">
            <Brain size={15} />
            {isBelievabilityRunning ? 'Calisiyor' : believability ? 'Yenile' : 'Uret'}
          </button>
        </div>
      </div>
      {!aiProviderStatus?.configured && <p className="fingerprint-empty">{aiProviderStatus?.detail ?? 'AI saglayicisi hazir degil.'}</p>}
      {believability && data ? (
        <div className="believability-content">
          <div className="fingerprint-summary">
            <p>{data.summary}</p>
            <div className="fingerprint-meta">
              <span>{believability.documentCount} kaynak</span>
              <span>{formatCompactNumber(believability.wordCount)} kelime</span>
              <span>{formatDateTime(believability.createdAt)}</span>
              {believability.stale && <span className="stale">Kaynak degisti</span>}
            </div>
          </div>
          <div className="believability-score-panel">
            <div className="believability-score">
              <span>Inanilirlik hissi</span>
              <strong>{Math.round(data.believabilityScore * 100)}</strong>
              <small>{data.confidence ? `${Math.round(data.confidence * 100)}% guven` : 'guven belirsiz'}</small>
            </div>
            <div className="believability-dimensions">
              {dimensions.map((dimension) => (
                <BelievabilityScoreCard key={dimension.label} label={dimension.label} value={dimension.value} />
              ))}
            </div>
          </div>
          {data.mechanisms.length > 0 && (
            <div className="believability-block">
              <strong>Guven mekanizmalari</strong>
              <div className="believability-signal-list">
                {data.mechanisms.map((mechanism) => (
                  <div className="believability-signal" key={mechanism.label}>
                    <div>
                      <span>{mechanism.label}</span>
                      <small>{Math.round(mechanism.score * 100)}%</small>
                    </div>
                    <i style={{ '--bar-width': `${Math.max(3, mechanism.score * 100)}%` } as CSSProperties} />
                    <p>{mechanism.rationale}</p>
                    {mechanism.sourceIds.length > 0 && <em>{mechanism.sourceIds.join(', ')}</em>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="believability-two-column">
            <div className="believability-block">
              <strong>Inandiricilik kancalari</strong>
              {data.hooks.length > 0 ? (
                <div className="believability-card-list">
                  {data.hooks.map((hook) => (
                    <div className="believability-card" key={hook.label}>
                      <div>
                        <span>{hook.label}</span>
                        <small>{Math.round(hook.impactScore * 100)}%</small>
                      </div>
                      <b>{hook.type}</b>
                      <p>{hook.rationale}</p>
                      {hook.sourceIds.length > 0 && <em>{hook.sourceIds.join(', ')}</em>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-mini">Kanca yok.</p>
              )}
            </div>
            <div className="believability-block">
              <strong>Zayiflatan noktalar</strong>
              {data.frictionPoints.length > 0 ? (
                <div className="believability-card-list">
                  {data.frictionPoints.map((friction) => (
                    <div className="believability-card" key={friction.label}>
                      <div>
                        <span>{friction.label}</span>
                        <small>{Math.round(friction.severity * 100)}%</small>
                      </div>
                      <p>{friction.rationale}</p>
                      {friction.sourceIds.length > 0 && <em>{friction.sourceIds.join(', ')}</em>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-mini">Belirgin zayiflatan nokta yok.</p>
              )}
            </div>
          </div>
          {data.audienceEffects.length > 0 && (
            <div className="believability-block">
              <strong>Olası izleyici etkileri</strong>
              <ul className="believability-effect-list">
                {data.audienceEffects.map((effect, index) => (
                  <li key={`${effect}-${index}`}>{effect}</li>
                ))}
              </ul>
            </div>
          )}
          {data.evidence.length > 0 && (
            <div className="fingerprint-evidence">
              <strong>Kanit kesitleri</strong>
              <div>
                {data.evidence.map((evidence, index) => (
                  <blockquote key={`${evidence.sourceId}-${index}`}>
                    <p>{evidence.quote}</p>
                    <cite>
                      {evidence.title}
                      {evidence.relevance ? ` - ${evidence.relevance}` : ''}
                    </cite>
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        aiProviderStatus?.configured && <p className="fingerprint-empty">Secili kaynaklar icin kayitli believability raporu yok.</p>
      )}
    </div>
  );
}

function BelievabilityScoreCard({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div className="believability-dimension-card">
      <span>{label}</span>
      <strong>{Math.round(value * 100)}%</strong>
      <i style={{ '--bar-width': `${Math.max(3, value * 100)}%` } as CSSProperties} />
    </div>
  );
}

function CrossAiExaminationDraftPanel(): ReactElement {
  const [selectedModels, setSelectedModels] = useState<string[]>(crossAiDefaultSlots);
  const selectedModelSet = new Set(selectedModels);

  function handleModelChange(index: number, value: string): void {
    setSelectedModels((current) => current.map((model, currentIndex) => (currentIndex === index ? value : model)));
  }

  return (
    <div className="analysis-result-section wide cross-exam-panel">
      <div className="fingerprint-header">
        <div className="analysis-subheading">
          <Sparkles size={15} />
          <span>Cross AI examination</span>
        </div>
        <div className="fingerprint-actions">
          <span className="fingerprint-status missing">Taslak</span>
          <button className="secondary-button compact" disabled type="button">
            Hazir degil
          </button>
        </div>
      </div>
      <div className="cross-model-grid">
        {crossAiSlotLabels.map((label, index) => (
          <label className="cross-model-slot" key={label}>
            <span>{label}</span>
            <select value={selectedModels[index]} onChange={(event) => handleModelChange(index, event.target.value)}>
              {crossAiModelOptions.map((option) => (
                <option
                  disabled={selectedModelSet.has(option.value) && selectedModels[index] !== option.value}
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="cross-draft-note">
        <strong>Plan notu</strong>
        <p>
          Secili kaynaklar uc ayri model/lens ile bagimsiz incelenecek; ortak bulgular, celiskiler,
          model ayrismalari ve yuksek guvenli anomaliler tek konsensus raporunda toplanacak.
        </p>
      </div>
    </div>
  );
}

interface RealityIndexDimension {
  label: string;
  score: number;
  rationale: string;
}

interface RealityIndex {
  score: number;
  level: string;
  dimensions: RealityIndexDimension[];
}

function RealityIndexPanel({ index }: { index: RealityIndex }): ReactElement {
  return (
    <div className="reality-index-panel">
      <div className="reality-index-score">
        <span>Gerceklik etkisi</span>
        <strong>{Math.round(index.score * 100)}</strong>
        <small>{index.level}</small>
      </div>
      <div className="reality-index-dimensions">
        {index.dimensions.map((dimension) => (
          <div className="reality-index-row" key={dimension.label}>
            <div>
              <span>{dimension.label}</span>
              <strong>{Math.round(dimension.score * 100)}%</strong>
            </div>
            <i style={{ '--bar-width': `${Math.max(3, dimension.score * 100)}%` } as CSSProperties} />
            <p>{dimension.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FingerprintChipGroup({ title, values }: { title: string; values: string[] }): ReactElement | null {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="fingerprint-chip-group">
      <strong>{title}</strong>
      <div>
        {values.map((value) => (
          <span key={value}>{value}</span>
        ))}
      </div>
    </div>
  );
}

function FingerprintSignalList({
  title,
  values
}: {
  title: string;
  values: Array<AnalysisEmotionalSignal | AnalysisRealityMechanic>;
}): ReactElement | null {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="fingerprint-signals">
      <strong>{title}</strong>
      {values.map((value) => (
        <div className="fingerprint-signal" key={value.label}>
          <div>
            <span>{value.label}</span>
            <small>{Math.round(value.score * 100)}%</small>
          </div>
          <i style={{ '--bar-width': `${Math.max(3, value.score * 100)}%` } as CSSProperties} />
          {value.rationale && <p>{value.rationale}</p>}
        </div>
      ))}
    </div>
  );
}

function buildRealityIndex(
  emotionalSignature: AnalysisEmotionalSignal[],
  realityMechanics: AnalysisRealityMechanic[],
  continuitySignalCount: number
): RealityIndex {
  const dimensions: RealityIndexDimension[] = [
    {
      label: 'Belirsizlik basinci',
      score: scoreByTerms(realityMechanics, ['soru', 'belirsiz', 'gizem', 'bosluk', 'suphe']),
      rationale: 'Cevaptan cok soru ve acik uc kullanimi.'
    },
    {
      label: 'Otorite ankraji',
      score: scoreByTerms(realityMechanics, ['kurum', 'otorite', 'nasa', 'vatikan', 'resmi', 'bilim', 'belgesel']),
      rationale: 'Kurum, tarih ve teknik ayrintiyla kanit hissi kurma.'
    },
    {
      label: 'Gizli bilgi cekimi',
      score: scoreByTerms(realityMechanics, ['gizli', 'yasak', 'sakla', 'sizinti', 'arsiv', 'silin', 'gomul']),
      rationale: 'Saklanan veya sonradan acilan bilgi vaadi.'
    },
    {
      label: 'Duygusal yuk',
      score: scoreByTerms(emotionalSignature, ['tehdit', 'korku', 'alarm', 'sarsil', 'kusku', 'suphe', 'paranoya', 'huzursuz', 'acil', 'secil']),
      rationale: 'Korku, suphe, huzursuzluk, zaman baskisi ve secilmislik karisimi.'
    },
    {
      label: 'Sureklilik kancasi',
      score: Math.max(scoreByTerms(realityMechanics, ['devam', 'esik', 'sonraki', 'cliff', 'davet']), normalizeScoreValue(continuitySignalCount / 8)),
      rationale: 'Anlatinin sonraki parcaya baglanma gucu.'
    }
  ];
  const weights = [0.22, 0.18, 0.22, 0.24, 0.14];
  const score = dimensions.reduce((total, dimension, index) => total + dimension.score * (weights[index] ?? 0), 0);

  return {
    score: normalizeScoreValue(score),
    level: getRealityIndexLevel(score),
    dimensions
  };
}

function scoreByTerms(
  values: Array<AnalysisEmotionalSignal | AnalysisRealityMechanic>,
  terms: string[]
): number {
  const normalizedTerms = terms.map(normalizeForTermMatch);
  const matches = values
    .map((value) => {
      const haystack = normalizeForTermMatch(`${value.label} ${value.rationale}`);
      return normalizedTerms.some((term) => haystack.includes(term)) ? value.score : 0;
    })
    .filter((score) => score > 0);

  if (matches.length === 0) {
    return 0;
  }

  return normalizeScoreValue(matches.reduce((total, score) => total + score, 0) / matches.length);
}

function normalizeForTermMatch(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function normalizeScoreValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function getRealityIndexLevel(score: number): string {
  if (score >= 0.8) {
    return 'Cok yuksek';
  }

  if (score >= 0.62) {
    return 'Yuksek';
  }

  if (score >= 0.42) {
    return 'Orta';
  }

  return 'Dusuk';
}
