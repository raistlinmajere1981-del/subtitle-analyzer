import type { SQLInputValue } from 'node:sqlite';
import path from 'node:path';
import type { AnalysisScope } from '../../../shared/archive.js';
import { hashText } from './files.js';

export function buildScopeWhere(scope: AnalysisScope, videoAlias: string): { sql: string; params: SQLInputValue[] } {
  const clauses: string[] = [];
  const params: SQLInputValue[] = [];

  if (scope.mode === 'channel' && scope.channelId) {
    clauses.push(`${videoAlias}.channel_id = ?`);
    params.push(scope.channelId);
  }

  if (scope.dateFrom) {
    clauses.push(`${videoAlias}.published_at >= ?`);
    params.push(scope.dateFrom);
  }

  if (scope.dateTo) {
    clauses.push(`${videoAlias}.published_at <= ?`);
    params.push(scope.dateTo);
  }

  if (scope.videoType) {
    clauses.push(`${videoAlias}.video_type = ?`);
    params.push(scope.videoType);
  }

  return {
    sql: clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : '',
    params
  };
}

export function buildInWhere(columnName: string, values: string[]): { sql: string; params: SQLInputValue[] } {
  return {
    sql: `AND ${columnName} IN (${values.map(() => '?').join(', ')})`,
    params: values
  };
}

export function getSelectedVideoIds(scope: AnalysisScope): string[] {
  return (scope.sourceIds ?? [])
    .filter((sourceId) => sourceId.startsWith('video:'))
    .map((sourceId) => sourceId.slice('video:'.length))
    .filter(Boolean);
}

export function getSelectedMergedIds(scope: AnalysisScope): string[] {
  return (scope.sourceIds ?? []).filter((sourceId) => sourceId.startsWith('merged:'));
}

export function getVideoSourceId(videoId: string): string {
  return `video:${videoId}`;
}

export function getMergedSourceId(filePath: string): string {
  return `merged:${hashText(path.resolve(filePath)).slice(0, 16)}`;
}
