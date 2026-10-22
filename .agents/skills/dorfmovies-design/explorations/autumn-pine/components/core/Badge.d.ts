import * as React from 'react';

/**
 * Tiny uppercase, wide-tracked label on a low-alpha accent tint —
 * the DorfMovies status/category chip (WATCHED, LIVE NOW, TV, PRIORITY).
 *
 * @startingPoint section="Core" subtitle="Status & category badges with accent tones" viewport="700x150"
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Accent tone. @default "neutral" */
  tone?: 'violet' | 'orange' | 'rose' | 'emerald' | 'amber' | 'neutral';
  /** Lucide icon name rendered before the label. */
  icon?: string;
  /** Show a pulsing status dot (used for "LIVE NOW"). @default false */
  dot?: boolean;
  children?: React.ReactNode;
}

export function Badge(props: BadgeProps): JSX.Element;
