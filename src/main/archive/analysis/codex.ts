import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AnalysisAiProviderStatus } from '../../../shared/archive.js';
import type { AnalysisTextDocument } from './types.js';

interface CodexProviderConfig extends AnalysisAiProviderStatus {
  timeoutMs: number;
  profile: string | null;
}

interface CodexRunResult {
  stdout: string;
  stderr: string;
}

export function getAnalysisAiProviderStatus(): AnalysisAiProviderStatus {
  const config = getCodexProviderConfig();

  return {
    configured: config.configured,
    provider: config.provider,
    model: config.model,
    command: config.command,
    version: config.version,
    detail: config.detail
  };
}

export async function requestCodexJson(input: {
  schema: unknown;
  schemaFileName: string;
  outputFileName: string;
  prompt: string;
  failureLabel: string;
}): Promise<unknown> {
  const config = getCodexProviderConfig();
  if (!config.configured || !config.command) {
    throw new Error(config.detail ?? 'Codex CLI hazir degil.');
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subtitle-analyzer-codex-'));
  const schemaPath = path.join(tempDir, input.schemaFileName);
  const outputPath = path.join(tempDir, input.outputFileName);

  try {
    fs.writeFileSync(schemaPath, JSON.stringify(input.schema, null, 2), 'utf8');

    const args = buildCodexArgs(config, schemaPath, outputPath);
    const result = await runCodexExec(config.command, args, input.prompt, config.timeoutMs);
    const content = readCodexOutput(outputPath, result);

    return parseJsonObject(content, input.failureLabel);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function buildDocumentExtracts(documents: AnalysisTextDocument[]): string {
  const totalBudget = getMaxInputChars();
  const perDocumentBudget = Math.max(1800, Math.floor(totalBudget / Math.max(1, documents.length)));
  let remainingBudget = totalBudget;
  const chunks: string[] = [];

  for (const document of documents) {
    const budget = Math.max(1200, Math.min(perDocumentBudget, remainingBudget));
    if (remainingBudget <= 0) {
      break;
    }

    chunks.push(
      [
        `--- KAYNAK ${document.sourceId}`,
        `Baslik: ${document.title}`,
        `Tarih: ${document.publishedAt ?? 'tarih yok'}`,
        excerptTranscript(document.transcript, budget)
      ].join('\n')
    );
    remainingBudget -= budget;
  }

  return chunks.join('\n\n');
}

function getCodexProviderConfig(): CodexProviderConfig {
  const command = process.env.SUBTITLE_ANALYZER_CODEX_BIN?.trim() || 'codex';
  const model = process.env.SUBTITLE_ANALYZER_CODEX_MODEL?.trim() || null;
  const profile = process.env.SUBTITLE_ANALYZER_CODEX_PROFILE?.trim() || null;
  const timeoutMs = getCodexTimeoutMs();
  const versionCheck = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    timeout: 5000
  });
  const configured = versionCheck.status === 0;
  const version = configured ? (versionCheck.stdout.trim() || versionCheck.stderr.trim() || null) : null;
  const modelLabel = model ?? (profile ? `profile:${profile}` : 'codex-default');

  return {
    configured,
    provider: 'codex-cli',
    model: modelLabel,
    command: configured ? command : null,
    version,
    timeoutMs,
    profile,
    detail: configured
      ? null
      : 'Codex CLI bulunamadi. codex kurulu ve terminalde calisabilir olmali.'
  };
}

function getCodexTimeoutMs(): number {
  const parsed = Number(process.env.SUBTITLE_ANALYZER_CODEX_TIMEOUT_MS ?? 240000);
  if (!Number.isFinite(parsed)) {
    return 240000;
  }

  return Math.max(30000, Math.min(900000, Math.floor(parsed)));
}

function buildCodexArgs(config: CodexProviderConfig, schemaPath: string, outputPath: string): string[] {
  const args = [
    '--ask-for-approval',
    'never',
    'exec',
    '--skip-git-repo-check',
    '--ephemeral',
    '--ignore-rules',
    '--sandbox',
    'read-only',
    '--output-schema',
    schemaPath,
    '--output-last-message',
    outputPath,
    '--color',
    'never'
  ];

  if (config.profile) {
    args.push('--profile', config.profile);
  }

  const explicitModel = process.env.SUBTITLE_ANALYZER_CODEX_MODEL?.trim();
  if (explicitModel) {
    args.push('--model', explicitModel);
  }

  args.push('-');
  return args;
}

function runCodexExec(command: string, args: string[], input: string, timeoutMs: number): Promise<CodexRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let completed = false;
    const timeout = setTimeout(() => {
      if (!completed) {
        child.kill('SIGTERM');
        reject(new Error(`Codex CLI zaman asimina ugradi (${Math.round(timeoutMs / 1000)} sn).`));
      }
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      completed = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      completed = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`Codex CLI analizi basarisiz oldu (${code ?? 'signal'}): ${trimDiagnostic(stderr || stdout)}`));
    });

    child.stdin.end(input);
  });
}

function readCodexOutput(outputPath: string, result: CodexRunResult): string {
  const fromFile = readTextFile(outputPath).trim();
  if (fromFile) {
    return fromFile;
  }

  const fromStdout = result.stdout.trim();
  if (fromStdout) {
    return fromStdout;
  }

  throw new Error(`Codex CLI bos sonuc dondu: ${trimDiagnostic(result.stderr)}`);
}

function readTextFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function trimDiagnostic(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, 600) : 'detay yok';
}

function getMaxInputChars(): number {
  const parsed = Number(process.env.SUBTITLE_ANALYZER_CODEX_MAX_INPUT_CHARS ?? 60000);
  if (!Number.isFinite(parsed)) {
    return 60000;
  }

  return Math.max(8000, Math.min(180000, Math.floor(parsed)));
}

function excerptTranscript(text: string, maxChars: number): string {
  const normalized = text.replace(/\r/g, '').trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }

  const markerBudget = 160;
  const partLength = Math.max(300, Math.floor((maxChars - markerBudget) / 3));
  const middleStart = Math.max(0, Math.floor(normalized.length / 2 - partLength / 2));
  const endStart = Math.max(0, normalized.length - partLength);

  return [
    normalized.slice(0, partLength).trim(),
    '[orta kesit]',
    normalized.slice(middleStart, middleStart + partLength).trim(),
    '[son kesit]',
    normalized.slice(endStart).trim()
  ].join('\n');
}

function parseJsonObject(content: string, failureLabel: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(content.slice(start, end + 1));
    }
    throw new Error(`${failureLabel} JSON formatinda donmedi.`);
  }
}
