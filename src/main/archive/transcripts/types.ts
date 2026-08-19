export interface CleanedSubtitle {
  text: string;
  segmentCount: number;
  wordCount: number;
}

export interface SubtitleCue {
  startMs: number;
  endMs: number;
  text: string;
}

export interface SubtitleTextFileNaming {
  publishedAt?: string | null;
  title?: string | null;
  fallbackName?: string | null;
}
