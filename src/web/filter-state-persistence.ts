import type { BookCategory } from '../catalog/book.js';
import { getFilterOptions, getSortOptions } from '../catalog/filter-catalog.js';
import type { SelectedFilters } from './search-filters-panel.js';

/** Persists a category's selected filters across a page refresh and restores them on load. */
export interface FilterStatePort {
  save(category: BookCategory, filters: SelectedFilters): void;
  load(category: BookCategory): SelectedFilters | undefined;
}

/** Minimal Web Storage-like contract (satisfied by `window.localStorage`) so this module has no DOM/lib dependency. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY_PREFIX = 'bookstore-app:filters:';

/** Drops any restored values no longer present in the current Filter Option Catalog or Sort Option Catalog (DR-010, TASK-020). */
function sanitizeFilters(category: BookCategory, filters: SelectedFilters): SelectedFilters {
  const options = getFilterOptions(category);
  const sortOptions = getSortOptions(category);
  const sanitized: SelectedFilters = {};

  if (filters.format !== undefined && (options.format as string[]).includes(filters.format)) {
    sanitized.format = filters.format;
  }
  if (filters.language !== undefined && (options.language as string[]).includes(filters.language)) {
    sanitized.language = filters.language;
  }
  if (filters.publicationDate !== undefined && (options.publicationDate as string[]).includes(filters.publicationDate)) {
    sanitized.publicationDate = filters.publicationDate;
  }
  if (filters.minRating !== undefined && (options.minRating as number[]).includes(filters.minRating)) {
    sanitized.minRating = filters.minRating;
  }
  if (filters.sort !== undefined && sortOptions.includes(filters.sort)) {
    sanitized.sort = filters.sort;
  }

  return sanitized;
}

/**
 * Adapter over any Web Storage-like backend — pass `window.localStorage` in a real browser.
 * Degrades gracefully (no-op) when the backend is missing/throws (e.g. private browsing mode
 * or quota exceeded) or its contents are missing/corrupt, so persistence failures never break
 * core filtering/search.
 */
export class LocalStorageFilterPersistence implements FilterStatePort {
  constructor(private readonly storage: StorageLike) {}

  save(category: BookCategory, filters: SelectedFilters): void {
    try {
      this.storage.setItem(STORAGE_KEY_PREFIX + category, JSON.stringify(filters));
    } catch {
      // Storage unavailable/quota exceeded — persistence is best-effort, never fatal.
    }
  }

  load(category: BookCategory): SelectedFilters | undefined {
    try {
      const raw = this.storage.getItem(STORAGE_KEY_PREFIX + category);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as SelectedFilters;
      return sanitizeFilters(category, parsed);
    } catch {
      return undefined;
    }
  }
}

/** In-memory test double — mirrors `LocalStorageFilterPersistence` behavior (including DR-010 sanitization) without a storage backend. */
export class InMemoryFilterPersistence implements FilterStatePort {
  private readonly store = new Map<BookCategory, SelectedFilters>();

  save(category: BookCategory, filters: SelectedFilters): void {
    this.store.set(category, { ...filters });
  }

  load(category: BookCategory): SelectedFilters | undefined {
    const stored = this.store.get(category);
    if (!stored) return undefined;
    return sanitizeFilters(category, stored);
  }
}
