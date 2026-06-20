import * as React from 'react';

/**
 * Sidebar navigation row: Lucide icon + label. The active row fills with a
 * glass pill and tints its icon violet; hover brightens text and scales the
 * icon.
 */
export interface NavItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Lucide icon name. */
  icon: string;
  /** Row label. */
  label: string;
  /** Active/selected state. @default false */
  active?: boolean;
}

export function NavItem(props: NavItemProps): JSX.Element;
