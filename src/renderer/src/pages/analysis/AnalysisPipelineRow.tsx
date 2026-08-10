import type { ComponentType, ReactElement } from 'react';

export function AnalysisPipelineRow({
  icon: Icon,
  label,
  active
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  active: boolean;
}): ReactElement {
  return (
    <div className={`analysis-pipeline-row ${active ? 'active' : ''}`}>
      <Icon size={15} />
      <span>{label}</span>
      <i />
    </div>
  );
}
