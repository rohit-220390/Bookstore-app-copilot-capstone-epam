import type { Book } from '../../src/catalog/book.js';
import { InMemoryFilterPersistence } from '../../src/web/filter-state-persistence.js';
import { SearchFiltersPanel } from '../../src/web/search-filters-panel.js';
import { ResultsView, type SearchResultPage } from '../../src/web/results-view.js';

const sampleBook: Book = {
  id: '1',
  title: 'Sample',
  author: 'Test Author',
  category: 'non-fiction',
  format: 'hardcover',
  language: 'english',
  publicationDate: '2026-01-01T00:00:00.000Z',
  averageRating: 4.5,
  price: 29.99,
};

describe('ResultsView', () => {
  it('populates items/total after a successful refresh', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 1, page: 1, limit: 20 }));
    const view = new ResultsView(panel, search);

    await view.refresh();

    expect(view.getItems()).toEqual([sampleBook]);
    expect(view.getTotal()).toBe(1);
    expect(view.getError()).toBeUndefined();
  });

  it('resets to page 1 and re-searches whenever a filter changes', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 1, page: 1, limit: 20 }));
    const view = new ResultsView(panel, search);
    await view.refresh();

    panel.selectFormat('hardcover');
    await Promise.resolve();

    expect(view.getPage()).toBe(1);
    expect(search).toHaveBeenCalledWith('non-fiction', { format: 'hardcover' }, 1);
  });

  it('keeps previously displayed items when a refresh fails', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest
      .fn<Promise<SearchResultPage>, [string, unknown, number]>()
      .mockResolvedValueOnce({ items: [sampleBook], total: 1, page: 1, limit: 20 })
      .mockRejectedValueOnce(new Error('API unavailable'));
    const view = new ResultsView(panel, search);

    await view.refresh();
    await view.refresh();

    expect(view.getItems()).toEqual([sampleBook]);
    expect(view.getError()).toBe('API unavailable');
  });

  it('restores previously saved filters on construction (Scenario: Filter state is preserved after page refresh)', async () => {
    const persistence = new InMemoryFilterPersistence();
    persistence.save('non-fiction', { format: 'hardcover' });
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 1, page: 1, limit: 20 }));

    const panel = new SearchFiltersPanel('non-fiction');
    const view = new ResultsView(panel, search, persistence);
    await Promise.resolve();

    expect(panel.getSelectedFilters()).toEqual({ format: 'hardcover' });
    expect(search).toHaveBeenCalledWith('non-fiction', { format: 'hardcover' }, 1);
    expect(view.getItems()).toEqual([sampleBook]);
  });

  it('saves filter changes through the persistence port as they happen', async () => {
    const persistence = new InMemoryFilterPersistence();
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 1, page: 1, limit: 20 }));
    const panel = new SearchFiltersPanel('non-fiction');
    new ResultsView(panel, search, persistence);

    panel.selectLanguage('spanish');
    await Promise.resolve();

    expect(persistence.load('non-fiction')).toEqual({ language: 'spanish' });
  });

  it('clearFilters() clears the persisted state too (DR-008)', async () => {
    const persistence = new InMemoryFilterPersistence();
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 1, page: 1, limit: 20 }));
    const panel = new SearchFiltersPanel('non-fiction');
    const view = new ResultsView(panel, search, persistence);
    panel.selectFormat('hardcover');
    await Promise.resolve();

    view.clearFilters();
    await Promise.resolve();

    expect(persistence.load('non-fiction')).toEqual({});

    const freshPanel = new SearchFiltersPanel('non-fiction');
    new ResultsView(freshPanel, search, persistence);
    expect(freshPanel.getSelectedFilters()).toEqual({});
  });

  it('onUpdate() notifies listeners after a successful refresh and after a failed one', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest
      .fn<Promise<SearchResultPage>, [string, unknown, number]>()
      .mockResolvedValueOnce({ items: [sampleBook], total: 1, page: 1, limit: 20 })
      .mockRejectedValueOnce(new Error('API unavailable'));
    const view = new ResultsView(panel, search);
    const listener = jest.fn();
    view.onUpdate(listener);

    await view.refresh();
    expect(listener).toHaveBeenCalledTimes(1);

    await view.refresh();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('getItems returns [] and getTotal returns 0 when backend returns no items', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [], total: 0, page: 1, limit: 20 }));
    const view = new ResultsView(panel, search);

    await view.refresh();

    expect(view.getItems()).toEqual([]);
    expect(view.getTotal()).toBe(0);
    expect(view.getError()).toBeUndefined();
  });

  it('hasNextPage true when total > page*limit', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 21, page: 1, limit: 20 }));
    const view = new ResultsView(panel, search);

    await view.refresh();

    expect(view.hasNextPage()).toBe(true);
  });

  it('hasPreviousPage false on page 1', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 1, page: 1, limit: 20 }));
    const view = new ResultsView(panel, search);

    await view.refresh();

    expect(view.hasPreviousPage()).toBe(false);
  });

  it('nextPage increments page and calls search with page+1', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 50, page: 1, limit: 20 }));
    const view = new ResultsView(panel, search);

    await view.refresh();
    search.mockClear();
    search.mockResolvedValue({ items: [sampleBook], total: 50, page: 2, limit: 20 });

    await view.nextPage();

    expect(view.getPage()).toBe(2);
    expect(search).toHaveBeenCalledWith('non-fiction', {}, 2);
  });

  it('prevPage decrements page and calls search with page-1', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 50, page: 1, limit: 20 }));
    const view = new ResultsView(panel, search);

    await view.refresh();
    search.mockResolvedValue({ items: [sampleBook], total: 50, page: 2, limit: 20 });
    await view.nextPage();
    search.mockClear();
    search.mockResolvedValue({ items: [sampleBook], total: 50, page: 1, limit: 20 });

    await view.prevPage();

    expect(view.getPage()).toBe(1);
    expect(search).toHaveBeenCalledWith('non-fiction', {}, 1);
  });

  it('nextPage is guarded: does not call search when hasNextPage is false', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 1, page: 1, limit: 20 }));
    const view = new ResultsView(panel, search);

    await view.refresh();
    search.mockClear();

    await view.nextPage();

    expect(search).not.toHaveBeenCalled();
  });

  it('prevPage is guarded: does not call search on page 1', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 1, page: 1, limit: 20 }));
    const view = new ResultsView(panel, search);

    await view.refresh();
    search.mockClear();

    await view.prevPage();

    expect(search).not.toHaveBeenCalled();
  });

  it('limit is stored from refresh result and used in hasNextPage calculation', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 11, page: 1, limit: 10 }));
    const view = new ResultsView(panel, search);

    await view.refresh();

    expect(view.hasNextPage()).toBe(true);
  });

  it('getIsLoading is true during refresh and false after', async () => {
    const panel = new SearchFiltersPanel('non-fiction');

    let resolveSearch!: (value: SearchResultPage) => void;
    const deferred = new Promise<SearchResultPage>((resolve) => { resolveSearch = resolve; });
    const search = jest.fn(() => deferred);
    const view = new ResultsView(panel, search);

    const refreshPromise = view.refresh();
    expect(view.getIsLoading()).toBe(true);

    resolveSearch({ items: [sampleBook], total: 1, page: 1, limit: 20 });
    await refreshPromise;

    expect(view.getIsLoading()).toBe(false);
  });

  it('loading resets to false on error', async () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const search = jest.fn().mockRejectedValue(new Error('Search failed'));
    const view = new ResultsView(panel, search);

    await view.refresh();

    expect(view.getIsLoading()).toBe(false);
    expect(view.getError()).toBe('Search failed');
  });
});
