import type {
  AnalysisBelievabilityFriction,
  AnalysisBelievabilityHook,
  AnalysisBelievabilityMechanism,
  AnalysisBelievabilityReport,
  AnalysisSemanticEvidence
} from '../../../shared/archive.js';
import { buildDocumentExtracts, requestCodexJson } from './codex.js';
import type { AnalysisTextDocument } from './types.js';

export const analysisBelievabilityPromptVersion = 'human-believability-codex-v1';

export async function requestBelievability(documents: AnalysisTextDocument[]): Promise<AnalysisBelievabilityReport> {
  const parsed = await requestCodexJson({
    schema: believabilitySchema,
    schemaFileName: 'believability.schema.json',
    outputFileName: 'believability.result.json',
    prompt: buildBelievabilityPrompt(documents),
    failureLabel: 'Codex CLI believability analizi'
  });

  return normalizeBelievabilityReport(parsed, documents);
}

function buildBelievabilityPrompt(documents: AnalysisTextDocument[]): string {
  const extracts = buildDocumentExtracts(documents);
  const sourceList = documents
    .map((document, index) => {
      return `${index + 1}. ${document.sourceId} | ${document.title} | ${document.publishedAt ?? 'tarih yok'} | ${document.wordCount} kelime`;
    })
    .join('\n');

  return `
Rol:
Sen Turkce calisan bir medya forensics, anlatida guven mimarisi ve insan inanilirlik algisi analiz modelisin. Gorevin metnin izleyicide nasil "gercek gibi", "samimi", "arastirmaya deger" veya "kontrol edilmesi zor ama ikna edici" hissi uretebildigini savunmaci/analitik sekilde incelemektir. Kimseye manipule etme tavsiyesi verme; ikna teknigi tarifi yazma; yalnizca metindeki mevcut sinyalleri kanita dayali raporla.

Secili analiz kaynaklari:
${sourceList}

Gorev:
Asagidaki transkriptlerde Human Believability Simulator raporu uret. Bu rapor "insan neden inanir?" sorusuna psikolojik ve retorik aciklama arar; "gercek mi?" sorusuna karar vermez.

Analiz boyutlari:
- believabilityScore: genel insan-inanilirlik hissi yogunlugu
- trustArchitectureScore: kaynak, belge, otorite, taniklik, tekrar ve tutarlilikla guven kurma
- detailAuthenticityScore: kucuk detay, tarih, teknik terim, somut sahne ve belge ayrintisiyle gerceklik hissi
- imperfectionSimulationScore: kusur, tereddut, eksik bilgi, parca parca anlatim veya dogal hata hissinin inanilirlik etkisi
- cognitiveGripScore: merak, yarim aciklama, ic jargon, soru-cevap boslugu ve izleyiciyi arastirmaya baglama gucu

Bul:
- mechanisms: guven/gerceklik hissi ureten ana mekanizmalar
- hooks: izleyiciyi zihinsel olarak tutan inandiricilik kancalari
- frictionPoints: inanilirligi zayiflatan, fazla tasarlanmis veya kontrol edilmesi zor noktalar
- audienceEffects: izleyicide uretilebilecek olasi algi etkileri

Kurallar:
- Son cevabin yalnizca JSON olsun.
- Dizi alanlarini en fazla 8 ogeyle sinirla.
- Tum skorlar 0 ile 1 arasinda olsun.
- evidence.quote metinden kisa ve dogrudan alinti olsun.
- Gercek/yalan karari verme; niyet atfetme; klinik veya hukuki hukum kurma.
- Manipulasyon nasil yapilir seklinde talimat verme; sadece mevcut metni analiz et.
- Metinde olmayan iddia ekleme.
- Markdown, yorum veya JSON disi metin yazma.
- Dosya veya komut kullanma; yalnizca bu prompt icindeki metinle calis.

Transkript kesitleri:
${extracts}
`.trim();
}

function normalizeBelievabilityReport(value: unknown, documents: AnalysisTextDocument[]): AnalysisBelievabilityReport {
  const object = asRecord(value);

  return {
    summary: normalizeString(object.summary, 'Believability ozeti bulunamadi.'),
    believabilityScore: normalizeScore(object.believabilityScore ?? object.believability_score),
    trustArchitectureScore: normalizeScore(object.trustArchitectureScore ?? object.trust_architecture_score),
    detailAuthenticityScore: normalizeScore(object.detailAuthenticityScore ?? object.detail_authenticity_score),
    imperfectionSimulationScore: normalizeScore(object.imperfectionSimulationScore ?? object.imperfection_simulation_score),
    cognitiveGripScore: normalizeScore(object.cognitiveGripScore ?? object.cognitive_grip_score),
    mechanisms: normalizeMechanismArray(object.mechanisms, documents, 8),
    hooks: normalizeHookArray(object.hooks, documents, 8),
    frictionPoints: normalizeFrictionArray(object.frictionPoints ?? object.friction_points, documents, 8),
    audienceEffects: normalizeStringArray(object.audienceEffects ?? object.audience_effects, 8),
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

function normalizeMechanismArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisBelievabilityMechanism[] {
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

function normalizeHookArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisBelievabilityHook[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);
      return {
        label: normalizeString(record.label, 'belirsiz'),
        type: normalizeString(record.type, 'hook'),
        impactScore: normalizeScore(record.impactScore ?? record.impact_score),
        rationale: normalizeString(record.rationale, ''),
        sourceIds: normalizeSourceIds(record.sourceIds ?? record.source_ids, documents)
      };
    })
    .filter((item) => item.label && item.rationale)
    .slice(0, limit);
}

function normalizeFrictionArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisBelievabilityFriction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);
      return {
        label: normalizeString(record.label, 'belirsiz'),
        severity: normalizeScore(record.severity),
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

const believabilitySignalSchema = {
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
} as const;

const believabilitySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'believabilityScore',
    'trustArchitectureScore',
    'detailAuthenticityScore',
    'imperfectionSimulationScore',
    'cognitiveGripScore',
    'mechanisms',
    'hooks',
    'frictionPoints',
    'audienceEffects',
    'evidence',
    'confidence'
  ],
  properties: {
    summary: {
      type: 'string'
    },
    believabilityScore: scoreSchema,
    trustArchitectureScore: scoreSchema,
    detailAuthenticityScore: scoreSchema,
    imperfectionSimulationScore: scoreSchema,
    cognitiveGripScore: scoreSchema,
    mechanisms: {
      type: 'array',
      maxItems: 8,
      items: believabilitySignalSchema
    },
    hooks: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'type', 'impactScore', 'rationale', 'sourceIds'],
        properties: {
          label: {
            type: 'string'
          },
          type: {
            type: 'string'
          },
          impactScore: scoreSchema,
          rationale: {
            type: 'string'
          },
          sourceIds: sourceIdsSchema
        }
      }
    },
    frictionPoints: {
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
          sourceIds: sourceIdsSchema
        }
      }
    },
    audienceEffects: {
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
