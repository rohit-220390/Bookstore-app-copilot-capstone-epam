import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Book, BookCategory, BookFormat, BookLanguage } from './book.js';

/** Computes an ISO date string N days before now, so fixture dates stay meaningful whenever tests run. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Raw JSON fixture shape: publication dates are stored as a relative offset, not a fixed date (see daysAgo). */
interface SeedBookRecord {
  id: string;
  title: string;
  category: BookCategory;
  format: BookFormat;
  language: BookLanguage;
  daysAgoOffset: number;
  averageRating: number;
  price: number;
}

// Read as plain JSON (not a static ESM import) so it works uniformly under tsx, ts-jest, and plain
// Node without depending on ESM JSON import-assertion syntax support. Path is relative to the
// process's working directory, which npm/tsx always set to this package's root.
const seedRecords = JSON.parse(
  readFileSync(join(process.cwd(), 'src/catalog/seed-data.json'), 'utf-8'),
) as SeedBookRecord[];

/**
 * In-memory catalog fixture (see docs/design-review.md DR-004), sourced from `seed-data.json`.
 * Covers both categories, every format/language, and a spread of publication dates/ratings/prices so
 * each filter and sort dimension has at least one matching and one excluded book. Includes books with
 * identical prices (f1, nf4, nf11: $24.99; f4, nf2: $19.99) for stable-sort testing per DR-015.
 */
export const seedBooks: Book[] = seedRecords.map((record) => ({
  id: record.id,
  title: record.title,
  category: record.category,
  format: record.format,
  language: record.language,
  publicationDate: daysAgo(record.daysAgoOffset),
  averageRating: record.averageRating,
  price: record.price,
}));
