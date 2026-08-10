import type { ReactElement } from 'react';

interface AnalysisMetric {
  label: string;
  value: string;
  note: string;
}

export function AnalysisMetricCard({ label, value, note }: AnalysisMetric): ReactElement {
  return (
    <div className="analysis-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
