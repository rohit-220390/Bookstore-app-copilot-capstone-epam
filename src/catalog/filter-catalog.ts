import type { BookCategory, BookFormat, BookLanguage } from './book.js';

export type PublicationDateWindow = 'last-30-days' | 'last-6-months' | 'last-year';
export type MinRating = 3 | 4;
export type SortOption =
  | 'price-high-to-low'
  | 'price-low-to-high'
  | 'rating-high-to-low'
  | 'publication-date-newest'
  | 'publication-date-oldest'
  | 'relevance';

export interface FilterOptions {
  format: BookFormat[];
  language: BookLanguage[];
  publicationDate: PublicationDateWindow[];
  minRating: MinRating[];
}

/** Single source of truth for filter groups/options — identical for every category so Fiction and Non-Fiction stay in lockstep. */
const SHARED_FILTER_OPTIONS: FilterOptions = {
  format: ['hardcover', 'paperback', 'ebook', 'audiobook'],
  language: ['english', 'spanish', 'french', 'german'],
  publicationDate: ['last-30-days', 'last-6-months', 'last-year'],
  minRating: [3, 4],
};

const FILTER_OPTIONS_BY_CATEGORY: Record<BookCategory, FilterOptions> = {
  fiction: SHARED_FILTER_OPTIONS,
  'non-fiction': SHARED_FILTER_OPTIONS,
};

/** Returns the available filter groups/options for a category. */
export function getFilterOptions(category: BookCategory): FilterOptions {
  return FILTER_OPTIONS_BY_CATEGORY[category];
}

/** Single source of truth for sorting options — identical for every category so Fiction and Non-Fiction stay in lockstep (parity requirement). */
const SHARED_SORT_OPTIONS: SortOption[] = [
  'price-high-to-low',
  'price-low-to-high',
  'rating-high-to-low',
  'publication-date-newest',
  'publication-date-oldest',
  'relevance',
];

const SORT_OPTIONS_BY_CATEGORY: Record<BookCategory, SortOption[]> = {
  fiction: SHARED_SORT_OPTIONS,
  'non-fiction': SHARED_SORT_OPTIONS,
};

/** Returns the available sort options for a category. */
export function getSortOptions(category: BookCategory): SortOption[] {
  return SORT_OPTIONS_BY_CATEGORY[category];
}
