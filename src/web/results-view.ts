import type { Book } from '../catalog/book.js';
import type { FilterStatePort } from './filter-state-persistence.js';
import type { SearchFiltersPanel, SelectedFilters } from './search-filters-panel.js';

export interface SearchResultPage {
  items: Book[];
  total: number;
  page: number;
  limit: number;
}

export type SearchFn = (category: string, filters: SelectedFilters, page: number) => Promise<SearchResultPage>;
export type ResultsUpdateListener = () => void;

/**
 * Connects a SearchFiltersPanel to a search function and holds the current results/error state.
 * On a failed refresh, previously displayed items are kept (per docs/architecture.md §7) rather
 * than cleared, and the page resets to 1 whenever a filter changes.
 *
 * When a `persistence` port is supplied, every filter change (including via `panel.clearAll()`
 * and `clearFilters()` below) is saved through it, and any previously saved filters for the
 * panel's category are restored at construction time — both through the same `onChange` path,
 * so persistence never falls out of sync with the panel's selections (DR-008).
 */
export class ResultsView {
  private items: Book[] = [];
  private total = 0;
  private page = 1;
  private error: string | undefined;
  private readonly updateListeners: ResultsUpdateListener[] = [];

  constructor(
    private readonly panel: SearchFiltersPanel,
    private readonly search: SearchFn,
    private readonly persistence?: FilterStatePort,
  ) {
    this.panel.onChange((filters) => {
      console.log('ResultsView onChange handler called with:', filters);
      this.persistence?.save(this.panel.getCategory(), filters);
      this.page = 1;
      console.log('About to refresh with filters:', filters);
      void this.refresh();
    });

    const restored = this.persistence?.load(this.panel.getCategory());
    if (restored && Object.keys(restored).length > 0) {
      this.panel.setSelectedFilters(restored);
    }
  }

  /** Clears all filters via the panel — the "Clear All Filters" UI trigger calls this. */
  clearFilters(): void {
    this.panel.clearAll();
  }

  /** Subscribes to be notified after every refresh (success or failure) — used by UI layers to re-render. */
  onUpdate(listener: ResultsUpdateListener): void {
    this.updateListeners.push(listener);
  }

  async refresh(): Promise<void> {
    try {
      const result = await this.search(this.panel.getCategory(), this.panel.getSelectedFilters(), this.page);
      this.items = result.items;
      this.total = result.total;
      this.error = undefined;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Search failed';
      // items/total intentionally left unchanged so previous results remain visible.
    } finally {
      for (const listener of this.updateListeners) listener();
    }
  }

  getItems(): Book[] {
    return this.items;
  }

  getTotal(): number {
    return this.total;
  }

  getError(): string | undefined {
    return this.error;
  }

  getPage(): number {
    return this.page;
  }
}
