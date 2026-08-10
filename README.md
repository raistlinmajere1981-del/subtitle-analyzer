# Subtitle Analyzer

Electron tabanli yerel YouTube kanal altyazi arsivi ve analiz uygulamasi.

## Mevcut Durum

- Electron + React + TypeScript iskeleti hazir.
- Kanal arsivi merkezli UI calisir.
- `Kanal ekle` ve `Manuel tara` akislari `yt-dlp` ile metadata tarar.
- Kanal ve video metadata kayitlari SQLite icinde tutulur.
- Filtrelenmis video listesi icin TR + original altyazi indirme akisi calisir.
- Temizlik ve analiz henuz gercek veriye baglanmadi.

## Gereksinimler

- Node.js 24 LTS onerilir. Bu makinede Node `v26.1.0` mevcut.
- npm 11+
- yt-dlp
- ffmpeg
- sqlite3

Bu makinede kontrol edilen araclar:

- `yt-dlp 2026.03.17`
- `ffmpeg n8.1.1`
- `sqlite3 3.53.0`

## Komutlar

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## V1 Kapsami

- Sadece kanal odakli arsiv.
- Kanal yenileme sadece manuel.
- Altyazi kapsami: TR + original/varsayilan dil.
- Analiz modu: yerel oncelikli; AI/LLM entegrasyonu sonraki faz.
- Raw altyazi dosyalari korunur; temizlenmis transcript turetilmis cikti olarak tutulur.

## Yerel Arsiv

Gelisim modunda arsiv verisi Electron userData altinda tutulur:

```text
~/.config/Subtitle Analyzer/archive/subtitle-analyzer.sqlite
```

Ilk tarama `yt-dlp --dump-single-json --flat-playlist` kullanir. Bu hizli kanal listeleme icin uygundur; YouTube'un sagladigi metadata eksikse uygulama sadece eksik kalan videolar icin tekil metadata sorgusu yaparak tarih ve sure alanlarini tamamlar.

Altyazi indirme raw dosyalari su yapida saklar:

```text
~/.config/Subtitle Analyzer/archive/subtitles/<channel-id>/<video-id>/raw/<video-id>.<lang>.vtt
```

`subtitle_assets` tablosu indirilen dil, kaynak tipi ve raw dosya yolunu tutar. Raw dosyalar temizleme asamasinda ezilmeyecek; temiz transcript ayrica uretilecek.
