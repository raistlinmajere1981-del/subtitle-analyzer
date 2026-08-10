export type VideoType = 'Uzun video' | 'Shorts' | 'Canli yayin' | 'Premiere';
export type SubtitleStatus = 'Hazir' | 'Eksik' | 'Indirilecek' | 'Temizlendi';
export type ChannelStatus = 'Guncel' | 'Taranmali' | 'Hata';
export type WeekdayLabel = 'Pazartesi' | 'Sali' | 'Carsamba' | 'Persembe' | 'Cuma' | 'Cumartesi' | 'Pazar';

export interface ChannelSummary {
  id: string;
  sourceUrl: string;
  name: string;
  handle: string;
  videos: number;
  archivedSubtitles: number;
  lastScan: string | null;
  status: ChannelStatus;
  accent: string;
  lastError: string | null;
}

export interface VideoRecord {
  id: string;
  channelId: string;
  title: string;
  publishedAt: string | null;
  weekday: WeekdayLabel | null;
  durationMinutes: number | null;
  type: VideoType;
  subtitleStatus: SubtitleStatus;
  language: string;
  thumbnailUrl: string | null;
  density: number;
  webpageUrl: string | null;
}

export interface ArchiveSnapshot {
  archivePath: string;
  channels: ChannelSummary[];
  videos: VideoRecord[];
}

export interface ScanChannelFilters {
  excludeMembersOnly?: boolean;
  excludeShorts?: boolean;
  minDurationMinutes?: number | null;
}

export interface ScanChannelInput {
  url: string;
  channelId?: string;
  mode?: 'full' | 'new';
  filters?: ScanChannelFilters;
  playlistUrl?: string | null;
}

export interface DeleteChannelInput {
  channelId: string;
}

export interface ImportManualTextsInput {
  archiveName: string;
  language?: string;
  sourcePaths?: string[];
}

export interface ImportManualTextsResult {
  snapshot: ArchiveSnapshot;
  channelId: string | null;
  imported: number;
  skipped: number;
  failed: number;
  cancelled: boolean;
  message: string;
}

export interface SubtitleWorkspaceInput {
  videoId: string;
  channelId?: string;
}

export interface ScanChannelProgress {
  phase: 'starting' | 'listing' | 'details' | 'saving' | 'done' | 'cancelled' | 'error';
  totalVideos: number;
  processedVideos: number;
  currentVideoId: string | null;
  currentTitle: string | null;
  message: string;
  canCancel: boolean;
}

export type SubtitleLanguageMode = 'tr' | 'original' | 'tr-original';

export interface DownloadSubtitlesInput {
  videoIds: string[];
  languageMode?: SubtitleLanguageMode;
}

export interface SubtitleDownloadProgress {
  total: number;
  completed: number;
  skipped: number;
  currentVideoId: string | null;
  currentTitle: string | null;
  status: 'running' | 'skipped' | 'done' | 'error' | 'cancelled';
  message: string;
  canCancel: boolean;
}

export interface DownloadSubtitlesResult {
  snapshot: ArchiveSnapshot;
  total: number;
  downloaded: number;
  missing: number;
  failed: number;
  skipped: number;
  cancelled: boolean;
}

export type SubtitleSourceType = 'manual' | 'auto';

export interface SubtitleAssetSummary {
  videoId: string;
  language: string;
  source: SubtitleSourceType;
  format: string;
  rawPath: string;
  downloadedAt: string;
}

export interface SubtitleWorkspace {
  videoId: string;
  hasSubtitle: boolean;
  hasCleaned: boolean;
  assets: SubtitleAssetSummary[];
  selectedAsset: SubtitleAssetSummary | null;
  rawText: string;
  cleanedText: string;
  suggestedCleanedText: string;
  cleanedPath: string | null;
  cleanedAt: string | null;
  segmentCount: number;
  wordCount: number;
  message: string | null;
  qualityWarnings: SubtitleQualityWarning[];
  history: SubtitleEditHistoryItem[];
}

export interface SubtitleListItem {
  videoId: string;
  channelId: string;
  title: string;
  publishedAt: string | null;
  weekday: WeekdayLabel | null;
  durationMinutes: number | null;
  type: VideoType;
  subtitleStatus: SubtitleStatus;
  language: string;
  thumbnailUrl: string | null;
  assetCount: number;
  hasCleaned: boolean;
  wordCount: number;
  segmentCount: number;
  downloadedAt: string | null;
  cleanedAt: string | null;
}

export interface SubtitleListInput {
  channelId?: string | null;
}

export interface CleanSubtitleInput {
  videoId: string;
}

export interface CleanSubtitleResult {
  snapshot: ArchiveSnapshot;
  workspace: SubtitleWorkspace;
}

export interface BulkCleanSubtitlesInput {
  videoIds: string[];
}

export interface BulkCleanSubtitlesResult {
  snapshot: ArchiveSnapshot;
  items: SubtitleListItem[];
  cleaned: number;
  skipped: number;
  failed: number;
}

export type SubtitleEditSource = 'single' | 'bulk' | 'undo';

export type SubtitleEditOperationType =
  | 'manual-edit'
  | 'clean-from-raw'
  | 'trim-empty-lines'
  | 'dedupe-repeats'
  | 'lowercase'
  | 'uppercase'
  | 'find-replace';

export interface SubtitleQualityWarning {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface SubtitleEditHistoryItem {
  id: string;
  batchId: string;
  videoId: string;
  operationType: SubtitleEditOperationType;
  source: SubtitleEditSource;
  actor: string;
  oldPreview: string;
  newPreview: string;
  oldWordCount: number;
  newWordCount: number;
  createdAt: string;
  undoneAt: string | null;
}

export interface SaveTranscriptEditInput {
  videoId: string;
  cleanedText: string;
  operationType?: SubtitleEditOperationType;
}

export interface SaveTranscriptEditResult {
  snapshot: ArchiveSnapshot;
  workspace: SubtitleWorkspace;
  items: SubtitleListItem[];
}

export interface SubtitleBulkEditOperation {
  type: Exclude<SubtitleEditOperationType, 'manual-edit'>;
  findText?: string;
  replaceText?: string;
  caseSensitive?: boolean;
}

export interface PreviewSubtitleBulkEditInput {
  videoIds: string[];
  operation: SubtitleBulkEditOperation;
}

export interface SubtitleBulkPreviewItem {
  videoId: string;
  title: string;
  status: 'changed' | 'skipped';
  reason: string | null;
  oldPreview: string;
  newPreview: string;
  oldWordCount: number;
  newWordCount: number;
  changeCount: number;
}

export interface PreviewSubtitleBulkEditResult {
  operation: SubtitleBulkEditOperation;
  affected: number;
  skipped: number;
  items: SubtitleBulkPreviewItem[];
  summary: string[];
}

export interface ApplySubtitleBulkEditInput extends PreviewSubtitleBulkEditInput {
  excludedVideoIds?: string[];
}

export interface ApplySubtitleBulkEditResult {
  snapshot: ArchiveSnapshot;
  items: SubtitleListItem[];
  batchId: string | null;
  applied: number;
  skipped: number;
  failed: number;
  preview: PreviewSubtitleBulkEditResult;
}

export interface UndoSubtitleEditInput {
  videoId?: string;
}

export interface UndoSubtitleEditResult {
  snapshot: ArchiveSnapshot;
  items: SubtitleListItem[];
  workspace: SubtitleWorkspace | null;
  undone: boolean;
  message: string;
}

export type SubtitleExportFormat = 'txt' | 'json' | 'vtt';

export interface ExportSubtitlesInput {
  videoIds: string[];
  format: SubtitleExportFormat;
  merge?: boolean;
  includeMetadata?: boolean;
  sortByPublishedAt?: boolean;
}

export interface ExportSubtitlesResult {
  exportPath: string;
  files: string[];
  merged: boolean;
  mergedFilePath: string | null;
  mergedCount: number;
  exported: number;
  skipped: number;
  failed: number;
}

export interface OpenArchivePathInput {
  path: string;
}

export interface OpenArchivePathResult {
  opened: boolean;
  error: string | null;
}

export interface SaveArchivePathAsInput {
  path: string;
  defaultFileName?: string;
}

export interface SaveArchivePathAsResult {
  saved: boolean;
  path: string | null;
  cancelled: boolean;
  error: string | null;
}

export type AnalysisScopeMode = 'archive' | 'channel';
export type AnalysisTimelineBucket = 'month' | 'day';
export type AnalysisNgramSize = 1 | 2 | 3;

export interface AnalysisScope {
  mode: AnalysisScopeMode;
  channelId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  videoType?: VideoType | null;
  sourceIds?: string[];
}

export interface AnalysisIndexSummary {
  totalVideos: number;
  readyVideos: number;
  transcriptDocuments: number;
  indexedDocuments: number;
  totalIndexedWords: number;
  staleDocuments: number;
  channelsWithIndexedDocuments: number;
  lastIndexedAt: string | null;
}

export interface AnalysisReconcileResult {
  cleanedFilesFound: number;
  linkedDocuments: number;
  updatedDocuments: number;
  skippedFiles: number;
  summary: AnalysisIndexSummary;
}

export interface AnalysisRebuildResult {
  reconciled: AnalysisReconcileResult;
  indexedDocuments: number;
  skippedDocuments: number;
  summary: AnalysisIndexSummary;
}

export type AnalysisSourceType = 'video-transcript' | 'merged-file';

export interface AnalysisSourceSummary {
  id: string;
  type: AnalysisSourceType;
  title: string;
  detail: string;
  channelId: string | null;
  channelName: string | null;
  publishedAt: string | null;
  videoType: VideoType | null;
  wordCount: number;
  path: string;
  updatedAt: string;
}

export interface AnalysisSourceListInput {
  scope: AnalysisScope;
}

export interface AnalysisSourceListResult {
  sources: AnalysisSourceSummary[];
}

export interface DeleteMergedAnalysisSourceInput {
  path: string;
}

export interface DeleteMergedAnalysisSourceResult {
  deleted: boolean;
  deletedMeta: boolean;
  error: string | null;
}

export interface AnalysisSearchInput {
  query: string;
  scope: AnalysisScope;
  limit?: number;
}

export interface AnalysisSearchHit {
  sourceId: string;
  sourceType: AnalysisSourceType;
  videoId: string | null;
  channelId: string | null;
  channelName: string;
  title: string;
  publishedAt: string | null;
  videoType: VideoType | null;
  rank: number;
  snippet: string;
}

export interface AnalysisSearchResult {
  query: string;
  total: number;
  hits: AnalysisSearchHit[];
}

export interface AnalysisFrequencyInput {
  scope: AnalysisScope;
  ngramSize?: AnalysisNgramSize;
  limit?: number;
}

export interface AnalysisTermScore {
  term: string;
  count: number;
  videoCount: number;
}

export interface AnalysisFrequencyResult {
  ngramSize: AnalysisNgramSize;
  terms: AnalysisTermScore[];
  documentCount: number;
}

export interface AnalysisTimelineInput {
  scope: AnalysisScope;
  query?: string;
  bucket?: AnalysisTimelineBucket;
}

export interface AnalysisTimelinePoint {
  bucket: string;
  label: string;
  videoCount: number;
  matchCount: number;
  wordCount: number;
}

export interface AnalysisTimelineResult {
  query: string;
  bucket: AnalysisTimelineBucket;
  points: AnalysisTimelinePoint[];
}

export interface AnalysisAiProviderStatus {
  configured: boolean;
  provider: string;
  model: string | null;
  command: string | null;
  version: string | null;
  detail: string | null;
}

export interface AnalysisEmotionalSignal {
  label: string;
  score: number;
  rationale: string;
}

export interface AnalysisRealityMechanic {
  label: string;
  score: number;
  rationale: string;
}

export interface AnalysisSemanticEvidence {
  sourceId: string;
  title: string;
  quote: string;
  relevance: string;
}

export interface AnalysisSemanticFingerprint {
  summary: string;
  dominantSymbols: string[];
  dominantConcepts: string[];
  narrativeTone: string;
  emotionalSignature: AnalysisEmotionalSignal[];
  realityMechanics: AnalysisRealityMechanic[];
  continuitySignals: string[];
  evidence: AnalysisSemanticEvidence[];
  confidence: number;
}

export interface AnalysisFingerprintRecord {
  id: string;
  channelId: string | null;
  sourceIds: string[];
  contentHash: string;
  provider: string;
  model: string;
  promptVersion: string;
  fingerprint: AnalysisSemanticFingerprint;
  createdAt: string;
  stale: boolean;
  documentCount: number;
  wordCount: number;
}

export interface AnalysisFingerprintInput {
  scope: AnalysisScope;
  force?: boolean;
}

export interface AnalysisFingerprintResult {
  providerStatus: AnalysisAiProviderStatus;
  fingerprint: AnalysisFingerprintRecord | null;
  fromCache: boolean;
}

export interface AnalysisContinuityConcept {
  concept: string;
  firstSeen: string | null;
  evolution: string;
  stabilityScore: number;
}

export interface AnalysisContinuityIssue {
  label: string;
  severity: number;
  rationale: string;
  sourceIds: string[];
}

export interface AnalysisContinuityReport {
  summary: string;
  continuityScore: number;
  naturalnessScore: number;
  retconRisk: number;
  foreshadowingScore: number;
  conceptEvolution: AnalysisContinuityConcept[];
  anomalies: AnalysisContinuityIssue[];
  chronologyNotes: string[];
  evidence: AnalysisSemanticEvidence[];
  confidence: number;
}

export interface AnalysisContinuityRecord {
  id: string;
  channelId: string | null;
  sourceIds: string[];
  contentHash: string;
  provider: string;
  model: string;
  promptVersion: string;
  report: AnalysisContinuityReport;
  createdAt: string;
  stale: boolean;
  documentCount: number;
  wordCount: number;
}

export interface AnalysisContinuityInput {
  scope: AnalysisScope;
  force?: boolean;
}

export interface AnalysisContinuityResult {
  providerStatus: AnalysisAiProviderStatus;
  continuity: AnalysisContinuityRecord | null;
  fromCache: boolean;
}

export interface AnalysisMythologyArchetype {
  label: string;
  role: string;
  score: number;
  rationale: string;
  sourceIds: string[];
}

export interface AnalysisMythologySymbolCluster {
  label: string;
  symbols: string[];
  interpretation: string;
  sourceIds: string[];
}

export interface AnalysisMythologyAffinity {
  tradition: string;
  affinityScore: number;
  rationale: string;
  caveat: string;
}

export interface AnalysisMythologyReport {
  summary: string;
  dominantMythicFrame: string;
  archetypes: AnalysisMythologyArchetype[];
  symbolClusters: AnalysisMythologySymbolCluster[];
  traditionAffinities: AnalysisMythologyAffinity[];
  cautions: string[];
  evidence: AnalysisSemanticEvidence[];
  confidence: number;
}

export interface AnalysisMythologyRecord {
  id: string;
  channelId: string | null;
  sourceIds: string[];
  contentHash: string;
  provider: string;
  model: string;
  promptVersion: string;
  report: AnalysisMythologyReport;
  createdAt: string;
  stale: boolean;
  documentCount: number;
  wordCount: number;
}

export interface AnalysisMythologyInput {
  scope: AnalysisScope;
  force?: boolean;
}

export interface AnalysisMythologyResult {
  providerStatus: AnalysisAiProviderStatus;
  mythology: AnalysisMythologyRecord | null;
  fromCache: boolean;
}

export interface AnalysisRealityIndexSignal {
  label: string;
  score: number;
  rationale: string;
  sourceIds: string[];
}

export interface AnalysisRealityIndexReport {
  summary: string;
  indexScore: number;
  riskLevel: string;
  uncertaintyDensity: number;
  authorityPressure: number;
  secrecyPressure: number;
  epistemicIsolation: number;
  cliffhangerPressure: number;
  fearKnowledgeBlend: number;
  dominantMechanisms: AnalysisRealityIndexSignal[];
  stabilizers: string[];
  evidence: AnalysisSemanticEvidence[];
  confidence: number;
}

export interface AnalysisRealityIndexRecord {
  id: string;
  channelId: string | null;
  sourceIds: string[];
  contentHash: string;
  provider: string;
  model: string;
  promptVersion: string;
  report: AnalysisRealityIndexReport;
  createdAt: string;
  stale: boolean;
  documentCount: number;
  wordCount: number;
}

export interface AnalysisRealityIndexInput {
  scope: AnalysisScope;
  force?: boolean;
}

export interface AnalysisRealityIndexResult {
  providerStatus: AnalysisAiProviderStatus;
  realityIndex: AnalysisRealityIndexRecord | null;
  fromCache: boolean;
}

export interface AnalysisCharacterGraphNode {
  id: string;
  label: string;
  role: string;
  stance: string;
  salience: number;
  rationale: string;
  sourceIds: string[];
}

export interface AnalysisCharacterGraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
  rationale: string;
  sourceIds: string[];
}

export interface AnalysisCharacterGraphReport {
  summary: string;
  graphBalanceScore: number;
  roleStabilityScore: number;
  fictionalitySignal: number;
  dominantCarrier: string;
  nodes: AnalysisCharacterGraphNode[];
  edges: AnalysisCharacterGraphEdge[];
  roleSignals: string[];
  evidence: AnalysisSemanticEvidence[];
  confidence: number;
}

export interface AnalysisCharacterGraphRecord {
  id: string;
  channelId: string | null;
  sourceIds: string[];
  contentHash: string;
  provider: string;
  model: string;
  promptVersion: string;
  report: AnalysisCharacterGraphReport;
  createdAt: string;
  stale: boolean;
  documentCount: number;
  wordCount: number;
}

export interface AnalysisCharacterGraphInput {
  scope: AnalysisScope;
  force?: boolean;
}

export interface AnalysisCharacterGraphResult {
  providerStatus: AnalysisAiProviderStatus;
  characterGraph: AnalysisCharacterGraphRecord | null;
  fromCache: boolean;
}

export interface AnalysisSemanticDriftConcept {
  concept: string;
  firstSeen: string | null;
  latestSeen: string | null;
  earlyMeaning: string;
  laterMeaning: string;
  driftType: string;
  driftScore: number;
  rationale: string;
  sourceIds: string[];
}

export interface AnalysisSemanticDriftPhase {
  label: string;
  period: string;
  summary: string;
  dominantConcepts: string[];
  sourceIds: string[];
}

export interface AnalysisSemanticDriftSignal {
  label: string;
  score: number;
  rationale: string;
  sourceIds: string[];
}

export interface AnalysisSemanticDriftReport {
  summary: string;
  driftIndex: number;
  controlledExpansionScore: number;
  organicMessinessScore: number;
  anchorStabilityScore: number;
  concepts: AnalysisSemanticDriftConcept[];
  phases: AnalysisSemanticDriftPhase[];
  expansionSignals: AnalysisSemanticDriftSignal[];
  stableAnchors: string[];
  evidence: AnalysisSemanticEvidence[];
  confidence: number;
}

export interface AnalysisSemanticDriftRecord {
  id: string;
  channelId: string | null;
  sourceIds: string[];
  contentHash: string;
  provider: string;
  model: string;
  promptVersion: string;
  report: AnalysisSemanticDriftReport;
  createdAt: string;
  stale: boolean;
  documentCount: number;
  wordCount: number;
}

export interface AnalysisSemanticDriftInput {
  scope: AnalysisScope;
  force?: boolean;
}

export interface AnalysisSemanticDriftResult {
  providerStatus: AnalysisAiProviderStatus;
  semanticDrift: AnalysisSemanticDriftRecord | null;
  fromCache: boolean;
}

export interface AnalysisBelievabilityMechanism {
  label: string;
  score: number;
  rationale: string;
  sourceIds: string[];
}

export interface AnalysisBelievabilityHook {
  label: string;
  type: string;
  impactScore: number;
  rationale: string;
  sourceIds: string[];
}

export interface AnalysisBelievabilityFriction {
  label: string;
  severity: number;
  rationale: string;
  sourceIds: string[];
}

export interface AnalysisBelievabilityReport {
  summary: string;
  believabilityScore: number;
  trustArchitectureScore: number;
  detailAuthenticityScore: number;
  imperfectionSimulationScore: number;
  cognitiveGripScore: number;
  mechanisms: AnalysisBelievabilityMechanism[];
  hooks: AnalysisBelievabilityHook[];
  frictionPoints: AnalysisBelievabilityFriction[];
  audienceEffects: string[];
  evidence: AnalysisSemanticEvidence[];
  confidence: number;
}

export interface AnalysisBelievabilityRecord {
  id: string;
  channelId: string | null;
  sourceIds: string[];
  contentHash: string;
  provider: string;
  model: string;
  promptVersion: string;
  report: AnalysisBelievabilityReport;
  createdAt: string;
  stale: boolean;
  documentCount: number;
  wordCount: number;
}

export interface AnalysisBelievabilityInput {
  scope: AnalysisScope;
  force?: boolean;
}

export interface AnalysisBelievabilityResult {
  providerStatus: AnalysisAiProviderStatus;
  believability: AnalysisBelievabilityRecord | null;
  fromCache: boolean;
}

export interface ToolState {
  tool: string;
  version: string;
  state: 'Hazir' | 'Eksik' | 'Hata';
  detail: string | null;
}

export interface ToolStatusSnapshot {
  tools: ToolState[];
}
