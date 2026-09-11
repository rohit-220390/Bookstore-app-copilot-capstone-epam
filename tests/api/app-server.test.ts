import type { AddressInfo } from 'node:net';
import type { Book } from '../../src/catalog/book.js';
import { createAppServer } from '../../src/api/app-server.js';

const catalog: Book[] = [
  { id: '1', title: 'Non-Fiction Hardcover EN', author: 'Test Author', category: 'non-fiction', format: 'hardcover', language: 'english', publicationDate: '2026-01-01T00:00:00.000Z', averageRating: 4.5, price: 29.99 },
];

describe('createAppServer', () => {
  const server = createAppServer(catalog);
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('serves the UI shell at /', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    const body = await res.text();
    expect(body).toContain('Bookstore Search');
  });

  it('serves static assets under /styles.css', async () => {
    const res = await fetch(`${baseUrl}/styles.css`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/css/);
  });

  it('still serves the JSON search API at /api/search', async () => {
    const res = await fetch(`${baseUrl}/api/search?category=non-fiction`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Book[] };
    expect(body.items).toHaveLength(1);
  });

  it('returns 404 for an unknown route', async () => {
    const res = await fetch(`${baseUrl}/unknown`);
    expect(res.status).toBe(404);
  });

  it('rejects directory traversal attempts outside the public directory', async () => {
    const res = await fetch(`${baseUrl}/../../package.json`);
    expect(res.status).toBe(404);
  });

  it('rejects directory traversal attempts outside the browser dist directory', async () => {
    const res = await fetch(`${baseUrl}/app/../../../package.json`);
    expect(res.status).toBe(404);
  });

  it('/api/search includes Access-Control-Allow-Origin header', async () => {
    const res = await fetch(`${baseUrl}/api/search?category=non-fiction`);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('/api/search includes Access-Control-Allow-Methods header', async () => {
    const res = await fetch(`${baseUrl}/api/search?category=non-fiction`);
    expect(res.headers.get('access-control-allow-methods')).toBe('GET');
  });

  it('CORS headers present on error responses too', async () => {
    const res = await fetch(`${baseUrl}/api/search?category=invalid-category`);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('q param filters results by title match', async () => {
    const res = await fetch(`${baseUrl}/api/search?category=non-fiction&q=hardcover`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Book[] };
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toContain('Hardcover');
  });
});
