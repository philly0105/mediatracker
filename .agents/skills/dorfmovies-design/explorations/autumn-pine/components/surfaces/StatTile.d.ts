import * as React from 'react';

/**
 * Bento dashboard stat: accent icon chip + tag up top, a giant gradient
 * numeral, and a caption below. Drop inside a SpotlightCard.
 *
 * @startingPoint section="Surfaces" subtitle="Giant-numeral bento stat tile" viewport="360x240"
 */
export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The big number/value. */
  value: React.ReactNode;
  /** Caption under the number (falls back from `caption`). */
  label?: string;
  /** Lucide icon for the chip. */
  icon: string;
  /** Accent (drives chip + numeral gradient). @default "violet" */
  tone?: 'violet' | 'orange' | 'rose' | 'white';
  /** Small uppercase tag in the top-right (e.g. "PRIORITY", "YEAR 2026"). */
  tag?: string;
  /** Caption text (overrides `label`). */
  caption?: string;
  /** Optional Lucide icon before the caption. */
  captionIcon?: string;
  /** Forward parent hover to scale the icon chip. @default false */
  hover?: boolean;
}

export function StatTile(props: StatTileProps): JSX.Element;
