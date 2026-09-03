import { validateFilters } from '../../src/search/validate-filters.js';

describe('validateFilters', () => {
  it('accepts a valid category with no optional filters', () => {
    expect(validateFilters({ category: 'non-fiction' })).toEqual({ category: 'non-fiction' });
  });

  it('throws on an invalid category', () => {
    expect(() => validateFilters({ category: 'sci-fi' })).toThrow('Invalid category: sci-fi');
  });

  it('accepts a valid format/language/publicationDate/minRating combination', () => {
    const result = validateFilters({
      category: 'non-fiction',
      format: 'hardcover',
      language: 'english',
      publicationDate: 'last-30-days',
      minRating: '4',
    });
    expect(result).toEqual({
      category: 'non-fiction',
      format: 'hardcover',
      language: 'english',
      publicationDate: 'last-30-days',
      minRating: 4,
    });
  });

  it('silently drops unrecognized filter values instead of throwing', () => {
    const result = validateFilters({
      category: 'non-fiction',
      format: 'large-print',
      language: 'klingon',
      publicationDate: 'last-decade',
      minRating: '2',
    });
    expect(result).toEqual({ category: 'non-fiction' });
  });
});
