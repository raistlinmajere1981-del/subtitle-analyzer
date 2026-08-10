import type {
  SubtitleBulkEditOperation,
  SubtitleExportFormat,
  SubtitleLanguageMode,
  SubtitleStatus,
  VideoType,
  WeekdayLabel
} from '../../../shared/archive';

export type DurationBucket = 'short' | 'medium' | 'long' | 'deep';
export type SubtitleSortOrder = 'newest' | 'oldest';

export const durationOptions: Array<[DurationBucket, string]> = [
  ['short', '0-10 dk'],
  ['medium', '10-30 dk'],
  ['long', '30-60 dk'],
  ['deep', '60+ dk']
];

export const subtitleSortOptions: Array<[SubtitleSortOrder, string]> = [
  ['newest', 'Yeni tarih once'],
  ['oldest', 'Eski tarih once']
];

export const typeOptions: Array<[VideoType, string]> = [
  ['Uzun video', 'Uzun video'],
  ['Shorts', 'Shorts'],
  ['Canli yayin', 'Canli yayin'],
  ['Premiere', 'Premiere']
];

export const dayOptions: Array<[WeekdayLabel, string]> = [
  ['Pazartesi', 'Pazartesi'],
  ['Sali', 'Sali'],
  ['Carsamba', 'Carsamba'],
  ['Persembe', 'Persembe'],
  ['Cuma', 'Cuma'],
  ['Cumartesi', 'Cumartesi'],
  ['Pazar', 'Pazar']
];

export const subtitleOptions: Array<[SubtitleStatus, string]> = [
  ['Hazir', 'Hazir'],
  ['Temizlendi', 'Temizlendi'],
  ['Indirilecek', 'Indirilecek'],
  ['Eksik', 'Eksik']
];

export const subtitleLanguageOptions: Array<[SubtitleLanguageMode, string]> = [
  ['tr-original', 'Turkce + orijinal'],
  ['tr', 'Turkce'],
  ['original', 'Orijinal']
];

export const subtitleExportOptions: Array<[SubtitleExportFormat, string]> = [
  ['txt', 'TXT'],
  ['json', 'JSON'],
  ['vtt', 'Raw VTT']
];

export const subtitleBulkOperationOptions: Array<[SubtitleBulkEditOperation['type'], string]> = [
  ['trim-empty-lines', 'Bos satirlari temizle'],
  ['dedupe-repeats', 'Ardisik tekrar azalt'],
  ['find-replace', 'Bul/degistir'],
  ['lowercase', 'Kucuk harf'],
  ['uppercase', 'Buyuk harf']
];
