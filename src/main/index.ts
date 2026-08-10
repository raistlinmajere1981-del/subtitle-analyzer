import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import type { OpenDialogOptions } from 'electron';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type {
  AnalysisBelievabilityInput,
  AnalysisCharacterGraphInput,
  AnalysisContinuityInput,
  AnalysisFingerprintInput,
  AnalysisFrequencyInput,
  AnalysisMythologyInput,
  AnalysisRealityIndexInput,
  AnalysisScope,
  AnalysisSemanticDriftInput,
  AnalysisSourceListInput,
  AnalysisSearchInput,
  AnalysisTimelineInput,
  ApplySubtitleBulkEditInput,
  BulkCleanSubtitlesInput,
  CleanSubtitleInput,
  DeleteChannelInput,
  DeleteMergedAnalysisSourceInput,
  DownloadSubtitlesInput,
  ExportSubtitlesInput,
  ImportManualTextsInput,
  OpenArchivePathInput,
  PreviewSubtitleBulkEditInput,
  SaveArchivePathAsInput,
  ScanChannelInput,
  ScanChannelProgress,
  SaveTranscriptEditInput,
  SubtitleListInput,
  SubtitleWorkspaceInput,
  SubtitleDownloadProgress,
  UndoSubtitleEditInput
} from '../shared/archive.js';
import { ArchiveAnalysis } from './archive/analysis.js';
import { registerArchiveAssetProtocol, registerArchiveAssetScheme } from './archive/assetProtocol.js';
import { exportSubtitles } from './archive/export.js';
import { getArchiveChildPath, openArchivePath } from './archive/openPath.js';
import { ArchiveStore } from './archive/store.js';
import { downloadVideoSubtitles } from './archive/subtitles.js';
import { cacheChannelThumbnails } from './archive/thumbnails.js';
import {
  applySubtitleBulkEdit,
  cleanSubtitle,
  cleanSubtitles,
  ensureAllDownloadedSubtitlesHaveTranscripts,
  ensureCleanedTranscript,
  getSubtitleWorkspace,
  normalizeExistingCleanedTranscriptNames,
  previewSubtitleBulkEdit,
  saveTranscriptEdit
} from './archive/transcriptWorkflow.js';
import { scanChannelWithYtDlp } from './archive/ytDlp.js';
import { getToolStatus } from './tools.js';
import { createMainWindow } from './window.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const preloadPath = path.join(__dirname, '../preload/index.mjs');
const rendererHtmlPath = path.join(__dirname, '../renderer/index.html');
const rendererEntry = process.env.ELECTRON_RENDERER_URL;
let archiveStore: ArchiveStore;
let archiveAnalysis: ArchiveAnalysis;
let activeScanController: AbortController | null = null;
let activeSubtitleDownloadController: AbortController | null = null;

registerArchiveAssetScheme();

function registerIpcHandlers(): void {
  ipcMain.handle('archive:get-snapshot', () => archiveStore.getSnapshot());

  ipcMain.handle('archive:delete-channel', (_event, input: DeleteChannelInput) => {
    if (activeScanController || activeSubtitleDownloadController) {
      throw new Error('Devam eden islem varken silme yapilamaz.');
    }

    return archiveStore.deleteChannel(input.channelId);
  });

  ipcMain.handle('archive:import-manual-texts', async (event, input: ImportManualTextsInput) => {
    if (activeScanController || activeSubtitleDownloadController) {
      throw new Error('Devam eden islem varken manuel arsiv eklenemez.');
    }

    if (!input.archiveName.trim()) {
      throw new Error('Manuel arsiv adi gerekli.');
    }

    let sourcePaths = input.sourcePaths ?? [];
    if (sourcePaths.length === 0) {
      const parentWindow = BrowserWindow.fromWebContents(event.sender);
      const dialogOptions: OpenDialogOptions = {
        title: 'Manuel arsive eklenecek metinleri sec',
        defaultPath: app.getPath('documents'),
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Metin dosyalari', extensions: ['txt', 'text', 'md', 'markdown', 'srt', 'vtt'] },
          { name: 'Tum dosyalar', extensions: ['*'] }
        ]
      };
      const result = parentWindow
        ? await dialog.showOpenDialog(parentWindow, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions);

      if (result.canceled) {
        return {
          snapshot: archiveStore.getSnapshot(),
          channelId: null,
          imported: 0,
          skipped: 0,
          failed: 0,
          cancelled: true,
          message: 'Manuel arsiv dosya secimi iptal edildi.'
        };
      }

      sourcePaths = result.filePaths;
    }

    return archiveStore.importManualTextFiles({
      ...input,
      sourcePaths
    });
  });

  ipcMain.handle('archive:get-subtitle-workspace', (_event, input: SubtitleWorkspaceInput) => {
    return getSubtitleWorkspace(archiveStore, input.videoId);
  });

  ipcMain.handle('archive:get-subtitle-list', (_event, input: SubtitleListInput = {}) => {
    return archiveStore.getSubtitleListItems(input.channelId);
  });

  ipcMain.handle('archive:clean-subtitle', (_event, input: CleanSubtitleInput) => {
    return cleanSubtitle(archiveStore, input);
  });

  ipcMain.handle('archive:clean-subtitles', (_event, input: BulkCleanSubtitlesInput) => {
    return cleanSubtitles(archiveStore, input);
  });

  ipcMain.handle('archive:export-subtitles', (_event, input: ExportSubtitlesInput) => {
    return exportSubtitles(archiveStore, input);
  });

  ipcMain.handle('archive:save-transcript-edit', (_event, input: SaveTranscriptEditInput) => {
    const result = saveTranscriptEdit(archiveStore, input);
    return {
      snapshot: archiveStore.getSnapshot(),
      workspace: getSubtitleWorkspace(archiveStore, input.videoId),
      items: archiveStore.getSubtitleListItems(),
      ...result
    };
  });

  ipcMain.handle('archive:preview-subtitle-bulk-edit', (_event, input: PreviewSubtitleBulkEditInput) => {
    return previewSubtitleBulkEdit(archiveStore, input);
  });

  ipcMain.handle('archive:apply-subtitle-bulk-edit', (_event, input: ApplySubtitleBulkEditInput) => {
    return applySubtitleBulkEdit(archiveStore, input);
  });

  ipcMain.handle('archive:undo-subtitle-edit', (_event, input: UndoSubtitleEditInput = {}) => {
    const result = archiveStore.undoLastTranscriptEdit(input.videoId);
    return {
      snapshot: archiveStore.getSnapshot(),
      items: archiveStore.getSubtitleListItems(),
      workspace: input.videoId ? getSubtitleWorkspace(archiveStore, input.videoId) : null,
      undone: result.undone,
      message: result.message
    };
  });

  ipcMain.handle('archive:scan-channel', async (event, input: ScanChannelInput) => {
    if (activeScanController) {
      throw new Error('Zaten devam eden bir kanal taramasi var.');
    }

    const scanController = new AbortController();
    activeScanController = scanController;
    const isIncrementalScan = input.mode === 'new' && Boolean(input.channelId);
    const existingVideoIds = isIncrementalScan
      ? archiveStore
          .getSnapshot()
          .videos.filter((video) => video.channelId === input.channelId)
          .map((video) => video.id)
      : undefined;
    const playlistUrl = typeof input.playlistUrl === 'string' && input.playlistUrl.trim().length > 0
      ? input.playlistUrl.trim()
      : null;
    const sendScanProgress = (progress: ScanChannelProgress): void => {
      event.sender.send('archive:scan-progress', progress);
    };

    try {
      const result = await scanChannelWithYtDlp(input.url, {
        existingVideoIds,
        filters: input.filters,
        playlistUrl,
        signal: scanController.signal,
        onProgress: sendScanProgress
      });

      if (playlistUrl && input.channelId) {
        const existingVideos = archiveStore.getVideosByChannelId(input.channelId);
        const playlistVideoIds = new Set(result.videos.map((video) => video.id));
        result.videos = [
          ...result.videos,
          ...existingVideos.filter((video) => !playlistVideoIds.has(video.id))
        ];
      }

      sendScanProgress({
        phase: 'saving',
        totalVideos: result.videos.length,
        processedVideos: 0,
        currentVideoId: null,
        currentTitle: null,
        message: playlistUrl
          ? 'Oynatma listesi thumbnail arsivi hazirlaniyor'
          : isIncrementalScan
            ? 'Yeni video thumbnail arsivi hazirlaniyor'
            : 'Thumbnail arsivi hazirlaniyor',
        canCancel: true
      });

      const cachedResult = await cacheChannelThumbnails(
        result,
        archiveStore.archivePath,
        scanController.signal,
        (processedVideos, currentTitle) => {
          sendScanProgress({
            phase: 'saving',
              totalVideos: result.videos.length,
              processedVideos,
              currentVideoId: null,
              currentTitle,
              message: playlistUrl
                ? 'Oynatma listesi thumbnail arsivi hazirlaniyor'
                : isIncrementalScan
                  ? 'Yeni video thumbnail arsivi hazirlaniyor'
                  : 'Thumbnail arsivi hazirlaniyor',
              canCancel: true
            });
        }
      );

      sendScanProgress({
        phase: 'saving',
        totalVideos: cachedResult.videos.length,
        processedVideos: cachedResult.videos.length,
        currentVideoId: null,
        currentTitle: null,
        message: playlistUrl ? 'Oynatma listesi videolari arsive ekleniyor' : isIncrementalScan ? 'Yeni videolar arsive ekleniyor' : 'Arsiv veritabani guncelleniyor',
        canCancel: false
      });

      const snapshot = archiveStore.saveSuccessfulScan(cachedResult);

      sendScanProgress({
        phase: 'done',
        totalVideos: result.videos.length,
        processedVideos: result.videos.length,
        currentVideoId: null,
        currentTitle: null,
        message: playlistUrl
          ? `${cachedResult.videos.length} oynatma listesi videosu arsive eklendi`
          : isIncrementalScan
          ? result.videos.length > 0
            ? `${result.videos.length} yeni video eklendi`
            : 'Yeni video bulunamadi'
          : 'Kanal taramasi tamamlandi',
        canCancel: false
      });

      return snapshot;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Kanal taramasi basarisiz oldu.');
      const wasCancelled = scanController.signal.aborted;

      sendScanProgress({
        phase: wasCancelled ? 'cancelled' : 'error',
        totalVideos: 0,
        processedVideos: 0,
        currentVideoId: null,
        currentTitle: null,
        message: wasCancelled ? 'Kanal taramasi iptal edildi' : normalizedError.message,
        canCancel: false
      });

      if (wasCancelled) {
        throw new Error('Kanal taramasi iptal edildi.');
      }

      archiveStore.saveFailedScan(input.url, normalizedError, input.channelId);
      throw normalizedError;
    } finally {
      activeScanController = null;
    }
  });

  ipcMain.handle('archive:cancel-scan', () => {
    activeScanController?.abort();
    return { cancelled: Boolean(activeScanController) };
  });

  ipcMain.handle('archive:download-subtitles', async (event, input: DownloadSubtitlesInput) => {
    if (activeSubtitleDownloadController) {
      throw new Error('Zaten devam eden bir altyazi indirme islemi var.');
    }

    const downloadController = new AbortController();
    activeSubtitleDownloadController = downloadController;
    const requestedVideoIds = [...new Set(input.videoIds)].filter((videoId) => videoId.trim().length > 0);
    const videos = archiveStore.getVideosByIds(requestedVideoIds);
    const total = videos.length;
    let downloaded = 0;
    let missing = 0;
    let failed = 0;
    let skipped = 0;
    let completed = 0;
    let cancelled = false;

    const sendProgress = (progress: Omit<SubtitleDownloadProgress, 'total' | 'completed' | 'skipped' | 'canCancel'>): void => {
      event.sender.send('archive:subtitle-progress', {
        total,
        completed,
        skipped,
        canCancel:
          !downloadController.signal.aborted &&
          progress.status !== 'cancelled' &&
          !(progress.status === 'done' && progress.currentVideoId === null),
        ...progress
      } satisfies SubtitleDownloadProgress);
    };

    try {
      for (const video of videos) {
        if (downloadController.signal.aborted) {
          cancelled = true;
          break;
        }

        const existingAssets = archiveStore.getSubtitleAssets(video.id);
        if (existingAssets.length > 0) {
          const transcriptCreated = ensureCleanedTranscript(archiveStore, video);
          skipped += 1;
          completed += 1;
          sendProgress({
            currentVideoId: video.id,
            currentTitle: video.title,
            status: 'skipped',
            message: `${video.title} zaten arsivde, atlandi${transcriptCreated ? ', transcript hazirlandi' : ''}`
          });
          continue;
        }

        sendProgress({
          currentVideoId: video.id,
          currentTitle: video.title,
          status: 'running',
          message: `${video.title} altyazilari indiriliyor`
        });

        try {
          const result = await downloadVideoSubtitles(video, archiveStore.archivePath, {
            languageMode: input.languageMode ?? 'tr-original',
            signal: downloadController.signal
          });

          if (downloadController.signal.aborted) {
            cancelled = true;
            break;
          }

          archiveStore.saveSubtitleDownloadResult(video.id, result.assets);
          const transcriptCreated = result.assets.length > 0 ? ensureCleanedTranscript(archiveStore, video) : false;

          if (result.assets.length > 0) {
            downloaded += 1;
          } else {
            missing += 1;
          }

          completed += 1;
          sendProgress({
            currentVideoId: video.id,
            currentTitle: video.title,
            status: 'done',
            message:
              result.assets.length > 0
                ? `${video.title} indirildi${transcriptCreated ? ', transcript hazirlandi' : ''}`
                : `${video.title} icin altyazi bulunamadi`
          });
        } catch (error) {
          if (downloadController.signal.aborted) {
            cancelled = true;
            break;
          }

          archiveStore.saveSubtitleDownloadResult(video.id, []);
          failed += 1;
          completed += 1;
          sendProgress({
            currentVideoId: video.id,
            currentTitle: video.title,
            status: 'error',
            message: error instanceof Error ? error.message : `${video.title} indirilemedi`
          });
        }
      }

      sendProgress({
        currentVideoId: null,
        currentTitle: null,
        status: cancelled ? 'cancelled' : 'done',
        message: cancelled ? 'Altyazi indirme iptal edildi' : 'Altyazi indirme tamamlandi'
      });

      return {
        snapshot: archiveStore.getSnapshot(),
        total,
        downloaded,
        missing,
        failed,
        skipped,
        cancelled
      };
    } finally {
      activeSubtitleDownloadController = null;
    }
  });

  ipcMain.handle('archive:cancel-subtitle-download', () => {
    activeSubtitleDownloadController?.abort();
    return { cancelled: Boolean(activeSubtitleDownloadController) };
  });

  ipcMain.handle('analysis:get-summary', (_event, scope?: AnalysisScope) => archiveAnalysis.getSummary(scope));

  ipcMain.handle('analysis:list-sources', (_event, input: AnalysisSourceListInput) => archiveAnalysis.listSources(input));

  ipcMain.handle('analysis:delete-merged-source', (_event, input: DeleteMergedAnalysisSourceInput) =>
    archiveAnalysis.deleteMergedSource(input)
  );

  ipcMain.handle('analysis:reconcile-documents', () => archiveAnalysis.reconcileCleanedDocuments());

  ipcMain.handle('analysis:rebuild-index', () => {
    ensureAllDownloadedSubtitlesHaveTranscripts(archiveStore);
    return archiveAnalysis.rebuildIndex();
  });

  ipcMain.handle('analysis:search', (_event, input: AnalysisSearchInput) => archiveAnalysis.search(input));

  ipcMain.handle('analysis:get-frequency', (_event, input: AnalysisFrequencyInput) =>
    archiveAnalysis.getFrequency(input)
  );

  ipcMain.handle('analysis:get-timeline', (_event, input: AnalysisTimelineInput) =>
    archiveAnalysis.getTimeline(input)
  );

  ipcMain.handle('analysis:get-ai-provider-status', () => archiveAnalysis.getAiProviderStatus());

  ipcMain.handle('analysis:get-fingerprint', (_event, input: AnalysisFingerprintInput) =>
    archiveAnalysis.getFingerprint(input)
  );

  ipcMain.handle('analysis:run-fingerprint', (_event, input: AnalysisFingerprintInput) =>
    archiveAnalysis.runFingerprint(input)
  );

  ipcMain.handle('analysis:get-continuity', (_event, input: AnalysisContinuityInput) =>
    archiveAnalysis.getContinuity(input)
  );

  ipcMain.handle('analysis:run-continuity', (_event, input: AnalysisContinuityInput) =>
    archiveAnalysis.runContinuity(input)
  );

  ipcMain.handle('analysis:get-mythology', (_event, input: AnalysisMythologyInput) =>
    archiveAnalysis.getMythology(input)
  );

  ipcMain.handle('analysis:run-mythology', (_event, input: AnalysisMythologyInput) =>
    archiveAnalysis.runMythology(input)
  );

  ipcMain.handle('analysis:get-reality-index', (_event, input: AnalysisRealityIndexInput) =>
    archiveAnalysis.getRealityIndex(input)
  );

  ipcMain.handle('analysis:run-reality-index', (_event, input: AnalysisRealityIndexInput) =>
    archiveAnalysis.runRealityIndex(input)
  );

  ipcMain.handle('analysis:get-character-graph', (_event, input: AnalysisCharacterGraphInput) =>
    archiveAnalysis.getCharacterGraph(input)
  );

  ipcMain.handle('analysis:run-character-graph', (_event, input: AnalysisCharacterGraphInput) =>
    archiveAnalysis.runCharacterGraph(input)
  );

  ipcMain.handle('analysis:get-semantic-drift', (_event, input: AnalysisSemanticDriftInput) =>
    archiveAnalysis.getSemanticDrift(input)
  );

  ipcMain.handle('analysis:run-semantic-drift', (_event, input: AnalysisSemanticDriftInput) =>
    archiveAnalysis.runSemanticDrift(input)
  );

  ipcMain.handle('analysis:get-believability', (_event, input: AnalysisBelievabilityInput) =>
    archiveAnalysis.getBelievability(input)
  );

  ipcMain.handle('analysis:run-believability', (_event, input: AnalysisBelievabilityInput) =>
    archiveAnalysis.runBelievability(input)
  );

  ipcMain.handle('tools:get-status', () => getToolStatus());

  ipcMain.handle('system:open-path', async (_event, input: OpenArchivePathInput) => {
    return openArchivePath(archiveStore.archivePath, input.path);
  });

  ipcMain.handle('system:save-path-as', async (event, input: SaveArchivePathAsInput) => {
    const sourcePath = getArchiveChildPath(archiveStore.archivePath, input.path);
    const sourceStat = fs.statSync(sourcePath);

    if (!sourceStat.isFile()) {
      throw new Error('Kaydedilecek kaynak dosya degil.');
    }

    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    const dialogOptions = {
      title: 'Birlestirilmis altyaziyi kaydet',
      defaultPath: input.defaultFileName?.trim() || path.basename(sourcePath),
      filters: [
        { name: 'Metin dosyalari', extensions: ['txt'] },
        { name: 'Tum dosyalar', extensions: ['*'] }
      ]
    };
    const result = parentWindow
      ? await dialog.showSaveDialog(parentWindow, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    if (result.canceled || !result.filePath) {
      return {
        saved: false,
        path: null,
        cancelled: true,
        error: null
      };
    }

    fs.copyFileSync(sourcePath, result.filePath);

    return {
      saved: true,
      path: result.filePath,
      cancelled: false,
      error: null
    };
  });
}

function resolveProjectArchivePath(): string {
  return path.resolve(process.env.SUBTITLE_ANALYZER_ARCHIVE_DIR ?? path.join(process.cwd(), 'archive'));
}

function migrateLegacyArchiveIfNeeded(projectArchivePath: string): void {
  const legacyArchivePath = path.join(app.getPath('userData'), 'archive');
  const projectDatabasePath = path.join(projectArchivePath, 'subtitle-analyzer.sqlite');
  const legacyDatabasePath = path.join(legacyArchivePath, 'subtitle-analyzer.sqlite');

  if (path.resolve(projectArchivePath) === path.resolve(legacyArchivePath)) {
    return;
  }

  if (fs.existsSync(projectDatabasePath) || !fs.existsSync(legacyDatabasePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(projectArchivePath), { recursive: true });
  fs.cpSync(legacyArchivePath, projectArchivePath, {
    recursive: true,
    errorOnExist: false,
    force: false
  });
}

function openMainWindow(): void {
  createMainWindow({
    preloadPath,
    rendererEntry,
    rendererHtmlPath
  });
}

app.setName('Subtitle Analyzer');

void app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  const archivePath = resolveProjectArchivePath();
  migrateLegacyArchiveIfNeeded(archivePath);
  archiveStore = new ArchiveStore(archivePath);
  archiveAnalysis = new ArchiveAnalysis(archivePath);
  normalizeExistingCleanedTranscriptNames(archiveStore);
  ensureAllDownloadedSubtitlesHaveTranscripts(archiveStore);
  registerArchiveAssetProtocol(() => archiveStore.archivePath);
  registerIpcHandlers();
  openMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
