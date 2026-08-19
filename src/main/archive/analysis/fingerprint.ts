import type {
  AnalysisEmotionalSignal,
  AnalysisRealityMechanic,
  AnalysisSemanticEvidence,
  AnalysisSemanticFingerprint
} from '../../../shared/archive.js';
import { buildDocumentExtracts, requestCodexJson } from './codex.js';
import type { AnalysisTextDocument } from './types.js';

export const analysisFingerprintPromptVersion = 'semantic-fingerprint-codex-v1';

export async function requestSemanticFingerprint(documents: AnalysisTextDocument[]): Promise<AnalysisSemanticFingerprint> {
  const parsed = await requestCodexJson({
    schema: semanticFingerprintSchema,
    schemaFileName: 'semantic-fingerprint.schema.json',
    outputFileName: 'semantic-fingerprint.result.json',
    prompt: buildFingerprintPrompt(documents),
    failureLabel: 'Codex CLI analizi'
  });

  return normalizeFingerprint(parsed, documents);
}

function buildFingerprintPrompt(documents: AnalysisTextDocument[]): string {
  const extracts = buildDocumentExtracts(documents);
  const sourceList = documents
    .map((document, index) => {
      return `${index + 1}. ${document.sourceId} | ${document.title} | ${document.publishedAt ?? 'tarih yok'} | ${document.wordCount} kelime`;
    })
    .join('\n');

  return `
Rol:
Sen Turkce calisan bir semantik forensics analiz modelisin. Gercek/yalan karari verme; yalnizca anlatinin zihinde nasil gerceklik hissi urettigini, sembolleri ve tekrar eden mekanikleri kanita dayali olarak analiz et.

Secili analiz kaynaklari:
${sourceList}

Gorev:
Asagidaki transkriptlerden semantik fingerprint cikar. "Gercek mi?" sorusunu cevaplama; bunun yerine anlati yapisinin hangi semboller, duygular, epistemik mekanikler ve sureklilik sinyalleri uzerinden gerceklik hissi urettigini incele.

Kurallar:
- Son cevabin yalnizca JSON olsun.
- Dizi alanlarini en fazla 8 ogeyle sinirla.
- score ve confidence 0 ile 1 arasinda olsun.
- evidence.quote metinden kisa ve dogrudan alinti olsun.
- Markdown, yorum veya JSON disi metin yazma.
- Dosya veya komut kullanma; yalnizca bu prompt icindeki metinle calis.

Transkript kesitleri:
${extracts}
`.trim();
}

function normalizeFingerprint(value: unknown, documents: AnalysisTextDocument[]): AnalysisSemanticFingerprint {
  const object = asRecord(value);

  return {
    summary: normalizeString(object.summary, 'Ozet bulunamadi.'),
    dominantSymbols: normalizeStringArray(object.dominantSymbols ?? object.dominant_symbols, 8),
    dominantConcepts: normalizeStringArray(object.dominantConcepts ?? object.dominant_concepts, 8),
    narrativeTone: normalizeString(object.narrativeTone ?? object.narrative_tone, 'belirsiz'),
    emotionalSignature: normalizeSignalArray(object.emotionalSignature ?? object.emotional_signature, 8),
    realityMechanics: normalizeMechanicArray(object.realityMechanics ?? object.reality_mechanics, 8),
    continuitySignals: normalizeStringArray(object.continuitySignals ?? object.continuity_signals, 8),
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

function normalizeSignalArray(value: unknown, limit: number): AnalysisEmotionalSignal[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);
      return {
        label: normalizeString(record.label, 'belirsiz'),
        score: normalizeScore(record.score),
        rationale: normalizeString(record.rationale, '')
      };
    })
    .slice(0, limit);
}

function normalizeMechanicArray(value: unknown, limit: number): AnalysisRealityMechanic[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);
      return {
        label: normalizeString(record.label, 'belirsiz'),
        score: normalizeScore(record.score),
        rationale: normalizeString(record.rationale, '')
      };
    })
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

const semanticFingerprintSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'dominantSymbols',
    'dominantConcepts',
    'narrativeTone',
    'emotionalSignature',
    'realityMechanics',
    'continuitySignals',
    'evidence',
    'confidence'
  ],
  properties: {
    summary: {
      type: 'string'
    },
    dominantSymbols: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'string'
      }
    },
    dominantConcepts: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'string'
      }
    },
    narrativeTone: {
      type: 'string'
    },
    emotionalSignature: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'score', 'rationale'],
        properties: {
          label: {
            type: 'string'
          },
          score: scoreSchema,
          rationale: {
            type: 'string'
          }
        }
      }
    },
    realityMechanics: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'score', 'rationale'],
        properties: {
          label: {
            type: 'string'
          },
          score: scoreSchema,
          rationale: {
            type: 'string'
          }
        }
      }
    },
    continuitySignals: {
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
