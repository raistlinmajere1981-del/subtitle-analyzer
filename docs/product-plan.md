# Product Plan

## Kurulum ve Teknik Taban

- Uygulama Electron + React + TypeScript + Vite uzerinde ilerler.
- Paket yoneticisi npm olur; pnpm/yarn zorunlu degil.
- Metadata ve indeksler SQLite icinde, thumbnail ve altyazi dosyalari dosya sisteminde tutulur.
- `yt-dlp` kanal metadata, thumbnail ve altyazi indirme icin birincil kaynak olur.
- `ffmpeg` sure/medya dogrulama ve ileride opsiyonel donusumler icin sistem gereksinimi olarak kalir.

## Dummy UI Bolumleri

- Arsiv: kanal listesi, kanal metrikleri, video tablosu, filtreler, toplu altyazi indirme aksiyonlari.
- Altyazilar: raw VTT onizleme, temiz transcript onizleme, temizlik adimlari.
- Analiz: arama, metrikler, konu agirliklari, analiz secenekleri.
- Ayarlar: sistem arac durumlari, v1 varsayilanlari.

## Veri Modeli Taslagi

- Channel: YouTube kanal id, ad, handle, son tarama zamani, durum, toplam video sayisi.
- Video: YouTube video id, kanal id, baslik, yayin tarihi, hafta gunu, sure, tur, thumbnail yolu, altyazi durumu.
- SubtitleAsset: video id, dil, kaynak tipi, raw dosya yolu, temiz dosya yolu, indirme tarihi.
- AnalysisIndex: video id, temiz metin yolu, token/segment istatistikleri, indekslenme tarihi.
- Job: is tipi, hedef id, durum, hata mesaji, baslangic/bitis zamani.

## Analiz Secenekleri

- Full-text search: temiz transcript uzerinden kanal/video filtreli arama.
- KWIC: eslesen ifadenin once/sonra baglam satirlari.
- Frequency: kelime, bigram, trigram ve stopword haric sayimlar.
- Timeline: kelime/konu yogunlugunu yayin tarihi, ay, hafta gunu ve video turune gore izleme.
- Compare: kanal, video, donem ve video turu arasinda ifade farklari.
- Topic clustering: ilk surumde yerel TF-IDF/anahtar kelime tabanli kumeleme.
- Quality stats: altyazi dili, manual/auto durumu, segment sayisi, metin yogunlugu.
- Export: analiz tablolari ve arama sonuclari icin CSV/JSON cikti.

## Sonraki Implementasyon Sirasi

1. Thumbnail dosya indirme ve local cache yolunu kaydet.
2. VTT temizleme ve transcript uretimini ekle.
3. Subtitle atolyasini raw/clean transcript dosyalarina bagla.
4. SQLite FTS veya yerel indeks ile arama/analiz ekranini gercek veriye bagla.
