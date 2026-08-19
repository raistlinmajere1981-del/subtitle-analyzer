import { net, protocol } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const archiveAssetProtocol = 'subtitle-asset';

export function registerArchiveAssetScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: archiveAssetProtocol,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true
      }
    }
  ]);
}

export function registerArchiveAssetProtocol(getArchivePath: () => string): void {
  protocol.handle(archiveAssetProtocol, (request) => {
    const assetPath = getArchiveAssetPath(request.url, getArchivePath());

    if (!assetPath) {
      return new Response('Not found', { status: 404 });
    }

    return net.fetch(pathToFileURL(assetPath).toString());
  });
}

function getArchiveAssetPath(url: string, archivePath: string): string | null {
  let requestedPath: string | null = null;

  try {
    const parsedUrl = new URL(url);
    requestedPath = parsedUrl.searchParams.get('path');
  } catch {
    return null;
  }

  if (!requestedPath) {
    return null;
  }

  const archiveRoot = path.resolve(archivePath);
  const assetPath = path.resolve(requestedPath);
  const relativePath = path.relative(archiveRoot, assetPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !fs.existsSync(assetPath)) {
    return null;
  }

  return assetPath;
}
