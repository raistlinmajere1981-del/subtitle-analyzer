import type {
  AnalysisSemanticDriftConcept,
  AnalysisSemanticDriftPhase,
  AnalysisSemanticDriftReport,
  AnalysisSemanticDriftSignal,
  AnalysisSemanticEvidence
} from '../../../shared/archive.js';
import { buildDocumentExtracts, requestCodexJson } from './codex.js';
import type { AnalysisTextDocument } from './types.js';

export const analysisSemanticDriftPromptVersion = 'semantic-drift-codex-v1';

export async function requestSemanticDrift(documents: AnalysisTextDocument[]): Promise<AnalysisSemanticDriftReport> {
  const parsed = await requestCodexJson({
    schema: semanticDriftSchema,
    schemaFileName: 'semantic-drift.schema.json',
    outputFileName: 'semantic-drift.result.json',
    prompt: buildSemanticDriftPrompt(documents),
    failureLabel: 'Codex CLI semantic drift analizi'
  });

  return normalizeSemanticDriftReport(parsed, documents);
}

function buildSemanticDriftPrompt(documents: AnalysisTextDocument[]): string {
  const chronologicalDocuments = [...documents].sort((first, second) =>
    (first.publishedAt ?? '').localeCompare(second.publishedAt ?? '')
  );
  const extracts = buildDocumentExtracts(chronologicalDocuments);
  const sourceList = chronologicalDocuments
    .map((document, index) => {
      return `${index + 1}. ${document.sourceId} | ${document.title} | ${document.publishedAt ?? 'tarih yok'} | ${document.wordCount} kelime`;
    })
    .join('\n');

  return `
Rol:
Sen Turkce calisan bir semantik drift ve kavram evrimi analiz modelisin. Gorevin secili kaynaklarda tekrar eden kavramlarin zaman icinde anlam, rol ve baglam degistirip degistirmedigini kanita dayali incelemektir. Gercek/yalan karari verme; niyet atfetme; kesin kurgu/gercek hukmu kurma.

Secili analiz kaynaklari kronolojik sirayla:
${sourceList}

Gorev:
Bu transkriptlerde tekrar eden ana kavram, sembol, kurum, karakter rolu veya lore parcaciklarinin semantik davranisini analiz et.

Ayirt et:
- Organik drift: kavramlar daginik, deneyimsel veya spontane anlatilarda oldugu gibi kismen tutarsiz kayiyor.
- Kontrollu expansion: kavramlar sonraki kaynaklarda daha organize, daha islevsel ve lore bible hissi veren sekilde genisliyor.
- Anchor stability: bazi kavramlar degismeden sabit cipa olarak kaliyor.
- Retcon hissi: eski kavram yeni anlamla geriye dogru yeniden okunuyor gibi duruyor.

Skorlar:
- driftIndex: 0 cok sabit, 1 anlam kaymasi cok yogun
- controlledExpansionScore: 0 daginik/organik, 1 kontrollu ve tasarlanmis genisleme sinyali yuksek
- organicMessinessScore: 0 steril/duzenli, 1 messy/spontane sinyali yuksek
- anchorStabilityScore: 0 cipa yok, 1 tekrar eden sabit kavramlar guclu

Kurallar:
- Son cevabin yalnizca JSON olsun.
- Dizi alanlarini en fazla 8 ogeyle sinirla.
- Tum skorlar 0 ile 1 arasinda olsun.
- evidence.quote metinden kisa ve dogrudan alinti olsun.
- firstSeen/latestSeen kaynak tarihi veya sourceId olabilir; belirsizse bos string kullan.
- "Kurgu", "retcon", "kontrollu" gibi ifadeleri kesin hukum degil sinyal olarak yaz.
- Metinde olmayan iddia ekleme.
- Markdown, yorum veya JSON disi metin yazma.
- Dosya veya komut kullanma; yalnizca bu prompt icindeki metinle calis.

Transkript kesitleri:
${extracts}
`.trim();
}

function normalizeSemanticDriftReport(value: unknown, documents: AnalysisTextDocument[]): AnalysisSemanticDriftReport {
  const object = asRecord(value);

  return {
    summary: normalizeString(object.summary, 'Semantic drift ozeti bulunamadi.'),
    driftIndex: normalizeScore(object.driftIndex ?? object.drift_index),
    controlledExpansionScore: normalizeScore(object.controlledExpansionScore ?? object.controlled_expansion_score),
    organicMessinessScore: normalizeScore(object.organicMessinessScore ?? object.organic_messiness_score),
    anchorStabilityScore: normalizeScore(object.anchorStabilityScore ?? object.anchor_stability_score),
    concepts: normalizeConceptArray(object.concepts, documents, 8),
    phases: normalizePhaseArray(object.phases, documents, 8),
    expansionSignals: normalizeSignalArray(object.expansionSignals ?? object.expansion_signals, documents, 8),
    stableAnchors: normalizeStringArray(object.stableAnchors ?? object.stable_anchors, 8),
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

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeSourceIds(value: unknown, documents: AnalysisTextDocument[]): string[] {
  const knownSourceIds = new Set(documents.map((document) => document.sourceId));
  return normalizeStringArray(value, 8).filter((sourceId) => knownSourceIds.has(sourceId));
}

function normalizeConceptArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisSemanticDriftConcept[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      return {
        concept: normalizeString(record.concept, 'belirsiz'),
        firstSeen: normalizeNullableString(record.firstSeen ?? record.first_seen),
        latestSeen: normalizeNullableString(record.latestSeen ?? record.latest_seen),
        earlyMeaning: normalizeString(record.earlyMeaning ?? record.early_meaning, ''),
        laterMeaning: normalizeString(record.laterMeaning ?? record.later_meaning, ''),
        driftType: normalizeString(record.driftType ?? record.drift_type, 'belirsiz'),
        driftScore: normalizeScore(record.driftScore ?? record.drift_score),
        rationale: normalizeString(record.rationale, ''),
        sourceIds: normalizeSourceIds(record.sourceIds ?? record.source_ids, documents)
      };
    })
    .filter((item) => item.concept && item.rationale)
    .slice(0, limit);
}

function normalizePhaseArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisSemanticDriftPhase[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      return {
        label: normalizeString(record.label, 'faz'),
        period: normalizeString(record.period, ''),
        summary: normalizeString(record.summary, ''),
        dominantConcepts: normalizeStringArray(record.dominantConcepts ?? record.dominant_concepts, 8),
        sourceIds: normalizeSourceIds(record.sourceIds ?? record.source_ids, documents)
      };
    })
    .filter((item) => item.label && item.summary)
    .slice(0, limit);
}

function normalizeSignalArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisSemanticDriftSignal[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);
      return {
        label: normalizeString(record.label, 'belirsiz'),
        score: normalizeScore(record.score),
        rationale: normalizeString(record.rationale, ''),
        sourceIds: normalizeSourceIds(record.sourceIds ?? record.source_ids, documents)
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

const sourceIdsSchema = {
  type: 'array',
  maxItems: 8,
  items: {
    type: 'string'
  }
} as const;

const semanticDriftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'driftIndex',
    'controlledExpansionScore',
    'organicMessinessScore',
    'anchorStabilityScore',
    'concepts',
    'phases',
    'expansionSignals',
    'stableAnchors',
    'evidence',
    'confidence'
  ],
  properties: {
    summary: {
      type: 'string'
    },
    driftIndex: scoreSchema,
    controlledExpansionScore: scoreSchema,
    organicMessinessScore: scoreSchema,
    anchorStabilityScore: scoreSchema,
    concepts: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'concept',
          'firstSeen',
          'latestSeen',
          'earlyMeaning',
          'laterMeaning',
          'driftType',
          'driftScore',
          'rationale',
          'sourceIds'
        ],
        properties: {
          concept: {
            type: 'string'
          },
          firstSeen: {
            type: 'string'
          },
          latestSeen: {
            type: 'string'
          },
          earlyMeaning: {
            type: 'string'
          },
          laterMeaning: {
            type: 'string'
          },
          driftType: {
            type: 'string'
          },
          driftScore: scoreSchema,
          rationale: {
            type: 'string'
          },
          sourceIds: sourceIdsSchema
        }
      }
    },
    phases: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'period', 'summary', 'dominantConcepts', 'sourceIds'],
        properties: {
          label: {
            type: 'string'
          },
          period: {
            type: 'string'
          },
          summary: {
            type: 'string'
          },
          dominantConcepts: {
            type: 'array',
            maxItems: 8,
            items: {
              type: 'string'
            }
          },
          sourceIds: sourceIdsSchema
        }
      }
    },
    expansionSignals: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'score', 'rationale', 'sourceIds'],
        properties: {
          label: {
            type: 'string'
          },
          score: scoreSchema,
          rationale: {
            type: 'string'
          },
          sourceIds: sourceIdsSchema
        }
      }
    },
    stableAnchors: {
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
