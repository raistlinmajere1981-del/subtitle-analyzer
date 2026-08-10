export function stripRawTimestamps(rawText: string): string {
  return rawText
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.length > 0 &&
        trimmed !== 'WEBVTT' &&
        !trimmed.includes('-->') &&
        !/^Kind:/i.test(trimmed) &&
        !/^Language:/i.test(trimmed) &&
        !/^align:/i.test(trimmed)
      );
    })
    .map((line) => line.replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '').replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
    .join('\n');
}

export function trimEmptyTranscriptLines(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function dedupeAdjacentTranscriptLines(text: string): string {
  const result: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const normalized = line.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
    const previous = result.at(-1)?.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');

    if (normalized.length > 0 && normalized === previous) {
      continue;
    }

    result.push(line);
  }

  return result.join('\n').trim();
}

export interface TranscriptExclusionRange {
  startMs: number;
  endMs: number;
}

export interface TranscriptRangeRemovalResult {
  text: string;
  removedCueCount: number;
  keptCueCount: number;
  removedPreview: string;
}

export interface TimedSubtitleCue {
  startMs: number;
  endMs: number;
  text: string;
}

export function removeTranscriptRangeFromRaw(
  rawText: string,
  range: TranscriptExclusionRange
): TranscriptRangeRemovalResult {
  const normalizedRange = normalizeRange(range);
  const cues = extractTimedSubtitleCues(rawText);
  const removedCues = cues.filter((cue) => overlapsRange(cue, normalizedRange));
  const keptCues = cues.filter((cue) => !overlapsRange(cue, normalizedRange));

  return {
    text: buildCleanTranscriptFromCues(keptCues),
    removedCueCount: removedCues.length,
    keptCueCount: keptCues.length,
    removedPreview: previewCueText(removedCues)
  };
}

function normalizeRange(range: TranscriptExclusionRange): TranscriptExclusionRange {
  return {
    startMs: Math.max(0, Math.min(range.startMs, range.endMs)),
    endMs: Math.max(0, Math.max(range.startMs, range.endMs))
  };
}

function overlapsRange(cue: TimedSubtitleCue, range: TranscriptExclusionRange): boolean {
  return cue.endMs > range.startMs && cue.startMs < range.endMs;
}

export function extractTimedSubtitleCues(rawText: string): TimedSubtitleCue[] {
  return rawText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n\r?\n+/)
    .map((block) => parseSubtitleCueBlock(block))
    .filter((cue): cue is TimedSubtitleCue => cue !== null && cue.text.length > 0);
}

function parseSubtitleCueBlock(block: string): TimedSubtitleCue | null {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0 || lines[0] === 'WEBVTT' || lines[0]?.startsWith('NOTE')) {
    return null;
  }

  const timingIndex = lines.findIndex((line) => line.includes('-->'));
  if (timingIndex === -1) {
    return null;
  }

  const timing = parseTimingLine(lines[timingIndex] ?? '');
  if (!timing) {
    return null;
  }

  const text = lines
    .slice(timingIndex + 1)
    .filter((line) => !line.includes('-->'))
    .map(cleanCueLine)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 0 ? { ...timing, text } : null;
}

function parseTimingLine(line: string): Pick<TimedSubtitleCue, 'startMs' | 'endMs'> | null {
  const match = line.match(
    /((?:\d{1,2}:)?\d{2}:\d{2}[\.,]\d{3})\s+-->\s+((?:\d{1,2}:)?\d{2}:\d{2}[\.,]\d{3})/
  );

  if (!match) {
    return null;
  }

  return {
    startMs: parseTimestampMs(match[1] ?? ''),
    endMs: parseTimestampMs(match[2] ?? '')
  };
}

function parseTimestampMs(value: string): number {
  const parts = value.replace(',', '.').split(':');
  const secondsPart = parts.pop() ?? '0';
  const minutesPart = parts.pop() ?? '0';
  const hoursPart = parts.pop() ?? '0';
  const seconds = Number.parseFloat(secondsPart);

  return (
    Number.parseInt(hoursPart, 10) * 60 * 60 * 1000 +
    Number.parseInt(minutesPart, 10) * 60 * 1000 +
    Math.round(seconds * 1000)
  );
}

function buildCleanTranscriptFromCues(cues: TimedSubtitleCue[]): string {
  const segments = pickFinalCaptionSegments(cues);
  const uniqueSegments: string[] = [];

  for (const segment of segments) {
    const previous = uniqueSegments.at(-1);
    if (previous !== segment) {
      uniqueSegments.push(segment);
    }
  }

  return paragraphize(uniqueSegments.join(' ').replace(/\s+/g, ' ').trim());
}

function pickFinalCaptionSegments(cues: TimedSubtitleCue[]): string[] {
  const shortBridgeCues = cues.filter((cue) => cue.endMs > cue.startMs && cue.endMs - cue.startMs <= 120);

  if (shortBridgeCues.length >= 3 && shortBridgeCues.length >= cues.length * 0.25) {
    const segments: string[] = [];

    for (let index = 0; index < cues.length; index += 1) {
      const cue = cues[index] as TimedSubtitleCue;
      const nextCue = cues[index + 1];
      const isShortCue = isShortBridgeCue(cue);
      const nextIsShortCue = nextCue ? isShortBridgeCue(nextCue) : false;
      const previous = segments.at(-1);

      if (isShortCue) {
        if (normalizeCaptionSpacing(cue.text) !== normalizeCaptionSpacing(previous ?? '')) {
          segments.push(cue.text);
        }
        continue;
      }

      if (nextIsShortCue && normalizeCaptionSpacing(nextCue?.text ?? '') === normalizeCaptionSpacing(cue.text)) {
        continue;
      }

      if (previous && startsWithCaptionText(cue.text, previous)) {
        if (!nextIsShortCue) {
          const suffix = removeCaptionPrefix(cue.text, previous);
          if (suffix.length > 0) {
            segments.push(suffix);
          }
        }
        continue;
      }

      segments.push(cue.text);
    }

    return segments;
  }

  return cues.map((cue) => cue.text);
}

function isShortBridgeCue(cue: TimedSubtitleCue): boolean {
  return cue.endMs > cue.startMs && cue.endMs - cue.startMs <= 120;
}

function startsWithCaptionText(text: string, prefix: string): boolean {
  const normalizedText = normalizeCaptionSpacing(text);
  const normalizedPrefix = normalizeCaptionSpacing(prefix);

  return normalizedText === normalizedPrefix || normalizedText.startsWith(`${normalizedPrefix} `);
}

function removeCaptionPrefix(text: string, prefix: string): string {
  const normalizedText = normalizeCaptionSpacing(text);
  const normalizedPrefix = normalizeCaptionSpacing(prefix);

  return normalizedText.startsWith(`${normalizedPrefix} `) ? normalizedText.slice(normalizedPrefix.length).trim() : '';
}

function normalizeCaptionSpacing(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function cleanCueLine(line: string): string {
  return decodeEntities(
    line
      .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\{\\an\d+\}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function paragraphize(text: string): string {
  if (text.length === 0) {
    return '';
  }

  const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [text];
  const paragraphs: string[] = [];
  let current = '';

  for (const sentence of sentences.map((value) => value.trim()).filter(Boolean)) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > 620 && current.length > 0) {
      paragraphs.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current.length > 0) {
    paragraphs.push(current);
  }

  return paragraphs.join('\n\n');
}

function previewCueText(cues: TimedSubtitleCue[]): string {
  const preview = cues
    .map((cue) => cue.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return preview.length > 180 ? `${preview.slice(0, 177)}...` : preview;
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos|nbsp);/g, (match, entity: string) => {
    if (entity === 'amp') {
      return '&';
    }
    if (entity === 'lt') {
      return '<';
    }
    if (entity === 'gt') {
      return '>';
    }
    if (entity === 'quot') {
      return '"';
    }
    if (entity === 'apos') {
      return "'";
    }
    if (entity === 'nbsp') {
      return ' ';
    }

    if (entity.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return match;
  });
}
