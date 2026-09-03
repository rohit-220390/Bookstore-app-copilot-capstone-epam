import { createServer, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import type { Book } from '../catalog/book.js';
import { handleSearchRequest } from './search-endpoint.js';

// Resolved relative to the process's working directory, which npm/tsx always set to this
// package's root, rather than via import.meta.url (kept out for ts-jest/ESM compatibility).
const PROJECT_ROOT = process.cwd();
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');
const BROWSER_DIST_DIR = join(PROJECT_ROOT, 'dist-browser');

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/**
 * Resolves `requestPath` safely under `baseDir`, rejecting any path that would escape it
 * (e.g. `../../secret`) to prevent directory traversal.
 */
function resolveStaticPath(baseDir: string, requestPath: string): string | undefined {
  const base = resolve(baseDir);
  const resolved = resolve(base, `.${sep}${requestPath}`);
  if (resolved !== base && !resolved.startsWith(base + sep)) return undefined;
  return resolved;
}

async function serveStaticFile(res: ServerResponse, filePath: string): Promise<boolean> {
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream' });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

function sendNotFound(res: ServerResponse): void {
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

/**
 * Full app server: serves the `GET /api/search` JSON API (via the pure `handleSearchRequest`
 * handler also used by `search-endpoint.ts`'s standalone API-only server) plus the static
 * browser UI (`public/` and the compiled `dist-browser/` client bundle under `/app/`).
 */
export function createAppServer(catalog: Book[]): Server {
  return createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://localhost');

      if (req.method !== 'GET') {
        sendNotFound(res);
        return;
      }

      if (url.pathname === '/api/search') {
        const rawQuery: Record<string, string | undefined> = {};
        for (const key of ['category', 'format', 'language', 'publicationDate', 'minRating', 'page', 'limit', 'sort']) {
          rawQuery[key] = url.searchParams.get(key) ?? undefined;
        }
        const { status, body } = handleSearchRequest(catalog, rawQuery);
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
        return;
      }

      if (url.pathname.startsWith('/app/')) {
        const filePath = resolveStaticPath(BROWSER_DIST_DIR, url.pathname.slice('/app/'.length));
        if (filePath && (await serveStaticFile(res, filePath))) return;
        sendNotFound(res);
        return;
      }

      const publicRequestPath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const filePath = resolveStaticPath(PUBLIC_DIR, publicRequestPath);
      if (filePath && (await serveStaticFile(res, filePath))) return;

      sendNotFound(res);
    })();
  });
}
