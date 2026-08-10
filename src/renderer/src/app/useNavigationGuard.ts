import type { NavKey } from './navigation';

interface UseNavigationGuardInput {
  isTranscriptDirty: boolean;
  setActiveNav: (nextNav: NavKey) => void;
  setSelectedVideoId: (videoId: string) => void;
}

export function useNavigationGuard({
  isTranscriptDirty,
  setActiveNav,
  setSelectedVideoId
}: UseNavigationGuardInput) {
  function confirmDiscardTranscriptChanges(): boolean {
    if (!isTranscriptDirty) {
      return true;
    }

    return window.confirm('Degisiklikleri kaybetmek istiyor musun?');
  }

  function handleSelectSubtitle(videoId: string): void {
    if (!confirmDiscardTranscriptChanges()) {
      return;
    }

    setSelectedVideoId(videoId);
  }

  function handleNavigate(nextNav: NavKey): void {
    if (nextNav !== 'subtitles' && !confirmDiscardTranscriptChanges()) {
      return;
    }

    setActiveNav(nextNav);
  }

  return {
    confirmDiscardTranscriptChanges,
    handleNavigate,
    handleSelectSubtitle
  };
}
