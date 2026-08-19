import type {
  AnalysisCharacterGraphEdge,
  AnalysisCharacterGraphNode,
  AnalysisCharacterGraphReport,
  AnalysisSemanticEvidence
} from '../../../shared/archive.js';
import { buildDocumentExtracts, requestCodexJson } from './codex.js';
import type { AnalysisTextDocument } from './types.js';

export const analysisCharacterGraphPromptVersion = 'character-consciousness-graph-codex-v1';

export async function requestCharacterGraph(documents: AnalysisTextDocument[]): Promise<AnalysisCharacterGraphReport> {
  const parsed = await requestCodexJson({
    schema: characterGraphSchema,
    schemaFileName: 'character-graph.schema.json',
    outputFileName: 'character-graph.result.json',
    prompt: buildCharacterGraphPrompt(documents),
    failureLabel: 'Codex CLI character graph analizi'
  });

  return normalizeCharacterGraphReport(parsed, documents);
}

function buildCharacterGraphPrompt(documents: AnalysisTextDocument[]): string {
  const extracts = buildDocumentExtracts(documents);
  const sourceList = documents
    .map((document, index) => {
      return `${index + 1}. ${document.sourceId} | ${document.title} | ${document.publishedAt ?? 'tarih yok'} | ${document.wordCount} kelime`;
    })
    .join('\n');

  return `
Rol:
Sen Turkce calisan bir anlati rolleri ve character consciousness graph analiz modelisin. Gorevin metindeki aktorleri gercek kisi tespiti gibi degil, anlati icinde bilgi, suphe, otorite, tehdit ve gerceklik iddiasini tasiyan fonksiyonlar olarak modellemektir. Gercek/yalan karari verme, niyet atfetme, klinik/hukuki hukum kurma.

Secili analiz kaynaklari:
${sourceList}

Gorev:
Asagidaki transkriptlerden bir karakter/rol grafigi cikar. "Karakter" kelimesi burada gercek kisi anlamina gelmez; anlatici sesi, kurum, gorunmeyen sistem, belge, tanik, supheci, koruyucu, oracle, gatekeeper, tehdit veya izleyiciye konusan rol gibi anlati fonksiyonlarini kapsar.

Analiz et:
- Hangi node hangi kavrami veya gerceklik iddiasini tasiyor?
- Hangi node bilgi veriyor, hangisi sakliyor, hangisi dogruluyor, hangisi suphe uretiyor?
- Roller kaynaklar arasinda stabil mi, yoksa kaynaklara gore daginik mi?
- Graph dramatik olarak fazla dengeli mi, yoksa spontane anlatilara benzer sekilde messy mi?
- "Reality carrier" yani gerceklik hissini en cok tasiyan rol hangisi?

Skorlar:
- graphBalanceScore: 0 daginik/spontane, 1 dramatik olarak cok dengeli ve fonksiyonel dagilmis graph
- roleStabilityScore: 0 roller kaynaklar arasinda degisken, 1 roller kaynaklar arasinda cok stabil
- fictionalitySignal: 0 kurgu sinyali zayif, 1 dramaturjik rol dagilimi belirgin. Bu skor kanit degil, yalnizca sinyaldir.

JSON alanlari:
- nodes[].id kisa, ASCII ve edges icinde kullanilabilir olsun.
- nodes[].label gorunen rol/aktor adi olsun.
- nodes[].role ornek: narrator, authority, witness, skeptic, oracle, gatekeeper, seeker, threat, hidden system, reality carrier.
- nodes[].stance rolun bilgiye/gerceklik iddiasina tavrini kisa aciklasin.
- edges[].source ve edges[].target mutlaka nodes[].id degerlerinden biri olsun.

Kurallar:
- Son cevabin yalnizca JSON olsun.
- Dizi alanlarini en fazla 8 ogeyle sinirla.
- Tum skorlar 0 ile 1 arasinda olsun.
- evidence.quote metinden kisa ve dogrudan alinti olsun.
- Kisileri gercek hayatta tespite calisma; yalnizca metindeki anlatim fonksiyonlarini adlandir.
- Metinde olmayan iddia ekleme.
- Markdown, yorum veya JSON disi metin yazma.
- Dosya veya komut kullanma; yalnizca bu prompt icindeki metinle calis.

Transkript kesitleri:
${extracts}
`.trim();
}

function normalizeCharacterGraphReport(value: unknown, documents: AnalysisTextDocument[]): AnalysisCharacterGraphReport {
  const object = asRecord(value);
  const nodes = normalizeNodeArray(object.nodes, documents, 8);

  return {
    summary: normalizeString(object.summary, 'Character graph ozeti bulunamadi.'),
    graphBalanceScore: normalizeScore(object.graphBalanceScore ?? object.graph_balance_score),
    roleStabilityScore: normalizeScore(object.roleStabilityScore ?? object.role_stability_score),
    fictionalitySignal: normalizeScore(object.fictionalitySignal ?? object.fictionality_signal),
    dominantCarrier: normalizeString(object.dominantCarrier ?? object.dominant_carrier, 'belirsiz'),
    nodes,
    edges: normalizeEdgeArray(object.edges, documents, nodes, 8),
    roleSignals: normalizeStringArray(object.roleSignals ?? object.role_signals, 8),
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

function normalizeNodeArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  limit: number
): AnalysisCharacterGraphNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const usedIds = new Set<string>();

  return value
    .map((item, index) => {
      const record = asRecord(item);
      const label = normalizeString(record.label, 'belirsiz rol');
      const id = normalizeNodeId(normalizeString(record.id), label, index, usedIds);

      return {
        id,
        label,
        role: normalizeString(record.role, 'belirsiz'),
        stance: normalizeString(record.stance, ''),
        salience: normalizeScore(record.salience),
        rationale: normalizeString(record.rationale, ''),
        sourceIds: normalizeSourceIds(record.sourceIds ?? record.source_ids, documents)
      };
    })
    .filter((item) => item.id && item.label && item.rationale)
    .slice(0, limit);
}

function normalizeNodeId(rawId: string, label: string, index: number, usedIds: Set<string>): string {
  const base = normalizeIdText(rawId || label || `node-${index + 1}`).slice(0, 48);
  const fallback = base || `node-${index + 1}`;
  let candidate = fallback;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${fallback}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function normalizeReferenceId(value: string): string {
  return normalizeIdText(value).slice(0, 48);
}

function normalizeIdText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeEdgeArray(
  value: unknown,
  documents: AnalysisTextDocument[],
  nodes: AnalysisCharacterGraphNode[],
  limit: number
): AnalysisCharacterGraphEdge[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const knownNodeIds = new Set(nodes.map((node) => node.id));

  return value
    .map((item) => {
      const record = asRecord(item);
      const source = normalizeReferenceId(normalizeString(record.source));
      const target = normalizeReferenceId(normalizeString(record.target));

      return {
        source,
        target,
        relation: normalizeString(record.relation, 'iliski'),
        weight: normalizeScore(record.weight),
        rationale: normalizeString(record.rationale, ''),
        sourceIds: normalizeSourceIds(record.sourceIds ?? record.source_ids, documents)
      };
    })
    .filter((item) => knownNodeIds.has(item.source) && knownNodeIds.has(item.target) && item.relation && item.rationale)
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

const characterGraphSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'graphBalanceScore',
    'roleStabilityScore',
    'fictionalitySignal',
    'dominantCarrier',
    'nodes',
    'edges',
    'roleSignals',
    'evidence',
    'confidence'
  ],
  properties: {
    summary: {
      type: 'string'
    },
    graphBalanceScore: scoreSchema,
    roleStabilityScore: scoreSchema,
    fictionalitySignal: scoreSchema,
    dominantCarrier: {
      type: 'string'
    },
    nodes: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'role', 'stance', 'salience', 'rationale', 'sourceIds'],
        properties: {
          id: {
            type: 'string'
          },
          label: {
            type: 'string'
          },
          role: {
            type: 'string'
          },
          stance: {
            type: 'string'
          },
          salience: scoreSchema,
          rationale: {
            type: 'string'
          },
          sourceIds: sourceIdsSchema
        }
      }
    },
    edges: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['source', 'target', 'relation', 'weight', 'rationale', 'sourceIds'],
        properties: {
          source: {
            type: 'string'
          },
          target: {
            type: 'string'
          },
          relation: {
            type: 'string'
          },
          weight: scoreSchema,
          rationale: {
            type: 'string'
          },
          sourceIds: sourceIdsSchema
        }
      }
    },
    roleSignals: {
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
