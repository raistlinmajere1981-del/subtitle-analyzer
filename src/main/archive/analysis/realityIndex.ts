import type {
  AnalysisRealityIndexReport,
  AnalysisRealityIndexSignal,
  AnalysisSemanticEvidence
} from '../../../shared/archive.js';
import { buildDocumentExtracts, requestCodexJson } from './codex.js';
import type { AnalysisTextDocument } from './types.js';

export const analysisRealityIndexPromptVersion = 'reality-index-codex-v1';

export async function requestRealityIndex(documents: AnalysisTextDocument[]): Promise<AnalysisRealityIndexReport> {
  const parsed = await requestCodexJson({
    schema: realityIndexSchema,
    schemaFileName: 'reality-index.schema.json',
    outputFileName: 'reality-index.result.json',
    prompt: buildRealityIndexPrompt(documents),
    failureLabel: 'Codex CLI reality index analizi'
  });

  return normalizeRealityIndexReport(parsed, documents);
}

function buildRealityIndexPrompt(documents: AnalysisTextDocument[]): string {
  const extracts = buildDocumentExtracts(documents);
  const sourceList = documents
    .map((document, index) => {
      return `${index + 1}. ${document.sourceId} | ${document.title} | ${document.publishedAt ?? 'tarih yok'} | ${document.wordCount} kelime`;
    })
    .join('\n');

  return `
Rol:
Sen Turkce calisan bir medya forensics ve retorik etki analiz modelisin. Gorevin bir anlatinin izleyicide "gerceklik hissi"ni nasil yogunlastirdigini veya destabilize ettigini kanita dayali puanlamaktir. Gercek/yalan karari verme, niyet atfetme ve kisi/grup hakkinda klinik ya da hukuki hukum kurma.

Secili analiz kaynaklari:
${sourceList}

Gorev:
Asagidaki transkriptlerde Reality Manipulation Index uret. Bu indeks, metnin izleyicide belirsizlik, sakli bilgi cekimi, otorite baskisi, epistemik izolasyon, cliffhanger ve korku+bilgi karisimi uzerinden gerceklik algisini ne kadar hareketlendirdigini olcer. "Manipulasyon" kelimesini kesin suclama gibi kullanma; "retorik etki sinyali", "destabilizasyon baskisi" ve "risk" dili kullan.

Boyutlar:
- uncertaintyDensity: cevap yerine soru, belirsizlik, bosluk, muamma yogunlugu
- authorityPressure: dogrulanmasi zor otorite, kurum, belge, uzman, tarihsel cipa kullanimi
- secrecyPressure: yasak bilgi, saklanan arsiv, silinmis belge, ifsa ve karartma cekimi
- epistemicIsolation: "bunu herkes goremez", "resmi anlatidan kop", "uyananlar/anlayanlar" dili
- cliffhangerPressure: yarim birakilan aciklama, sonraki parcaya baglama, surekli erteleme
- fearKnowledgeBlend: korku, kriz veya tehdit ile bilgi/uyanma vaadinin birlikte kullanimi

Kurallar:
- Son cevabin yalnizca JSON olsun.
- Dizi alanlarini en fazla 8 ogeyle sinirla.
- Tum skorlar 0 ile 1 arasinda olsun.
- evidence.quote metinden kisa ve dogrudan alinti olsun.
- Metinde olmayan iddia ekleme.
- Markdown, yorum veya JSON disi metin yazma.
- Dosya veya komut kullanma; yalnizca bu prompt icindeki metinle calis.

Transkript kesitleri:
${extracts}
`.trim();
}

function normalizeRealityIndexReport(value: unknown, documents: AnalysisTextDocument[]): AnalysisRealityIndexReport {
  const object = asRecord(value);

  return {
    summary: normalizeString(object.summary, 'Reality index ozeti bulunamadi.'),
    indexScore: normalizeScore(object.indexScore ?? object.index_score),
    riskLevel: normalizeString(object.riskLevel ?? object.risk_level, 'belirsiz'),
    uncertaintyDensity: normalizeScore(object.uncertaintyDensity ?? object.uncertainty_density),
    authorityPressure: normalizeScore(object.authorityPressure ?? object.authority_pressure),
    secrecyPressure: normalizeScore(object.secrecyPressure ?? object.secrecy_pressure),
    epistemicIsolation: normalizeScore(object.epistemicIsolation ?? object.epistemic_isolation),
    cliffhangerPressure: normalizeScore(object.cliffhangerPressure ?? object.cliffhanger_pressure),
    fearKnowledgeBlend: normalizeScore(object.fearKnowledgeBlend ?? object.fear_knowledge_blend),
    dominantMechanisms: normalizeSignalArray(object.dominantMechanisms ?? object.dominant_mechanisms, documents, 8),
    stabilizers: normalizeStringArray(object.stabilizers, 8),
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

function normalizeSignalArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisRealityIndexSignal[] {
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

const realityIndexSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'indexScore',
    'riskLevel',
    'uncertaintyDensity',
    'authorityPressure',
    'secrecyPressure',
    'epistemicIsolation',
    'cliffhangerPressure',
    'fearKnowledgeBlend',
    'dominantMechanisms',
    'stabilizers',
    'evidence',
    'confidence'
  ],
  properties: {
    summary: {
      type: 'string'
    },
    indexScore: scoreSchema,
    riskLevel: {
      type: 'string'
    },
    uncertaintyDensity: scoreSchema,
    authorityPressure: scoreSchema,
    secrecyPressure: scoreSchema,
    epistemicIsolation: scoreSchema,
    cliffhangerPressure: scoreSchema,
    fearKnowledgeBlend: scoreSchema,
    dominantMechanisms: {
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
    stabilizers: {
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
