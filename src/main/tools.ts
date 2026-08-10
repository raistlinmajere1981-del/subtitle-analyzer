import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ToolState, ToolStatusSnapshot } from '../shared/archive.js';

const execFileAsync = promisify(execFile);

export async function getToolStatus(): Promise<ToolStatusSnapshot> {
  const tools = await Promise.all([
    readToolVersion('yt-dlp', ['--version'], (stdout) => stdout.trim()),
    readToolVersion('ffmpeg', ['-version'], (stdout) => stdout.split('\n')[0]?.replace(/^ffmpeg version\s+/, '').trim() ?? '-'),
    readToolVersion('sqlite3', ['--version'], (stdout) => stdout.trim().split(/\s+/)[0] ?? '-'),
    readToolVersion(process.env.SUBTITLE_ANALYZER_CODEX_BIN?.trim() || 'codex', ['--version'], (stdout) => stdout.trim())
  ]);

  return { tools };
}

async function readToolVersion(
  tool: string,
  args: string[],
  parseVersion: (stdout: string) => string
): Promise<ToolState> {
  try {
    const { stdout } = await execFileAsync(tool, args, {
      encoding: 'utf8',
      timeout: 1000 * 10,
      maxBuffer: 1024 * 1024
    });

    return {
      tool,
      version: parseVersion(stdout),
      state: 'Hazir',
      detail: null
    };
  } catch (error) {
    return {
      tool,
      version: '-',
      state: 'Eksik',
      detail: error instanceof Error ? error.message : 'Komut calistirilamadi.'
    };
  }
}
