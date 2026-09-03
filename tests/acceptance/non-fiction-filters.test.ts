import { getFilterOptions } from '../../src/catalog/filter-catalog.js';
import { seedBooks } from '../../src/catalog/seed-data.js';
import { handleSearchRequest } from '../../src/api/search-endpoint.js';
import { InMemoryFilterPersistence, type FilterStatePort } from '../../src/web/filter-state-persistence.js';
import { SearchFiltersPanel } from '../../src/web/search-filters-panel.js';
import { ResultsView, type SearchFn } from '../../src/web/results-view.js';

/**
 * One test per Gherkin scenario in docs/requirements.md (EPMCDMETST-52015), run against the
 * real in-memory catalog + full search stack — no test doubles.
 */
describe('EPMCDMETST-52015 acceptance criteria', () => {
  it('Scenario: Filter availability on Non-Fiction results', () => {
    const options = getFilterOptions('non-fiction');
    expect(options.format.length).toBeGreaterThan(0);
    expect(options.language.length).toBeGreaterThan(0);
    expect(options.publicationDate.length).toBeGreaterThan(0);
    expect(options.minRating.length).toBeGreaterThan(0);
  });

  it('Scenario: Book Format filter works', () => {
    const response = handleSearchRequest(seedBooks, { category: 'non-fiction', format: 'hardcover' });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items.every((b) => b.format === 'hardcover' && b.category === 'non-fiction')).toBe(true);
    }
  });

  it('Scenario: Language filter works', () => {
    const response = handleSearchRequest(seedBooks, { category: 'non-fiction', language: 'spanish' });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items.every((b) => b.language === 'spanish' && b.category === 'non-fiction')).toBe(true);
    }
  });

  it('Scenario: Publication Date filter works', () => {
    const response = handleSearchRequest(seedBooks, { category: 'non-fiction', publicationDate: 'last-30-days' });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      expect(response.body.items.length).toBeGreaterThan(0);
      // nf2 (~90 days ago) must be excluded from the 30-day window.
      expect(response.body.items.find((b) => b.id === 'nf2')).toBeUndefined();
    }
  });

  it('Scenario: Customer Reviews filter works', () => {
    const fourPlus = handleSearchRequest(seedBooks, { category: 'non-fiction', minRating: '4' });
    const threePlus = handleSearchRequest(seedBooks, { category: 'non-fiction', minRating: '3' });
    expect(fourPlus.status).toBe(200);
    expect(threePlus.status).toBe(200);
    if (fourPlus.status === 200 && threePlus.status === 200) {
      expect(fourPlus.body.items.every((b) => b.averageRating >= 4)).toBe(true);
      // "3-stars" is an exclusive bucket ([3, 4)): it excludes both sub-3 and 4+ rated books.
      expect(threePlus.body.items.every((b) => b.averageRating >= 3 && b.averageRating < 4)).toBe(true);
      expect(threePlus.body.items.find((b) => b.id === 'nf4')).toBeUndefined();
    }
  });

  it('Scenario: Consistency with Fiction', () => {
    expect(getFilterOptions('fiction')).toEqual(getFilterOptions('non-fiction'));
  });

  const searchViaApi: SearchFn = async (category, filters, page) => {
    const response = handleSearchRequest(seedBooks, {
      category,
      format: filters.format,
      language: filters.language,
      publicationDate: filters.publicationDate,
      minRating: filters.minRating !== undefined ? String(filters.minRating) : undefined,
      sort: filters.sort,
      page: String(page),
    });
    if (response.status !== 200) throw new Error(response.body.error);
    return response.body;
  };

  it('Scenario: Clear all filters', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const view = new ResultsView(panel, searchViaApi);
    await view.refresh();
    const unfilteredTotal = view.getTotal();

    panel.selectFormat('hardcover');
    await Promise.resolve();
    expect(view.getTotal()).toBeLessThan(unfilteredTotal);

    view.clearFilters();
    await Promise.resolve();

    expect(panel.getSelectedFilters()).toEqual({});
    expect(view.getTotal()).toBe(unfilteredTotal);
  });

  it('Scenario: Filter state is preserved after page refresh', async () => {
    const persistence: FilterStatePort = new InMemoryFilterPersistence();

    const firstPanel = new SearchFiltersPanel('non-fiction');
    const firstView = new ResultsView(firstPanel, searchViaApi, persistence);
    await firstView.refresh();
    firstPanel.selectFormat('hardcover');
    await Promise.resolve();

    // Simulate a page refresh: brand-new panel/view instances reading from the same persistence port.
    const refreshedPanel = new SearchFiltersPanel('non-fiction');
    const refreshedView = new ResultsView(refreshedPanel, searchViaApi, persistence);
    await Promise.resolve();

    expect(refreshedPanel.getSelectedFilters()).toEqual({ format: 'hardcover' });
    expect(refreshedView.getItems().every((b) => b.format === 'hardcover')).toBe(true);
  });

  it('Scenario: Filtering works with sorting (TASK-024)', async () => {
    // Apply filter to Non-Fiction results
    const response = handleSearchRequest(seedBooks, {
      category: 'non-fiction',
      format: 'ebook',
      sort: 'price-high-to-low',
    });
    
    expect(response.status).toBe(200);
    if (response.status === 200) {
      // Verify filtered results (only ebooks)
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items.every((b) => b.format === 'ebook' && b.category === 'non-fiction')).toBe(true);
      
      // Verify sorting (price high to low within filtered ebooks)
      for (let i = 1; i < response.body.items.length; i++) {
        expect(response.body.items[i - 1].price).toBeGreaterThanOrEqual(response.body.items[i].price);
      }
      
      // Verify applied filters remain active (not cleared by sorting)
      const filteredIds = response.body.items.map((b) => b.id);
      const unfilteredSorted = handleSearchRequest(seedBooks, {
        category: 'non-fiction',
        sort: 'price-high-to-low',
      });
      if (unfilteredSorted.status === 200) {
        // Unfiltered sorted should have more items than filtered sorted
        expect(unfilteredSorted.body.total).toBeGreaterThan(response.body.total);
      }
    }
  });
});
