import type { ReactElement } from 'react';
import type { ScanChannelProgress, SubtitleDownloadProgress } from '../../../shared/archive';

export function ScanProgressPanel({
  progress,
  onCancel
}: {
  progress: ScanChannelProgress;
  onCancel: () => void;
}): ReactElement {
  const percent =
    progress.totalVideos > 0 ? Math.min(100, Math.round((progress.processedVideos / progress.totalVideos) * 100)) : 8;
  const remaining = Math.max(0, progress.totalVideos - progress.processedVideos);

  return (
    <section className="scan-progress-panel">
      <div className="scan-progress-copy">
        <strong>{progress.message}</strong>
        <span>{progress.currentTitle ?? 'Kanal ve video listesi hazirlaniyor'}</span>
      </div>
      <div className="scan-progress-meter" aria-label="Kanal tarama ilerlemesi">
        <i style={{ width: `${percent}%` }} />
      </div>
      <div className="scan-progress-meta">
        <span>{progress.processedVideos} islenen</span>
        <span>{remaining} kalan</span>
        <span>{progress.totalVideos || '-'} toplam</span>
      </div>
      <button className="secondary-button" disabled={!progress.canCancel} onClick={onCancel} type="button">
        Iptal
      </button>
    </section>
  );
}

export function SubtitleDownloadProgressPanel({
  progress,
  onCancel
}: {
  progress: SubtitleDownloadProgress;
  onCancel: () => void;
}): ReactElement {
  const percent =
    progress.total > 0 ? Math.min(100, Math.round((progress.completed / progress.total) * 100)) : 8;
  const remaining = Math.max(0, progress.total - progress.completed);

  return (
    <section className="scan-progress-panel">
      <div className="scan-progress-copy">
        <strong>{progress.message}</strong>
        <span>{progress.currentTitle ?? 'Altyazi indirme kuyrugu hazirlaniyor'}</span>
      </div>
      <div className="scan-progress-meter" aria-label="Altyazi indirme ilerlemesi">
        <i style={{ width: `${percent}%` }} />
      </div>
      <div className="scan-progress-meta">
        <span>{progress.completed} islenen</span>
        <span>{progress.skipped} atlanan</span>
        <span>{remaining} kalan</span>
        <span>{progress.total || '-'} toplam</span>
      </div>
      <button className="secondary-button" disabled={!progress.canCancel} onClick={onCancel} type="button">
        Iptal
      </button>
    </section>
  );
}
