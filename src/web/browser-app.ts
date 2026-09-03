import type { BookCategory, BookFormat, BookLanguage } from '../catalog/book.js';
import type { MinRating, PublicationDateWindow, SortOption } from '../catalog/filter-catalog.js';
import { SearchFiltersPanel } from './search-filters-panel.js';
import { ResultsView, type SearchFn, type SearchResultPage } from './results-view.js';
import { LocalStorageFilterPersistence } from './filter-state-persistence.js';

/** Browser entry point wiring the framework-agnostic panel/results classes to real DOM elements. */

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} element`);
  return el as T;
}

const tabsEl = requireElement<HTMLElement>('category-tabs');
const filtersEl = requireElement<HTMLElement>('filters');
const clearAllButton = requireElement<HTMLButtonElement>('clear-all');
const errorEl = requireElement<HTMLElement>('error');
const summaryEl = requireElement<HTMLElement>('summary');
const resultsEl = requireElement<HTMLUListElement>('results');

const persistence = new LocalStorageFilterPersistence(window.localStorage);

const searchViaApi: SearchFn = async (category, filters, page) => {
  const params = new URLSearchParams({ category, page: String(page) });
  if (filters.format) params.set('format', filters.format);
  if (filters.language) params.set('language', filters.language);
  if (filters.publicationDate) params.set('publicationDate', filters.publicationDate);
  if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
  if (filters.sort) params.set('sort', filters.sort);

  const res = await fetch(`/api/search?${params.toString()}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: 'Search failed' }))) as { error: string };
    throw new Error(body.error);
  }
  return (await res.json()) as SearchResultPage;
};

function renderGroup<T extends string>(
  label: string,
  values: readonly T[],
  active: T | undefined,
  onSelect: (value: T) => void,
): HTMLElement {
  const wrapper = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = label;
  wrapper.appendChild(legend);

  for (const value of values) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = value;
    button.className = value === active ? 'option active' : 'option';
    button.addEventListener('click', () => onSelect(value));
    wrapper.appendChild(button);
  }
  return wrapper;
}

function renderStars(
  ratings: readonly MinRating[],
  active: MinRating | undefined,
  onSelect: (value: MinRating) => void,
): HTMLElement {
  const wrapper = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = 'Customer Reviews';
  wrapper.appendChild(legend);

  // Label just shows the tier number; the underlying filter still buckets it exclusively
  // (see searchBooks in query-builder.ts) — e.g. "3★" matches ratings [3, 4) only.
  for (const rating of ratings) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${rating}\u2605`;
    button.className = rating === active ? 'star active' : 'star';
    button.addEventListener('click', () => onSelect(rating));
    wrapper.appendChild(button);
  }
  return wrapper;
}

function renderSortDropdown(
  label: string,
  options: readonly SortOption[],
  active: SortOption | undefined,
  onSelect: (value: SortOption) => void,
): HTMLElement {
  const wrapper = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = label;
  wrapper.appendChild(legend);

  const select = document.createElement('select');
  select.className = 'sort-dropdown';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Select Sort Option --';
  defaultOption.selected = !active;
  select.appendChild(defaultOption);

  // Add sort options
  for (const option of options) {
    const optionEl = document.createElement('option');
    optionEl.value = option;
    optionEl.textContent = option;
    optionEl.selected = option === active;
    select.appendChild(optionEl);
  }

  select.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    const value = target.value;
    console.log('Sort dropdown changed:', value);
    if (value && value !== '') {
      console.log('Calling onSelect with:', value);
      onSelect(value as SortOption);
    }
  });

  wrapper.appendChild(select);
  return wrapper;
}


let panel: SearchFiltersPanel;
let view: ResultsView;

function render(): void {
  const options = panel.getOptions();
  const selected = panel.getSelectedFilters();

  filtersEl.innerHTML = '';
  filtersEl.appendChild(
    renderGroup<BookFormat>('Format', options.format, selected.format, (value) => panel.selectFormat(value)),
  );
  filtersEl.appendChild(
    renderGroup<BookLanguage>('Language', options.language, selected.language, (value) => panel.selectLanguage(value)),
  );
  filtersEl.appendChild(
    renderGroup<PublicationDateWindow>('Publication Date', options.publicationDate, selected.publicationDate, (value) =>
      panel.selectPublicationDate(value),
    ),
  );
  filtersEl.appendChild(renderStars(options.minRating, selected.minRating, (value) => panel.clickStar(value)));
  filtersEl.appendChild(
    renderSortDropdown('Sort By', panel.getSortOptions(), selected.sort, (value) => {
      console.log('Sort callback invoked with:', value);
      panel.selectSort(value);
    }),
  );

  const error = view.getError();
  errorEl.hidden = !error;
  errorEl.textContent = error ?? '';

  summaryEl.textContent = `${view.getTotal()} result(s) \u2014 page ${view.getPage()}`;

  resultsEl.innerHTML = '';
  for (const book of view.getItems()) {
    const li = document.createElement('li');
    li.textContent = `${book.title} \u2014 ${book.format}, ${book.language}, \u2605${book.averageRating.toFixed(1)}, $${book.price.toFixed(2)}`;
    resultsEl.appendChild(li);
  }
}

let isInitialLoad = true;

async function selectCategory(category: BookCategory): Promise<void> {
  for (const tab of tabsEl.querySelectorAll<HTMLButtonElement>('button')) {
    tab.classList.toggle('active', tab.dataset.category === category);
  }

  panel = new SearchFiltersPanel(category);
  // Only use persistence on initial page load, not when switching tabs
  view = new ResultsView(panel, searchViaApi, isInitialLoad ? persistence : undefined);
  isInitialLoad = false;
  view.onUpdate(render);
  clearAllButton.onclick = () => view.clearFilters();

  await view.refresh();
  render();
}

for (const tab of tabsEl.querySelectorAll<HTMLButtonElement>('button')) {
  tab.addEventListener('click', () => {
    const category = tab.dataset.category as BookCategory | undefined;
    if (category) void selectCategory(category);
  });
}

void selectCategory('fiction');
