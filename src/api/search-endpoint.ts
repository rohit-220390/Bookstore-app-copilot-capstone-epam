import { createServer, type Server } from 'node:http';
import type { Book } from '../catalog/book.js';
import { validateFilters } from '../search/validate-filters.js';
import { parsePagination, searchBooks, type SearchResult } from '../search/query-builder.js';

export interface SearchApiError {
  error: string;
}

export type SearchApiResponse =
  | { status: 200; body: SearchResult }
  | { status: 400; body: SearchApiError };

/**
 * Pure request handler: takes the catalog and raw (untrusted) query params, returns a typed
 * response with no HTTP-framework dependency, so it's testable without a running server.
 */
export function handleSearchRequest(
  catalog: Book[],
  rawQuery: Record<string, string | undefined>,
): SearchApiResponse {
  try {
    const category = rawQuery.category;
    if (!category) {
      return { status: 400, body: { error: 'Missing required query parameter: category' } };
    }
    const filters = validateFilters({
      category,
      format: rawQuery.format,
      language: rawQuery.language,
      publicationDate: rawQuery.publicationDate,
      minRating: rawQuery.minRating,
      sort: rawQuery.sort,
    });
    const pagination = parsePagination(rawQuery.page, rawQuery.limit);
    const result = searchBooks(catalog, filters, pagination);
    return { status: 200, body: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return { status: 400, body: { error: message } };
  }
}

/** Thin `node:http` wrapper exposing `GET /api/search` over `handleSearchRequest`. */
export function createSearchServer(catalog: Book[]): Server {
  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method !== 'GET' || url.pathname !== '/api/search') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' } satisfies SearchApiError));
      return;
    }

    const rawQuery: Record<string, string | undefined> = {};
    for (const key of ['category', 'format', 'language', 'publicationDate', 'minRating', 'page', 'limit', 'sort']) {
      rawQuery[key] = url.searchParams.get(key) ?? undefined;
    }

    const { status, body } = handleSearchRequest(catalog, rawQuery);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  });
}
