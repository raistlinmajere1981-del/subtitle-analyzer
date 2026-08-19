import type { CleanedSubtitle, SubtitleCue } from './types.js';

export function cleanRawSubtitleText(rawText: string): CleanedSubtitle {
  const subtitleText = cleanVttText(rawText);
  if (subtitleText.text.trim().length > 0) {
    return subtitleText;
  }

  return cleanPlainText(rawText);
}

export function getTranscriptStats(text: string): Pick<CleanedSubtitle, 'segmentCount' | 'wordCount'> {
  const compactText = text.replace(/\s+/g, ' ').trim();
  const words = compactText.length > 0 ? compactText.split(/\s+/) : [];
  const segmentCount = text
    .split(/\n{2,}|\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;

  return {
    segmentCount,
    wordCount: words.length
  };
}

function cleanVttText(rawText: string): CleanedSubtitle {
  const segments = pickFinalCaptionSegments(extractVttCues(rawText));
  const uniqueSegments: string[] = [];

  for (const segment of segments) {
    const previous = uniqueSegments.at(-1);
    if (previous === segment) {
      continue;
    }

    uniqueSegments.push(segment);
  }

  const compactText = uniqueSegments.join(' ').replace(/\s+/g, ' ').trim();
  const text = paragraphize(compactText);
  const words = compactText.length > 0 ? compactText.split(/\s+/) : [];

  return {
    text,
    segmentCount: uniqueSegments.length,
    wordCount: words.length
  };
}

function cleanPlainText(rawText: string): CleanedSubtitle {
  const lines = rawText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => !isSubtitleMetadataLine(line))
    .map(cleanCueLine)
    .filter(Boolean);
  const paragraphs: string[] = [];
  let current = '';

  for (const line of lines) {
    const next = current ? `${current} ${line}` : line;
    if (next.length > 620 && current.length > 0) {
      paragraphs.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current.length > 0) {
    paragraphs.push(current);
  }

  const text = paragraphs.join('\n\n').trim();
  const wordCount = text.length > 0 ? text.replace(/\s+/g, ' ').split(/\s+/).length : 0;

  return {
    text,
    segmentCount: lines.length,
    wordCount
  };
}

function isSubtitleMetadataLine(line: string): boolean {
  return (
    line === 'WEBVTT' ||
    line.startsWith('WEBVTT ') ||
    line.startsWith('NOTE') ||
    line.includes('-->') ||
    /^\d+$/.test(line)
  );
}

function extractVttCues(rawText: string): SubtitleCue[] {
  return rawText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n\r?\n+/)
    .map((block) => parseVttCueBlock(block))
    .filter((cue): cue is SubtitleCue => cue !== null && cue.text.length > 0);
}

function parseVttCueBlock(block: string): SubtitleCue | null {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0 || lines[0] === 'WEBVTT' || lines[0]?.startsWith('NOTE')) {
    return null;
  }

  const timingIndex = lines.findIndex((line) => line.includes('-->'));
  if (timingIndex === -1) {
    return null;
  }

  const timing = parseVttTimingLine(lines[timingIndex] ?? '');
  if (!timing) {
    return null;
  }

  const cueText = lines
    .slice(timingIndex + 1)
    .filter((line) => !line.includes('-->'))
    .map(cleanCueLine)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cueText.length > 0
    ? {
        ...timing,
        text: cueText
      }
    : null;
}

function pickFinalCaptionSegments(cues: SubtitleCue[]): string[] {
  const shortBridgeCues = cues.filter((cue) => cue.endMs > cue.startMs && cue.endMs - cue.startMs <= 120);

  if (shortBridgeCues.length >= 3 && shortBridgeCues.length >= cues.length * 0.25) {
    const segments: string[] = [];

    for (let index = 0; index < cues.length; index += 1) {
      const cue = cues[index] as SubtitleCue;
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

function isShortBridgeCue(cue: SubtitleCue): boolean {
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

  return normalizedText.startsWith(`${normalizedPrefix} `)
    ? normalizedText.slice(normalizedPrefix.length).trim()
    : '';
}

function normalizeCaptionSpacing(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function parseVttTimingLine(line: string): Pick<SubtitleCue, 'startMs' | 'endMs'> | null {
  const match = line.match(
    /(\d{2}:\d{2}:\d{2}[\.,]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[\.,]\d{3})/
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
  const [hours = '0', minutes = '0', secondsPart = '0'] = value.replace(',', '.').split(':');
  const seconds = Number.parseFloat(secondsPart);

  return (
    Number.parseInt(hours, 10) * 60 * 60 * 1000 +
    Number.parseInt(minutes, 10) * 60 * 1000 +
    Math.round(seconds * 1000)
  );
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
