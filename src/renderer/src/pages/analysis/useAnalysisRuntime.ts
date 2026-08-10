import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AnalysisAiProviderStatus,
  AnalysisBelievabilityRecord,
  AnalysisCharacterGraphRecord,
  AnalysisContinuityRecord,
  AnalysisFingerprintRecord,
  AnalysisFrequencyResult,
  AnalysisIndexSummary,
  AnalysisMythologyRecord,
  AnalysisNgramSize,
  AnalysisRealityIndexRecord,
  AnalysisScope,
  AnalysisSemanticDriftRecord,
  AnalysisSearchResult,
  AnalysisSourceType,
  AnalysisSourceSummary,
  AnalysisTimelineResult,
  ChannelSummary
} from '../../../../shared/archive';
import { errorToMessage } from '../../lib/errors';
import {
  analysisRunDefinitions,
  analysisRunOrder,
  normalizeAnalysisRunSelection,
  toggleAnalysisRunSelection,
  type AnalysisRunKey
} from './analysisRunConfig';
import { emptyAnalysisSummary } from './constants';

interface UseAnalysisRuntimeParams {
  selectedChannel: ChannelSummary | null;
  onArchiveChanged: () => Promise<void>;
}

export interface AnalysisRunQueueState {
  isRunning: boolean;
  currentKey: AnalysisRunKey | null;
  pendingKeys: AnalysisRunKey[];
  completedKeys: AnalysisRunKey[];
  failedKey: AnalysisRunKey | null;
  cancelRequested: boolean;
}

export function useAnalysisRuntime({ selectedChannel, onArchiveChanged }: UseAnalysisRuntimeParams): {
  analysisQuery: string;
  ngramSize: AnalysisNgramSize;
  summary: AnalysisIndexSummary;
  searchResult: AnalysisSearchResult | null;
  frequency: AnalysisFrequencyResult | null;
  timeline: AnalysisTimelineResult | null;
  aiProviderStatus: AnalysisAiProviderStatus | null;
  semanticFingerprint: AnalysisFingerprintRecord | null;
  continuityReport: AnalysisContinuityRecord | null;
  mythologyReport: AnalysisMythologyRecord | null;
  realityIndexReport: AnalysisRealityIndexRecord | null;
  characterGraphReport: AnalysisCharacterGraphRecord | null;
  semanticDriftReport: AnalysisSemanticDriftRecord | null;
  believabilityReport: AnalysisBelievabilityRecord | null;
  analysisMessage: string | null;
  analysisError: string | null;
  isAnalysisLoading: boolean;
  isFingerprintRunning: boolean;
  isContinuityRunning: boolean;
  isMythologyRunning: boolean;
  isRealityIndexRunning: boolean;
  isCharacterGraphRunning: boolean;
  isSemanticDriftRunning: boolean;
  isBelievabilityRunning: boolean;
  analysisSources: AnalysisSourceSummary[];
  analysisSourceType: AnalysisSourceType;
  analysisSourceTypeCounts: Record<AnalysisSourceType, number>;
  activeAnalysisSourceCount: number;
  selectedAnalysisSourceIds: string[];
  selectedAnalysisSourceSet: Set<string>;
  visibleAnalysisSources: AnalysisSourceSummary[];
  analysisSourceQuery: string;
  selectedAnalysisWordCount: number;
  isAnalysisUnavailable: boolean;
  selectedAnalysisRunKeys: AnalysisRunKey[];
  analysisRunQueue: AnalysisRunQueueState;
  onAnalysisQueryChange: (value: string) => void;
  onNgramSizeChange: (value: AnalysisNgramSize) => void;
  onAnalysisSourceTypeChange: (value: AnalysisSourceType) => void;
  onAnalysisSourceQueryChange: (value: string) => void;
  onSelectVisibleSources: () => void;
  onClearSelectedSources: () => void;
  onToggleSource: (sourceId: string) => void;
  onToggleAnalysisRun: (key: AnalysisRunKey) => void;
  onSelectAllAnalysisRuns: () => void;
  onClearAnalysisRuns: () => void;
  handleStartSelectedAnalyses: () => Promise<void>;
  handleCancelSelectedAnalyses: () => void;
  handleRebuildAnalysis: () => Promise<void>;
  handleSearch: (event?: FormEvent<HTMLFormElement>) => Promise<void>;
  handleRunFingerprint: () => Promise<void>;
  handleRunContinuity: () => Promise<void>;
  handleRunMythology: () => Promise<void>;
  handleRunRealityIndex: () => Promise<void>;
  handleRunCharacterGraph: () => Promise<void>;
  handleRunSemanticDrift: () => Promise<void>;
  handleRunBelievability: () => Promise<void>;
} {
  const [analysisQuery, setAnalysisQuery] = useState('');
  const [ngramSize, setNgramSize] = useState<AnalysisNgramSize>(1);
  const [summary, setSummary] = useState<AnalysisIndexSummary>(emptyAnalysisSummary);
  const [searchResult, setSearchResult] = useState<AnalysisSearchResult | null>(null);
  const [frequency, setFrequency] = useState<AnalysisFrequencyResult | null>(null);
  const [timeline, setTimeline] = useState<AnalysisTimelineResult | null>(null);
  const [aiProviderStatus, setAiProviderStatus] = useState<AnalysisAiProviderStatus | null>(null);
  const [semanticFingerprint, setSemanticFingerprint] = useState<AnalysisFingerprintRecord | null>(null);
  const [continuityReport, setContinuityReport] = useState<AnalysisContinuityRecord | null>(null);
  const [mythologyReport, setMythologyReport] = useState<AnalysisMythologyRecord | null>(null);
  const [realityIndexReport, setRealityIndexReport] = useState<AnalysisRealityIndexRecord | null>(null);
  const [characterGraphReport, setCharacterGraphReport] = useState<AnalysisCharacterGraphRecord | null>(null);
  const [semanticDriftReport, setSemanticDriftReport] = useState<AnalysisSemanticDriftRecord | null>(null);
  const [believabilityReport, setBelievabilityReport] = useState<AnalysisBelievabilityRecord | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isFingerprintRunning, setIsFingerprintRunning] = useState(false);
  const [isContinuityRunning, setIsContinuityRunning] = useState(false);
  const [isMythologyRunning, setIsMythologyRunning] = useState(false);
  const [isRealityIndexRunning, setIsRealityIndexRunning] = useState(false);
  const [isCharacterGraphRunning, setIsCharacterGraphRunning] = useState(false);
  const [isSemanticDriftRunning, setIsSemanticDriftRunning] = useState(false);
  const [isBelievabilityRunning, setIsBelievabilityRunning] = useState(false);
  const [selectedAnalysisRunKeys, setSelectedAnalysisRunKeys] = useState<AnalysisRunKey[]>(
    normalizeAnalysisRunSelection([...analysisRunOrder])
  );
  const [analysisRunQueue, setAnalysisRunQueue] = useState<AnalysisRunQueueState>({
    isRunning: false,
    currentKey: null,
    pendingKeys: [],
    completedKeys: [],
    failedKey: null,
    cancelRequested: false
  });
  const analysisRunCancelRef = useRef(false);
  const [analysisSources, setAnalysisSources] = useState<AnalysisSourceSummary[]>([]);
  const [analysisSourceType, setAnalysisSourceType] = useState<AnalysisSourceType>('video-transcript');
  const [selectedAnalysisSourceIds, setSelectedAnalysisSourceIds] = useState<string[]>([]);
  const [analysisSourceQuery, setAnalysisSourceQuery] = useState('');
  const baseScope = useMemo<AnalysisScope>(
    () => ({
      mode: 'channel',
      channelId: selectedChannel?.id ?? '__no-active-channel__'
    }),
    [selectedChannel?.id]
  );
  const scope = useMemo<AnalysisScope>(
    () => ({
      ...baseScope,
      sourceIds: selectedAnalysisSourceIds
    }),
    [baseScope, selectedAnalysisSourceIds]
  );
  const activeAnalysisSources = useMemo(
    () => analysisSources.filter((source) => source.type === analysisSourceType),
    [analysisSourceType, analysisSources]
  );
  const analysisSourceTypeCounts = useMemo<Record<AnalysisSourceType, number>>(
    () => ({
      'video-transcript': analysisSources.filter((source) => source.type === 'video-transcript').length,
      'merged-file': analysisSources.filter((source) => source.type === 'merged-file').length
    }),
    [analysisSources]
  );
  const selectedAnalysisSourceSet = useMemo(() => new Set(selectedAnalysisSourceIds), [selectedAnalysisSourceIds]);
  const visibleAnalysisSources = useMemo(() => {
    const normalizedQuery = analysisSourceQuery.trim().toLocaleLowerCase('tr-TR');
    return activeAnalysisSources.filter((source) => {
      return (
        normalizedQuery.length === 0 ||
        source.title.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
        source.detail.toLocaleLowerCase('tr-TR').includes(normalizedQuery)
      );
    });
  }, [activeAnalysisSources, analysisSourceQuery]);
  const selectedAnalysisSources = useMemo(
    () => activeAnalysisSources.filter((source) => selectedAnalysisSourceSet.has(source.id)),
    [activeAnalysisSources, selectedAnalysisSourceSet]
  );
  const selectedAnalysisWordCount = useMemo(
    () => selectedAnalysisSources.reduce((total, source) => total + source.wordCount, 0),
    [selectedAnalysisSources]
  );
  const isAnalysisUnavailable =
    !selectedChannel || activeAnalysisSources.length === 0 || selectedAnalysisSourceIds.length === 0;

  async function refreshAnalysisSources(): Promise<AnalysisSourceSummary[]> {
    const result = await window.subtitleAnalyzer?.analysis.listSources({ scope: baseScope });
    const sources = result?.sources ?? [];

    setAnalysisSources(sources);
    setSelectedAnalysisSourceIds((current) => {
      const availableIds = new Set(
        sources.filter((source) => source.type === analysisSourceType).map((source) => source.id)
      );
      return current.filter((sourceId) => availableIds.has(sourceId));
    });

    return sources;
  }

  useEffect(() => {
    let cancelled = false;

    async function prepareAnalysis(): Promise<void> {
      setIsAnalysisLoading(true);
      setAnalysisError(null);

      try {
        const currentSummary = await window.subtitleAnalyzer?.analysis.getSummary(baseScope);
        let nextSummary = currentSummary ?? emptyAnalysisSummary;

        if (
          nextSummary.indexedDocuments === 0 ||
          nextSummary.staleDocuments > 0 ||
          nextSummary.transcriptDocuments === 0
        ) {
          const rebuild = await window.subtitleAnalyzer?.analysis.rebuildIndex();
          nextSummary = (await window.subtitleAnalyzer?.analysis.getSummary(baseScope)) ?? rebuild?.summary ?? nextSummary;
          await onArchiveChanged();

          if (!cancelled && rebuild && nextSummary.indexedDocuments > 0) {
            setAnalysisMessage(`${nextSummary.indexedDocuments} transcript analize hazirlandi.`);
          }
        }

        if (!cancelled) {
          setSummary(nextSummary);
        }

        await refreshAnalysisSources();

        const [nextFrequency, nextTimeline] = await Promise.all([
          window.subtitleAnalyzer?.analysis.getFrequency({ scope, ngramSize, limit: 18 }),
          window.subtitleAnalyzer?.analysis.getTimeline({ scope, query: analysisQuery, bucket: 'month' })
        ]);

        if (!cancelled) {
          setFrequency(nextFrequency ?? null);
          setTimeline(nextTimeline ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setAnalysisError(errorToMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsAnalysisLoading(false);
        }
      }
    }

    void prepareAnalysis();

    return () => {
      cancelled = true;
    };
  }, [baseScope]);

  useEffect(() => {
    let cancelled = false;

    async function loadLocalAnalysis(): Promise<void> {
      setIsAnalysisLoading(true);
      setAnalysisError(null);

      try {
        const [nextSummary, nextFrequency, nextTimeline] = await Promise.all([
          window.subtitleAnalyzer?.analysis.getSummary(baseScope),
          window.subtitleAnalyzer?.analysis.getFrequency({ scope, ngramSize, limit: 18 }),
          window.subtitleAnalyzer?.analysis.getTimeline({ scope, query: analysisQuery, bucket: 'month' })
        ]);

        if (!cancelled) {
          setSummary(nextSummary ?? emptyAnalysisSummary);
          setFrequency(nextFrequency ?? null);
          setTimeline(nextTimeline ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setAnalysisError(errorToMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsAnalysisLoading(false);
        }
      }
    }

    void loadLocalAnalysis();

    return () => {
      cancelled = true;
    };
  }, [analysisQuery, baseScope, ngramSize, scope]);

  useEffect(() => {
    let cancelled = false;

    async function loadFingerprintState(): Promise<void> {
      try {
        const status = await window.subtitleAnalyzer?.analysis.getAiProviderStatus();
        const [
          cachedFingerprint,
          cachedContinuity,
          cachedMythology,
          cachedRealityIndex,
          cachedCharacterGraph,
          cachedSemanticDrift,
          cachedBelievability
        ] =
          selectedChannel && selectedAnalysisSourceIds.length > 0
            ? await Promise.all([
                window.subtitleAnalyzer?.analysis.getFingerprint({ scope }),
                window.subtitleAnalyzer?.analysis.getContinuity({ scope }),
                window.subtitleAnalyzer?.analysis.getMythology({ scope }),
                window.subtitleAnalyzer?.analysis.getRealityIndex({ scope }),
                window.subtitleAnalyzer?.analysis.getCharacterGraph({ scope }),
                window.subtitleAnalyzer?.analysis.getSemanticDrift({ scope }),
                window.subtitleAnalyzer?.analysis.getBelievability({ scope })
              ])
            : [null, null, null, null, null, null, null];

        if (!cancelled) {
          setAiProviderStatus(
            cachedFingerprint?.providerStatus ??
              cachedContinuity?.providerStatus ??
              cachedMythology?.providerStatus ??
              cachedRealityIndex?.providerStatus ??
              cachedCharacterGraph?.providerStatus ??
              cachedSemanticDrift?.providerStatus ??
              cachedBelievability?.providerStatus ??
              status ??
              null
          );
          setSemanticFingerprint(cachedFingerprint?.fingerprint ?? null);
          setContinuityReport(cachedContinuity?.continuity ?? null);
          setMythologyReport(cachedMythology?.mythology ?? null);
          setRealityIndexReport(cachedRealityIndex?.realityIndex ?? null);
          setCharacterGraphReport(cachedCharacterGraph?.characterGraph ?? null);
          setSemanticDriftReport(cachedSemanticDrift?.semanticDrift ?? null);
          setBelievabilityReport(cachedBelievability?.believability ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setSemanticFingerprint(null);
          setContinuityReport(null);
          setMythologyReport(null);
          setRealityIndexReport(null);
          setCharacterGraphReport(null);
          setSemanticDriftReport(null);
          setBelievabilityReport(null);
          setAnalysisError(errorToMessage(error));
        }
      }
    }

    void loadFingerprintState();

    return () => {
      cancelled = true;
    };
  }, [scope, selectedAnalysisSourceIds.length, selectedChannel]);

  async function handleRebuildAnalysis(): Promise<void> {
    setIsAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisMessage(null);

    try {
      const rebuild = await window.subtitleAnalyzer?.analysis.rebuildIndex();
      if (!rebuild) {
        throw new Error('Analiz indeksi sonucu alinamadi.');
      }

      const nextSummary = (await window.subtitleAnalyzer?.analysis.getSummary(baseScope)) ?? rebuild.summary;
      setSummary(nextSummary);
      await refreshAnalysisSources();
      const [nextFrequency, nextTimeline, nextSearch] = await Promise.all([
        window.subtitleAnalyzer?.analysis.getFrequency({ scope, ngramSize, limit: 18 }),
        window.subtitleAnalyzer?.analysis.getTimeline({ scope, query: analysisQuery, bucket: 'month' }),
        analysisQuery.trim()
          ? window.subtitleAnalyzer?.analysis.search({ query: analysisQuery.trim(), scope, limit: 40 })
          : Promise.resolve(null)
      ]);
      setFrequency(nextFrequency ?? null);
      setTimeline(nextTimeline ?? null);
      if (nextSearch) {
        setSearchResult(nextSearch);
      }
      setAnalysisMessage(
        nextSummary.indexedDocuments > 0
          ? `${nextSummary.indexedDocuments} transcript analize hazir.`
          : 'Bu kanalda kaydedilmis transcript bulunamadi.'
      );
      await onArchiveChanged();
    } catch (error) {
      setAnalysisError(errorToMessage(error));
    } finally {
      setIsAnalysisLoading(false);
    }
  }

  async function handleSearch(event?: FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    const query = analysisQuery.trim();

    if (!query) {
      setSearchResult(null);
      return;
    }

    if (!selectedChannel || summary.transcriptDocuments === 0) {
      return;
    }

    setIsAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const [nextSearch, nextTimeline] = await Promise.all([
        window.subtitleAnalyzer?.analysis.search({ query, scope, limit: 40 }),
        window.subtitleAnalyzer?.analysis.getTimeline({ scope, query, bucket: 'month' })
      ]);

      setSearchResult(nextSearch ?? null);
      setTimeline(nextTimeline ?? null);
    } catch (error) {
      setAnalysisError(errorToMessage(error));
    } finally {
      setIsAnalysisLoading(false);
    }
  }

  function setAnalysisTaskRunning(key: AnalysisRunKey, running: boolean): void {
    if (key === 'fingerprint') {
      setIsFingerprintRunning(running);
    } else if (key === 'continuity') {
      setIsContinuityRunning(running);
    } else if (key === 'mythology') {
      setIsMythologyRunning(running);
    } else if (key === 'realityIndex') {
      setIsRealityIndexRunning(running);
    } else if (key === 'characterGraph') {
      setIsCharacterGraphRunning(running);
    } else if (key === 'semanticDrift') {
      setIsSemanticDriftRunning(running);
    } else if (key === 'believability') {
      setIsBelievabilityRunning(running);
    }
  }

  async function runAnalysisTask(key: AnalysisRunKey): Promise<string> {
    setAnalysisTaskRunning(key, true);

    try {
      if (key === 'fingerprint') {
        const result = await window.subtitleAnalyzer?.analysis.runFingerprint({ scope, force: true });
        if (!result?.fingerprint) {
          throw new Error('AI fingerprint sonucu alinamadi.');
        }

        setAiProviderStatus(result.providerStatus);
        setSemanticFingerprint(result.fingerprint);
        return result.fromCache
          ? 'AI fingerprint cache kaydindan alindi.'
          : `${result.fingerprint.documentCount} kaynak icin AI fingerprint olusturuldu.`;
      }

      if (key === 'realityIndex') {
        const result = await window.subtitleAnalyzer?.analysis.runRealityIndex({ scope, force: true });
        if (!result?.realityIndex) {
          throw new Error('Reality Manipulation Index sonucu alinamadi.');
        }

        setAiProviderStatus(result.providerStatus);
        setRealityIndexReport(result.realityIndex);
        return result.fromCache
          ? 'Reality Manipulation Index cache kaydindan alindi.'
          : `${result.realityIndex.documentCount} kaynak icin Reality Manipulation Index olusturuldu.`;
      }

      if (key === 'continuity') {
        const result = await window.subtitleAnalyzer?.analysis.runContinuity({ scope, force: true });
        if (!result?.continuity) {
          throw new Error('Narrative continuity sonucu alinamadi.');
        }

        setAiProviderStatus(result.providerStatus);
        setContinuityReport(result.continuity);
        return result.fromCache
          ? 'Narrative continuity cache kaydindan alindi.'
          : `${result.continuity.documentCount} kaynak icin narrative continuity olusturuldu.`;
      }

      if (key === 'mythology') {
        const result = await window.subtitleAnalyzer?.analysis.runMythology({ scope, force: true });
        if (!result?.mythology) {
          throw new Error('Mythology mapping sonucu alinamadi.');
        }

        setAiProviderStatus(result.providerStatus);
        setMythologyReport(result.mythology);
        return result.fromCache
          ? 'Mythology mapping cache kaydindan alindi.'
          : `${result.mythology.documentCount} kaynak icin mythology mapping olusturuldu.`;
      }

      if (key === 'characterGraph') {
        const result = await window.subtitleAnalyzer?.analysis.runCharacterGraph({ scope, force: true });
        if (!result?.characterGraph) {
          throw new Error('Character graph sonucu alinamadi.');
        }

        setAiProviderStatus(result.providerStatus);
        setCharacterGraphReport(result.characterGraph);
        return result.fromCache
          ? 'Character graph cache kaydindan alindi.'
          : `${result.characterGraph.documentCount} kaynak icin character graph olusturuldu.`;
      }

      if (key === 'semanticDrift') {
        const result = await window.subtitleAnalyzer?.analysis.runSemanticDrift({ scope, force: true });
        if (!result?.semanticDrift) {
          throw new Error('Semantic drift sonucu alinamadi.');
        }

        setAiProviderStatus(result.providerStatus);
        setSemanticDriftReport(result.semanticDrift);
        return result.fromCache
          ? 'Semantic drift cache kaydindan alindi.'
          : `${result.semanticDrift.documentCount} kaynak icin Semantic Drift Analysis olusturuldu.`;
      }

      const result = await window.subtitleAnalyzer?.analysis.runBelievability({ scope, force: true });
      if (!result?.believability) {
        throw new Error('Human Believability sonucu alinamadi.');
      }

      setAiProviderStatus(result.providerStatus);
      setBelievabilityReport(result.believability);
      return result.fromCache
        ? 'Human Believability cache kaydindan alindi.'
        : `${result.believability.documentCount} kaynak icin Human Believability raporu olusturuldu.`;
    } finally {
      setAnalysisTaskRunning(key, false);
    }
  }

  async function runSingleAnalysis(key: AnalysisRunKey): Promise<void> {
    if (!selectedChannel || selectedAnalysisSourceIds.length === 0 || analysisRunQueue.isRunning) {
      return;
    }

    setAnalysisError(null);
    setAnalysisMessage(null);

    try {
      const message = await runAnalysisTask(key);
      setAnalysisMessage(message);
    } catch (error) {
      setAnalysisError(errorToMessage(error));
    }
  }

  async function handleRunFingerprint(): Promise<void> {
    await runSingleAnalysis('fingerprint');
  }

  async function handleRunContinuity(): Promise<void> {
    await runSingleAnalysis('continuity');
  }

  async function handleRunMythology(): Promise<void> {
    await runSingleAnalysis('mythology');
  }

  async function handleRunRealityIndex(): Promise<void> {
    await runSingleAnalysis('realityIndex');
  }

  async function handleRunCharacterGraph(): Promise<void> {
    await runSingleAnalysis('characterGraph');
  }

  async function handleRunSemanticDrift(): Promise<void> {
    await runSingleAnalysis('semanticDrift');
  }

  async function handleRunBelievability(): Promise<void> {
    await runSingleAnalysis('believability');
  }

  async function handleStartSelectedAnalyses(): Promise<void> {
    if (
      !selectedChannel ||
      selectedAnalysisSourceIds.length === 0 ||
      analysisRunQueue.isRunning ||
      selectedAnalysisRunKeys.length === 0
    ) {
      return;
    }

    const queue = normalizeAnalysisRunSelection(selectedAnalysisRunKeys);
    analysisRunCancelRef.current = false;
    setAnalysisError(null);
    setAnalysisMessage(`${queue.length} analiz siraya alindi.`);
    setAnalysisRunQueue({
      isRunning: true,
      currentKey: null,
      pendingKeys: queue,
      completedKeys: [],
      failedKey: null,
      cancelRequested: false
    });

    let failedKey: AnalysisRunKey | null = null;

    for (const key of queue) {
      if (analysisRunCancelRef.current) {
        break;
      }

      setAnalysisRunQueue((current) => ({
        ...current,
        currentKey: key,
        pendingKeys: queue.filter((candidate) => candidate !== key && !current.completedKeys.includes(candidate))
      }));

      try {
        await runAnalysisTask(key);
        setAnalysisRunQueue((current) => ({
          ...current,
          completedKeys: current.completedKeys.includes(key) ? current.completedKeys : [...current.completedKeys, key],
          pendingKeys: current.pendingKeys.filter((candidate) => candidate !== key)
        }));
      } catch (error) {
        failedKey = key;
        setAnalysisError(errorToMessage(error));
        setAnalysisRunQueue((current) => ({
          ...current,
          failedKey: key,
          pendingKeys: current.pendingKeys.filter((candidate) => candidate !== key)
        }));
        break;
      }
    }

    const cancelled = analysisRunCancelRef.current;
    setAnalysisRunQueue((current) => ({
      ...current,
      isRunning: false,
      currentKey: null,
      failedKey,
      cancelRequested: cancelled,
      pendingKeys: cancelled ? current.pendingKeys : failedKey ? current.pendingKeys : []
    }));

    if (cancelled) {
      setAnalysisMessage('Analiz kuyrugu iptal edildi. Devam eden islem tamamlandi, kalanlar calistirilmadi.');
    } else if (!failedKey) {
      setAnalysisMessage(`${queue.length} analiz tamamlandi.`);
    }
  }

  function handleCancelSelectedAnalyses(): void {
    analysisRunCancelRef.current = true;
    setAnalysisRunQueue((current) => ({
      ...current,
      cancelRequested: true
    }));
  }

  function onSelectVisibleSources(): void {
    setSelectedAnalysisSourceIds(visibleAnalysisSources.map((source) => source.id));
  }

  function onClearSelectedSources(): void {
    setSelectedAnalysisSourceIds([]);
  }

  function onToggleSource(sourceId: string): void {
    setSelectedAnalysisSourceIds((current) =>
      current.includes(sourceId) ? current.filter((currentSourceId) => currentSourceId !== sourceId) : [...current, sourceId]
    );
  }

  function onToggleAnalysisRun(key: AnalysisRunKey): void {
    if (analysisRunQueue.isRunning) {
      return;
    }

    setSelectedAnalysisRunKeys((current) => toggleAnalysisRunSelection(current, key));
  }

  function onSelectAllAnalysisRuns(): void {
    if (analysisRunQueue.isRunning) {
      return;
    }

    setSelectedAnalysisRunKeys(normalizeAnalysisRunSelection(analysisRunDefinitions.map((definition) => definition.key)));
  }

  function onClearAnalysisRuns(): void {
    if (analysisRunQueue.isRunning) {
      return;
    }

    setSelectedAnalysisRunKeys([]);
  }

  function onAnalysisSourceTypeChange(value: AnalysisSourceType): void {
    setAnalysisSourceType(value);
    setSelectedAnalysisSourceIds([]);
    setSearchResult(null);
    setSemanticFingerprint(null);
    setContinuityReport(null);
    setMythologyReport(null);
    setRealityIndexReport(null);
    setCharacterGraphReport(null);
    setSemanticDriftReport(null);
    setBelievabilityReport(null);
    setAnalysisMessage(null);
    setAnalysisRunQueue({
      isRunning: false,
      currentKey: null,
      pendingKeys: [],
      completedKeys: [],
      failedKey: null,
      cancelRequested: false
    });
    analysisRunCancelRef.current = false;
  }

  return {
    analysisQuery,
    ngramSize,
    summary,
    searchResult,
    frequency,
    timeline,
    aiProviderStatus,
    semanticFingerprint,
    continuityReport,
    mythologyReport,
    realityIndexReport,
    characterGraphReport,
    semanticDriftReport,
    believabilityReport,
    analysisMessage,
    analysisError,
    isAnalysisLoading,
    isFingerprintRunning,
    isContinuityRunning,
    isMythologyRunning,
    isRealityIndexRunning,
    isCharacterGraphRunning,
    isSemanticDriftRunning,
    isBelievabilityRunning,
    analysisSources,
    analysisSourceType,
    analysisSourceTypeCounts,
    activeAnalysisSourceCount: activeAnalysisSources.length,
    selectedAnalysisSourceIds,
    selectedAnalysisSourceSet,
    visibleAnalysisSources,
    analysisSourceQuery,
    selectedAnalysisWordCount,
    isAnalysisUnavailable,
    selectedAnalysisRunKeys,
    analysisRunQueue,
    onAnalysisQueryChange: setAnalysisQuery,
    onNgramSizeChange: setNgramSize,
    onAnalysisSourceTypeChange,
    onAnalysisSourceQueryChange: setAnalysisSourceQuery,
    onSelectVisibleSources,
    onClearSelectedSources,
    onToggleSource,
    onToggleAnalysisRun,
    onSelectAllAnalysisRuns,
    onClearAnalysisRuns,
    handleStartSelectedAnalyses,
    handleCancelSelectedAnalyses,
    handleRebuildAnalysis,
    handleSearch,
    handleRunFingerprint,
    handleRunContinuity,
    handleRunMythology,
    handleRunRealityIndex,
    handleRunCharacterGraph,
    handleRunSemanticDrift,
    handleRunBelievability
  };
}
