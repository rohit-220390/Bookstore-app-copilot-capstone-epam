import type { Book } from '../../src/catalog/book.js';
import { InMemoryFilterPersistence } from '../../src/web/filter-state-persistence.js';
import { SearchFiltersPanel } from '../../src/web/search-filters-panel.js';
import { ResultsView, type SearchResultPage } from '../../src/web/results-view.js';

const sampleBook: Book = {
  id: '1',
  title: 'Sample',
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
    await Promise.resolve(); // let the async onChange handler's refresh() settle

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

    // Simulates a fresh page load: a brand-new panel/view pair reading from the same persistence port.
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

  it('clearFilters() clears the persisted state too, so a later refresh does not restore old filters (DR-008)', async () => {
    const persistence = new InMemoryFilterPersistence();
    const search = jest.fn(async (): Promise<SearchResultPage> => ({ items: [sampleBook], total: 1, page: 1, limit: 20 }));
    const panel = new SearchFiltersPanel('non-fiction');
    const view = new ResultsView(panel, search, persistence);
    panel.selectFormat('hardcover');
    await Promise.resolve();

    view.clearFilters();
    await Promise.resolve();

    expect(persistence.load('non-fiction')).toEqual({});

    // Simulate a subsequent page refresh: a brand-new panel/view pair reading from the same port.
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
});