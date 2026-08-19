import type { AnalysisNgramSize, AnalysisTimelineBucket } from '../../../shared/archive.js';

const stopWords = new Set([
  'acaba',
  'ama',
  'artık',
  'aslında',
  'az',
  'bazı',
  'ben',
  'bence',
  'beri',
  'bir',
  'biri',
  'biz',
  'bu',
  'buna',
  'bunda',
  'bundan',
  'bunu',
  'bunun',
  'burada',
  'çok',
  'çünkü',
  'da',
  'daha',
  'de',
  'değil',
  'diye',
  'eğer',
  'en',
  'fakat',
  'gibi',
  'hem',
  'hep',
  'hepsi',
  'her',
  'hiç',
  'için',
  'ile',
  'ise',
  'işte',
  'kadar',
  'ki',
  'mı',
  'mi',
  'mu',
  'mü',
  'nasıl',
  'ne',
  'neden',
  'nerede',
  'o',
  'olan',
  'olarak',
  'oldu',
  'olduğu',
  'olur',
  'ona',
  'ondan',
  'onu',
  'onun',
  'şey',
  'şimdi',
  'şu',
  've',
  'veya',
  'ya',
  'yani'
]);

export function buildFtsQuery(query: string): string {
  const tokens = tokenizeForAnalysis(query).slice(0, 8);
  return tokens.map((token) => `${token}*`).join(' ');
}

export function normalizeNgramSize(value: AnalysisNgramSize | undefined): AnalysisNgramSize {
  return value === 2 || value === 3 ? value : 1;
}

export function tokenizeForAnalysis(text: string): string[] {
  return (
    text
      .toLocaleLowerCase('tr-TR')
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((token) => token.length > 1 && !stopWords.has(token)) ?? []
  );
}

export function buildNgrams(tokens: string[], size: AnalysisNgramSize): string[] {
  const ngrams: string[] = [];
  for (let index = 0; index <= tokens.length - size; index += 1) {
    ngrams.push(tokens.slice(index, index + size).join(' '));
  }
  return ngrams;
}

export function countQueryMatches(text: string, query: string): number {
  const queryTokens = tokenizeForAnalysis(query);
  if (queryTokens.length === 0) {
    return 0;
  }

  const tokens = tokenizeForAnalysis(text);
  const ngramSize = Math.min(queryTokens.length, 3) as AnalysisNgramSize;
  const needle = queryTokens.slice(0, ngramSize).join(' ');
  return buildNgrams(tokens, ngramSize).filter((term) => term === needle).length;
}

export function createSnippet(text: string, queryTokens: string[]): string {
  const compactText = text.replace(/\s+/g, ' ').trim();
  const lowerText = compactText.toLocaleLowerCase('tr-TR');
  const firstMatchIndex =
    queryTokens
      .map((token) => lowerText.indexOf(token.toLocaleLowerCase('tr-TR')))
      .filter((index) => index >= 0)
      .sort((first, second) => first - second)[0] ?? 0;
  const start = Math.max(0, firstMatchIndex - 90);
  const end = Math.min(compactText.length, firstMatchIndex + 220);
  let snippet = `${start > 0 ? '...' : ''}${compactText.slice(start, end)}${end < compactText.length ? '...' : ''}`;

  for (const token of queryTokens.slice(0, 5)) {
    snippet = snippet.replace(new RegExp(`(${escapeRegExp(token)})`, 'giu'), '<mark>$1</mark>');
  }

  return snippet;
}

export function getTimelineBucket(value: string | null, bucket: AnalysisTimelineBucket): string {
  if (!value) {
    return 'tarih-yok';
  }

  return bucket === 'day' ? value.slice(0, 10) : value.slice(0, 7);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
