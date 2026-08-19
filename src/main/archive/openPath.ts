import { shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export function openArchivePath(archivePath: string, requestedPath: string): { opened: boolean; error: string | null } {
  const targetPath = getArchiveChildPath(archivePath, requestedPath);
  void shell.openPath(targetPath);

  return {
    opened: true,
    error: null
  };
}

export function getArchiveChildPath(archivePath: string, requestedPath: string): string {
  const archiveRoot = path.resolve(archivePath);
  const targetPath = path.resolve(requestedPath);
  const relativePath = path.relative(archiveRoot, targetPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Bu yol arsiv klasoru disinda.');
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error('Acilacak dosya veya klasor bulunamadi.');
  }

  return targetPath;
}
