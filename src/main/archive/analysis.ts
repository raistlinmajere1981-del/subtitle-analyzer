import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AnalysisAiProviderStatus,
  AnalysisBelievabilityInput,
  AnalysisBelievabilityRecord,
  AnalysisBelievabilityReport,
  AnalysisBelievabilityResult,
  AnalysisCharacterGraphInput,
  AnalysisCharacterGraphRecord,
  AnalysisCharacterGraphReport,
  AnalysisCharacterGraphResult,
  AnalysisContinuityInput,
  AnalysisContinuityRecord,
  AnalysisContinuityReport,
  AnalysisContinuityResult,
  AnalysisFingerprintInput,
  AnalysisFingerprintRecord,
  AnalysisFingerprintResult,
  AnalysisFrequencyInput,
  AnalysisFrequencyResult,
  AnalysisIndexSummary,
  AnalysisMythologyInput,
  AnalysisMythologyRecord,
  AnalysisMythologyReport,
  AnalysisMythologyResult,
  AnalysisRealityIndexInput,
  AnalysisRealityIndexRecord,
  AnalysisRealityIndexReport,
  AnalysisRealityIndexResult,
  AnalysisRebuildResult,
  AnalysisReconcileResult,
  AnalysisSemanticFingerprint,
  AnalysisSemanticDriftInput,
  AnalysisSemanticDriftRecord,
  AnalysisSemanticDriftReport,
  AnalysisSemanticDriftResult,
  AnalysisScope,
  AnalysisSourceListInput,
  AnalysisSourceListResult,
  AnalysisSearchHit,
  AnalysisSearchInput,
  AnalysisSearchResult,
  AnalysisTermScore,
  AnalysisTimelineInput,
  AnalysisTimelinePoint,
  AnalysisTimelineResult,
  DeleteMergedAnalysisSourceInput,
  DeleteMergedAnalysisSourceResult
} from '../../shared/archive.js';
import {
  findCleanedFileCandidates,
  getAnalysisDocuments,
  getExistingTranscriptDocument,
  getMergedFileSources,
  getPreferredAsset,
  getTranscriptDocuments,
  getTranscriptSources
} from './analysis/documents.js';
import {
  analysisBelievabilityPromptVersion,
  requestBelievability
} from './analysis/believability.js';
import {
  analysisContinuityPromptVersion,
  requestNarrativeContinuity
} from './analysis/continuity.js';
import {
  analysisCharacterGraphPromptVersion,
  requestCharacterGraph
} from './analysis/characterGraph.js';
import { getAnalysisAiProviderStatus } from './analysis/codex.js';
import {
  hashText,
  readTextFile
} from './analysis/files.js';
import {
  analysisFingerprintPromptVersion,
  requestSemanticFingerprint
} from './analysis/fingerprint.js';
import {
  analysisMythologyPromptVersion,
  requestMythologyMapping
} from './analysis/mythology.js';
import {
  analysisRealityIndexPromptVersion,
  requestRealityIndex
} from './analysis/realityIndex.js';
import {
  analysisSemanticDriftPromptVersion,
  requestSemanticDrift
} from './analysis/semanticDrift.js';
import { initializeArchiveAnalysisSchema } from './analysis/schema.js';
import { buildScopeWhere } from './analysis/scope.js';
import {
  buildNgrams,
  countQueryMatches,
  createSnippet,
  getTimelineBucket,
  normalizeNgramSize,
  tokenizeForAnalysis
} from './analysis/text.js';
import { getTranscriptStats } from './transcripts.js';

interface PreparedAnalysisAiScope {
  channelId: string | null;
  sourceIds: string[];
  sourceIdsJson: string;
  contentHash: string;
  documents: ReturnType<typeof getAnalysisDocuments>;
  documentCount: number;
  wordCount: number;
}

interface FingerprintRow {
  id: string;
  channel_id: string | null;
  source_ids_json: string;
  content_hash: string;
  provider: string;
  model: string;
  prompt_version: string;
  result_json: string;
  document_count: number;
  word_count: number;
  created_at: string;
}

interface ContinuityRow {
  id: string;
  channel_id: string | null;
  source_ids_json: string;
  content_hash: string;
  provider: string;
  model: string;
  prompt_version: string;
  result_json: string;
  document_count: number;
  word_count: number;
  created_at: string;
}

interface MythologyRow {
  id: string;
  channel_id: string | null;
  source_ids_json: string;
  content_hash: string;
  provider: string;
  model: string;
  prompt_version: string;
  result_json: string;
  document_count: number;
  word_count: number;
  created_at: string;
}

interface RealityIndexRow {
  id: string;
  channel_id: string | null;
  source_ids_json: string;
  content_hash: string;
  provider: string;
  model: string;
  prompt_version: string;
  result_json: string;
  document_count: number;
  word_count: number;
  created_at: string;
}

interface CharacterGraphRow {
  id: string;
  channel_id: string | null;
  source_ids_json: string;
  content_hash: string;
  provider: string;
  model: string;
  prompt_version: string;
  result_json: string;
  document_count: number;
  word_count: number;
  created_at: string;
}

interface SemanticDriftRow {
  id: string;
  channel_id: string | null;
  source_ids_json: string;
  content_hash: string;
  provider: string;
  model: string;
  prompt_version: string;
  result_json: string;
  document_count: number;
  word_count: number;
  created_at: string;
}

interface BelievabilityRow {
  id: string;
  channel_id: string | null;
  source_ids_json: string;
  content_hash: string;
  provider: string;
  model: string;
  prompt_version: string;
  result_json: string;
  document_count: number;
  word_count: number;
  created_at: string;
}

export class ArchiveAnalysis {
  private readonly db: DatabaseSync;

  constructor(private readonly archivePath: string) {
    this.db = new DatabaseSync(path.join(archivePath, 'subtitle-analyzer.sqlite'));
    initializeArchiveAnalysisSchema(this.db);
  }

  getSummary(scope: AnalysisScope = { mode: 'archive' }): AnalysisIndexSummary {
    const scopeWhere = buildScopeWhere(scope, 'v');
    const videoCounts = this.db
      .prepare(
        `
        SELECT
          COUNT(*) AS total_videos,
          SUM(CASE WHEN subtitle_status IN ('Hazir', 'Temizlendi') THEN 1 ELSE 0 END) AS ready_videos
        FROM videos v
        WHERE 1 = 1
          ${scopeWhere.sql}
      `
      )
      .get(...scopeWhere.params) as { total_videos: number; ready_videos: number | null };
    const documentCounts = this.db
      .prepare(
        `
        SELECT
          COUNT(DISTINCT video_id) AS transcript_documents
        FROM transcript_documents td
        JOIN videos v ON v.id = td.video_id
        WHERE 1 = 1
          ${scopeWhere.sql}
      `
      )
      .get(...scopeWhere.params) as { transcript_documents: number };
    const indexCounts = this.db
      .prepare(
        `
        SELECT
          COUNT(*) AS indexed_documents,
          SUM(word_count) AS total_indexed_words,
          COUNT(DISTINCT ad.channel_id) AS channels_with_indexed_documents,
          MAX(indexed_at) AS last_indexed_at
        FROM analysis_documents ad
        JOIN videos v ON v.id = ad.video_id
        WHERE 1 = 1
          ${scopeWhere.sql}
      `
      )
      .get(...scopeWhere.params) as {
      indexed_documents: number;
      total_indexed_words: number | null;
      channels_with_indexed_documents: number;
      last_indexed_at: string | null;
    };
    const staleCounts = this.db
      .prepare(
        `
        SELECT COUNT(DISTINCT td.video_id) AS stale_documents
        FROM transcript_documents td
        JOIN videos v ON v.id = td.video_id
        LEFT JOIN analysis_documents ad ON ad.video_id = td.video_id
        WHERE (ad.video_id IS NULL OR ad.source_cleaned_at <> td.cleaned_at)
          ${scopeWhere.sql}
      `
      )
      .get(...scopeWhere.params) as { stale_documents: number };

    return {
      totalVideos: Number(videoCounts.total_videos ?? 0),
      readyVideos: Number(videoCounts.ready_videos ?? 0),
      transcriptDocuments: Number(documentCounts.transcript_documents ?? 0),
      indexedDocuments: Number(indexCounts.indexed_documents ?? 0),
      totalIndexedWords: Number(indexCounts.total_indexed_words ?? 0),
      staleDocuments: Number(staleCounts.stale_documents ?? 0),
      channelsWithIndexedDocuments: Number(indexCounts.channels_with_indexed_documents ?? 0),
      lastIndexedAt: indexCounts.last_indexed_at
    };
  }

  reconcileCleanedDocuments(): AnalysisReconcileResult {
    const candidates = findCleanedFileCandidates(this.db, this.archivePath);
    const now = new Date().toISOString();
    let linkedDocuments = 0;
    let updatedDocuments = 0;
    let skippedFiles = 0;

    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const candidate of candidates) {
        const text = readTextFile(candidate.cleanedPath).trim();
        if (!text) {
          skippedFiles += 1;
          continue;
        }

        const asset = getPreferredAsset(this.db, candidate.videoId);
        const existing = getExistingTranscriptDocument(this.db, candidate.videoId);
        const stats = getTranscriptStats(text);
        const language = asset?.language_code ?? 'tr';
        const source = asset?.source_type ?? 'auto';
        const format = asset?.format ?? 'vtt';
        const unchanged =
          existing?.cleaned_path === candidate.cleanedPath &&
          Number(existing.word_count) === stats.wordCount &&
          Number(existing.segment_count) === stats.segmentCount;

        if (!existing) {
          linkedDocuments += 1;
        } else if (!unchanged) {
          updatedDocuments += 1;
        }

        this.db
          .prepare(
            `
            INSERT INTO transcript_documents (
              video_id,
              language_code,
              source_type,
              format,
              cleaned_path,
              word_count,
              segment_count,
              cleaned_at,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(video_id, language_code, source_type, format) DO UPDATE SET
              cleaned_path = excluded.cleaned_path,
              word_count = excluded.word_count,
              segment_count = excluded.segment_count,
              cleaned_at = excluded.cleaned_at,
              updated_at = excluded.updated_at
          `
          )
          .run(
            candidate.videoId,
            language,
            source,
            format,
            candidate.cleanedPath,
            stats.wordCount,
            stats.segmentCount,
            candidate.cleanedAt,
            now,
            now
          );

        this.db
          .prepare(
            `
            UPDATE videos
            SET subtitle_status = 'Temizlendi', density = ?, updated_at = ?
            WHERE id = ?
          `
          )
          .run(stats.wordCount, now, candidate.videoId);
      }

      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }

    return {
      cleanedFilesFound: candidates.length,
      linkedDocuments,
      updatedDocuments,
      skippedFiles,
      summary: this.getSummary()
    };
  }

  rebuildIndex(): AnalysisRebuildResult {
    const reconciled = this.reconcileCleanedDocuments();
    const documents = getTranscriptDocuments(this.db);
    const now = new Date().toISOString();
    let indexedDocuments = 0;
    let skippedDocuments = 0;

    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('DELETE FROM analysis_document_index').run();
      this.db.prepare('DELETE FROM analysis_documents').run();

      for (const document of documents) {
        const transcript = readTextFile(document.cleaned_path).trim();
        if (!transcript) {
          skippedDocuments += 1;
          continue;
        }

        const contentHash = hashText(transcript);
        this.db
          .prepare(
            `
            INSERT INTO analysis_documents (
              video_id,
              channel_id,
              cleaned_path,
              content_hash,
              word_count,
              segment_count,
              source_cleaned_at,
              indexed_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          )
          .run(
            document.video_id,
            document.channel_id,
            document.cleaned_path,
            contentHash,
            document.word_count,
            document.segment_count,
            document.cleaned_at,
            now,
            now
          );

        this.db
          .prepare(
            `
            INSERT INTO analysis_document_index (video_id, channel_id, title, transcript)
            VALUES (?, ?, ?, ?)
          `
          )
          .run(document.video_id, document.channel_id, document.title, transcript);
        indexedDocuments += 1;
      }

      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }

    return {
      reconciled,
      indexedDocuments,
      skippedDocuments,
      summary: this.getSummary()
    };
  }

  listSources(input: AnalysisSourceListInput): AnalysisSourceListResult {
    return {
      sources: [...getTranscriptSources(this.db, input.scope), ...getMergedFileSources(this.db, this.archivePath, input.scope)]
    };
  }

  deleteMergedSource(input: DeleteMergedAnalysisSourceInput): DeleteMergedAnalysisSourceResult {
    const targetPath = path.resolve(input.path);
    const exportsRoot = path.resolve(this.archivePath, 'exports');
    const relativePath = path.relative(exportsRoot, targetPath);
    const fileName = path.basename(targetPath).toLocaleLowerCase('tr-TR');
    const isSafeMergedFile =
      relativePath.length > 0 &&
      !relativePath.startsWith('..') &&
      !path.isAbsolute(relativePath) &&
      fileName.endsWith('.txt') &&
      fileName.includes('birlesik');

    if (!isSafeMergedFile) {
      return {
        deleted: false,
        deletedMeta: false,
        error: 'Sadece arsiv exports klasorundeki birlestirilmis altyazi dosyalari silinebilir.'
      };
    }

    try {
      const deleted = deleteFileIfExists(targetPath);
      const deletedMeta = deleteFileIfExists(getMergedMetadataPath(targetPath));

      return {
        deleted,
        deletedMeta,
        error: deleted ? null : 'Silinecek birlestirilmis altyazi dosyasi bulunamadi.'
      };
    } catch (error) {
      return {
        deleted: false,
        deletedMeta: false,
        error: error instanceof Error ? error.message : 'Birlestirilmis altyazi silinemedi.'
      };
    }
  }

  search(input: AnalysisSearchInput): AnalysisSearchResult {
    const normalizedQuery = input.query.trim();
    const queryTokens = tokenizeForAnalysis(normalizedQuery);
    if (queryTokens.length === 0) {
      return { query: normalizedQuery, total: 0, hits: [] };
    }

    const hits: AnalysisSearchHit[] = getAnalysisDocuments(this.db, this.archivePath, input.scope)
      .map((document) => {
        const matchCount = countQueryMatches(document.transcript, normalizedQuery);
        if (matchCount === 0) {
          return null;
        }

        return {
          sourceId: document.sourceId,
          sourceType: document.sourceType,
          videoId: document.videoId,
          channelId: document.channelId,
          channelName: document.channelName,
          title: document.title,
          publishedAt: document.publishedAt,
          videoType: document.videoType,
          rank: matchCount,
          snippet: createSnippet(document.transcript, queryTokens)
        } satisfies AnalysisSearchHit;
      })
      .filter((hit): hit is AnalysisSearchHit => hit !== null)
      .sort((first, second) => second.rank - first.rank || first.title.localeCompare(second.title, 'tr'))
      .slice(0, input.limit ?? 40);

    return {
      query: normalizedQuery,
      total: hits.length,
      hits
    };
  }

  getFrequency(input: AnalysisFrequencyInput): AnalysisFrequencyResult {
    const ngramSize = normalizeNgramSize(input.ngramSize);
    const documents = getAnalysisDocuments(this.db, this.archivePath, input.scope);
    const termCounts = new Map<string, AnalysisTermScore>();

    for (const document of documents) {
      const tokens = tokenizeForAnalysis(document.transcript);
      const seenInVideo = new Set<string>();

      for (const term of buildNgrams(tokens, ngramSize)) {
        const current = termCounts.get(term) ?? { term, count: 0, videoCount: 0 };
        current.count += 1;
        if (!seenInVideo.has(term)) {
          current.videoCount += 1;
          seenInVideo.add(term);
        }
        termCounts.set(term, current);
      }
    }

    const terms = [...termCounts.values()]
      .sort((first, second) => second.count - first.count || second.videoCount - first.videoCount || first.term.localeCompare(second.term, 'tr'))
      .slice(0, input.limit ?? 24);

    return {
      ngramSize,
      terms,
      documentCount: documents.length
    };
  }

  getTimeline(input: AnalysisTimelineInput): AnalysisTimelineResult {
    const bucket = input.bucket ?? 'month';
    const normalizedQuery = input.query?.trim() ?? '';
    const documents = getAnalysisDocuments(this.db, this.archivePath, input.scope);
    const points = new Map<string, AnalysisTimelinePoint>();

    for (const document of documents) {
      const bucketKey = getTimelineBucket(document.publishedAt, bucket);
      const current =
        points.get(bucketKey) ??
        ({
          bucket: bucketKey,
          label: bucketKey,
          videoCount: 0,
          matchCount: 0,
          wordCount: 0
        } satisfies AnalysisTimelinePoint);

      current.videoCount += 1;
      current.wordCount += Number(document.wordCount);
      current.matchCount += normalizedQuery ? countQueryMatches(document.transcript, normalizedQuery) : 0;
      points.set(bucketKey, current);
    }

    return {
      query: normalizedQuery,
      bucket,
      points: [...points.values()].sort((first, second) => first.bucket.localeCompare(second.bucket))
    };
  }

  getAiProviderStatus(): AnalysisAiProviderStatus {
    return getAnalysisAiProviderStatus();
  }

  getFingerprint(input: AnalysisFingerprintInput): AnalysisFingerprintResult {
    const prepared = this.prepareAiScope(input.scope, analysisFingerprintPromptVersion);
    const providerStatus = this.getAiProviderStatus();

    return {
      providerStatus,
      fingerprint: this.getCachedFingerprint(prepared, providerStatus),
      fromCache: true
    };
  }

  async runFingerprint(input: AnalysisFingerprintInput): Promise<AnalysisFingerprintResult> {
    const prepared = this.prepareAiScope(input.scope, analysisFingerprintPromptVersion);
    const providerStatus = this.getAiProviderStatus();
    const cached = this.getCachedFingerprint(prepared, providerStatus);

    if (cached && !cached.stale && !input.force) {
      return {
        providerStatus,
        fingerprint: cached,
        fromCache: true
      };
    }

    if (!providerStatus.configured) {
      throw new Error(providerStatus.detail ?? 'AI analiz saglayicisi yapilandirilmamis.');
    }

    const fingerprint = await requestSemanticFingerprint(prepared.documents);

    return {
      providerStatus,
      fingerprint: this.saveFingerprint(prepared, providerStatus, fingerprint),
      fromCache: false
    };
  }

  getContinuity(input: AnalysisContinuityInput): AnalysisContinuityResult {
    const prepared = this.prepareAiScope(input.scope, analysisContinuityPromptVersion);
    const providerStatus = this.getAiProviderStatus();

    return {
      providerStatus,
      continuity: this.getCachedContinuity(prepared, providerStatus),
      fromCache: true
    };
  }

  async runContinuity(input: AnalysisContinuityInput): Promise<AnalysisContinuityResult> {
    const prepared = this.prepareAiScope(input.scope, analysisContinuityPromptVersion);
    const providerStatus = this.getAiProviderStatus();
    const cached = this.getCachedContinuity(prepared, providerStatus);

    if (cached && !cached.stale && !input.force) {
      return {
        providerStatus,
        continuity: cached,
        fromCache: true
      };
    }

    if (!providerStatus.configured) {
      throw new Error(providerStatus.detail ?? 'AI analiz saglayicisi yapilandirilmamis.');
    }

    const report = await requestNarrativeContinuity(prepared.documents);

    return {
      providerStatus,
      continuity: this.saveContinuity(prepared, providerStatus, report),
      fromCache: false
    };
  }

  getMythology(input: AnalysisMythologyInput): AnalysisMythologyResult {
    const prepared = this.prepareAiScope(input.scope, analysisMythologyPromptVersion);
    const providerStatus = this.getAiProviderStatus();

    return {
      providerStatus,
      mythology: this.getCachedMythology(prepared, providerStatus),
      fromCache: true
    };
  }

  async runMythology(input: AnalysisMythologyInput): Promise<AnalysisMythologyResult> {
    const prepared = this.prepareAiScope(input.scope, analysisMythologyPromptVersion);
    const providerStatus = this.getAiProviderStatus();
    const cached = this.getCachedMythology(prepared, providerStatus);

    if (cached && !cached.stale && !input.force) {
      return {
        providerStatus,
        mythology: cached,
        fromCache: true
      };
    }

    if (!providerStatus.configured) {
      throw new Error(providerStatus.detail ?? 'AI analiz saglayicisi yapilandirilmamis.');
    }

    const report = await requestMythologyMapping(prepared.documents);

    return {
      providerStatus,
      mythology: this.saveMythology(prepared, providerStatus, report),
      fromCache: false
    };
  }

  getRealityIndex(input: AnalysisRealityIndexInput): AnalysisRealityIndexResult {
    const prepared = this.prepareAiScope(input.scope, analysisRealityIndexPromptVersion);
    const providerStatus = this.getAiProviderStatus();

    return {
      providerStatus,
      realityIndex: this.getCachedRealityIndex(prepared, providerStatus),
      fromCache: true
    };
  }

  async runRealityIndex(input: AnalysisRealityIndexInput): Promise<AnalysisRealityIndexResult> {
    const prepared = this.prepareAiScope(input.scope, analysisRealityIndexPromptVersion);
    const providerStatus = this.getAiProviderStatus();
    const cached = this.getCachedRealityIndex(prepared, providerStatus);

    if (cached && !cached.stale && !input.force) {
      return {
        providerStatus,
        realityIndex: cached,
        fromCache: true
      };
    }

    if (!providerStatus.configured) {
      throw new Error(providerStatus.detail ?? 'AI analiz saglayicisi yapilandirilmamis.');
    }

    const report = await requestRealityIndex(prepared.documents);

    return {
      providerStatus,
      realityIndex: this.saveRealityIndex(prepared, providerStatus, report),
      fromCache: false
    };
  }

  getCharacterGraph(input: AnalysisCharacterGraphInput): AnalysisCharacterGraphResult {
    const prepared = this.prepareAiScope(input.scope, analysisCharacterGraphPromptVersion);
    const providerStatus = this.getAiProviderStatus();

    return {
      providerStatus,
      characterGraph: this.getCachedCharacterGraph(prepared, providerStatus),
      fromCache: true
    };
  }

  async runCharacterGraph(input: AnalysisCharacterGraphInput): Promise<AnalysisCharacterGraphResult> {
    const prepared = this.prepareAiScope(input.scope, analysisCharacterGraphPromptVersion);
    const providerStatus = this.getAiProviderStatus();
    const cached = this.getCachedCharacterGraph(prepared, providerStatus);

    if (cached && !cached.stale && !input.force) {
      return {
        providerStatus,
        characterGraph: cached,
        fromCache: true
      };
    }

    if (!providerStatus.configured) {
      throw new Error(providerStatus.detail ?? 'AI analiz saglayicisi yapilandirilmamis.');
    }

    const report = await requestCharacterGraph(prepared.documents);

    return {
      providerStatus,
      characterGraph: this.saveCharacterGraph(prepared, providerStatus, report),
      fromCache: false
    };
  }

  getSemanticDrift(input: AnalysisSemanticDriftInput): AnalysisSemanticDriftResult {
    const prepared = this.prepareAiScope(input.scope, analysisSemanticDriftPromptVersion);
    const providerStatus = this.getAiProviderStatus();

    return {
      providerStatus,
      semanticDrift: this.getCachedSemanticDrift(prepared, providerStatus),
      fromCache: true
    };
  }

  async runSemanticDrift(input: AnalysisSemanticDriftInput): Promise<AnalysisSemanticDriftResult> {
    const prepared = this.prepareAiScope(input.scope, analysisSemanticDriftPromptVersion);
    const providerStatus = this.getAiProviderStatus();
    const cached = this.getCachedSemanticDrift(prepared, providerStatus);

    if (cached && !cached.stale && !input.force) {
      return {
        providerStatus,
        semanticDrift: cached,
        fromCache: true
      };
    }

    if (!providerStatus.configured) {
      throw new Error(providerStatus.detail ?? 'AI analiz saglayicisi yapilandirilmamis.');
    }

    const report = await requestSemanticDrift(prepared.documents);

    return {
      providerStatus,
      semanticDrift: this.saveSemanticDrift(prepared, providerStatus, report),
      fromCache: false
    };
  }

  getBelievability(input: AnalysisBelievabilityInput): AnalysisBelievabilityResult {
    const prepared = this.prepareAiScope(input.scope, analysisBelievabilityPromptVersion);
    const providerStatus = this.getAiProviderStatus();

    return {
      providerStatus,
      believability: this.getCachedBelievability(prepared, providerStatus),
      fromCache: true
    };
  }

  async runBelievability(input: AnalysisBelievabilityInput): Promise<AnalysisBelievabilityResult> {
    const prepared = this.prepareAiScope(input.scope, analysisBelievabilityPromptVersion);
    const providerStatus = this.getAiProviderStatus();
    const cached = this.getCachedBelievability(prepared, providerStatus);

    if (cached && !cached.stale && !input.force) {
      return {
        providerStatus,
        believability: cached,
        fromCache: true
      };
    }

    if (!providerStatus.configured) {
      throw new Error(providerStatus.detail ?? 'AI analiz saglayicisi yapilandirilmamis.');
    }

    const report = await requestBelievability(prepared.documents);

    return {
      providerStatus,
      believability: this.saveBelievability(prepared, providerStatus, report),
      fromCache: false
    };
  }

  private prepareAiScope(scope: AnalysisScope, promptVersion: string): PreparedAnalysisAiScope {
    const documents = getAnalysisDocuments(this.db, this.archivePath, scope);
    if (documents.length === 0) {
      throw new Error('Secili analiz kaynaklarinda transcript bulunamadi.');
    }

    const sourceIds = documents.map((document) => document.sourceId).sort((first, second) => first.localeCompare(second));
    const documentHashes = documents
      .map((document) => ({
        sourceId: document.sourceId,
        contentHash: hashText(document.transcript),
        wordCount: document.wordCount
      }))
      .sort((first, second) => first.sourceId.localeCompare(second.sourceId));
    const contentHash = hashText(
      JSON.stringify({
        promptVersion,
        scope: {
          mode: scope.mode,
          channelId: scope.channelId ?? null,
          dateFrom: scope.dateFrom ?? null,
          dateTo: scope.dateTo ?? null,
          videoType: scope.videoType ?? null
        },
        documents: documentHashes
      })
    );

    return {
      channelId: scope.mode === 'channel' ? scope.channelId ?? null : null,
      sourceIds,
      sourceIdsJson: JSON.stringify(sourceIds),
      contentHash,
      documents,
      documentCount: documents.length,
      wordCount: documents.reduce((total, document) => total + Number(document.wordCount), 0)
    };
  }

  private getCachedFingerprint(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus
  ): AnalysisFingerprintRecord | null {
    if (!providerStatus.model) {
      return null;
    }

    const row = this.db
      .prepare(
        `
        SELECT
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        FROM analysis_fingerprints
        WHERE channel_id IS ?
          AND source_ids_json = ?
          AND provider = ?
          AND model = ?
          AND prompt_version = ?
        ORDER BY created_at DESC
        LIMIT 1
      `
      )
      .get(
        prepared.channelId,
        prepared.sourceIdsJson,
        providerStatus.provider,
        providerStatus.model,
        analysisFingerprintPromptVersion
      ) as FingerprintRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToFingerprintRecord(row, prepared.sourceIds, row.content_hash !== prepared.contentHash);
  }

  private saveFingerprint(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus,
    fingerprint: AnalysisSemanticFingerprint
  ): AnalysisFingerprintRecord {
    if (!providerStatus.model) {
      throw new Error('AI model bilgisi eksik.');
    }

    const now = new Date().toISOString();
    const id = hashText(
      JSON.stringify({
        contentHash: prepared.contentHash,
        provider: providerStatus.provider,
        model: providerStatus.model,
        promptVersion: analysisFingerprintPromptVersion,
        createdAt: now
      })
    );

    this.db
      .prepare(
        `
        INSERT INTO analysis_fingerprints (
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        prepared.channelId,
        prepared.sourceIdsJson,
        prepared.contentHash,
        providerStatus.provider,
        providerStatus.model,
        analysisFingerprintPromptVersion,
        JSON.stringify(fingerprint),
        prepared.documentCount,
        prepared.wordCount,
        now
      );

    return {
      id,
      channelId: prepared.channelId,
      sourceIds: prepared.sourceIds,
      contentHash: prepared.contentHash,
      provider: providerStatus.provider,
      model: providerStatus.model,
      promptVersion: analysisFingerprintPromptVersion,
      fingerprint,
      createdAt: now,
      stale: false,
      documentCount: prepared.documentCount,
      wordCount: prepared.wordCount
    };
  }

  private rowToFingerprintRecord(
    row: FingerprintRow,
    fallbackSourceIds: string[],
    stale: boolean
  ): AnalysisFingerprintRecord | null {
    try {
      const sourceIds = JSON.parse(row.source_ids_json) as unknown;

      return {
        id: row.id,
        channelId: row.channel_id,
        sourceIds: Array.isArray(sourceIds) ? sourceIds.filter((item): item is string => typeof item === 'string') : fallbackSourceIds,
        contentHash: row.content_hash,
        provider: row.provider,
        model: row.model,
        promptVersion: row.prompt_version,
        fingerprint: JSON.parse(row.result_json) as AnalysisSemanticFingerprint,
        createdAt: row.created_at,
        stale,
        documentCount: Number(row.document_count),
        wordCount: Number(row.word_count)
      };
    } catch {
      return null;
    }
  }

  private getCachedContinuity(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus
  ): AnalysisContinuityRecord | null {
    if (!providerStatus.model) {
      return null;
    }

    const row = this.db
      .prepare(
        `
        SELECT
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        FROM analysis_continuity_reports
        WHERE channel_id IS ?
          AND source_ids_json = ?
          AND provider = ?
          AND model = ?
          AND prompt_version = ?
        ORDER BY created_at DESC
        LIMIT 1
      `
      )
      .get(
        prepared.channelId,
        prepared.sourceIdsJson,
        providerStatus.provider,
        providerStatus.model,
        analysisContinuityPromptVersion
      ) as ContinuityRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToContinuityRecord(row, prepared.sourceIds, row.content_hash !== prepared.contentHash);
  }

  private saveContinuity(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus,
    report: AnalysisContinuityReport
  ): AnalysisContinuityRecord {
    if (!providerStatus.model) {
      throw new Error('AI model bilgisi eksik.');
    }

    const now = new Date().toISOString();
    const id = hashText(
      JSON.stringify({
        contentHash: prepared.contentHash,
        provider: providerStatus.provider,
        model: providerStatus.model,
        promptVersion: analysisContinuityPromptVersion,
        createdAt: now
      })
    );

    this.db
      .prepare(
        `
        INSERT INTO analysis_continuity_reports (
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        prepared.channelId,
        prepared.sourceIdsJson,
        prepared.contentHash,
        providerStatus.provider,
        providerStatus.model,
        analysisContinuityPromptVersion,
        JSON.stringify(report),
        prepared.documentCount,
        prepared.wordCount,
        now
      );

    return {
      id,
      channelId: prepared.channelId,
      sourceIds: prepared.sourceIds,
      contentHash: prepared.contentHash,
      provider: providerStatus.provider,
      model: providerStatus.model,
      promptVersion: analysisContinuityPromptVersion,
      report,
      createdAt: now,
      stale: false,
      documentCount: prepared.documentCount,
      wordCount: prepared.wordCount
    };
  }

  private rowToContinuityRecord(
    row: ContinuityRow,
    fallbackSourceIds: string[],
    stale: boolean
  ): AnalysisContinuityRecord | null {
    try {
      const sourceIds = JSON.parse(row.source_ids_json) as unknown;

      return {
        id: row.id,
        channelId: row.channel_id,
        sourceIds: Array.isArray(sourceIds) ? sourceIds.filter((item): item is string => typeof item === 'string') : fallbackSourceIds,
        contentHash: row.content_hash,
        provider: row.provider,
        model: row.model,
        promptVersion: row.prompt_version,
        report: JSON.parse(row.result_json) as AnalysisContinuityReport,
        createdAt: row.created_at,
        stale,
        documentCount: Number(row.document_count),
        wordCount: Number(row.word_count)
      };
    } catch {
      return null;
    }
  }

  private getCachedMythology(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus
  ): AnalysisMythologyRecord | null {
    if (!providerStatus.model) {
      return null;
    }

    const row = this.db
      .prepare(
        `
        SELECT
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        FROM analysis_mythology_reports
        WHERE channel_id IS ?
          AND source_ids_json = ?
          AND provider = ?
          AND model = ?
          AND prompt_version = ?
        ORDER BY created_at DESC
        LIMIT 1
      `
      )
      .get(
        prepared.channelId,
        prepared.sourceIdsJson,
        providerStatus.provider,
        providerStatus.model,
        analysisMythologyPromptVersion
      ) as MythologyRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToMythologyRecord(row, prepared.sourceIds, row.content_hash !== prepared.contentHash);
  }

  private saveMythology(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus,
    report: AnalysisMythologyReport
  ): AnalysisMythologyRecord {
    if (!providerStatus.model) {
      throw new Error('AI model bilgisi eksik.');
    }

    const now = new Date().toISOString();
    const id = hashText(
      JSON.stringify({
        contentHash: prepared.contentHash,
        provider: providerStatus.provider,
        model: providerStatus.model,
        promptVersion: analysisMythologyPromptVersion,
        createdAt: now
      })
    );

    this.db
      .prepare(
        `
        INSERT INTO analysis_mythology_reports (
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        prepared.channelId,
        prepared.sourceIdsJson,
        prepared.contentHash,
        providerStatus.provider,
        providerStatus.model,
        analysisMythologyPromptVersion,
        JSON.stringify(report),
        prepared.documentCount,
        prepared.wordCount,
        now
      );

    return {
      id,
      channelId: prepared.channelId,
      sourceIds: prepared.sourceIds,
      contentHash: prepared.contentHash,
      provider: providerStatus.provider,
      model: providerStatus.model,
      promptVersion: analysisMythologyPromptVersion,
      report,
      createdAt: now,
      stale: false,
      documentCount: prepared.documentCount,
      wordCount: prepared.wordCount
    };
  }

  private rowToMythologyRecord(
    row: MythologyRow,
    fallbackSourceIds: string[],
    stale: boolean
  ): AnalysisMythologyRecord | null {
    try {
      const sourceIds = JSON.parse(row.source_ids_json) as unknown;

      return {
        id: row.id,
        channelId: row.channel_id,
        sourceIds: Array.isArray(sourceIds) ? sourceIds.filter((item): item is string => typeof item === 'string') : fallbackSourceIds,
        contentHash: row.content_hash,
        provider: row.provider,
        model: row.model,
        promptVersion: row.prompt_version,
        report: JSON.parse(row.result_json) as AnalysisMythologyReport,
        createdAt: row.created_at,
        stale,
        documentCount: Number(row.document_count),
        wordCount: Number(row.word_count)
      };
    } catch {
      return null;
    }
  }

  private getCachedRealityIndex(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus
  ): AnalysisRealityIndexRecord | null {
    if (!providerStatus.model) {
      return null;
    }

    const row = this.db
      .prepare(
        `
        SELECT
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        FROM analysis_reality_index_reports
        WHERE channel_id IS ?
          AND source_ids_json = ?
          AND provider = ?
          AND model = ?
          AND prompt_version = ?
        ORDER BY created_at DESC
        LIMIT 1
      `
      )
      .get(
        prepared.channelId,
        prepared.sourceIdsJson,
        providerStatus.provider,
        providerStatus.model,
        analysisRealityIndexPromptVersion
      ) as RealityIndexRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToRealityIndexRecord(row, prepared.sourceIds, row.content_hash !== prepared.contentHash);
  }

  private saveRealityIndex(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus,
    report: AnalysisRealityIndexReport
  ): AnalysisRealityIndexRecord {
    if (!providerStatus.model) {
      throw new Error('AI model bilgisi eksik.');
    }

    const now = new Date().toISOString();
    const id = hashText(
      JSON.stringify({
        contentHash: prepared.contentHash,
        provider: providerStatus.provider,
        model: providerStatus.model,
        promptVersion: analysisRealityIndexPromptVersion,
        createdAt: now
      })
    );

    this.db
      .prepare(
        `
        INSERT INTO analysis_reality_index_reports (
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        prepared.channelId,
        prepared.sourceIdsJson,
        prepared.contentHash,
        providerStatus.provider,
        providerStatus.model,
        analysisRealityIndexPromptVersion,
        JSON.stringify(report),
        prepared.documentCount,
        prepared.wordCount,
        now
      );

    return {
      id,
      channelId: prepared.channelId,
      sourceIds: prepared.sourceIds,
      contentHash: prepared.contentHash,
      provider: providerStatus.provider,
      model: providerStatus.model,
      promptVersion: analysisRealityIndexPromptVersion,
      report,
      createdAt: now,
      stale: false,
      documentCount: prepared.documentCount,
      wordCount: prepared.wordCount
    };
  }

  private rowToRealityIndexRecord(
    row: RealityIndexRow,
    fallbackSourceIds: string[],
    stale: boolean
  ): AnalysisRealityIndexRecord | null {
    try {
      const sourceIds = JSON.parse(row.source_ids_json) as unknown;

      return {
        id: row.id,
        channelId: row.channel_id,
        sourceIds: Array.isArray(sourceIds) ? sourceIds.filter((item): item is string => typeof item === 'string') : fallbackSourceIds,
        contentHash: row.content_hash,
        provider: row.provider,
        model: row.model,
        promptVersion: row.prompt_version,
        report: JSON.parse(row.result_json) as AnalysisRealityIndexReport,
        createdAt: row.created_at,
        stale,
        documentCount: Number(row.document_count),
        wordCount: Number(row.word_count)
      };
    } catch {
      return null;
    }
  }

  private getCachedCharacterGraph(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus
  ): AnalysisCharacterGraphRecord | null {
    if (!providerStatus.model) {
      return null;
    }

    const row = this.db
      .prepare(
        `
        SELECT
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        FROM analysis_character_graph_reports
        WHERE channel_id IS ?
          AND source_ids_json = ?
          AND provider = ?
          AND model = ?
          AND prompt_version = ?
        ORDER BY created_at DESC
        LIMIT 1
      `
      )
      .get(
        prepared.channelId,
        prepared.sourceIdsJson,
        providerStatus.provider,
        providerStatus.model,
        analysisCharacterGraphPromptVersion
      ) as CharacterGraphRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToCharacterGraphRecord(row, prepared.sourceIds, row.content_hash !== prepared.contentHash);
  }

  private saveCharacterGraph(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus,
    report: AnalysisCharacterGraphReport
  ): AnalysisCharacterGraphRecord {
    if (!providerStatus.model) {
      throw new Error('AI model bilgisi eksik.');
    }

    const now = new Date().toISOString();
    const id = hashText(
      JSON.stringify({
        contentHash: prepared.contentHash,
        provider: providerStatus.provider,
        model: providerStatus.model,
        promptVersion: analysisCharacterGraphPromptVersion,
        createdAt: now
      })
    );

    this.db
      .prepare(
        `
        INSERT INTO analysis_character_graph_reports (
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        prepared.channelId,
        prepared.sourceIdsJson,
        prepared.contentHash,
        providerStatus.provider,
        providerStatus.model,
        analysisCharacterGraphPromptVersion,
        JSON.stringify(report),
        prepared.documentCount,
        prepared.wordCount,
        now
      );

    return {
      id,
      channelId: prepared.channelId,
      sourceIds: prepared.sourceIds,
      contentHash: prepared.contentHash,
      provider: providerStatus.provider,
      model: providerStatus.model,
      promptVersion: analysisCharacterGraphPromptVersion,
      report,
      createdAt: now,
      stale: false,
      documentCount: prepared.documentCount,
      wordCount: prepared.wordCount
    };
  }

  private rowToCharacterGraphRecord(
    row: CharacterGraphRow,
    fallbackSourceIds: string[],
    stale: boolean
  ): AnalysisCharacterGraphRecord | null {
    try {
      const sourceIds = JSON.parse(row.source_ids_json) as unknown;

      return {
        id: row.id,
        channelId: row.channel_id,
        sourceIds: Array.isArray(sourceIds) ? sourceIds.filter((item): item is string => typeof item === 'string') : fallbackSourceIds,
        contentHash: row.content_hash,
        provider: row.provider,
        model: row.model,
        promptVersion: row.prompt_version,
        report: JSON.parse(row.result_json) as AnalysisCharacterGraphReport,
        createdAt: row.created_at,
        stale,
        documentCount: Number(row.document_count),
        wordCount: Number(row.word_count)
      };
    } catch {
      return null;
    }
  }

  private getCachedSemanticDrift(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus
  ): AnalysisSemanticDriftRecord | null {
    if (!providerStatus.model) {
      return null;
    }

    const row = this.db
      .prepare(
        `
        SELECT
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        FROM analysis_semantic_drift_reports
        WHERE channel_id IS ?
          AND source_ids_json = ?
          AND provider = ?
          AND model = ?
          AND prompt_version = ?
        ORDER BY created_at DESC
        LIMIT 1
      `
      )
      .get(
        prepared.channelId,
        prepared.sourceIdsJson,
        providerStatus.provider,
        providerStatus.model,
        analysisSemanticDriftPromptVersion
      ) as SemanticDriftRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToSemanticDriftRecord(row, prepared.sourceIds, row.content_hash !== prepared.contentHash);
  }

  private saveSemanticDrift(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus,
    report: AnalysisSemanticDriftReport
  ): AnalysisSemanticDriftRecord {
    if (!providerStatus.model) {
      throw new Error('AI model bilgisi eksik.');
    }

    const now = new Date().toISOString();
    const id = hashText(
      JSON.stringify({
        contentHash: prepared.contentHash,
        provider: providerStatus.provider,
        model: providerStatus.model,
        promptVersion: analysisSemanticDriftPromptVersion,
        createdAt: now
      })
    );

    this.db
      .prepare(
        `
        INSERT INTO analysis_semantic_drift_reports (
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        prepared.channelId,
        prepared.sourceIdsJson,
        prepared.contentHash,
        providerStatus.provider,
        providerStatus.model,
        analysisSemanticDriftPromptVersion,
        JSON.stringify(report),
        prepared.documentCount,
        prepared.wordCount,
        now
      );

    return {
      id,
      channelId: prepared.channelId,
      sourceIds: prepared.sourceIds,
      contentHash: prepared.contentHash,
      provider: providerStatus.provider,
      model: providerStatus.model,
      promptVersion: analysisSemanticDriftPromptVersion,
      report,
      createdAt: now,
      stale: false,
      documentCount: prepared.documentCount,
      wordCount: prepared.wordCount
    };
  }

  private rowToSemanticDriftRecord(
    row: SemanticDriftRow,
    fallbackSourceIds: string[],
    stale: boolean
  ): AnalysisSemanticDriftRecord | null {
    try {
      const sourceIds = JSON.parse(row.source_ids_json) as unknown;

      return {
        id: row.id,
        channelId: row.channel_id,
        sourceIds: Array.isArray(sourceIds) ? sourceIds.filter((item): item is string => typeof item === 'string') : fallbackSourceIds,
        contentHash: row.content_hash,
        provider: row.provider,
        model: row.model,
        promptVersion: row.prompt_version,
        report: JSON.parse(row.result_json) as AnalysisSemanticDriftReport,
        createdAt: row.created_at,
        stale,
        documentCount: Number(row.document_count),
        wordCount: Number(row.word_count)
      };
    } catch {
      return null;
    }
  }

  private getCachedBelievability(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus
  ): AnalysisBelievabilityRecord | null {
    if (!providerStatus.model) {
      return null;
    }

    const row = this.db
      .prepare(
        `
        SELECT
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        FROM analysis_believability_reports
        WHERE channel_id IS ?
          AND source_ids_json = ?
          AND provider = ?
          AND model = ?
          AND prompt_version = ?
        ORDER BY created_at DESC
        LIMIT 1
      `
      )
      .get(
        prepared.channelId,
        prepared.sourceIdsJson,
        providerStatus.provider,
        providerStatus.model,
        analysisBelievabilityPromptVersion
      ) as BelievabilityRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToBelievabilityRecord(row, prepared.sourceIds, row.content_hash !== prepared.contentHash);
  }

  private saveBelievability(
    prepared: PreparedAnalysisAiScope,
    providerStatus: AnalysisAiProviderStatus,
    report: AnalysisBelievabilityReport
  ): AnalysisBelievabilityRecord {
    if (!providerStatus.model) {
      throw new Error('AI model bilgisi eksik.');
    }

    const now = new Date().toISOString();
    const id = hashText(
      JSON.stringify({
        contentHash: prepared.contentHash,
        provider: providerStatus.provider,
        model: providerStatus.model,
        promptVersion: analysisBelievabilityPromptVersion,
        createdAt: now
      })
    );

    this.db
      .prepare(
        `
        INSERT INTO analysis_believability_reports (
          id,
          channel_id,
          source_ids_json,
          content_hash,
          provider,
          model,
          prompt_version,
          result_json,
          document_count,
          word_count,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        prepared.channelId,
        prepared.sourceIdsJson,
        prepared.contentHash,
        providerStatus.provider,
        providerStatus.model,
        analysisBelievabilityPromptVersion,
        JSON.stringify(report),
        prepared.documentCount,
        prepared.wordCount,
        now
      );

    return {
      id,
      channelId: prepared.channelId,
      sourceIds: prepared.sourceIds,
      contentHash: prepared.contentHash,
      provider: providerStatus.provider,
      model: providerStatus.model,
      promptVersion: analysisBelievabilityPromptVersion,
      report,
      createdAt: now,
      stale: false,
      documentCount: prepared.documentCount,
      wordCount: prepared.wordCount
    };
  }

  private rowToBelievabilityRecord(
    row: BelievabilityRow,
    fallbackSourceIds: string[],
    stale: boolean
  ): AnalysisBelievabilityRecord | null {
    try {
      const sourceIds = JSON.parse(row.source_ids_json) as unknown;

      return {
        id: row.id,
        channelId: row.channel_id,
        sourceIds: Array.isArray(sourceIds) ? sourceIds.filter((item): item is string => typeof item === 'string') : fallbackSourceIds,
        contentHash: row.content_hash,
        provider: row.provider,
        model: row.model,
        promptVersion: row.prompt_version,
        report: JSON.parse(row.result_json) as AnalysisBelievabilityReport,
        createdAt: row.created_at,
        stale,
        documentCount: Number(row.document_count),
        wordCount: Number(row.word_count)
      };
    } catch {
      return null;
    }
  }
}

function deleteFileIfExists(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);
  return true;
}

function getMergedMetadataPath(filePath: string): string {
  const parsedPath = path.parse(filePath);
  return path.join(parsedPath.dir, `${parsedPath.name}.meta.json`);
}
