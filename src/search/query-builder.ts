import type { Book } from '../catalog/book.js';
import type { ValidatedSearchFilters } from './validate-filters.js';
import { isWithinPublicationWindow } from './date-filter.js';
import { getFilterOptions, type SortOption } from '../catalog/filter-catalog.js';

export interface Pagination {
  page: number;
  limit: number;
}

export interface SearchResult {
  items: Book[];
  total: number;
  page: number;
  limit: number;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;

/** Validates and normalizes raw page/limit query params (per docs/design-review.md DR-006): rejects non-positive-integer values, clamps limit to MAX_LIMIT. */
export function parsePagination(rawPage?: string, rawLimit?: string): Pagination {
  const page = rawPage === undefined ? DEFAULT_PAGE : Number(rawPage);
  const limit = rawLimit === undefined ? DEFAULT_LIMIT : Number(rawLimit);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Invalid page: ${String(rawPage)}`);
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`Invalid limit: ${String(rawLimit)}`);
  }

  return { page, limit: Math.min(limit, MAX_LIMIT) };
}

/**
 * Sorts the book array by the given sort option. Uses ES2019+ stable Array.sort() (guaranteed in Node 12+).
 * Books with equal sort-key values maintain their relative catalog order (stable sort per DR-015).
 */
function sortBooks(books: Book[], sort?: SortOption): Book[] {
  if (!sort || sort === 'relevance') {
    return books; // No sorting, preserve catalog order
  }

  // Create a copy to avoid mutating the input array
  const sorted = books.slice();

  switch (sort) {
    case 'price-high-to-low':
      return sorted.sort((a, b) => b.price - a.price);
    case 'price-low-to-high':
      return sorted.sort((a, b) => a.price - b.price);
    case 'rating-high-to-low':
      return sorted.sort((a, b) => b.averageRating - a.averageRating);
    case 'publication-date-newest':
      return sorted.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
    case 'publication-date-oldest':
      return sorted.sort((a, b) => new Date(a.publicationDate).getTime() - new Date(b.publicationDate).getTime());
    default:
      return books; // Fallback to unsorted if somehow an invalid option passes validation
  }
}

/**
 * Filters the catalog by validated filters, then sorts, then paginates. Execution order per DR-013:
 * 1. Filter: Category/format/language are exact matches; publicationDate is threshold-based.
 *    minRating is bucketed (exclusive of the next higher tier) so each Customer Reviews option shows
 *    a distinct rating range rather than an overlapping "and above" set — e.g. "3-stars" means [3, 4),
 *    "4-stars" means [4, 5].
 * 2. Sort: Apply sorting to the filtered result set by the selected sort option.
 * 3. Paginate: Slice the sorted, filtered results by page/limit.
 * Fiction and Non-Fiction run through the same code path, parameterized only by `filters.category`.
 */
export function searchBooks(
  catalog: Book[],
  filters: ValidatedSearchFilters,
  pagination: Pagination,
  referenceTime: Date = new Date(),
): SearchResult {
  // Step 1: Filter
  const matched = catalog.filter((book) => {
    if (book.category !== filters.category) return false;
    if (filters.format && book.format !== filters.format) return false;
    if (filters.language && book.language !== filters.language) return false;
    if (
      filters.publicationDate &&
      !isWithinPublicationWindow(book.publicationDate, filters.publicationDate, referenceTime)
    ) {
      return false;
    }
    if (filters.minRating !== undefined) {
      if (book.averageRating < filters.minRating) return false;
      const tiers = getFilterOptions(filters.category).minRating.slice().sort((a, b) => a - b);
      const nextTier = tiers[tiers.indexOf(filters.minRating) + 1];
      if (nextTier !== undefined && book.averageRating >= nextTier) return false;
    }
    return true;
  });

  // Step 2: Sort (after filtering, before pagination per DR-013)
  const sorted = sortBooks(matched, filters.sort);

  // Step 3: Paginate
  const start = (pagination.page - 1) * pagination.limit;
  const items = sorted.slice(start, start + pagination.limit);

  return { items, total: sorted.length, page: pagination.page, limit: pagination.limit };
}
