import type { SubtitleEditOperationType } from '../../../shared/archive';

export function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR', { notation: value >= 10000 ? 'compact' : 'standard' }).format(value);
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) {
    return '-';
  }

  if (minutes < 60) {
    return `${minutes} dk`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours} sa ${remaining} dk`;
}

export function operationLabel(operationType: SubtitleEditOperationType): string {
  const labels: Record<SubtitleEditOperationType, string> = {
    'manual-edit': 'Elle edit',
    'clean-from-raw': 'Transcript olusturma',
    'trim-empty-lines': 'Bos satir temizligi',
    'dedupe-repeats': 'Tekrar azaltma',
    lowercase: 'Kucuk harf',
    uppercase: 'Buyuk harf',
    'find-replace': 'Bul/degistir'
  };

  return labels[operationType];
}

export function getFileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}
