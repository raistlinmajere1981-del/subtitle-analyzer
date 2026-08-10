import type { SubtitleAnalyzerApi } from '../../preload';

declare global {
  interface Window {
    subtitleAnalyzer?: SubtitleAnalyzerApi;
  }
}

export {};
