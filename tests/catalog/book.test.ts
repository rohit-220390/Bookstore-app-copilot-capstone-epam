import type { Book } from '../../src/catalog/book.js';

describe('Book interface', () => {
  it('accepts a fully populated Book object', () => {
    const b: Book = {
      id: '1',
      title: 'Test Title',
      author: 'Test Author',
      category: 'fiction',
      format: 'ebook',
      language: 'english',
      publicationDate: '2024-01-01',
      averageRating: 4,
      price: 10,
    };
    expect(b.author).toBe('Test Author');
  });

  it('Book literal missing author fails at compile time', () => {
    // @ts-expect-error: author is required
    const b: Book = { id: '1', title: 'T', category: 'fiction', format: 'ebook', language: 'english', publicationDate: '2024-01-01', averageRating: 4, price: 10 };
    // If @ts-expect-error is satisfied (i.e. TypeScript reports an error for missing author), the test passes at type level.
    expect(b).toBeDefined();
  });
});
