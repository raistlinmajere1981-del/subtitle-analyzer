import type {
  AnalysisContinuityConcept,
  AnalysisContinuityIssue,
  AnalysisContinuityReport,
  AnalysisSemanticEvidence
} from '../../../shared/archive.js';
import { buildDocumentExtracts, requestCodexJson } from './codex.js';
import type { AnalysisTextDocument } from './types.js';

export const analysisContinuityPromptVersion = 'narrative-continuity-codex-v1';

export async function requestNarrativeContinuity(documents: AnalysisTextDocument[]): Promise<AnalysisContinuityReport> {
  const parsed = await requestCodexJson({
    schema: narrativeContinuitySchema,
    schemaFileName: 'narrative-continuity.schema.json',
    outputFileName: 'narrative-continuity.result.json',
    prompt: buildContinuityPrompt(documents),
    failureLabel: 'Codex CLI continuity analizi'
  });

  return normalizeContinuityReport(parsed, documents);
}

function buildContinuityPrompt(documents: AnalysisTextDocument[]): string {
  const extracts = buildDocumentExtracts(documents);
  const sourceList = documents
    .map((document, index) => {
      return `${index + 1}. ${document.sourceId} | ${document.title} | ${document.publishedAt ?? 'tarih yok'} | ${document.wordCount} kelime`;
    })
    .join('\n');

  return `
Rol:
Sen Turkce calisan bir anlati surekliligi ve semantik forensic analiz modelisin. Gercek/yalan karari verme; yalnizca secili kaynaklar arasinda kavramlarin zaman icindeki davranisini kanita dayali incele.

Secili analiz kaynaklari kronolojik baglamla:
${sourceList}

Gorev:
Bu kaynaklarda ayni kavramlarin, karakter rollerinin, sembollerin ve lore parcaciklarinin zaman icinde nasil degistigini analiz et. Spontane anlatiya benzeyen daginik kaymalar ile sonradan kontrollu eklenmis/retcon hissi veren parcaciklari ayir. Foreshadowing, gec eklenen bilgi, kavram genislemesi ve tutarlilik sinyallerini puanla.

Kurallar:
- Son cevabin yalnizca JSON olsun.
- Dizi alanlarini en fazla 8 ogeyle sinirla.
- Tum skorlar 0 ile 1 arasinda olsun.
- evidence.quote metinden kisa ve dogrudan alinti olsun.
- Retcon veya anomali icin kesin hukum verme; "risk/sinyal" dili kullan.
- Markdown, yorum veya JSON disi metin yazma.
- Dosya veya komut kullanma; yalnizca bu prompt icindeki metinle calis.

Transkript kesitleri:
${extracts}
`.trim();
}

function normalizeContinuityReport(value: unknown, documents: AnalysisTextDocument[]): AnalysisContinuityReport {
  const object = asRecord(value);

  return {
    summary: normalizeString(object.summary, 'Sureklilik ozeti bulunamadi.'),
    continuityScore: normalizeScore(object.continuityScore ?? object.continuity_score),
    naturalnessScore: normalizeScore(object.naturalnessScore ?? object.naturalness_score),
    retconRisk: normalizeScore(object.retconRisk ?? object.retcon_risk),
    foreshadowingScore: normalizeScore(object.foreshadowingScore ?? object.foreshadowing_score),
    conceptEvolution: normalizeConceptArray(object.conceptEvolution ?? object.concept_evolution, 8),
    anomalies: normalizeIssueArray(object.anomalies, documents, 8),
    chronologyNotes: normalizeStringArray(object.chronologyNotes ?? object.chronology_notes, 8),
    evidence: normalizeEvidenceArray(object.evidence, documents, 8),
    confidence: normalizeScore(object.confidence)
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeConceptArray(value: unknown, limit: number): AnalysisContinuityConcept[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);
      const firstSeen = normalizeString(record.firstSeen ?? record.first_seen);

      return {
        concept: normalizeString(record.concept, 'belirsiz'),
        firstSeen: firstSeen || null,
        evolution: normalizeString(record.evolution, ''),
        stabilityScore: normalizeScore(record.stabilityScore ?? record.stability_score)
      };
    })
    .filter((item) => item.concept)
    .slice(0, limit);
}

function normalizeIssueArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisContinuityIssue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const knownSourceIds = new Set(documents.map((document) => document.sourceId));

  return value
    .map((item) => {
      const record = asRecord(item);
      const sourceIds = normalizeStringArray(record.sourceIds ?? record.source_ids, 8).filter((sourceId) =>
        knownSourceIds.has(sourceId)
      );

      return {
        label: normalizeString(record.label, 'belirsiz'),
        severity: normalizeScore(record.severity),
        rationale: normalizeString(record.rationale, ''),
        sourceIds
      };
    })
    .filter((item) => item.label && item.rationale)
    .slice(0, limit);
}

function normalizeEvidenceArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisSemanticEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);
      const sourceId = normalizeString(record.sourceId ?? record.source_id);
      const source = documents.find((document) => document.sourceId === sourceId) ?? documents[0] ?? null;

      return {
        sourceId: sourceId || source?.sourceId || '',
        title: normalizeString(record.title, source?.title ?? ''),
        quote: trimToLength(normalizeString(record.quote), 220),
        relevance: normalizeString(record.relevance, '')
      };
    })
    .filter((item) => item.sourceId && item.quote)
    .slice(0, limit);
}

function normalizeScore(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(1, numeric));
}

function trimToLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

const scoreSchema = {
  type: 'number',
  minimum: 0,
  maximum: 1
} as const;

const narrativeContinuitySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'continuityScore',
    'naturalnessScore',
    'retconRisk',
    'foreshadowingScore',
    'conceptEvolution',
    'anomalies',
    'chronologyNotes',
    'evidence',
    'confidence'
  ],
  properties: {
    summary: {
      type: 'string'
    },
    continuityScore: scoreSchema,
    naturalnessScore: scoreSchema,
    retconRisk: scoreSchema,
    foreshadowingScore: scoreSchema,
    conceptEvolution: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['concept', 'firstSeen', 'evolution', 'stabilityScore'],
        properties: {
          concept: {
            type: 'string'
          },
          firstSeen: {
            type: ['string', 'null']
          },
          evolution: {
            type: 'string'
          },
          stabilityScore: scoreSchema
        }
      }
    },
    anomalies: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'severity', 'rationale', 'sourceIds'],
        properties: {
          label: {
            type: 'string'
          },
          severity: scoreSchema,
          rationale: {
            type: 'string'
          },
          sourceIds: {
            type: 'array',
            maxItems: 8,
            items: {
              type: 'string'
            }
          }
        }
      }
    },
    chronologyNotes: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'string'
      }
    },
    evidence: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['sourceId', 'title', 'quote', 'relevance'],
        properties: {
          sourceId: {
            type: 'string'
          },
          title: {
            type: 'string'
          },
          quote: {
            type: 'string',
            maxLength: 220
          },
          relevance: {
            type: 'string'
          }
        }
      }
    },
    confidence: scoreSchema
  }
} as const;
