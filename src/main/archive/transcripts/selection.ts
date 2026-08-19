import type { SubtitleAssetSummary } from '../../../shared/archive.js';

export function pickPreferredAsset(assets: SubtitleAssetSummary[]): SubtitleAssetSummary | null {
  return (
    [...assets].sort((first, second) => {
      const firstLanguageScore = isTurkish(first.language) ? 0 : 1;
      const secondLanguageScore = isTurkish(second.language) ? 0 : 1;
      if (firstLanguageScore !== secondLanguageScore) {
        return firstLanguageScore - secondLanguageScore;
      }

      const firstSourceScore = first.source === 'manual' ? 0 : 1;
      const secondSourceScore = second.source === 'manual' ? 0 : 1;
      if (firstSourceScore !== secondSourceScore) {
        return firstSourceScore - secondSourceScore;
      }

      return second.downloadedAt.localeCompare(first.downloadedAt);
    })[0] ?? null
  );
}

function isTurkish(language: string): boolean {
  return language === 'tr' || language.startsWith('tr-');
}
