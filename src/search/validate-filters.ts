import type { BookCategory, BookFormat, BookLanguage } from '../catalog/book.js';
import {
  getFilterOptions,
  getSortOptions,
  type MinRating,
  type PublicationDateWindow,
  type SortOption,
} from '../catalog/filter-catalog.js';

/** Raw, untrusted query-string values as received over HTTP. */
export interface RawSearchFilters {
  category: string;
  format?: string;
  language?: string;
  publicationDate?: string;
  minRating?: string;
  sort?: string;
}

export interface ValidatedSearchFilters {
  category: BookCategory;
  format?: BookFormat;
  language?: BookLanguage;
  publicationDate?: PublicationDateWindow;
  minRating?: MinRating;
  sort?: SortOption;
}

const VALID_CATEGORIES: BookCategory[] = ['fiction', 'non-fiction'];

/** Category selects the entire result set, so an unrecognized value is a hard error rather than silently dropped. */
function parseCategory(raw: string): BookCategory {
  if (!VALID_CATEGORIES.includes(raw as BookCategory)) {
    throw new Error(`Invalid category: ${raw}`);
  }
  return raw as BookCategory;
}

/**
 * Validates raw query filters against the category's Filter Option Catalog allow-list.
 * Unrecognized optional filter values are dropped (ignored) rather than causing a request failure.
 * Sort validation defaults to 'relevance' for unrecognized values (per DR-014).
 */
export function validateFilters(raw: RawSearchFilters): ValidatedSearchFilters {
  const category = parseCategory(raw.category);
  const options = getFilterOptions(category);
  const sortOptions = getSortOptions(category);

  const result: ValidatedSearchFilters = { category };

  if (raw.format && (options.format as string[]).includes(raw.format)) {
    result.format = raw.format as BookFormat;
  }
  if (raw.language && (options.language as string[]).includes(raw.language)) {
    result.language = raw.language as BookLanguage;
  }
  if (raw.publicationDate && (options.publicationDate as string[]).includes(raw.publicationDate)) {
    result.publicationDate = raw.publicationDate as PublicationDateWindow;
  }
  if (raw.minRating !== undefined) {
    const parsed = Number(raw.minRating);
    if ((options.minRating as number[]).includes(parsed)) {
      result.minRating = parsed as MinRating;
    }
  }
  // Sort validation: defaults to 'relevance' for unrecognized values (graceful degradation per DR-014)
  if (raw.sort && sortOptions.includes(raw.sort as SortOption)) {
    result.sort = raw.sort as SortOption;
  } else if (raw.sort) {
    result.sort = 'relevance'; // Default for invalid sort values
  }

  return result;
}
