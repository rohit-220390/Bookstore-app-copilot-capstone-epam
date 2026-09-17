import { InMemoryFilterPersistence, LocalStorageFilterPersistence, type StorageLike } from '../../src/web/filter-state-persistence.js';

class FakeStorage implements StorageLike {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('InMemoryFilterPersistence', () => {
  it('round-trips saved filters for a category', () => {
    const persistence = new InMemoryFilterPersistence();
    persistence.save('non-fiction', { format: 'hardcover', minRating: 4 });
    expect(persistence.load('non-fiction')).toEqual({ format: 'hardcover', minRating: 4 });
  });

  it('round-trips saved filters including sort (TASK-020)', () => {
    const persistence = new InMemoryFilterPersistence();
    persistence.save('non-fiction', { format: 'hardcover', sort: 'price-high-to-low' });
    expect(persistence.load('non-fiction')).toEqual({ format: 'hardcover', sort: 'price-high-to-low' });
  });

  it('clearAll also clears sort when persisted (DR-017)', () => {
    const persistence = new InMemoryFilterPersistence();
    persistence.save('non-fiction', { format: 'hardcover', sort: 'price-high-to-low' });
    persistence.save('non-fiction', {}); // Simulates clearAll()
    expect(persistence.load('non-fiction')).toEqual({});
  });

  it('keeps fiction and non-fiction filter state independent', () => {
    const persistence = new InMemoryFilterPersistence();
    persistence.save('fiction', { format: 'paperback' });
    persistence.save('non-fiction', { format: 'ebook' });
    expect(persistence.load('fiction')).toEqual({ format: 'paperback' });
    expect(persistence.load('non-fiction')).toEqual({ format: 'ebook' });
  });

  it('returns undefined when nothing was saved for a category', () => {
    const persistence = new InMemoryFilterPersistence();
    expect(persistence.load('non-fiction')).toBeUndefined();
  });

  it('round-trips author filter (ENH-002 T2)', () => {
    const persistence = new InMemoryFilterPersistence();
    persistence.save('non-fiction', { author: 'Ursula' });
    expect(persistence.load('non-fiction')).toEqual({ author: 'Ursula' });
  });

  it('drops empty-string author (ENH-002 T2)', () => {
    const persistence = new InMemoryFilterPersistence();
    persistence.save('non-fiction', { author: '   ' });
    expect(persistence.load('non-fiction')).toEqual({});
  });

  it('drops non-string author (ENH-002 T2)', () => {
    const persistence = new InMemoryFilterPersistence();
    // @ts-expect-error intentional type violation to test runtime sanitization
    persistence.save('non-fiction', { author: 42 });
    expect(persistence.load('non-fiction')).toEqual({});
  });

  it('round-trips q keyword filter (ENH-003 T3)', () => {
    const persistence = new InMemoryFilterPersistence();
    persistence.save('non-fiction', { q: 'dragon' });
    expect(persistence.load('non-fiction')).toEqual({ q: 'dragon' });
  });

  it('drops empty-string q (ENH-003 T3)', () => {
    const persistence = new InMemoryFilterPersistence();
    persistence.save('non-fiction', { q: '' });
    expect(persistence.load('non-fiction')).toEqual({});
  });

  it('trims whitespace from persisted author (ENH-002 T2)', () => {
    const persistence = new InMemoryFilterPersistence();
    persistence.save('non-fiction', { author: '  Le Guin  ' });
    expect(persistence.load('non-fiction')).toEqual({ author: 'Le Guin' });
  });

  it('trims whitespace from persisted q (ENH-003 T3)', () => {
    const persistence = new InMemoryFilterPersistence();
    persistence.save('non-fiction', { q: '  hobbit  ' });
    expect(persistence.load('non-fiction')).toEqual({ q: 'hobbit' });
  });
});

describe('LocalStorageFilterPersistence', () => {
  it('round-trips saved filters through the storage backend', () => {
    const persistence = new LocalStorageFilterPersistence(new FakeStorage());
    persistence.save('non-fiction', { language: 'french', publicationDate: 'last-year' });
    expect(persistence.load('non-fiction')).toEqual({ language: 'french', publicationDate: 'last-year' });
  });

  it('drops a persisted value that is no longer in the current Filter Option Catalog (DR-010)', () => {
    const storage = new FakeStorage();
    storage.setItem('bookstore-app:filters:non-fiction', JSON.stringify({ format: 'hardcover', language: 'klingon' }));
    const persistence = new LocalStorageFilterPersistence(storage);
    expect(persistence.load('non-fiction')).toEqual({ format: 'hardcover' });
  });

  it('drops a persisted sort value that is no longer in the current Sort Option Catalog (DR-010 + TASK-020)', () => {
    const storage = new FakeStorage();
    storage.setItem('bookstore-app:filters:non-fiction', JSON.stringify({ format: 'hardcover', sort: 'invalid-sort' }));
    const persistence = new LocalStorageFilterPersistence(storage);
    expect(persistence.load('non-fiction')).toEqual({ format: 'hardcover' });
  });

  it('returns undefined when the storage backend throws', () => {
    const throwingStorage: StorageLike = {
      getItem: () => {
        throw new Error('storage unavailable');
      },
      setItem: () => {
        throw new Error('storage unavailable');
      },
    };
    const persistence = new LocalStorageFilterPersistence(throwingStorage);
    expect(() => persistence.save('non-fiction', { format: 'hardcover' })).not.toThrow();
    expect(persistence.load('non-fiction')).toBeUndefined();
  });

  it('returns undefined for corrupt (non-JSON) stored content', () => {
    const storage = new FakeStorage();
    storage.setItem('bookstore-app:filters:non-fiction', 'not-json{');
    const persistence = new LocalStorageFilterPersistence(storage);
    expect(persistence.load('non-fiction')).toBeUndefined();
  });
});
