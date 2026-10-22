import * as React from 'react';

/**
 * Round low-alpha tint "well" with a centered Lucide icon — the adornment at
 * the top of bento stat cards and inside nav. Scales up when `hover` is true.
 */
export interface IconChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Lucide icon name (required). */
  icon: string;
  /** Tint color. @default "violet" */
  tone?: 'violet' | 'orange' | 'rose' | 'emerald';
  /** Diameter in px. @default 40 */
  size?: number;
  /** Apply the 110% hover scale (drive from parent card hover). @default false */
  hover?: boolean;
  /** Add a soft colored glow. @default false */
  glow?: boolean;
}

export function IconChip(props: IconChipProps): JSX.Element;
