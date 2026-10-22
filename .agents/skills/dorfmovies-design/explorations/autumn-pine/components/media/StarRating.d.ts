import * as React from 'react';

/**
 * Five-star rating with half-star support — gray ★ track, amber fill clipped
 * by width. Interactive (hover + click in 0.5 steps) unless `readOnly`.
 */
export interface StarRatingProps {
  /** Current rating 0–5 (0.5 steps), or null for unrated. */
  value?: number | null;
  /** Called with the new rating on click. */
  onChange?: (rating: number) => void;
  /** Display only — no hover/click. @default false */
  readOnly?: boolean;
  /** Star size in px. @default 24 */
  size?: number;
  /** Show the "n/5" text after the stars. @default true */
  showValue?: boolean;
  style?: React.CSSProperties;
}

export function StarRating(props: StarRatingProps): JSX.Element;
