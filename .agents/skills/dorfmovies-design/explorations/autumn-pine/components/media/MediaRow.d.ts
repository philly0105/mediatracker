import * as React from 'react';

/**
 * Horizontal watch-entry card: poster thumb + title, type/year meta, star
 * rating, and an optional review snippet. The list-view counterpart to
 * PosterCard.
 *
 * @startingPoint section="Media" subtitle="Watch-entry row with poster, rating, review" viewport="520x140"
 */
export interface MediaRowProps {
  title: string;
  year?: string | number;
  /** @default "movie" */
  type?: 'movie' | 'show';
  posterUrl?: string;
  /** User rating shown as stars. */
  rating?: number | null;
  /** If provided, stars become interactive and call this on change. */
  onRate?: (rating: number) => void;
  /** Review snippet (clamped to 2 lines, italic). */
  review?: string;
  /** Watched date string shown with a calendar icon. */
  watchedAt?: string;
  /** TMDB community score shown as an amber star chip. */
  tmdbRating?: number | string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function MediaRow(props: MediaRowProps): JSX.Element;
