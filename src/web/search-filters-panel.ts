import type { BookCategory, BookFormat, BookLanguage } from '../catalog/book.js';
import {
  getFilterOptions,
  getSortOptions,
  type FilterOptions,
  type MinRating,
  type PublicationDateWindow,
  type SortOption,
} from '../catalog/filter-catalog.js';

export interface SelectedFilters {
  format?: BookFormat;
  language?: BookLanguage;
  publicationDate?: PublicationDateWindow;
  minRating?: MinRating;
  sort?: SortOption;
}

export type FilterChangeListener = (filters: SelectedFilters) => void;

/**
 * Presentation logic for the shared filter panel: Format/Language/Publication Date are
 * single-select groups, Customer Reviews is a clickable star-rating control. Framework-agnostic
 * (no DOM dependency) so any UI layer can render on top of it. Fiction and Non-Fiction both use
 * this same class, parameterized only by `category`, guaranteeing consistent behavior.
 */
export class SearchFiltersPanel {
  private selected: SelectedFilters = {};
  private readonly listeners: FilterChangeListener[] = [];

  constructor(private readonly category: BookCategory) {}

  getCategory(): BookCategory {
    return this.category;
  }

  getOptions(): FilterOptions {
    return getFilterOptions(this.category);
  }

  getSortOptions(): SortOption[] {
    return getSortOptions(this.category);
  }

  onChange(listener: FilterChangeListener): void {
    this.listeners.push(listener);
  }

  private emitChange(): void {
    const snapshot = { ...this.selected };
    console.log('emitChange: notifying', this.listeners.length, 'listeners with:', snapshot);
    for (const listener of this.listeners) listener(snapshot);
  }

  selectFormat(format: BookFormat): void {
    this.selected.format = format;
    this.emitChange();
  }

  selectLanguage(language: BookLanguage): void {
    this.selected.language = language;
    this.emitChange();
  }

  selectPublicationDate(window: PublicationDateWindow): void {
    this.selected.publicationDate = window;
    this.emitChange();
  }

  /** Clicking star N applies the "N-stars and above" threshold; clicking a different star replaces it. Clicking the already-active star is a no-op. */
  clickStar(rating: MinRating): void {
    if (this.selected.minRating === rating) return;
    this.selected.minRating = rating;
    this.emitChange();
  }

  /** Selects a sort option; emits through the same onChange path as filter selections. */
  selectSort(option: SortOption): void {
    console.log('selectSort called with:', option);
    this.selected.sort = option;
    console.log('About to emit change, selected:', this.selected);
    this.emitChange();
  }

  /** Resets all selections including sort via the same emitChange() path as every other setter (DR-008: no bypass, so persistence stays in sync). */
  clearAll(): void {
    this.selected = {};
    this.emitChange();
  }

  /** Replaces the full selection (e.g. hydrating from persisted state); callers are responsible for passing already-validated filters. */
  setSelectedFilters(filters: SelectedFilters): void {
    this.selected = { ...filters };
    this.emitChange();
  }

  getSelectedFilters(): SelectedFilters {
    return { ...this.selected };
  }
}
