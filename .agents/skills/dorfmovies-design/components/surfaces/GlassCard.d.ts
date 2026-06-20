import * as React from 'react';

/**
 * The workhorse glassmorphic surface: translucent fill + backdrop blur +
 * hairline border, lifting with a colored glow on hover.
 *
 * @startingPoint section="Surfaces" subtitle="Glassmorphic card that lifts and glows on hover" viewport="700x180"
 */
export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Hover glow color. @default "violet" */
  glow?: 'violet' | 'rose' | 'orange' | 'none';
  /** Enable the lift/brighten/glow hover behavior. @default true */
  interactive?: boolean;
  /** CSS padding value. @default "var(--space-6)" */
  padding?: string;
  children?: React.ReactNode;
}

export function GlassCard(props: GlassCardProps): JSX.Element;
