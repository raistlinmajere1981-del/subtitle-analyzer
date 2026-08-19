import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function safeReadDirectory(directoryPath: string): fs.Dirent[] {
  try {
    return fs.readdirSync(directoryPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

export function walkFiles(directoryPath: string): string[] {
  const files: string[] = [];

  for (const entry of safeReadDirectory(directoryPath)) {
    const itemPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(itemPath));
    } else if (entry.isFile()) {
      files.push(itemPath);
    }
  }

  return files;
}

export function getMtimeMs(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

export function readTextFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
