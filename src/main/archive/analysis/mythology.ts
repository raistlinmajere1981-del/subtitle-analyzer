import type {
  AnalysisMythologyAffinity,
  AnalysisMythologyArchetype,
  AnalysisMythologyReport,
  AnalysisMythologySymbolCluster,
  AnalysisSemanticEvidence
} from '../../../shared/archive.js';
import { buildDocumentExtracts, requestCodexJson } from './codex.js';
import type { AnalysisTextDocument } from './types.js';

export const analysisMythologyPromptVersion = 'mythology-mapping-codex-v1';

export async function requestMythologyMapping(documents: AnalysisTextDocument[]): Promise<AnalysisMythologyReport> {
  const parsed = await requestCodexJson({
    schema: mythologyMappingSchema,
    schemaFileName: 'mythology-mapping.schema.json',
    outputFileName: 'mythology-mapping.result.json',
    prompt: buildMythologyPrompt(documents),
    failureLabel: 'Codex CLI mythology mapping analizi'
  });

  return normalizeMythologyReport(parsed, documents);
}

function buildMythologyPrompt(documents: AnalysisTextDocument[]): string {
  const extracts = buildDocumentExtracts(documents);
  const sourceList = documents
    .map((document, index) => {
      return `${index + 1}. ${document.sourceId} | ${document.title} | ${document.publishedAt ?? 'tarih yok'} | ${document.wordCount} kelime`;
    })
    .join('\n');

  return `
Rol:
Sen Turkce calisan bir mitoloji, arketip ve medya-anlati haritalama modelisin. Gorevin dogruluk veya kaynak soy bagi ispatlamak degil; secili metinlerdeki sembol, rol ve anlati islevlerini mitolojik/arketipsel yapilarla temkinli bicimde eslemektir.

Secili analiz kaynaklari:
${sourceList}

Gorev:
Asagidaki transkriptlerde tekrar eden mitik rolleri, sembol kumelerini ve gelenek/tema benzerliklerini cikar. Gnostik, Jungian, apokaliptik, inisiyasyon, kahraman yolculugu, ezoterik, lovecraftian/kozmik korku, trickster, tufan/reset, yasak bilgi ve dusus-yukselis gibi kaliplari dusunebilirsin.

Kurallar:
- Son cevabin yalnizca JSON olsun.
- Dizi alanlarini en fazla 8 ogeyle sinirla.
- Tum skorlar 0 ile 1 arasinda olsun.
- Benzerlikleri "benziyor", "yaklasiyor", "motif olarak eslesiyor" diliyle yaz; dogrudan etki/soy bagi iddia etme.
- evidence.quote metinden kisa ve dogrudan alinti olsun.
- Metinde olmayan yeni olay, isim veya iddia ekleme.
- Markdown, yorum veya JSON disi metin yazma.
- Dosya veya komut kullanma; yalnizca bu prompt icindeki metinle calis.

Transkript kesitleri:
${extracts}
`.trim();
}

function normalizeMythologyReport(value: unknown, documents: AnalysisTextDocument[]): AnalysisMythologyReport {
  const object = asRecord(value);

  return {
    summary: normalizeString(object.summary, 'Mitoloji haritasi ozeti bulunamadi.'),
    dominantMythicFrame: normalizeString(object.dominantMythicFrame ?? object.dominant_mythic_frame, 'belirsiz'),
    archetypes: normalizeArchetypeArray(object.archetypes, documents, 8),
    symbolClusters: normalizeSymbolClusterArray(object.symbolClusters ?? object.symbol_clusters, documents, 8),
    traditionAffinities: normalizeAffinityArray(object.traditionAffinities ?? object.tradition_affinities, 8),
    cautions: normalizeStringArray(object.cautions, 8),
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

function normalizeSourceIds(value: unknown, documents: AnalysisTextDocument[]): string[] {
  const knownSourceIds = new Set(documents.map((document) => document.sourceId));
  return normalizeStringArray(value, 8).filter((sourceId) => knownSourceIds.has(sourceId));
}

function normalizeArchetypeArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisMythologyArchetype[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);
      return {
        label: normalizeString(record.label, 'belirsiz'),
        role: normalizeString(record.role, ''),
        score: normalizeScore(record.score),
        rationale: normalizeString(record.rationale, ''),
        sourceIds: normalizeSourceIds(record.sourceIds ?? record.source_ids, documents)
      };
    })
    .filter((item) => item.label && item.rationale)
    .slice(0, limit);
}

function normalizeSymbolClusterArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisMythologySymbolCluster[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);
      return {
        label: normalizeString(record.label, 'belirsiz'),
        symbols: normalizeStringArray(record.symbols, 8),
        interpretation: normalizeString(record.interpretation, ''),
        sourceIds: normalizeSourceIds(record.sourceIds ?? record.source_ids, documents)
      };
    })
    .filter((item) => item.label && item.interpretation)
    .slice(0, limit);
}

function normalizeAffinityArray(value: unknown, limit: number): AnalysisMythologyAffinity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);
      return {
        tradition: normalizeString(record.tradition, 'belirsiz'),
        affinityScore: normalizeScore(record.affinityScore ?? record.affinity_score),
        rationale: normalizeString(record.rationale, ''),
        caveat: normalizeString(record.caveat, '')
      };
    })
    .filter((item) => item.tradition && item.rationale)
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

const mythologyMappingSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'dominantMythicFrame',
    'archetypes',
    'symbolClusters',
    'traditionAffinities',
    'cautions',
    'evidence',
    'confidence'
  ],
  properties: {
    summary: {
      type: 'string'
    },
    dominantMythicFrame: {
      type: 'string'
    },
    archetypes: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'role', 'score', 'rationale', 'sourceIds'],
        properties: {
          label: {
            type: 'string'
          },
          role: {
            type: 'string'
          },
          score: scoreSchema,
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
    symbolClusters: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'symbols', 'interpretation', 'sourceIds'],
        properties: {
          label: {
            type: 'string'
          },
          symbols: {
            type: 'array',
            maxItems: 8,
            items: {
              type: 'string'
            }
          },
          interpretation: {
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
    traditionAffinities: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['tradition', 'affinityScore', 'rationale', 'caveat'],
        properties: {
          tradition: {
            type: 'string'
          },
          affinityScore: scoreSchema,
          rationale: {
            type: 'string'
          },
          caveat: {
            type: 'string'
          }
        }
      }
    },
    cautions: {
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
