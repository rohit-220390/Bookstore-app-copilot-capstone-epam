import { SearchFiltersPanel } from '../../src/web/search-filters-panel.js';

describe('SearchFiltersPanel', () => {
  it('returns identical options for fiction and non-fiction (consistency requirement)', () => {
    const fiction = new SearchFiltersPanel('fiction');
    const nonFiction = new SearchFiltersPanel('non-fiction');
    expect(fiction.getOptions()).toEqual(nonFiction.getOptions());
  });

  it('returns identical sort options for fiction and non-fiction (parity requirement)', () => {
    const fiction = new SearchFiltersPanel('fiction');
    const nonFiction = new SearchFiltersPanel('non-fiction');
    expect(fiction.getSortOptions()).toEqual(nonFiction.getSortOptions());
  });

  it('single-selects format: choosing a new value replaces the previous one', () => {
    const panel = new SearchFiltersPanel('non-fiction');
    panel.selectFormat('hardcover');
    panel.selectFormat('ebook');
    expect(panel.getSelectedFilters().format).toBe('ebook');
  });

  it('single-selects language and publicationDate', () => {
    const panel = new SearchFiltersPanel('non-fiction');
    panel.selectLanguage('english');
    panel.selectLanguage('french');
    panel.selectPublicationDate('last-30-days');
    panel.selectPublicationDate('last-year');
    expect(panel.getSelectedFilters()).toEqual({ language: 'french', publicationDate: 'last-year' });
  });

  it('clicking a star sets the minRating threshold, replacing a prior selection', () => {
    const panel = new SearchFiltersPanel('non-fiction');
    panel.clickStar(3);
    expect(panel.getSelectedFilters().minRating).toBe(3);
    panel.clickStar(4);
    expect(panel.getSelectedFilters().minRating).toBe(4);
  });

  it('clicking the already-active star is a no-op (does not re-emit change)', () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const listener = jest.fn();
    panel.clickStar(3);
    panel.onChange(listener);
    panel.clickStar(3);
    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies listeners with a snapshot of the current selection on every change', () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const listener = jest.fn();
    panel.onChange(listener);
    panel.selectFormat('paperback');
    expect(listener).toHaveBeenCalledWith({ format: 'paperback' });
  });

  it('clearAll() resets every selection including sort and emits an empty filter set (Scenario: Clear all filters + DR-017)', () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const listener = jest.fn();
    panel.selectFormat('hardcover');
    panel.selectLanguage('english');
    panel.clickStar(4);
    panel.selectSort('price-high-to-low');
    panel.onChange(listener);

    panel.clearAll();

    expect(panel.getSelectedFilters()).toEqual({});
    expect(listener).toHaveBeenCalledWith({});
  });

  it('selectSort() updates the sort selection and emits through onChange (TASK-018)', () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const listener = jest.fn();
    panel.onChange(listener);

    panel.selectSort('price-high-to-low');

    expect(panel.getSelectedFilters().sort).toBe('price-high-to-low');
    expect(listener).toHaveBeenCalledWith({ sort: 'price-high-to-low' });
  });

  it('selectSort() replaces previous sort selection', () => {
    const panel = new SearchFiltersPanel('non-fiction');
    panel.selectSort('price-high-to-low');
    panel.selectSort('rating-high-to-low');
    expect(panel.getSelectedFilters().sort).toBe('rating-high-to-low');
  });

  it('setSelectedFilters() replaces the selection and emits a change (used to hydrate from persistence)', () => {
    const panel = new SearchFiltersPanel('non-fiction');
    const listener = jest.fn();
    panel.onChange(listener);

    panel.setSelectedFilters({ format: 'audiobook', minRating: 3 });

    expect(panel.getSelectedFilters()).toEqual({ format: 'audiobook', minRating: 3 });
    expect(listener).toHaveBeenCalledWith({ format: 'audiobook', minRating: 3 });
  });
});
