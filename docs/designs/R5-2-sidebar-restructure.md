# R5-2 — Sidebar restructure: search pill, flat More, real nav semantics

Goal: three changes to `components/Sidebar.tsx` + `components/ui/NavItem.tsx`.
(1) Desktop Search stops pretending to be a page — it becomes a search-field-
style trigger pill under the logo. (2) The desktop "More" collapse goes away;
all nine destinations are always visible, split by a divider. (3) `NavItem`
renders real semantics — a `Link` when it has an `href`, a `<button>` when it
is action-only — fixing keyboard access (the current bare `<a>` with no href
has no tab stop) and retiring the deprecated `passHref legacyBehavior`
pattern. Mobile layout is unchanged except two small fixes.

Consult `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`
before writing the NavItem change — per AGENTS.md this Next.js version
differs from your training data (`legacyBehavior` no longer exists).

## 1. `components/ui/NavItem.tsx`

New interface and rendering — the visual style is IDENTICAL to today; only
the element changes:

```tsx
import React, { useState } from 'react'
import Link from 'next/link'

interface NavItemProps {
  icon: React.ComponentType<any>
  label: string
  active?: boolean
  onClick?: () => void
  href?: string
}

export function NavItem({ icon: Icon, label, active = false, onClick, href }: NavItemProps) {
  const [hover, setHover] = useState(false)

  const style: React.CSSProperties = {
    // ...the exact style object that exists today, unchanged, plus:
    width: '100%',
    textAlign: 'left' as const,
  }

  const content = (
    <>
      <Icon style={{ /* the exact icon style object that exists today */ }} />
      <span>{label}</span>
    </>
  )

  const shared = {
    onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style,
  }

  // A nav entry that goes somewhere is a link; one that only does something
  // is a button. Both are focusable, unlike the old bare <a>.
  return href
    ? <Link href={href} {...shared}>{content}</Link>
    : <button type="button" {...shared}>{content}</button>
}
```

Keep the existing style/icon-style objects byte-for-byte (colors, hover
scale, transitions); only `width` and `textAlign` are added so the button
variant fills the sidebar like the anchor did. `fontFamily`/`fontSize` are
already in the style object, so the button won't inherit UA font styles.

## 2. `components/Sidebar.tsx` — desktop

### 2a. Search trigger pill

- Remove the Search entry's special-casing from the desktop nav loop
  entirely (the `item.action === 'search-overlay'` branch there goes away —
  desktop filters it out, see 2b).
- Between the brand logo div and the `<nav>`, insert:

```tsx
{/* Search is an action, not a destination — a field-shaped trigger reads
    as "summons the palette" and teaches the shortcut. */}
<button
  type="button"
  onClick={openSearchOverlay}
  className="w-full h-9 mb-6 px-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-white/[0.03] transition-colors text-left"
>
  <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
  <span className="flex-1 text-sm text-zinc-500 truncate">Search…</span>
  <kbd className="inline-flex items-center text-[10px] font-semibold text-zinc-500 border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
</button>
```

### 2b. Flat nav, no More

- Desktop nav renders `PRIMARY_NAV.filter((item) => !item.action)` — the
  data array keeps Search at index 1 because the mobile bottom bar still
  takes `slice(0, 4)`.
- Every desktop entry becomes `NavItem` with `href` (no `Link` wrapper, no
  `passHref legacyBehavior`):

```tsx
<NavItem
  key={item.href}
  href={item.href}
  icon={item.icon}
  label={item.name}
  active={isNavActive(pathname, item.href)}
/>
```

- After the primary items, a plain divider, then `MORE_NAV` items rendered
  identically (same `NavItem href` form):

```tsx
<div aria-hidden style={{ borderTop: '1px solid var(--border-subtle)', margin: '12px 12px' }} />
```

- DELETE: the desktop More toggle `NavItem`, the `AnimatePresence`/
  `motion.div` collapse block around `MORE_NAV`, the `desktopMoreOpen`
  state, the `moreActive` const, and the `useEffect` that synced them.
  `AnimatePresence`/`motion` imports STAY (the mobile drawer uses them);
  `MoreHorizontal` import stays (mobile More button uses it).

### 2c. Footer: one row for account + settings

Replace the current footer (Settings `NavItem` + separate account card)
with a single Settings destination:

- When `userEmail` is present:

```tsx
<Link
  href="/settings"
  className="flex items-center gap-3 rounded-[var(--radius-md)] transition-colors"
  style={{
    padding: '10px 12px',
    background: pathname === '/settings' ? 'rgba(255,255,255,0.05)' : 'transparent',
    border: `1px solid ${pathname === '/settings' ? 'var(--border-default)' : 'var(--border-faint)'}`,
  }}
>
  <img
    src={'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(userEmail)}
    alt=""
    style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--zinc-800)', border: '1px solid var(--border-subtle)' }}
  />
  <p
    className="flex-1"
    style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}
  >
    {userEmail.split('@')[0]}
  </p>
  <Settings className="w-4 h-4 flex-shrink-0" style={{ color: pathname === '/settings' ? 'var(--accent)' : 'var(--text-muted)' }} />
</Link>
```

- When `userEmail` is absent: keep a plain
  `<NavItem href="/settings" icon={Settings} label="Settings" active={pathname === '/settings'} />`.
- The full-email line is dropped (the prefix identifies the account; the
  gear signals where the row goes).

## 3. `components/Sidebar.tsx` — mobile fixes

- Top bar: the avatar circle becomes a `Link href="/settings"` with the
  same classes/styles on the circle div moved onto the Link (it currently
  looks tappable and does nothing). Content (img / `User` icon) unchanged.
- More drawer: DELETE the `item.action === 'search-overlay'` branch inside
  `moreDrawerItems.map` — Search is always in the bottom bar's first four,
  never in the drawer; the branch is dead code. Drawer composition
  (`PRIMARY_NAV.slice(4)` + `MORE_NAV` + Settings) is unchanged.
- Bottom bar: unchanged (its search-action button branch stays).

## 4. Tests — `components/__tests__/NavItem.test.tsx`

- The existing "applies active styles" test: pass `href="/dashboard"` and
  keep asserting via `closest('a')`.
- The existing onClick test (no href) now exercises the button variant —
  assertion unchanged.
- Mock `next/link` at the top of the file if rendering `Link` outside a
  router errors; prefer no mock if it renders fine.
- ADD: with `href="/stats"` the rendered element is an `<a>` with
  `href="/stats"`; without `href` it is a `<button>` (e.g.
  `getByRole('button')`).

## 5. Out of scope

Do not touch `SearchOverlay`, `KeyboardShortcuts`, `DashboardSearchBar`,
any page under `app/`, or anything under `docs/`.
