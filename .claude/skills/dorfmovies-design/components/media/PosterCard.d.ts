import * as React from 'react';

/**
 * Portrait 2:3 poster card with a frosted title/year footer. Hover zooms the
 * art, casts a violet glow, and fades up an optional overlay pill.
 *
 * @startingPoint section="Media" subtitle="Poster-art card with title, year, rating" viewport="240x440"
 */
export interface PosterCardProps {
  title: string;
  year?: string | number;
  /** Poster image URL (TMDB-style 2:3 artwork). */
  posterUrl?: string;
  /** Read-only star rating shown in the footer. */
  rating?: number | null;
  /** Pill text revealed over the art on hover (e.g. watched date). */
  overlay?: string;
  /** Fixed width; omit to fill the grid cell. */
  width?: number | string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function PosterCard(props: PosterCardProps): JSX.Element;
