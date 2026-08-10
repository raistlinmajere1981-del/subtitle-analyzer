import type { ReactElement } from 'react';
import type { ChannelSummary } from '../../../../shared/archive';
import { AnalysisMainPanel } from './AnalysisMainPanel';
import { AnalysisScopePanel } from './AnalysisScopePanel';
import { useAnalysisRuntime } from './useAnalysisRuntime';

export function AnalysisPage({
  selectedChannel,
  onOpenSubtitles,
  onArchiveChanged
}: {
  selectedChannel: ChannelSummary | null;
  onOpenSubtitles: () => void;
  onArchiveChanged: () => Promise<void>;
}): ReactElement {
  const analysis = useAnalysisRuntime({ selectedChannel, onArchiveChanged });

  return (
    <section className="analysis-layout">
      <AnalysisMainPanel selectedChannel={selectedChannel} onOpenSubtitles={onOpenSubtitles} {...analysis} />
      <AnalysisScopePanel selectedChannel={selectedChannel} {...analysis} />
    </section>
  );
}
