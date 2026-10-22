import * as React from 'react';

/**
 * Pill text input on a translucent fill; border brightens to 30% white on
 * focus. `multiline` switches to a rounded-2xl textarea (the review field).
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  /** Leading Lucide icon name (single-line only). */
  icon?: string;
  /** Render a textarea instead of an input. @default false */
  multiline?: boolean;
  /** Textarea row count. @default 4 */
  rows?: number;
  style?: React.CSSProperties;
}

export function Input(props: InputProps): JSX.Element;
