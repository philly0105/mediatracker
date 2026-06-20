import * as React from 'react';

/**
 * Pill button in the DorfMovies house style. Solid-white primary,
 * translucent glass ghost, a violet-tinted accent, and a bare link.
 *
 * @startingPoint section="Core" subtitle="Pill buttons — primary, ghost, accent, link" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default "primary" */
  variant?: 'primary' | 'ghost' | 'accent' | 'link';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Lucide icon name shown before the label (requires lucide on the page). */
  icon?: string;
  /** Lucide icon name shown after the label; slides right on hover. */
  iconRight?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
