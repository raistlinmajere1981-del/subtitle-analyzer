# God File Analizi ve Parcalama Plani

## Ozet

Kaynak kodda asil sisme iki eksende toplanmis durumda:

- Renderer/UI: `src/renderer/src/App.tsx`, sayfa componentleri ve domain CSS parcalari
- Main process/is mantigi: `src/main/index.ts`, `src/main/archive/transcriptWorkflow.ts`, `src/shared/archive.ts`, `src/main/archive/analysis.ts`

Build ciktisi (`out`), arsiv verisi (`archive`) ve ekran goruntuleri (`tmp`) analiz disinda tutuldu.

## Refactor Durumu

Bu planin ilk renderer, CSS, main servis, Electron kabugu, transcript workflow, store repository, transcript helper, App hook, analysis altyapi ve analysis sayfa parcalama turlari uygulandi. Guncel durum:

| Dosya | Satir | Durum |
| --- | ---: | --- |
| `src/renderer/src/App.tsx` | 491 | App shell ve sayfa wiring seviyesine indi; hedef satir bandina girdi. |
| `src/renderer/src/app/useArchiveRuntime.ts` | 105 | Ilk arsiv yukleme, tool status ve progress event subscription akisi ayrildi. |
| `src/renderer/src/app/useNavigationGuard.ts` | 43 | Navigation ve transcript dirty guard ayrildi. |
| `src/renderer/src/pages/archive/useArchiveActions.ts` | 226 | Kanal tarama, silme ve altyazi indirme action'lari ayrildi. |
| `src/renderer/src/pages/archive/useArchiveViewState.ts` | 135 | Kanal secimi, video filtreleri, render batch ve indirilebilir video state'i ayrildi. |
| `src/renderer/src/pages/subtitles/useSubtitleActions.ts` | 348 | Subtitle temizleme, export, bulk edit, undo ve not action'lari ayrildi. |
| `src/renderer/src/pages/subtitles/useSubtitleListView.ts` | 66 | Altyazi liste filtreleri, render batch ve gorunur secim state'i ayrildi. |
| `src/renderer/src/pages/subtitles/useSubtitleWorkspaceRuntime.ts` | 88 | Workspace yukleme, transcript draft sync ve dirty uyarisi ayrildi. |
| `src/renderer/src/pages/subtitles/SubtitlesPage.tsx` | 160 | Altyazi sayfasi shell seviyesine indi; sol kutuphane ve editor panelleri ayrildi. |
| `src/renderer/src/pages/subtitles/SubtitleLibraryPanel.tsx` | 438 | Filtreler, secim, toplu islem, export ve altyazi listesi ayrildi. |
| `src/renderer/src/pages/subtitles/TranscriptEditorPanel.tsx` | 297 | Editor toolbar, raw/cleaned transcript, gecmis ve not UI'i ayrildi. |
| `src/renderer/src/pages/analysis/AnalysisPage.tsx` | 24 | Analiz sayfasi shell seviyesine indi; runtime ve paneller ayrildi. |
| `src/renderer/src/pages/analysis/useAnalysisRuntime.ts` | 314 | Analiz summary, index rebuild, arama, kaynak secimi ve timeline/frequency state akisi ayrildi. |
| `src/renderer/src/pages/analysis/AnalysisMainPanel.tsx` | 210 | KWIC, frekans, timeline, arama ve index toolbar gorunumu ayrildi. |
| `src/renderer/src/pages/analysis/AnalysisScopePanel.tsx` | 110 | Analiz kapsam karti, kaynak filtresi/secimi ve pipeline durumu ayrildi. |
| `src/renderer/src/pages/analysis/*` | 12-314 | Metric, pipeline row, snippet render ve empty summary sabitleri ayrildi. |
| `src/renderer/src/pages/archive/ArchivePage.tsx` | 379 | Kanal arsivi ve video listesi tasindi. |
| `src/renderer/src/pages/settings/SettingsPage.tsx` | 60 | Ayarlar sayfasi tasindi. |
| `src/renderer/src/components/*` | 10-67 | Ortak nav, progress, pill, filter ve notice componentleri ayrildi. |
| `src/renderer/src/lib/*` | 11-48 | Format, thumbnail, kanal normalize, hata ve transcript helperlari ayrildi. |
| `src/renderer/src/styles/index.css` | 8 | CSS girisi sadece import listesi oldu. |
| `src/renderer/src/styles/subtitles.css` | 5 | Altyazi/workbench CSS girisi import listesine indirildi. |
| `src/renderer/src/styles/subtitles/*.css` | 65-321 | Filtre, bulk, liste, editor ve transcript stilleri ayrildi. |
| `src/renderer/src/styles/archive.css` | 7 | Arsiv CSS girisi import listesine indirildi. |
| `src/renderer/src/styles/archive/*.css` | 56-150 | Arsiv base, kanal, metrik, filtre, secim, video ve state stilleri ayrildi. |
| `src/renderer/src/styles/analysis.css` | 6 | Analiz CSS girisi import listesine indirildi. |
| `src/renderer/src/styles/analysis/*.css` | 32-143 | Analiz controls, state, metric, result, source ve toggle stilleri ayrildi. |
| `src/renderer/src/styles/layout.css` | 7 | Ortak layout CSS girisi import listesine indirildi. |
| `src/renderer/src/styles/layout/*.css` | 35-84 | Shell, navigation, feedback, progress, forms, buttons ve grid/panel stilleri ayrildi. |
| `src/renderer/src/styles.css` | 1 | Eski import yolu icin uyumluluk shim'i olarak kaldi. |
| `src/main/index.ts` | 454 | Electron lifecycle, IPC registration ve scan/download orchestration seviyesine indi; transcript workflow ayrildi. |
| `src/main/archive/transcriptWorkflow.ts` | 487 | Workspace, single/bulk clean, manual edit, bulk edit preview/apply ve transcript isim normalizasyonu ayrildi. |
| `src/main/archive/ytDlp.ts` | 380 | yt-dlp komutlari, progress ve kanal tarama orchestration seviyesine indi; entry normalize/helperlari ayrildi. |
| `src/main/archive/ytDlp/entry.ts` | 282 | Video entry dedupe, tarih/sure/type/thumbnail normalize ve VideoRecord mapping ayrildi. |
| `src/main/archive/ytDlp/types.ts` | 36 | yt-dlp payload/entry tipleri ayrildi. |
| `src/main/archive/export.ts` | 202 | Altyazi export ve merge dosya yazma akisi ayrildi. |
| `src/main/archive/thumbnails.ts` | 125 | Kanal taramasi thumbnail cache akisi ayrildi. |
| `src/main/archive/assetProtocol.ts` | 57 | `subtitle-asset` scheme ve guvenli asset resolve ayrildi. |
| `src/main/window.ts` | 44 | BrowserWindow kurulumu ayrildi. |
| `src/main/archive/openPath.ts` | 29 | Arsiv disina cikmayi engelleyen path acma yardimcisi ayrildi. |
| `src/main/archive/store.ts` | 122 | Store artik facade seviyesinde; SQL snapshot, scan, video, subtitle asset ve transcript repository dosyalarinda. |
| `src/main/archive/store/scans.ts` | 171 | Kanal scan save/fail/delete persistence akisi ayrildi. |
| `src/main/archive/store/subtitleAssets.ts` | 144 | Subtitle asset listeleme, subtitle list item sorgusu ve download sonucu persistence'i ayrildi. |
| `src/main/archive/store/transcripts.ts` | 4 | Transcript repository girisi barrel dosyasina indirildi. |
| `src/main/archive/store/transcripts/*.ts` | 53-154 | Transcript document, edit, note ve undo repositoryleri ayrildi. |
| `src/main/archive/store/*` | 26-171 | Store schema, mapper, type, snapshot, scan, video, subtitle asset, transcript repository ve utils katmani ayrildi. |
| `src/main/archive/transcripts.ts` | 5 | Transcript helper girisi barrel dosyasina indirildi. |
| `src/main/archive/transcripts/*.ts` | 9-250 | VTT temizleme, workspace, dosya isimlendirme, asset secimi ve file util katmanlari ayrildi. |
| `src/main/archive/analysis.ts` | 399 | Analysis facade seviyesine indi; source/document repository sorgulari ayrildi. |
| `src/main/archive/analysis/documents.ts` | 303 | Cleaned file discovery, transcript source listesi, indexed/merged document okuma ayrildi. |
| `src/main/archive/analysis/*` | 31-303 | Analysis schema, type, scope, text, file ve document repository modulleri ayrildi. |

`npm run typecheck` ve `npm run build` basarili calisti.

## Sicak Noktalar

| Dosya | Satir | Risk | Neden |
| --- | ---: | --- | --- |
| `src/renderer/src/App.tsx` | 491 | Dusuk-orta | App shell hedef bandinda ama global modal/notice/progress wiring halen burada. |
| `src/main/archive/transcriptWorkflow.ts` | 487 | Orta | Transcript workflow ayrildi; ileride IPC servisleriyle daha da kucultulebilir. |
| `src/shared/archive.ts` | 462 | Orta | Tum IPC kontratlari ve domain tipleri tek dosyada; henuz kritik degil ama bolme zamani yaklasiyor. |
| `src/main/index.ts` | 454 | Orta | Lifecycle inceldi ama scan/download IPC orchestration halen burada. |
| `src/renderer/src/pages/subtitles/SubtitleLibraryPanel.tsx` | 438 | Dusuk-orta | Sol panel artik ayrildi; bulk preview alt componenti ileride ayrilabilir. |
| `src/main/archive/analysis.ts` | 399 | Dusuk-orta | Analysis facade inceldi; search/frequency/timeline sorgulari ileride alt servislere ayrilabilir. |
| `src/main/archive/ytDlp.ts` | 380 | Dusuk-orta | Entry normalize ayrildi; detay lookup/fetch orchestration ileride servis altina alinabilir. |
| `src/renderer/src/pages/archive/ArchivePage.tsx` | 379 | Dusuk-orta | Arsiv sayfasi halen sidebar/form/video list action baglamasini ayni gorunumde tutuyor. |
| `src/renderer/src/pages/subtitles/useSubtitleActions.ts` | 348 | Dusuk-orta | Subtitle action hook'u bulk edit, clean, export, undo ve note akisini beraber tasiyor. |
| `src/renderer/src/styles/subtitles/bulk.css` | 321 | Dusuk | Bulk edit/preview stilleri kendi domaininde ama biraz buyuk kaldi. |
| `src/renderer/src/pages/analysis/useAnalysisRuntime.ts` | 314 | Dusuk-orta | Analysis runtime tek hook; kaynak secimi ve query refresh akislari ileride ayrilabilir. |

## Renderer Parcalama

Hedef: `App.tsx` sadece uygulama kabugunu, navigasyonu ve sayfa secimini tutsun. Her sayfa kendi UI ve hook katmanina ayrilsin.

Onerilen dosya yapisi:

```text
src/renderer/src/
  App.tsx
  app/
    AppShell.tsx
    FeedbackBanner.tsx
    navigation.ts
  components/
    CheckboxFilterGroup.tsx
    EmptyState.tsx
    ProgressPanel.tsx
    StatusPill.tsx
    SubtitlePill.tsx
    Thumbnail.tsx
  pages/
    archive/
      ArchivePage.tsx
      ArchiveSidebar.tsx
      AddChannelForm.tsx
      ChannelCard.tsx
      VideoSelectionToolbar.tsx
      VideoTable.tsx
      useArchiveController.ts
      useVideoFilters.ts
    subtitles/
      SubtitlesPage.tsx
      SubtitleLibrary.tsx
      SubtitleBulkTools.tsx
      SubtitleExportControls.tsx
      TranscriptEditor.tsx
      TranscriptMetaPanel.tsx
      useSubtitleController.ts
      useSubtitleFilters.ts
      useTranscriptEditor.ts
    analysis/
      AnalysisPage.tsx
      AnalysisResults.tsx
      AnalysisSourcesPanel.tsx
      AnalysisToolbar.tsx
      useAnalysisController.ts
    settings/
      SettingsPage.tsx
      InstallRow.tsx
  lib/
    errors.ts
    format.ts
    selection.ts
    thumbnail.ts
    transcriptTransforms.ts
  constants/
    archiveOptions.ts
    subtitleOptions.ts
```

### Kod/UI Ayrimi

- `pages/*/*.tsx`: sadece gorunum ve event baglama.
- `use*Controller.ts`: IPC cagri zincirleri, busy/error/notice state, refresh islemleri.
- `use*Filters.ts`: filtre state ve derived listeler.
- `lib/*.ts`: pure helperlar; React import etmez.
- `components/*.tsx`: sayfalar arasi tekrar kullanilan kucuk UI parcaciklari.

Ilk renderer hedefi:

- `ArchivePage` ve archive helperlarini ayirmak en dusuk riskli baslangic.
- `SubtitlesPage` ikinci adim olmali; cunku editor, bulk edit, export ve notlar daha fazla state tasiyor.
- `AnalysisPage` tamamlandi; shell, runtime hook, sonuc paneli ve kapsam paneli artik ayri dosyalarda.

## CSS Parcalama

Hedef: Tek global giris kalsin ama stiller konuya gore bolunsun. Vite CSS importlariyla calisir.

```text
src/renderer/src/styles/
  index.css
  tokens.css
  base.css
  layout.css
  buttons.css
  forms.css
  panels.css
  archive.css
  subtitles.css
  analysis.css
  settings.css
  responsive.css
```

`main.tsx` sadece `styles/index.css` import eder. `index.css` alt dosyalari sirayla import eder. Bu yol CSS Modules'a gecmeden en az riskli bolme.

## Main Process Parcalama

Hedef: `src/main/index.ts` Electron yasam dongusu ve wiring disinda is mantigi tasimasin.

```text
src/main/
  index.ts
  bootstrap/
    createMainWindow.ts
    archiveAssetProtocol.ts
    archivePath.ts
  ipc/
    registerIpcHandlers.ts
    archiveIpc.ts
    subtitleIpc.ts
    analysisIpc.ts
    systemIpc.ts
    toolsIpc.ts
  services/
    channelScanService.ts
    subtitleDownloadService.ts
    transcriptEditService.ts
    subtitleExportService.ts
    thumbnailCacheService.ts
```

`index.ts` sonunda su seviyeye inmeli:

- archive path resolve/migration
- store/service instance yaratma
- protocol register
- ipc register
- window yaratma
- Electron app lifecycle

## Store ve Analysis Parcalama

`ArchiveStore` kisa vadede facade olarak kalabilir. Once icinden SQL ve mapper sorumluluklari ayrilmali:

```text
src/main/archive/store/
  ArchiveStore.ts
  schema.ts
  mappers.ts
  channelRepository.ts
  videoRepository.ts
  subtitleAssetRepository.ts
  transcriptRepository.ts
  transcriptEditRepository.ts
```

`ArchiveAnalysis` icin:

```text
src/main/archive/analysis/
  ArchiveAnalysis.ts
  schema.ts
  scope.ts
  indexer.ts
  sources.ts
  search.ts
  frequency.ts
  timeline.ts
  tokenizer.ts
  files.ts
```

## Uygulama Sirasi

1. [Tamamlandi] CSS dosyasini import tabanli parcala. Davranis degismez, merge riski dusuk.
2. [Tamamlandi] `App.tsx` icinden pure helperlari `lib/` altina al: format, thumbnail, transcript transform, error.
3. [Tamamlandi] Shared kucuk UI componentlerini ayir: progress panel, nav button, pills, checkbox filter.
4. [Tamamlandi] `ArchivePage` gorunumunu ayir; controller hook'u halen takip isidir.
5. [Tamamlandi] `SubtitlesPage` gorunumunu ayir; liste/bulk/export ve transcript editor panelleri alt componentlere tasindi.
6. [Tamamlandi] `AnalysisPage` gorunum ve data hook katmani ayrildi; sayfa shell seviyesine indi.
7. [Tamamlandi] `App.tsx` derived/runtime/action hooklari ayrildi ve app shell hedef satir bandina girdi.
8. [Kismen tamamlandi] Main process'te servisleri ayir: thumbnail cache, export, asset protocol, open-path, pencere kurulumu ve transcript workflow tamamlandi; sira scan/download IPC handlerlarini servis katmanina almada.
9. [Tamamlandi] Store schema, mapper, type, snapshot, scan, video, subtitle asset, transcript repository ve utils katmani ayrildi.
10. [Kismen tamamlandi] Analysis schema, type, scope, text/tokenizer, file helper ve document repository katmani ayrildi; sira search/frequency/timeline servislerinde.
11. [Kismen tamamlandi] yt-dlp entry type/normalize/mapping helperlari ayrildi; sira fetch/detail lookup orchestration'i daha kucuk servislere bolmede.
12. [Tamamlandi] `archive.css` import tabanli parcalandi; base, channels, metrics, filters, selection, videos ve states dosyalari ayrildi.
13. [Tamamlandi] `analysis.css` import tabanli parcalandi; controls, states, metrics, results, sources ve toggles dosyalari ayrildi.
14. [Tamamlandi] `layout.css` import tabanli parcalandi; shell, navigation, feedback, progress, forms, buttons ve grids dosyalari ayrildi.
15. [Tamamlandi] `store.ts` facade seviyesine indirildi; snapshot, scans, videos ve subtitleAssets repositoryleri ayrildi.
16. [Tamamlandi] `store/transcripts.ts` barrel dosyasina indirildi; document, edit, note ve undo repositoryleri ayrildi.
17. [Tamamlandi] `main/archive/transcripts.ts` barrel dosyasina indirildi; VTT text cleaner, workspace, files, selection ve utils ayrildi.

## Basari Kriteri

- `App.tsx`: 300-500 satir arasi app shell.
- Her sayfa: 300-700 satir arasi, alt componentlere bolunmus.
- Hook dosyalari: UI JSX icermemeli.
- `styles/index.css`: sadece import listesi.
- Her CSS parcasinda tek domain.
- `src/main/index.ts`: 200-300 satir arasi bootstrap.
- IPC handler dosyalari servis cagirsin; dosya sistemi, DB ve transform detaylari servis/store katmaninda kalsin.

## Kontrol

Bu analizden sonra mevcut proje icin `npm run typecheck` ve `npm run build` basarili calisti.
