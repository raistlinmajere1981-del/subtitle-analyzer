import type { FormEvent } from 'react';
import type {
  ArchiveSnapshot,
  ChannelSummary,
  ScanChannelFilters,
  ScanChannelProgress,
  SubtitleDownloadProgress,
  SubtitleLanguageMode
} from '../../../../shared/archive';
import { findScannedChannelId, isLikelyYoutubePlaylistUrl, normalizeChannelInput, normalizePlaylistInput } from '../../lib/channel';
import { errorToMessage } from '../../lib/errors';

interface UseArchiveActionsInput {
  channelInput: string;
  channelPlaylistInput: string;
  confirmDiscardTranscriptChanges: () => boolean;
  manualArchiveName: string;
  scanFilters: ScanChannelFilters;
  selectedChannel: ChannelSummary | null;
  setActiveNav: (nextNav: 'archive') => void;
  setBusyLabel: (value: string | null) => void;
  setChannelInput: (value: string) => void;
  setChannelPlaylistInput: (value: string) => void;
  setCheckedVideoIds: (value: string[] | ((current: string[]) => string[])) => void;
  setErrorMessage: (value: string | null) => void;
  setIsAddChannelOpen: (value: boolean) => void;
  setIsManualArchiveOpen: (value: boolean) => void;
  setManualArchiveName: (value: string) => void;
  setNotice: (value: string | null) => void;
  setScanProgress: (value: ScanChannelProgress | null) => void;
  setSelectedChannelId: (value: string | null | ((current: string | null) => string | null)) => void;
  setSelectedVideoId: (value: string | null | ((current: string | null) => string | null)) => void;
  setSnapshot: (value: ArchiveSnapshot) => void;
  setSubtitleProgress: (value: SubtitleDownloadProgress | null) => void;
  subtitleLanguageMode: SubtitleLanguageMode;
}

export function useArchiveActions({
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
}: UseArchiveActionsInput) {
  async function refreshSnapshot(): Promise<void> {
    const nextSnapshot = await window.subtitleAnalyzer?.archive.getSnapshot();
    if (!nextSnapshot) {
      return;
    }

    setSnapshot(nextSnapshot);
    setSelectedChannelId((current) => {
      if (current && nextSnapshot.channels.some((channel) => channel.id === current)) {
        return current;
      }

      return nextSnapshot.channels[0]?.id ?? null;
    });
  }

  function handleAddChannel(): void {
    if (!confirmDiscardTranscriptChanges()) {
      return;
    }

    setActiveNav('archive');
    setErrorMessage(null);
    setNotice(null);
    setIsManualArchiveOpen(false);
    setIsAddChannelOpen(true);
  }

  function handleAddManualArchive(): void {
    if (!confirmDiscardTranscriptChanges()) {
      return;
    }

    setActiveNav('archive');
    setErrorMessage(null);
    setNotice(null);
    setIsAddChannelOpen(false);
    setIsManualArchiveOpen(true);
  }

  async function handleRefreshChannel(): Promise<void> {
    if (!selectedChannel) {
      handleAddChannel();
      return;
    }

    await scanChannel(selectedChannel.sourceUrl, selectedChannel.id, 'new', scanFilters);
  }

  async function handleSubmitChannel(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const nextUrl = normalizeChannelInput(channelInput);
    if (!nextUrl) {
      setErrorMessage('Kanal URL veya @handle girmen gerekiyor.');
      return;
    }

    const playlistUrl = normalizePlaylistInput(channelPlaylistInput);
    if (playlistUrl && !isLikelyYoutubePlaylistUrl(playlistUrl)) {
      setErrorMessage('Gecerli bir YouTube oynatma listesi URL\'si girmen gerekiyor.');
      return;
    }

    setIsAddChannelOpen(false);
    const succeeded = await scanChannel(nextUrl, undefined, 'full', scanFilters, playlistUrl);

    if (succeeded) {
      setChannelInput('');
      setChannelPlaylistInput('');
    } else {
      setIsAddChannelOpen(true);
    }
  }

  async function handleSubmitManualArchive(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const archiveName = manualArchiveName.trim();
    if (!archiveName) {
      setErrorMessage('Manuel arsiv adi girmen gerekiyor.');
      return;
    }

    setBusyLabel('Manuel arsiv icin metinler seciliyor');
    setErrorMessage(null);
    setNotice(null);

    try {
      const result = await window.subtitleAnalyzer?.archive.importManualTexts({ archiveName });
      if (!result) {
        throw new Error('Manuel arsiv sonucu alinamadi.');
      }

      setSnapshot(result.snapshot);

      if (result.cancelled) {
        setNotice(result.message);
        return;
      }

      if (result.channelId) {
        setSelectedChannelId(result.channelId);
        setSelectedVideoId(result.snapshot.videos.find((video) => video.channelId === result.channelId)?.id ?? null);
      }

      setCheckedVideoIds([]);
      setManualArchiveName('');
      setIsManualArchiveOpen(false);
      setNotice(`${archiveName}: ${result.imported} metin eklendi, ${result.skipped} atlandi, ${result.failed} hata.`);
    } catch (error) {
      setErrorMessage(errorToMessage(error));
      await refreshSnapshot();
    } finally {
      setBusyLabel(null);
    }
  }

  async function scanChannel(
    url: string,
    channelId?: string,
    mode: 'full' | 'new' = 'full',
    filters?: ScanChannelFilters,
    playlistUrl?: string | null
  ): Promise<boolean> {
    const previousVideoCount = mode === 'new' && selectedChannel?.id === channelId ? selectedChannel?.videos ?? null : null;
    const isPlaylistScan = Boolean(playlistUrl);
    const startingMessage = mode === 'new'
      ? 'Yeni videolar kontrol ediliyor'
      : isPlaylistScan
        ? 'Oynatma listesi bilgisi aliniyor'
        : 'Kanal bilgisi aliniyor';

    setBusyLabel(startingMessage);
    setErrorMessage(null);
    setNotice(null);
    setScanProgress({
      phase: 'starting',
      totalVideos: 0,
      processedVideos: 0,
      currentVideoId: null,
      currentTitle: null,
      message: startingMessage,
      canCancel: true
    });

    try {
      const nextSnapshot = await window.subtitleAnalyzer?.archive.scanChannel({ url, channelId, mode, filters, playlistUrl });
      if (nextSnapshot) {
        const nextSelectedChannelId =
          channelId && nextSnapshot.channels.some((channel) => channel.id === channelId)
            ? channelId
            : findScannedChannelId(nextSnapshot, url) ?? nextSnapshot.channels[0]?.id ?? null;

        setSnapshot(nextSnapshot);
        setSelectedChannelId(nextSelectedChannelId);
        setSelectedVideoId(nextSnapshot.videos.find((video) => video.channelId === nextSelectedChannelId)?.id ?? null);
        if (mode === 'new' && previousVideoCount !== null) {
          const nextVideoCount =
            nextSnapshot.channels.find((channel) => channel.id === nextSelectedChannelId)?.videos ?? previousVideoCount;
          const addedVideoCount = Math.max(0, nextVideoCount - previousVideoCount);
          setNotice(addedVideoCount > 0 ? `${addedVideoCount} yeni video arsive eklendi.` : 'Yeni video bulunamadi.');
        } else {
          setNotice(isPlaylistScan ? 'Oynatma listesindeki videolar arsive yazildi.' : 'Kanal metadata arsive yazildi.');
        }
      } else {
        await refreshSnapshot();
      }
      return true;
    } catch (error) {
      setErrorMessage(errorToMessage(error));
      await refreshSnapshot();
      return false;
    } finally {
      setBusyLabel(null);
      setScanProgress(null);
    }
  }

  async function handleCancelScan(): Promise<void> {
    setBusyLabel('Tarama iptal ediliyor');
    await window.subtitleAnalyzer?.archive.cancelScan();
  }

  async function handleCancelSubtitleDownload(): Promise<void> {
    setBusyLabel('Altyazi indirme iptal ediliyor');
    await window.subtitleAnalyzer?.archive.cancelSubtitleDownload();
  }

  async function handleDeleteChannel(channel: ChannelSummary): Promise<void> {
    const confirmed = window.confirm(
      `${channel.name} kanalini arsivden silmek istiyor musun?\n\nBu islem kanal metadata kayitlarini, video kayitlarini ve indirilen altyazi dosyalarini temizler.`
    );

    if (!confirmed) {
      return;
    }

    setBusyLabel('Kanal siliniyor');
    setErrorMessage(null);
    setNotice(null);

    try {
      const nextSnapshot = await window.subtitleAnalyzer?.archive.deleteChannel({ channelId: channel.id });
      if (!nextSnapshot) {
        throw new Error('Kanal silme sonucu alinamadi.');
      }

      const nextChannelId = nextSnapshot.channels[0]?.id ?? null;
      setSnapshot(nextSnapshot);
      setSelectedChannelId(nextChannelId);
      setSelectedVideoId(nextSnapshot.videos.find((video) => video.channelId === nextChannelId)?.id ?? null);
      setCheckedVideoIds([]);
      setNotice(`${channel.name} arsivden silindi.`);
    } catch (error) {
      setErrorMessage(errorToMessage(error));
      await refreshSnapshot();
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleDownloadSubtitles(videoIds: string[], scopeLabel: string): Promise<void> {
    if (videoIds.length === 0) {
      setErrorMessage('Bu kapsamda indirilecek yeni altyazi yok.');
      return;
    }

    setBusyLabel(`Altyazi indiriliyor (0/${videoIds.length})`);
    setErrorMessage(null);
    setNotice(null);
    setSubtitleProgress(null);

    try {
      const result = await window.subtitleAnalyzer?.archive.downloadSubtitles({ videoIds, languageMode: subtitleLanguageMode });
      if (!result) {
        throw new Error('Altyazi indirme sonucu alinamadi.');
      }

      setSnapshot(result.snapshot);
      setNotice(
        `${scopeLabel}: ${result.downloaded} indirildi, ${result.skipped} atlandi, ${result.missing} bulunamadi, ${result.failed} hata${result.cancelled ? ', iptal edildi' : ''}.`
      );
    } catch (error) {
      setErrorMessage(errorToMessage(error));
      await refreshSnapshot();
    } finally {
      setBusyLabel(null);
    }
  }

  return {
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
  };
}
