import type { PublicationDateWindow } from '../catalog/filter-catalog.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const WINDOW_MS: Record<PublicationDateWindow, number> = {
  'last-30-days': 30 * DAY_MS,
  'last-6-months': 182 * DAY_MS,
  'last-year': 365 * DAY_MS,
};

/** Computes the inclusive cutoff date for a publication-date window, relative to referenceTime (defaults to now — never precomputed/cached, per docs/design-review.md DR-003). */
export function resolveDateCutoff(window: PublicationDateWindow, referenceTime: Date = new Date()): Date {
  return new Date(referenceTime.getTime() - WINDOW_MS[window]);
}

/** Returns true if publicationDate falls within the window (inclusive of the cutoff), relative to referenceTime. */
export function isWithinPublicationWindow(
  publicationDate: string,
  window: PublicationDateWindow,
  referenceTime: Date = new Date(),
): boolean {
  const cutoff = resolveDateCutoff(window, referenceTime);
  return new Date(publicationDate).getTime() >= cutoff.getTime();
}
