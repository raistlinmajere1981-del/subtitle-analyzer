import { useEffect, useState } from 'react';
import type { SubtitleWorkspace, VideoRecord } from '../../../../shared/archive';
import { errorToMessage } from '../../lib/errors';

interface UseSubtitleWorkspaceRuntimeInput {
  activeNav: string;
  selectedVideo: VideoRecord | null;
  setErrorMessage: (message: string | null) => void;
}

export function useSubtitleWorkspaceRuntime({
  activeNav,
  selectedVideo,
  setErrorMessage
}: UseSubtitleWorkspaceRuntimeInput) {
  const [subtitleWorkspace, setSubtitleWorkspace] = useState<SubtitleWorkspace | null>(null);
  const [isSubtitleWorkspaceBusy, setIsSubtitleWorkspaceBusy] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [showRawTimestamps, setShowRawTimestamps] = useState(true);
  const isTranscriptDirty =
    activeNav === 'subtitles' && subtitleWorkspace !== null && transcriptDraft !== subtitleWorkspace.cleanedText;

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace(videoId: string): Promise<void> {
      setIsSubtitleWorkspaceBusy(true);
      setSubtitleWorkspace((current) => (current?.videoId === videoId ? current : null));

      try {
        const workspace = await window.subtitleAnalyzer?.archive.getSubtitleWorkspace({ videoId });
        if (!cancelled) {
          setSubtitleWorkspace(workspace ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setSubtitleWorkspace(null);
          setErrorMessage(errorToMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsSubtitleWorkspaceBusy(false);
        }
      }
    }

    if (activeNav === 'subtitles' && selectedVideo) {
      void loadWorkspace(selectedVideo.id);
    } else {
      setSubtitleWorkspace(null);
    }

    return () => {
      cancelled = true;
    };
  }, [activeNav, selectedVideo?.id, setErrorMessage]);

  useEffect(() => {
    setTranscriptDraft(subtitleWorkspace?.cleanedText ?? '');
  }, [subtitleWorkspace?.videoId, subtitleWorkspace?.cleanedText]);

  useEffect(() => {
    if (!isTranscriptDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isTranscriptDirty]);

  return {
    isSubtitleWorkspaceBusy,
    isTranscriptDirty,
    setIsSubtitleWorkspaceBusy,
    setShowRawTimestamps,
    setSubtitleWorkspace,
    setTranscriptDraft,
    showRawTimestamps,
    subtitleWorkspace,
    transcriptDraft
  };
}
