import * as React from 'react';

/**
 * Large-radius glass card with a cursor-following radial spotlight that fades
 * in on hover — the dashboard bento stat-tile container.
 */
export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Color of the radial spotlight. @default "rgba(255,255,255,0.08)" */
  spotlightColor?: string;
  /** CSS padding value (often 0 so a Link can fill the card). @default 0 */
  padding?: number | string;
  children?: React.ReactNode;
}

export function SpotlightCard(props: SpotlightCardProps): JSX.Element;
