import { getFilterOptions, getSortOptions } from '../../src/catalog/filter-catalog.js';

describe('getFilterOptions', () => {
  it('returns identical filter groups/options for fiction and non-fiction (parity requirement)', () => {
    expect(getFilterOptions('fiction')).toEqual(getFilterOptions('non-fiction'));
  });

  it('includes all four required filter groups with the specified options', () => {
    const options = getFilterOptions('fiction');
    expect(options.format).toEqual(['hardcover', 'paperback', 'ebook', 'audiobook']);
    expect(options.language).toEqual(['english', 'spanish', 'french', 'german']);
    expect(options.publicationDate).toEqual(['last-30-days', 'last-6-months', 'last-year']);
    expect(options.minRating).toEqual([3, 4]);
  });
});

describe('getSortOptions', () => {
  it('returns identical sort options for fiction and non-fiction (parity requirement)', () => {
    expect(getSortOptions('fiction')).toEqual(getSortOptions('non-fiction'));
  });

  it('includes all six required sort options', () => {
    const options = getSortOptions('fiction');
    expect(options).toEqual([
      'price-high-to-low',
      'price-low-to-high',
      'rating-high-to-low',
      'publication-date-newest',
      'publication-date-oldest',
      'relevance',
    ]);
  });
});
