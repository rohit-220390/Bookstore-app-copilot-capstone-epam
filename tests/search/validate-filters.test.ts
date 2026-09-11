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

  it('validateFilters passes through q trimmed', () => {
    const result = validateFilters({ category: 'fiction', q: '  Ring  ' });
    expect(result.q).toBe('Ring');
  });

  it('validateFilters sets q undefined for blank string', () => {
    const result = validateFilters({ category: 'fiction', q: '   ' });
    expect(result.q).toBeUndefined();
  });

  it('missing q stays undefined', () => {
    const result = validateFilters({ category: 'fiction' });
    expect(result.q).toBeUndefined();
  });

  it('q does not interfere with other field validation', () => {
    const result = validateFilters({ category: 'non-fiction', format: 'hardcover', q: 'history' });
    expect(result.format).toBe('hardcover');
    expect(result.q).toBe('history');
  });
});
