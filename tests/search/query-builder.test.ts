import type { Book } from '../../src/catalog/book.js';
import { parsePagination, searchBooks } from '../../src/search/query-builder.js';

const NOW = new Date('2026-06-15T00:00:00.000Z');

const catalog: Book[] = [
  { id: '1', title: 'Fiction Hardcover EN Recent', category: 'fiction', format: 'hardcover', language: 'english', publicationDate: '2026-06-01T00:00:00.000Z', averageRating: 4.5, price: 24.99 },
  { id: '2', title: 'Fiction Paperback ES Old', category: 'fiction', format: 'paperback', language: 'spanish', publicationDate: '2020-01-01T00:00:00.000Z', averageRating: 3.0, price: 14.99 },
  { id: '3', title: 'Non-Fiction Hardcover EN Recent', category: 'non-fiction', format: 'hardcover', language: 'english', publicationDate: '2026-06-01T00:00:00.000Z', averageRating: 4.8, price: 34.99 },
  { id: '4', title: 'Non-Fiction Ebook FR Old Low Rating', category: 'non-fiction', format: 'ebook', language: 'french', publicationDate: '2020-01-01T00:00:00.000Z', averageRating: 2.0, price: 9.99 },
  { id: '5', title: 'Non-Fiction Hardcover EN Recent Low Rating', category: 'non-fiction', format: 'hardcover', language: 'english', publicationDate: '2026-06-02T00:00:00.000Z', averageRating: 3.2, price: 29.99 },
];

describe('parsePagination', () => {
  it('defaults to page 1, limit 20 when omitted', () => {
    expect(parsePagination(undefined, undefined)).toEqual({ page: 1, limit: 20 });
  });

  it('clamps limit to the max of 100', () => {
    expect(parsePagination('1', '500')).toEqual({ page: 1, limit: 100 });
  });

  it('throws on a non-integer or non-positive page', () => {
    expect(() => parsePagination('0', '10')).toThrow('Invalid page');
    expect(() => parsePagination('1.5', '10')).toThrow('Invalid page');
  });

  it('throws on a non-integer or non-positive limit', () => {
    expect(() => parsePagination('1', '0')).toThrow('Invalid limit');
    expect(() => parsePagination('1', 'abc')).toThrow('Invalid limit');
  });
});

describe('searchBooks', () => {
  it('filters by category only', () => {
    const result = searchBooks(catalog, { category: 'non-fiction' }, { page: 1, limit: 20 }, NOW);
    expect(result.total).toBe(3);
    expect(result.items.map((b) => b.id)).toEqual(['3', '4', '5']);
  });

  it('filters by format within a category', () => {
    const result = searchBooks(catalog, { category: 'non-fiction', format: 'ebook' }, { page: 1, limit: 20 }, NOW);
    expect(result.items.map((b) => b.id)).toEqual(['4']);
  });

  it('filters by language within a category', () => {
    const result = searchBooks(catalog, { category: 'fiction', language: 'spanish' }, { page: 1, limit: 20 }, NOW);
    expect(result.items.map((b) => b.id)).toEqual(['2']);
  });

  it('filters by publicationDate window', () => {
    const result = searchBooks(
      catalog,
      { category: 'non-fiction', publicationDate: 'last-30-days' },
      { page: 1, limit: 20 },
      NOW,
    );
    expect(result.items.map((b) => b.id)).toEqual(['3', '5']);
  });

  it('filters by minRating threshold (top tier has no upper bound)', () => {
    const result = searchBooks(catalog, { category: 'non-fiction', minRating: 4 }, { page: 1, limit: 20 }, NOW);
    expect(result.items.map((b) => b.id)).toEqual(['3']);
  });

  it('minRating buckets are mutually exclusive: a lower tier excludes ratings that belong to a higher tier', () => {
    // id '3' is rated 4.8, so it belongs to the 4-star bucket, not the 3-star bucket.
    const result = searchBooks(catalog, { category: 'non-fiction', minRating: 3 }, { page: 1, limit: 20 }, NOW);
    expect(result.items.map((b) => b.id)).toEqual(['5']);
  });

  it('combines multiple filters', () => {
    const result = searchBooks(
      catalog,
      { category: 'non-fiction', format: 'hardcover', minRating: 3 },
      { page: 1, limit: 20 },
      NOW,
    );
    expect(result.items.map((b) => b.id)).toEqual(['5']);
  });

  it('paginates the filtered result set', () => {
    const result = searchBooks(catalog, { category: 'non-fiction' }, { page: 2, limit: 2 }, NOW);
    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
    expect(result.items.map((b) => b.id)).toEqual(['5']);
  });
});
