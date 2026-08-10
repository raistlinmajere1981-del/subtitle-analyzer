export type AnalysisRunKey =
  | 'fingerprint'
  | 'realityIndex'
  | 'continuity'
  | 'mythology'
  | 'characterGraph'
  | 'semanticDrift'
  | 'believability';

export interface AnalysisRunDefinition {
  key: AnalysisRunKey;
  label: string;
  shortLabel: string;
  description: string;
  dependsOn: AnalysisRunKey[];
}

export const analysisRunDefinitions: AnalysisRunDefinition[] = [
  {
    key: 'fingerprint',
    label: 'AI fingerprint',
    shortLabel: 'Fingerprint',
    description: 'Temel sembol, duygu, ton ve gerceklik mekanigi haritasi.',
    dependsOn: []
  },
  {
    key: 'realityIndex',
    label: 'Reality index',
    shortLabel: 'RMI',
    description: 'Belirsizlik, otorite, gizli bilgi ve cliffhanger yogunlugu.',
    dependsOn: ['fingerprint']
  },
  {
    key: 'continuity',
    label: 'Narrative continuity',
    shortLabel: 'Continuity',
    description: 'Kavram evrimi, retcon riski, dogallik ve on isaretler.',
    dependsOn: ['fingerprint']
  },
  {
    key: 'mythology',
    label: 'Mythology mapping',
    shortLabel: 'Mythology',
    description: 'Sembol kumeleri, arketipler ve mitolojik benzerlikler.',
    dependsOn: ['fingerprint']
  },
  {
    key: 'characterGraph',
    label: 'Character graph',
    shortLabel: 'Graph',
    description: 'Rol dagilimi, reality carrier ve anlatidaki islevsel node yapisi.',
    dependsOn: ['continuity']
  },
  {
    key: 'semanticDrift',
    label: 'Semantic drift',
    shortLabel: 'Drift',
    description: 'Kavram anlam kaymalari, genisleme ve sabit cipa kontrolu.',
    dependsOn: ['continuity']
  },
  {
    key: 'believability',
    label: 'Human believability',
    shortLabel: 'Believability',
    description: 'Insan-inanilirlik hissi, guven mimarisi ve surtunme noktalari.',
    dependsOn: ['realityIndex']
  }
];

export const analysisRunOrder = analysisRunDefinitions.map((definition) => definition.key);

export function getAnalysisRunDefinition(key: AnalysisRunKey): AnalysisRunDefinition {
  const fallback = analysisRunDefinitions[0];
  if (!fallback) {
    throw new Error('Analiz tanimi bulunamadi.');
  }

  return analysisRunDefinitions.find((definition) => definition.key === key) ?? fallback;
}

export function normalizeAnalysisRunSelection(keys: AnalysisRunKey[]): AnalysisRunKey[] {
  const selected = new Set<AnalysisRunKey>();
  keys.forEach((key) => addWithDependencies(selected, key));
  return analysisRunOrder.filter((key) => selected.has(key));
}

export function toggleAnalysisRunSelection(current: AnalysisRunKey[], key: AnalysisRunKey): AnalysisRunKey[] {
  const selected = new Set(current);
  if (selected.has(key)) {
    const blocked = collectDependents(key);
    blocked.add(key);
    return analysisRunOrder.filter((currentKey) => selected.has(currentKey) && !blocked.has(currentKey));
  }

  addWithDependencies(selected, key);
  return analysisRunOrder.filter((currentKey) => selected.has(currentKey));
}

function addWithDependencies(selected: Set<AnalysisRunKey>, key: AnalysisRunKey): void {
  getAnalysisRunDefinition(key).dependsOn.forEach((dependency) => addWithDependencies(selected, dependency));
  selected.add(key);
}

function collectDependents(key: AnalysisRunKey): Set<AnalysisRunKey> {
  const dependents = new Set<AnalysisRunKey>();
  let changed = true;

  while (changed) {
    changed = false;
    analysisRunDefinitions.forEach((definition) => {
      const hasDependency = definition.dependsOn.some((dependency) => dependency === key || dependents.has(dependency));
      if (hasDependency && !dependents.has(definition.key)) {
        dependents.add(definition.key);
        changed = true;
      }
    });
  }

  return dependents;
}
