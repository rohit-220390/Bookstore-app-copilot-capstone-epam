import { resolveDateCutoff, isWithinPublicationWindow } from '../../src/search/date-filter.js';

const NOW = new Date('2026-06-15T00:00:00.000Z');

describe('resolveDateCutoff', () => {
  it('computes the correct cutoff for last-30-days relative to referenceTime', () => {
    const cutoff = resolveDateCutoff('last-30-days', NOW);
    expect(cutoff.toISOString()).toBe('2026-05-16T00:00:00.000Z');
  });

  it('computes the correct cutoff for last-6-months relative to referenceTime', () => {
    const cutoff = resolveDateCutoff('last-6-months', NOW);
    expect(cutoff.toISOString()).toBe('2025-12-15T00:00:00.000Z');
  });

  it('computes the correct cutoff for last-year relative to referenceTime', () => {
    const cutoff = resolveDateCutoff('last-year', NOW);
    expect(cutoff.toISOString()).toBe('2025-06-15T00:00:00.000Z');
  });
});

describe('isWithinPublicationWindow', () => {
  it('includes a book published within the window', () => {
    expect(isWithinPublicationWindow('2026-06-01T00:00:00.000Z', 'last-30-days', NOW)).toBe(true);
  });

  it('excludes a book published before the window', () => {
    expect(isWithinPublicationWindow('2026-01-01T00:00:00.000Z', 'last-30-days', NOW)).toBe(false);
  });

  it('treats the exact cutoff boundary as inclusive', () => {
    const cutoff = resolveDateCutoff('last-30-days', NOW).toISOString();
    expect(isWithinPublicationWindow(cutoff, 'last-30-days', NOW)).toBe(true);
  });
});
