import type { Dispatch, SetStateAction } from 'react';
import type {
  ArchiveSnapshot,
  ExportSubtitlesResult,
  PreviewSubtitleBulkEditResult,
  SubtitleBulkEditOperation,
  SubtitleEditOperationType,
  SubtitleExportFormat,
  SubtitleListItem,
  SubtitleWorkspace,
  VideoRecord
} from '../../../../shared/archive';
import { errorToMessage } from '../../lib/errors';

interface UseSubtitleActionsInput {
  checkedVisibleSubtitleIds: string[];
  includeExportMetadata: boolean;
  mergeSubtitleExport: boolean;
  refreshSubtitleItems: () => Promise<SubtitleListItem[]>;
  selectedVideo: VideoRecord | null;
  setBusyLabel: (value: string | null) => void;
  setErrorMessage: (value: string | null) => void;
  setIsSubtitleWorkspaceBusy: (value: boolean) => void;
  setNotice: (value: string | null) => void;
  setSnapshot: (value: ArchiveSnapshot) => void;
  setSubtitleItems: (value: SubtitleListItem[]) => void;
  setSubtitleWorkspace: Dispatch<SetStateAction<SubtitleWorkspace | null>>;
  onMergedExportCreated: (result: ExportSubtitlesResult) => Promise<void>;
  sortMergedExportByDate: boolean;
  subtitleExportFormat: SubtitleExportFormat;
}

export function useSubtitleActions({
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
  onMergedExportCreated,
  sortMergedExportByDate,
  subtitleExportFormat
}: UseSubtitleActionsInput) {
  async function handleCleanSubtitle(videoId: string): Promise<void> {
    setIsSubtitleWorkspaceBusy(true);
    setBusyLabel('Altyazi temizleniyor');
    setErrorMessage(null);
    setNotice(null);

    try {
      const result = await window.subtitleAnalyzer?.archive.cleanSubtitle({ videoId });
      if (!result) {
        throw new Error('Altyazi temizleme sonucu alinamadi.');
      }

      setSnapshot(result.snapshot);
      setSubtitleWorkspace(result.workspace);
      await refreshSubtitleItems();
      setNotice('Transcript kaydedildi ve analiz icin hazirlandi.');
    } catch (error) {
      setErrorMessage(errorToMessage(error));
    } finally {
      setBusyLabel(null);
      setIsSubtitleWorkspaceBusy(false);
    }
  }

  async function handleCleanSelectedSubtitles(videoIds: string[]): Promise<void> {
    if (videoIds.length === 0) {
      setErrorMessage('Toplu islem icin altyazi secmelisin.');
      return;
    }

    setBusyLabel('Secili altyazilar temizleniyor');
    setErrorMessage(null);
    setNotice(null);

    try {
      const result = await window.subtitleAnalyzer?.archive.cleanSubtitles({ videoIds });
      if (!result) {
        throw new Error('Toplu altyazi temizleme sonucu alinamadi.');
      }

      setSnapshot(result.snapshot);
      setSubtitleItems(result.items);
      setNotice(`${result.cleaned} altyazi temizlendi, ${result.skipped} atlandi, ${result.failed} hata.`);

      if (selectedVideo) {
        const workspace = await window.subtitleAnalyzer?.archive.getSubtitleWorkspace({ videoId: selectedVideo.id });
        setSubtitleWorkspace(workspace ?? null);
      }
    } catch (error) {
      setErrorMessage(errorToMessage(error));
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleExportSelectedSubtitles(videoIds: string[]): Promise<void> {
    if (videoIds.length === 0) {
      setErrorMessage('Export icin altyazi secmelisin.');
      return;
    }

    const shouldMerge = mergeSubtitleExport && videoIds.length > 1;
    setBusyLabel('Altyazilar export ediliyor');
    setErrorMessage(null);
    setNotice(null);

    try {
      const result = await window.subtitleAnalyzer?.archive.exportSubtitles({
        videoIds,
        format: shouldMerge ? 'txt' : subtitleExportFormat,
        merge: shouldMerge,
        includeMetadata: includeExportMetadata,
        sortByPublishedAt: sortMergedExportByDate
      });
      if (!result) {
        throw new Error('Export sonucu alinamadi.');
      }

      if (result.merged) {
        if (!result.mergedFilePath) {
          setErrorMessage('Birlestirilecek temiz transcript bulunamadi.');
          return;
        }

        await onMergedExportCreated(result);
        return;
      }

      const message = `${result.files.length} dosya export edildi, ${result.skipped} atlandi, ${result.failed} hata.`;
      setNotice(message);
    } catch (error) {
      setErrorMessage(errorToMessage(error));
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleSaveTranscriptEdit(
    cleanedText: string,
    operationType: SubtitleEditOperationType = 'manual-edit'
  ): Promise<void> {
    if (!selectedVideo) {
      setErrorMessage('Kaydedilecek video secili degil.');
      return;
    }

    setIsSubtitleWorkspaceBusy(true);
    setBusyLabel('Transcript kaydediliyor');
    setErrorMessage(null);
    setNotice(null);

    try {
      const result = await window.subtitleAnalyzer?.archive.saveTranscriptEdit({
        videoId: selectedVideo.id,
        cleanedText,
        operationType
      });
      if (!result) {
        throw new Error('Transcript kayit sonucu alinamadi.');
      }

      setSnapshot(result.snapshot);
      await refreshSubtitleItems();
      setSubtitleWorkspace(result.workspace);
      setNotice('Transcript kaydedildi ve analiz icin hazirlandi.');
    } catch (error) {
      setErrorMessage(errorToMessage(error));
    } finally {
      setBusyLabel(null);
      setIsSubtitleWorkspaceBusy(false);
    }
  }

  async function handlePreviewSubtitleBulkEdit(
    operation: SubtitleBulkEditOperation
  ): Promise<PreviewSubtitleBulkEditResult | null> {
    if (checkedVisibleSubtitleIds.length === 0) {
      setErrorMessage('Toplu islem icin altyazi secmelisin.');
      return null;
    }

    setBusyLabel('Toplu islem onizlemesi hazirlaniyor');
    setErrorMessage(null);
    setNotice(null);

    try {
      const result = await window.subtitleAnalyzer?.archive.previewSubtitleBulkEdit({
        videoIds: checkedVisibleSubtitleIds,
        operation
      });
      if (!result) {
        throw new Error('Toplu onizleme sonucu alinamadi.');
      }

      setNotice(`${result.affected} kayit etkilenecek, ${result.skipped} kayit atlanacak.`);
      return result;
    } catch (error) {
      setErrorMessage(errorToMessage(error));
      return null;
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleApplySubtitleBulkEdit(
    operation: SubtitleBulkEditOperation,
    excludedVideoIds: string[]
  ): Promise<boolean> {
    if (checkedVisibleSubtitleIds.length === 0) {
      setErrorMessage('Uygulanacak secili altyazi yok.');
      return false;
    }

    setBusyLabel('Toplu transcript islemi uygulaniyor');
    setErrorMessage(null);
    setNotice(null);

    try {
      const result = await window.subtitleAnalyzer?.archive.applySubtitleBulkEdit({
        videoIds: checkedVisibleSubtitleIds,
        operation,
        excludedVideoIds
      });
      if (!result) {
        throw new Error('Toplu islem sonucu alinamadi.');
      }

      setSnapshot(result.snapshot);
      setSubtitleItems(result.items);
      if (selectedVideo) {
        const workspace = await window.subtitleAnalyzer?.archive.getSubtitleWorkspace({ videoId: selectedVideo.id });
        setSubtitleWorkspace(workspace ?? null);
      }
      setNotice(`${result.applied} kayit guncellendi, ${result.skipped} atlandi, ${result.failed} hata.`);
      return true;
    } catch (error) {
      setErrorMessage(errorToMessage(error));
      return false;
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleUndoSubtitleEdit(videoId?: string): Promise<void> {
    setBusyLabel('Son transcript islemi geri aliniyor');
    setErrorMessage(null);
    setNotice(null);

    try {
      const result = await window.subtitleAnalyzer?.archive.undoSubtitleEdit({ videoId });
      if (!result) {
        throw new Error('Geri alma sonucu alinamadi.');
      }

      setSnapshot(result.snapshot);
      setSubtitleItems(result.items);
      if (result.workspace) {
        setSubtitleWorkspace(result.workspace);
      } else if (selectedVideo) {
        const workspace = await window.subtitleAnalyzer?.archive.getSubtitleWorkspace({ videoId: selectedVideo.id });
        setSubtitleWorkspace(workspace ?? null);
      }
      setNotice(result.message);
    } catch (error) {
      setErrorMessage(errorToMessage(error));
    } finally {
      setBusyLabel(null);
    }
  }

  return {
    handleApplySubtitleBulkEdit,
    handleCleanSelectedSubtitles,
    handleCleanSubtitle,
    handleExportSelectedSubtitles,
    handlePreviewSubtitleBulkEdit,
    handleSaveTranscriptEdit,
    handleUndoSubtitleEdit
  };
}
