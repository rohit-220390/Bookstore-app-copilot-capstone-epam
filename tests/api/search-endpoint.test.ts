import type { AddressInfo } from 'node:net';
import type { Book } from '../../src/catalog/book.js';
import { handleSearchRequest, createSearchServer } from '../../src/api/search-endpoint.js';

const catalog: Book[] = [
  { id: '1', title: 'Non-Fiction Hardcover EN', category: 'non-fiction', format: 'hardcover', language: 'english', publicationDate: '2026-01-01T00:00:00.000Z', averageRating: 4.5, price: 29.99 },
  { id: '2', title: 'Non-Fiction Paperback ES', category: 'non-fiction', format: 'paperback', language: 'spanish', publicationDate: '2026-01-01T00:00:00.000Z', averageRating: 3.0, price: 16.99 },
];

describe('handleSearchRequest', () => {
  it('returns 400 when category is missing', () => {
    const response = handleSearchRequest(catalog, {});
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing required query parameter: category' });
  });

  it('returns 400 for an invalid category', () => {
    const response = handleSearchRequest(catalog, { category: 'sci-fi' });
    expect(response.status).toBe(400);
  });

  it('returns 400 for an invalid page/limit', () => {
    const response = handleSearchRequest(catalog, { category: 'non-fiction', page: '0' });
    expect(response.status).toBe(400);
  });

  it('returns 200 with matching results for a valid request', () => {
    const response = handleSearchRequest(catalog, { category: 'non-fiction', format: 'hardcover' });
    expect(response.status).toBe(200);
    expect(response.status === 200 && response.body.items.map((b) => b.id)).toEqual(['1']);
  });

  it('accepts and applies sort parameter (TASK-019)', () => {
    const response = handleSearchRequest(catalog, { category: 'non-fiction', sort: 'price-low-to-high' });
    expect(response.status).toBe(200);
    // id '2' ($16.99) should come before id '1' ($29.99)
    expect(response.status === 200 && response.body.items.map((b) => b.id)).toEqual(['2', '1']);
  });

  it('defaults to relevance (unsorted) for invalid sort values (DR-014)', () => {
    const response = handleSearchRequest(catalog, { category: 'non-fiction', sort: 'invalid-sort' });
    expect(response.status).toBe(200);
    // Should return in catalog order when sort is relevance/invalid
    expect(response.status === 200 && response.body.items.map((b) => b.id)).toEqual(['1', '2']);
  });

  it('applies sorting after filtering (DR-013 execution order)', () => {
    const response = handleSearchRequest(catalog, { category: 'non-fiction', format: 'paperback', sort: 'price-high-to-low' });
    expect(response.status).toBe(200);
    // Only paperback (id '2') matches the filter, so only one result despite sorting
    expect(response.status === 200 && response.body.items.map((b) => b.id)).toEqual(['2']);
  });
});

describe('GET /api/search (integration)', () => {
  const server = createSearchServer(catalog);
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns filtered results for a valid query', async () => {
    const res = await fetch(`${baseUrl}/api/search?category=non-fiction&language=spanish`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Book[]; total: number };
    expect(body.items.map((b) => b.id)).toEqual(['2']);
  });

  it('returns sorted results when sort parameter is provided', async () => {
    const res = await fetch(`${baseUrl}/api/search?category=non-fiction&sort=price-high-to-low`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Book[]; total: number };
    // id '1' ($29.99) before id '2' ($16.99)
    expect(body.items.map((b) => b.id)).toEqual(['1', '2']);
  });

  it('returns a 400 JSON error for a missing category', async () => {
    const res = await fetch(`${baseUrl}/api/search`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/category/i);
  });

  it('returns 404 for an unknown route', async () => {
    const res = await fetch(`${baseUrl}/unknown`);
    expect(res.status).toBe(404);
  });
});
