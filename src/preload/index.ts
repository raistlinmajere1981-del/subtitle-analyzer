import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  AnalysisAiProviderStatus,
  AnalysisBelievabilityInput,
  AnalysisBelievabilityResult,
  AnalysisCharacterGraphInput,
  AnalysisCharacterGraphResult,
  AnalysisContinuityInput,
  AnalysisContinuityResult,
  AnalysisFingerprintInput,
  AnalysisFingerprintResult,
  AnalysisFrequencyInput,
  AnalysisFrequencyResult,
  AnalysisIndexSummary,
  AnalysisMythologyInput,
  AnalysisMythologyResult,
  AnalysisRealityIndexInput,
  AnalysisRealityIndexResult,
  AnalysisRebuildResult,
  AnalysisReconcileResult,
  AnalysisScope,
  AnalysisSemanticDriftInput,
  AnalysisSemanticDriftResult,
  AnalysisSourceListInput,
  AnalysisSourceListResult,
  AnalysisSearchInput,
  AnalysisSearchResult,
  AnalysisTimelineInput,
  AnalysisTimelineResult,
  DeleteMergedAnalysisSourceInput,
  DeleteMergedAnalysisSourceResult,
  ArchiveSnapshot,
  ApplySubtitleBulkEditInput,
  ApplySubtitleBulkEditResult,
  BulkCleanSubtitlesInput,
  BulkCleanSubtitlesResult,
  CleanSubtitleInput,
  CleanSubtitleResult,
  DeleteChannelInput,
  DownloadSubtitlesInput,
  DownloadSubtitlesResult,
  ExportSubtitlesInput,
  ExportSubtitlesResult,
  ImportManualTextsInput,
  ImportManualTextsResult,
  OpenArchivePathInput,
  OpenArchivePathResult,
  PreviewSubtitleBulkEditInput,
  PreviewSubtitleBulkEditResult,
  ScanChannelInput,
  ScanChannelProgress,
  SaveTranscriptEditInput,
  SaveTranscriptEditResult,
  SaveArchivePathAsInput,
  SaveArchivePathAsResult,
  SubtitleListInput,
  SubtitleListItem,
  SubtitleWorkspace,
  SubtitleWorkspaceInput,
  SubtitleDownloadProgress,
  UndoSubtitleEditInput,
  UndoSubtitleEditResult,
  ToolStatusSnapshot
} from '../shared/archive.js';

const api = {
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },
  platform: process.platform,
  archive: {
    getSnapshot: () => ipcRenderer.invoke('archive:get-snapshot') as Promise<ArchiveSnapshot>,
    deleteChannel: (input: DeleteChannelInput) =>
      ipcRenderer.invoke('archive:delete-channel', input) as Promise<ArchiveSnapshot>,
    importManualTexts: (input: ImportManualTextsInput) =>
      ipcRenderer.invoke('archive:import-manual-texts', input) as Promise<ImportManualTextsResult>,
    getSubtitleWorkspace: (input: SubtitleWorkspaceInput) =>
      ipcRenderer.invoke('archive:get-subtitle-workspace', input) as Promise<SubtitleWorkspace>,
    getSubtitleList: (input: SubtitleListInput = {}) =>
      ipcRenderer.invoke('archive:get-subtitle-list', input) as Promise<SubtitleListItem[]>,
    cleanSubtitle: (input: CleanSubtitleInput) =>
      ipcRenderer.invoke('archive:clean-subtitle', input) as Promise<CleanSubtitleResult>,
    cleanSubtitles: (input: BulkCleanSubtitlesInput) =>
      ipcRenderer.invoke('archive:clean-subtitles', input) as Promise<BulkCleanSubtitlesResult>,
    exportSubtitles: (input: ExportSubtitlesInput) =>
      ipcRenderer.invoke('archive:export-subtitles', input) as Promise<ExportSubtitlesResult>,
    saveTranscriptEdit: (input: SaveTranscriptEditInput) =>
      ipcRenderer.invoke('archive:save-transcript-edit', input) as Promise<SaveTranscriptEditResult>,
    previewSubtitleBulkEdit: (input: PreviewSubtitleBulkEditInput) =>
      ipcRenderer.invoke('archive:preview-subtitle-bulk-edit', input) as Promise<PreviewSubtitleBulkEditResult>,
    applySubtitleBulkEdit: (input: ApplySubtitleBulkEditInput) =>
      ipcRenderer.invoke('archive:apply-subtitle-bulk-edit', input) as Promise<ApplySubtitleBulkEditResult>,
    undoSubtitleEdit: (input: UndoSubtitleEditInput = {}) =>
      ipcRenderer.invoke('archive:undo-subtitle-edit', input) as Promise<UndoSubtitleEditResult>,
    scanChannel: (input: ScanChannelInput) => ipcRenderer.invoke('archive:scan-channel', input) as Promise<ArchiveSnapshot>,
    cancelScan: () => ipcRenderer.invoke('archive:cancel-scan') as Promise<{ cancelled: boolean }>,
    onScanProgress: (callback: (progress: ScanChannelProgress) => void) => {
      const listener = (_event: IpcRendererEvent, progress: ScanChannelProgress): void => {
        callback(progress);
      };

      ipcRenderer.on('archive:scan-progress', listener);

      return () => {
        ipcRenderer.removeListener('archive:scan-progress', listener);
      };
    },
    downloadSubtitles: (input: DownloadSubtitlesInput) =>
      ipcRenderer.invoke('archive:download-subtitles', input) as Promise<DownloadSubtitlesResult>,
    cancelSubtitleDownload: () =>
      ipcRenderer.invoke('archive:cancel-subtitle-download') as Promise<{ cancelled: boolean }>,
    onSubtitleProgress: (callback: (progress: SubtitleDownloadProgress) => void) => {
      const listener = (_event: IpcRendererEvent, progress: SubtitleDownloadProgress): void => {
        callback(progress);
      };

      ipcRenderer.on('archive:subtitle-progress', listener);

      return () => {
        ipcRenderer.removeListener('archive:subtitle-progress', listener);
      };
    }
  },
  analysis: {
    getSummary: (scope?: AnalysisScope) => ipcRenderer.invoke('analysis:get-summary', scope) as Promise<AnalysisIndexSummary>,
    listSources: (input: AnalysisSourceListInput) =>
      ipcRenderer.invoke('analysis:list-sources', input) as Promise<AnalysisSourceListResult>,
    deleteMergedSource: (input: DeleteMergedAnalysisSourceInput) =>
      ipcRenderer.invoke('analysis:delete-merged-source', input) as Promise<DeleteMergedAnalysisSourceResult>,
    reconcileDocuments: () =>
      ipcRenderer.invoke('analysis:reconcile-documents') as Promise<AnalysisReconcileResult>,
    rebuildIndex: () => ipcRenderer.invoke('analysis:rebuild-index') as Promise<AnalysisRebuildResult>,
    search: (input: AnalysisSearchInput) =>
      ipcRenderer.invoke('analysis:search', input) as Promise<AnalysisSearchResult>,
    getFrequency: (input: AnalysisFrequencyInput) =>
      ipcRenderer.invoke('analysis:get-frequency', input) as Promise<AnalysisFrequencyResult>,
    getTimeline: (input: AnalysisTimelineInput) =>
      ipcRenderer.invoke('analysis:get-timeline', input) as Promise<AnalysisTimelineResult>,
    getAiProviderStatus: () =>
      ipcRenderer.invoke('analysis:get-ai-provider-status') as Promise<AnalysisAiProviderStatus>,
    getFingerprint: (input: AnalysisFingerprintInput) =>
      ipcRenderer.invoke('analysis:get-fingerprint', input) as Promise<AnalysisFingerprintResult>,
    runFingerprint: (input: AnalysisFingerprintInput) =>
      ipcRenderer.invoke('analysis:run-fingerprint', input) as Promise<AnalysisFingerprintResult>,
    getContinuity: (input: AnalysisContinuityInput) =>
      ipcRenderer.invoke('analysis:get-continuity', input) as Promise<AnalysisContinuityResult>,
    runContinuity: (input: AnalysisContinuityInput) =>
      ipcRenderer.invoke('analysis:run-continuity', input) as Promise<AnalysisContinuityResult>,
    getMythology: (input: AnalysisMythologyInput) =>
      ipcRenderer.invoke('analysis:get-mythology', input) as Promise<AnalysisMythologyResult>,
    runMythology: (input: AnalysisMythologyInput) =>
      ipcRenderer.invoke('analysis:run-mythology', input) as Promise<AnalysisMythologyResult>,
    getRealityIndex: (input: AnalysisRealityIndexInput) =>
      ipcRenderer.invoke('analysis:get-reality-index', input) as Promise<AnalysisRealityIndexResult>,
    runRealityIndex: (input: AnalysisRealityIndexInput) =>
      ipcRenderer.invoke('analysis:run-reality-index', input) as Promise<AnalysisRealityIndexResult>,
    getCharacterGraph: (input: AnalysisCharacterGraphInput) =>
      ipcRenderer.invoke('analysis:get-character-graph', input) as Promise<AnalysisCharacterGraphResult>,
    runCharacterGraph: (input: AnalysisCharacterGraphInput) =>
      ipcRenderer.invoke('analysis:run-character-graph', input) as Promise<AnalysisCharacterGraphResult>,
    getSemanticDrift: (input: AnalysisSemanticDriftInput) =>
      ipcRenderer.invoke('analysis:get-semantic-drift', input) as Promise<AnalysisSemanticDriftResult>,
    runSemanticDrift: (input: AnalysisSemanticDriftInput) =>
      ipcRenderer.invoke('analysis:run-semantic-drift', input) as Promise<AnalysisSemanticDriftResult>,
    getBelievability: (input: AnalysisBelievabilityInput) =>
      ipcRenderer.invoke('analysis:get-believability', input) as Promise<AnalysisBelievabilityResult>,
    runBelievability: (input: AnalysisBelievabilityInput) =>
      ipcRenderer.invoke('analysis:run-believability', input) as Promise<AnalysisBelievabilityResult>
  },
  system: {
    openPath: (input: OpenArchivePathInput) =>
      ipcRenderer.invoke('system:open-path', input) as Promise<OpenArchivePathResult>,
    savePathAs: (input: SaveArchivePathAsInput) =>
      ipcRenderer.invoke('system:save-path-as', input) as Promise<SaveArchivePathAsResult>
  },
  tools: {
    getStatus: () => ipcRenderer.invoke('tools:get-status') as Promise<ToolStatusSnapshot>
  }
};

contextBridge.exposeInMainWorld('subtitleAnalyzer', api);

export type SubtitleAnalyzerApi = typeof api;
