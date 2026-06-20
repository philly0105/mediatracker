import * as React from 'react';

/**
 * Glass pill with a wide-tracked uppercase label and optional accent icon —
 * the "WELCOME BACK" eyebrow that sits above page heroes.
 */
export interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Label/icon color. @default "violet" */
  tone?: 'violet' | 'orange' | 'rose' | 'neutral';
  /** Lucide icon name shown before the label. */
  icon?: string;
  children?: React.ReactNode;
}

export function Eyebrow(props: EyebrowProps): JSX.Element;
