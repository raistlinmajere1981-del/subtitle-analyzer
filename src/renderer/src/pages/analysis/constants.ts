import type { AnalysisIndexSummary } from '../../../../shared/archive';

export const emptyAnalysisSummary: AnalysisIndexSummary = {
  totalVideos: 0,
  readyVideos: 0,
  transcriptDocuments: 0,
  indexedDocuments: 0,
  totalIndexedWords: 0,
  staleDocuments: 0,
  channelsWithIndexedDocuments: 0,
  lastIndexedAt: null
};
