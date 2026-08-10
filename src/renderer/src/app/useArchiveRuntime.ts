import { useEffect, useState } from 'react';
import type {
  ArchiveSnapshot,
  ScanChannelProgress,
  SubtitleDownloadProgress,
  ToolStatusSnapshot
} from '../../../shared/archive';
import { errorToMessage } from '../lib/errors';

const activeScanPhases = new Set<ScanChannelProgress['phase']>(['starting', 'listing', 'details', 'saving']);
const terminalScanPhases = new Set<ScanChannelProgress['phase']>(['done', 'cancelled', 'error']);
const terminalSubtitleStatuses = new Set<SubtitleDownloadProgress['status']>(['done', 'cancelled', 'error']);

const emptySnapshot: ArchiveSnapshot = {
  archivePath: '',
  channels: [],
  videos: []
};

export function useArchiveRuntime() {
  const [snapshot, setSnapshot] = useState<ArchiveSnapshot>(emptySnapshot);
  const [tools, setTools] = useState<ToolStatusSnapshot>({ tools: [] });
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>('Arsiv yukleniyor');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subtitleProgress, setSubtitleProgress] = useState<SubtitleDownloadProgress | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanChannelProgress | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData(): Promise<void> {
      try {
        const [archiveSnapshot, toolSnapshot] = await Promise.all([
          window.subtitleAnalyzer?.archive.getSnapshot(),
          window.subtitleAnalyzer?.tools.getStatus()
        ]);

        if (cancelled) {
          return;
        }

        if (archiveSnapshot) {
          setSnapshot(archiveSnapshot);
          setSelectedChannelId((current) => current ?? archiveSnapshot.channels[0]?.id ?? null);
          setSelectedVideoId((current) => current ?? archiveSnapshot.videos[0]?.id ?? null);
        }

        if (toolSnapshot) {
          setTools(toolSnapshot);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(errorToMessage(error));
        }
      } finally {
        if (!cancelled) {
          setBusyLabel(null);
        }
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return window.subtitleAnalyzer?.archive.onSubtitleProgress((progress) => {
      setSubtitleProgress(progress);

      if (progress.canCancel && progress.total > 0) {
        setBusyLabel(`Altyazi indiriliyor (${Math.min(progress.completed + 1, progress.total)}/${progress.total})`);
      } else if (!progress.canCancel && terminalSubtitleStatuses.has(progress.status)) {
        setBusyLabel(null);
      }
    });
  }, []);

  useEffect(() => {
    return window.subtitleAnalyzer?.archive.onScanProgress((progress) => {
      setScanProgress(progress);

      if (activeScanPhases.has(progress.phase)) {
        setBusyLabel(progress.message);
      } else if (terminalScanPhases.has(progress.phase)) {
        setBusyLabel(null);
      }
    });
  }, []);

  useEffect(() => {
    if (scanProgress && terminalScanPhases.has(scanProgress.phase) && busyLabel !== null) {
      setBusyLabel(null);
    }
  }, [busyLabel, scanProgress]);

  return {
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
    setTools,
    snapshot,
    subtitleProgress,
    tools
  };
}
