import type { ReactElement } from 'react';
import type { ChannelSummary, SubtitleStatus } from '../../../shared/archive';

export function StatusPill({ status }: { status: ChannelSummary['status'] }): ReactElement {
  return <span className={`status-pill status-${status.toLocaleLowerCase('tr-TR')}`}>{status}</span>;
}

export function SubtitlePill({ status }: { status: SubtitleStatus }): ReactElement {
  return <span className={`subtitle-pill subtitle-${status.toLocaleLowerCase('tr-TR')}`}>{status}</span>;
}
