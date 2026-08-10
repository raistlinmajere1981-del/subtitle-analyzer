import { Eye, EyeOff, FileText, History, Layers3, Save, Undo2, X } from 'lucide-react';
import { memo, type ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type {
  SubtitleEditOperationType,
  SubtitleWorkspace,
  VideoRecord
} from '../../../../shared/archive';
import { formatDateTime, operationLabel } from '../../lib/format';
import {
  dedupeAdjacentTranscriptLines,
  removeTranscriptRangeFromRaw,
  stripRawTimestamps,
  type TranscriptExclusionRange,
  trimEmptyTranscriptLines
} from '../../lib/transcriptTransforms';
import { SubtitleVideoPreviewPanel } from './SubtitleVideoPreviewPanel';

interface TranscriptEditorPanelProps {
  isBusy: boolean;
  isTranscriptDirty: boolean;
  onSaveTranscript: (cleanedText: string, operationType?: SubtitleEditOperationType) => void;
  onUndoSelected: () => void;
  selectedVideo: VideoRecord | null;
  setShowRawTimestamps: (value: boolean) => void;
  setTranscriptDraft: (value: string) => void;
  showRawTimestamps: boolean;
  transcriptDraft: string;
  workspace: SubtitleWorkspace | null;
}

export const TranscriptEditorPanel = memo(function TranscriptEditorPanel({
  isBusy,
  isTranscriptDirty,
  onSaveTranscript,
  onUndoSelected,
  selectedVideo,
  setShowRawTimestamps,
  setTranscriptDraft,
  showRawTimestamps,
  transcriptDraft,
  workspace
}: TranscriptEditorPanelProps): ReactElement {
  const currentWorkspace = selectedVideo && workspace?.videoId === selectedVideo.id ? workspace : null;
  const isWorkspaceLoading = selectedVideo !== null && currentWorkspace === null;
  const rawDisplayText = useMemo(
    () => showRawTimestamps
      ? currentWorkspace?.rawText ?? ''
      : stripRawTimestamps(currentWorkspace?.rawText ?? ''),
    [showRawTimestamps, currentWorkspace?.rawText]
  );
  const [, setEditorActionMessage] = useState('');

  useEffect(() => {
    setEditorActionMessage('');
  }, [selectedVideo?.id]);

  function handleRemovePreviewRange(range: TranscriptExclusionRange): void {
    if (!currentWorkspace?.rawText.trim()) {
      setEditorActionMessage('Zaman araligi cikarmak icin raw altyazi bulunamadi.');
      return;
    }

    if (isTranscriptDirty) {
      const shouldContinue = window.confirm(
        'Bu islem raw altyazidan yeni transcript taslagi uretir ve kaydedilmemis elle duzenlemeleri ezebilir. Devam edilsin mi?'
      );
      if (!shouldContinue) {
        return;
      }
    }

    const result = removeTranscriptRangeFromRaw(currentWorkspace.rawText, range);
    setTranscriptDraft(result.text);
    setEditorActionMessage(
      result.removedCueCount > 0
        ? `${formatRange(range)} araligi cikarildi; ${result.removedCueCount} segment atlandi, ${result.keptCueCount} segment korundu.`
        : `${formatRange(range)} araliginda raw altyazi segmenti bulunamadi.`
    );
  }

  return (
    <div className="subtitle-editor-panel">
      {selectedVideo && (
        <>
          <SubtitleVideoPreviewPanel
            disabled={isBusy || isWorkspaceLoading}
            onRemoveRange={handleRemovePreviewRange}
            rawText={currentWorkspace?.rawText ?? ''}
            selectedVideo={selectedVideo}
          />

          <div className="editor-toolbar">
            <div className="editor-tool-group">
              <button
                className="cleanup-step editor-tool"
                disabled={!transcriptDraft.trim() || isBusy}
                onClick={() => {
                  const nextDraft = trimEmptyTranscriptLines(transcriptDraft);
                  setTranscriptDraft(nextDraft);
                  setEditorActionMessage(
                    nextDraft === transcriptDraft
                      ? 'Bos satir temizligi uygulandi; degisecek satir yoktu.'
                      : 'Bos satirlar temizlendi.'
                  );
                }}
                type="button"
              >
                <Layers3 size={16} />
                Bos satirlari temizle
              </button>
              <button
                className="cleanup-step editor-tool"
                disabled={!transcriptDraft.trim() || isBusy}
                onClick={() => {
                  const nextDraft = dedupeAdjacentTranscriptLines(transcriptDraft);
                  setTranscriptDraft(nextDraft);
                  setEditorActionMessage(
                    nextDraft === transcriptDraft
                      ? 'Tekrar azaltma uygulandi; ardisik tekrar bulunmadi.'
                      : 'Ardisik tekrarlar azaltildi.'
                  );
                }}
                type="button"
              >
                <Layers3 size={16} />
                Tekrarlari azalt
              </button>
              <button
                className="cleanup-step editor-tool"
                disabled={!transcriptDraft.trim() || isBusy}
                onClick={() => {
                  setTranscriptDraft(transcriptDraft.toLocaleLowerCase('tr-TR'));
                  setEditorActionMessage('Metin kucuk harfe donusturuldu.');
                }}
                type="button"
              >
                <FileText size={16} />
                Kucuk harf
              </button>
              <button
                className="cleanup-step editor-tool"
                disabled={!transcriptDraft.trim() || isBusy}
                onClick={() => {
                  setTranscriptDraft(transcriptDraft.toLocaleUpperCase('tr-TR'));
                  setEditorActionMessage('Metin buyuk harfe donusturuldu.');
                }}
                type="button"
              >
                <FileText size={16} />
                Buyuk harf
              </button>
            </div>
            <div className="editor-tool-group save-tools">
              <button
                className="primary-button"
                disabled={!isTranscriptDirty || isBusy}
                onClick={() => onSaveTranscript(transcriptDraft)}
                type="button"
              >
                <Save size={16} />
                Transcript kaydet
              </button>
              <button
                className="secondary-button"
                disabled={!isTranscriptDirty || isBusy}
                onClick={() => setTranscriptDraft(currentWorkspace?.cleanedText ?? '')}
                type="button"
              >
                <X size={16} />
                Vazgec
              </button>
              <button className="secondary-button" disabled={isBusy} onClick={onUndoSelected} type="button">
                <Undo2 size={16} />
                Bu kayitta geri al
              </button>
            </div>
          </div>

        </>
      )}

      {!selectedVideo && <p className="workshop-message">Listeden bir altyazi sec.</p>}

      <div className="transcript-panel">
        <div className="transcript-column raw">
          <div className="column-title-row">
            <span className="column-title">Raw VTT</span>
            <button className="secondary-button compact" onClick={() => setShowRawTimestamps(!showRawTimestamps)} type="button">
              {showRawTimestamps ? <EyeOff size={15} /> : <Eye size={15} />}
              {showRawTimestamps ? 'Damgayi gizle' : 'Damgayi goster'}
            </button>
          </div>
          <pre>{isWorkspaceLoading ? 'Altyazi dosyasi hazirlaniyor...' : rawDisplayText || 'Bu video icin raw altyazi bulunamadi.'}</pre>
        </div>
        <div className="transcript-column cleaned">
          <div className="column-title-row">
            <span className="column-title">Analizde kullanilacak transcript</span>
          </div>
          <textarea
            disabled={isBusy || !selectedVideo}
            onChange={(event) => {
              setTranscriptDraft(event.target.value);
              setEditorActionMessage('');
            }}
            placeholder={isBusy ? 'Transcript hazirlaniyor...' : 'Transcript henuz olusturulmadi.'}
            value={transcriptDraft}
          />
        </div>
        <div className="transcript-meta-panel">
          <div className="meta-section history-section">
            <span className="column-title">
              <History size={14} />
              Gecmis
            </span>
            <div className="history-list">
              {currentWorkspace?.history.map((item) => (
                <div className={`history-item ${item.undoneAt ? 'undone' : ''}`} key={item.id}>
                  <strong>{operationLabel(item.operationType)}</strong>
                  <small>
                    {formatDateTime(item.createdAt)} · {item.source === 'bulk' ? 'toplu' : 'tekli'} · {item.actor}
                  </small>
                  <p>{item.newPreview || '-'}</p>
                  {item.undoneAt && <em>Geri alindi</em>}
                </div>
              ))}
              {(!currentWorkspace || currentWorkspace.history.length === 0) && <p className="empty-mini">Gecmis yok.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

function formatRange(range: TranscriptExclusionRange): string {
  return `${formatMs(range.startMs)} - ${formatMs(range.endMs)}`;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
