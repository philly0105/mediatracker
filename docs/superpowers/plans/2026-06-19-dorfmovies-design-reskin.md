# DorfMovies Autumn Pine Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the mediatracker application to completely conform to the DorfMovies Autumn Pine design system.

**Architecture:** We will integrate the design system's CSS variables, port core UI primitives (Button, Badge, Eyebrow, IconChip, Input, NavItem, PosterCard, MediaRow, StatTile, Card) as TypeScript React components under `components/ui/`, and then migrate all application pages and layout structures to consume these primitives.

**Tech Stack:** Next.js, React, Tailwind CSS v4, Framer Motion, Vitest, Testing Library

## Global Constraints
* Maintain existing functional logic, database sync queries, and dynamic routing pathways unchanged.
* Use `Lucide` icons only; do not introduce emojis in the UI.
* Do not introduce any `@theme` color-scale overrides in Tailwind; write utility classes or direct var expressions (e.g. `bg-[var(--bg-base)]`) so that styles can be visually traced.
* Ensure all corner radii strictly match the design system scale: buttons/inputs/chips (sm: 4px), navigation/rows (md: 6px), standard cards (lg: 8px), posters (xl: 10px), modals (2xl: 12px), badges/eyebrows (pill: 9999px).

---

## Task 1: CSS Integration & Global Styles Setup

**Files:**
- Modify: `app/globals.css:1-6`
- Modify: `app/layout.tsx:25-52`

**Interfaces:**
- Consumes: None
- Produces: CSS variables loaded into the page context.

- [ ] **Step 1: Reference Design System Stylesheet in globals.css**
  Modify [app/globals.css](file:///C:/Users/aideo/Projects/mediatracker/app/globals.css) to import the design system stylesheet at the very beginning of the file.
  ```css
  @import "../.agents/skills/dorfmovies-design/styles.css";
  @import "tailwindcss";
  ```

- [ ] **Step 2: Update layout.tsx with theme background and recolored orbs**
  Modify [app/layout.tsx](file:///C:/Users/aideo/Projects/mediatracker/app/layout.tsx):
  * Replace the body tag class with `bg-[var(--surface-page)] text-zinc-100 min-h-screen relative antialiased bg-[var(--page-radial)] bg-fixed`
  * Recolor the absolute-positioned ambient glow orbs to use the design system CSS variables:
    * First orb (top-left): `style={{ background: 'var(--orb-violet)' }}`
    * Second orb (bottom-right): `style={{ background: 'var(--orb-rose)' }}`
    * Third orb (center): `style={{ background: 'var(--orb-orange)' }}`

- [ ] **Step 3: Verify dev server boots clean**
  Run: `npx vitest run`
  Expected: PASS

- [ ] **Step 4: Commit Task 1**
  ```bash
  git add app/globals.css app/layout.tsx
  git commit -m "style: import design system CSS variables and recolor ambient layout orbs"
  ```

---

## Task 2: Port Core Primitives (Button, Badge, Eyebrow, IconChip, Input, Card, StatTile)

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Eyebrow.tsx`
- Create: `components/ui/IconChip.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/StatTile.tsx`

**Interfaces:**
- Consumes: CSS variables for design system typography and colors.
- Produces: Standard TypeScript React primitives in `components/ui/` for buttons, labels, tiles, and input elements.

- [ ] **Step 1: Port and convert Button to TypeScript**
  Create [components/ui/Button.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/ui/Button.tsx):
  ```typescript
  import React, { useState } from 'react'

  interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'accent' | 'link'
    size?: 'sm' | 'md' | 'lg'
    icon?: string
    iconRight?: string
    fullWidth?: boolean
  }

  export function Button({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    disabled = false,
    fullWidth = false,
    onClick,
    style,
    ...rest
  }: ButtonProps) {
    const [hover, setHover] = useState(false)

    const pads = {
      sm: { padding: '7px 14px', fontSize: 'var(--text-sm)' },
      md: { padding: '10px 20px', fontSize: 'var(--text-base)' },
      lg: { padding: '12px 26px', fontSize: 'var(--text-md)' },
    }[size]

    const variants = {
      primary: {
        background: hover && !disabled ? 'var(--btn-primary-bg-hover)' : 'var(--btn-primary-bg)',
        color: 'var(--btn-primary-fg)',
        border: '1px solid transparent',
      },
      ghost: {
        background: hover && !disabled ? 'var(--btn-ghost-bg-hover)' : 'var(--btn-ghost-bg)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(var(--blur-md))',
      },
      accent: {
        background: hover && !disabled ? 'var(--violet-tint-border)' : 'var(--violet-tint-bg)',
        color: 'var(--violet-300)',
        border: '1px solid var(--violet-tint-border)',
      },
      link: {
        background: hover ? 'var(--btn-ghost-bg)' : 'transparent',
        color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: '1px solid transparent',
      },
    }[variant]

    return (
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        disabled={disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: fullWidth ? '100%' : 'auto',
          fontFamily: 'var(--font-sans)',
          fontWeight: 'var(--weight-semibold)' as any,
          borderRadius: 'var(--radius-sm)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-out-expo)',
          whiteSpace: 'nowrap',
          ...pads,
          ...variants,
          ...style,
        }}
        {...rest}
      >
        {children}
      </button>
    )
  }
  ```

- [ ] **Step 2: Port and convert Badge to TypeScript**
  Create [components/ui/Badge.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/ui/Badge.tsx):
  ```typescript
  import React from 'react'

  interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    tone?: 'brand' | 'accent' | 'neutral' | 'live' | 'rating' | 'success'
  }

  export function Badge({ children, tone = 'neutral', style, ...rest }: BadgeProps) {
    const theme = {
      brand: { background: 'var(--green-tint-bg)', color: 'var(--green-300)', border: '1px solid var(--green-tint-border)' },
      accent: { background: 'var(--green-tint-bg)', color: 'var(--green-300)', border: '1px solid var(--green-tint-border)' },
      neutral: { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
      live: { background: 'var(--rust-tint-bg)', color: 'var(--rust-300)', border: '1px solid var(--rust-tint-border)' },
      rating: { background: 'var(--amber-tint-bg)', color: 'var(--amber-300)', border: '1px solid var(--amber-tint-border)' },
      success: { background: 'var(--teal-tint-bg)', color: 'var(--teal-300)', border: '1px solid var(--teal-tint-border)' },
    }[tone]

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--text-2xs)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 'var(--weight-bold)' as any,
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-widest)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-pill)',
          whiteSpace: 'nowrap',
          ...theme,
          ...style,
        }}
        {...rest}
      >
        {children}
      </span>
    )
  }
  ```

- [ ] **Step 3: Port and convert Eyebrow to TypeScript**
  Create [components/ui/Eyebrow.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/ui/Eyebrow.tsx):
  ```typescript
  import React from 'react'

  interface EyebrowProps extends React.HTMLAttributes<HTMLParagraphElement> {
    children: React.ReactNode
  }

  export function Eyebrow({ children, style, ...rest }: EyebrowProps) {
    return (
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--eyebrow-size)',
          fontWeight: 'var(--eyebrow-weight)' as any,
          letterSpacing: 'var(--eyebrow-tracking)',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          ...style,
        }}
        {...rest}
      >
        {children}
      </p>
    )
  }
  ```

- [ ] **Step 4: Port and convert IconChip to TypeScript**
  Create [components/ui/IconChip.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/ui/IconChip.tsx):
  ```typescript
  import React from 'react'

  interface IconChipProps extends React.HTMLAttributes<HTMLDivElement> {
    icon: React.ReactNode
    tone?: 'brand' | 'live' | 'rating' | 'success' | 'neutral'
  }

  export function IconChip({ icon, tone = 'neutral', style, ...rest }: IconChipProps) {
    const theme = {
      brand: { background: 'var(--green-tint-bg)', color: 'var(--green-300)', border: '1px solid var(--green-tint-border)' },
      live: { background: 'var(--rust-tint-bg)', color: 'var(--rust-300)', border: '1px solid var(--rust-tint-border)' },
      rating: { background: 'var(--amber-tint-bg)', color: 'var(--amber-300)', border: '1px solid var(--amber-tint-border)' },
      success: { background: 'var(--teal-tint-bg)', color: 'var(--teal-300)', border: '1px solid var(--teal-tint-border)' },
      neutral: { background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
    }[tone]

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-sm)',
          flexShrink: 0,
          ...theme,
          ...style,
        }}
        {...rest}
      >
        {icon}
      </div>
    )
  }
  ```

- [ ] **Step 5: Port and convert Input to TypeScript**
  Create [components/ui/Input.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/ui/Input.tsx):
  ```typescript
  import React, { useState } from 'react'

  interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
    icon?: React.ReactNode
    multiline?: boolean
    rows?: number
  }

  export function Input({
    icon,
    multiline = false,
    rows = 4,
    value,
    onChange,
    placeholder,
    type = 'text',
    style,
    ...rest
  }: InputProps) {
    const [focus, setFocus] = useState(false)

    const base = {
      width: '100%',
      boxSizing: 'border-box' as any,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-primary)',
      background: 'var(--surface-input)',
      border: `1px solid ${focus ? 'var(--border-focus)' : 'var(--border-default)'}`,
      outline: 'none',
      transition: 'border-color var(--dur-fast) var(--ease-standard)',
      backdropFilter: 'blur(var(--blur-md))',
    }

    if (multiline) {
      return (
        <textarea
          rows={rows}
          value={value}
          onChange={onChange as any}
          placeholder={placeholder}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{ ...base, resize: 'none' as any, borderRadius: 'var(--radius-lg)', padding: '12px 18px', ...style }}
          {...rest}
        />
      )
    }

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        {icon && (
          <div style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange as any}
          placeholder={placeholder}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{ ...base, borderRadius: 'var(--radius-sm)', padding: icon ? '11px 16px 11px 42px' : '11px 16px', ...style }}
          {...rest}
        />
      </div>
    )
  }
  ```

- [ ] **Step 6: Port and convert Card to TypeScript**
  Create [components/ui/Card.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/ui/Card.tsx) (derived from `GlassCard.jsx`):
  ```typescript
  import React, { useState } from 'react'

  interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    onClick?: () => void
  }

  export function Card({ children, onClick, style, ...rest }: CardProps) {
    const [hover, setHover] = useState(false)

    return (
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={onClick}
        style={{
          padding: 'var(--space-7)',
          borderRadius: 'var(--radius-lg)',
          background: hover && onClick ? 'var(--glass-card-hover)' : 'var(--glass-card)',
          border: `1px solid ${hover && onClick ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
          boxShadow: hover && onClick ? 'var(--glow-violet), var(--inset-hairline)' : 'none',
          transform: hover && onClick ? 'translateY(-2px)' : 'none',
          transition: 'all var(--dur-base) var(--ease-out-expo)',
          cursor: onClick ? 'pointer' : 'default',
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    )
  }
  ```

- [ ] **Step 7: Port and convert StatTile to TypeScript**
  Create [components/ui/StatTile.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/ui/StatTile.tsx):
  ```typescript
  import React from 'react'

  interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
    label: string
    value: string | number
    icon?: React.ReactNode
  }

  export function StatTile({ label, value, icon, style, ...rest }: StatTileProps) {
    return (
      <div
        style={{
          padding: '18px 20px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--glass-card)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          ...style,
        }}
        {...rest}
      >
        <div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-widest)', fontWeight: 'var(--weight-bold)' as any }}>
            {label}
          </span>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-extrabold)' as any, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-tight)' }}>
            {value}
          </p>
        </div>
        {icon && (
          <div style={{ color: 'var(--text-muted)', opacity: 0.8 }}>
            {icon}
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 8: Build and commit core primitives**
  Run: `npx vitest run`
  Expected: PASS
  ```bash
  git add components/ui/Button.tsx components/ui/Badge.tsx components/ui/Eyebrow.tsx components/ui/IconChip.tsx components/ui/Input.tsx components/ui/Card.tsx components/ui/StatTile.tsx
  git commit -m "feat: port core design system primitives to typescript"
  ```

---

## Task 3: Port Navigation & Layout (NavItem, Sidebar)

**Files:**
- Create: `components/ui/NavItem.tsx`
- Modify: `components/Sidebar.tsx`

**Interfaces:**
- Consumes: None
- Produces: Sidebar sidebar component and NavItem sub-component.

- [ ] **Step 1: Port NavItem to components/ui/NavItem.tsx**
  Create [components/ui/NavItem.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/ui/NavItem.tsx):
  ```typescript
  import React, { useState } from 'react'

  interface NavItemProps {
    icon: React.ComponentType<any>
    label: string
    active?: boolean
    onClick?: () => void
  }

  export function NavItem({ icon: Icon, label, active = false, onClick }: NavItemProps) {
    const [hover, setHover] = useState(false)

    return (
      <a
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: '11px 16px',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-base)',
          fontWeight: active ? 'var(--weight-semibold)' as any : 'var(--weight-medium)' as any,
          color: active ? 'var(--text-primary)' : (hover ? 'var(--zinc-300)' : 'var(--text-secondary)'),
          background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
          border: `1px solid ${active ? 'var(--border-default)' : 'transparent'}`,
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'color var(--dur-base) var(--ease-standard), background var(--dur-base) var(--ease-standard)',
        }}
      >
        <Icon
          style={{
            width: 16, height: 16, flexShrink: 0,
            color: active ? 'var(--accent)' : (hover ? 'var(--zinc-300)' : 'var(--text-muted)'),
            transform: hover ? 'scale(1.1)' : 'none',
            transition: 'transform var(--dur-base) var(--ease-out-expo)',
          }}
        />
        <span>{label}</span>
      </a>
    )
  }
  ```

- [ ] **Step 2: Redesign Sidebar.tsx**
  Refactor [components/Sidebar.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/Sidebar.tsx) to:
  * Remove hardcoded desktop bg `#09090B` and borders; style with `background: 'var(--bg-base)'` and `borderRight: '1px solid var(--border-subtle)'`.
  * Replace the navigation item maps to wrap the ported `NavItem` primitive.
  * Update the DorfMovies logotype styles to use `var(--text-primary)` (warm cream) for "Dorf" and `var(--brand-mark)` (pine green) for "Movies".
  * Refactor mobile top bar, mobile bottom navigation bar, and slide drawer to match the styling values of the design system.

- [ ] **Step 3: Verify build**
  Run: `npx vitest run`
  Expected: PASS

- [ ] **Step 4: Commit Sidebar updates**
  ```bash
  git add components/ui/NavItem.tsx components/Sidebar.tsx
  git commit -m "feat: update sidebar navigation layout and NavItem using design system tokens"
  ```

---

## Task 4: Port Surfaces & Media Components (PosterCard, MediaRow, SpotlightCard, RatingStars)

**Files:**
- Create: `components/ui/PosterCard.tsx`
- Create: `components/ui/MediaRow.tsx`
- Modify: `components/ui/SpotlightCard.tsx`
- Modify: `components/RatingStars.tsx`
- Modify: `components/__tests__/RatingStars.test.tsx`

**Interfaces:**
- Consumes: `StarRating` implementation, `Badge` core primitive.
- Produces: Re-designed horizontal and vertical media list item components.

- [ ] **Step 1: Port PosterCard to components/ui/PosterCard.tsx**
  Create [components/ui/PosterCard.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/ui/PosterCard.tsx):
  ```typescript
  import React, { useState } from 'react'
  import RatingStars from '@/components/RatingStars'

  interface PosterCardProps {
    title: string
    year?: string | number
    posterUrl?: string | null
    rating?: number | null
    overlay?: string
    onClick?: () => void
  }

  export function PosterCard({
    title,
    year,
    posterUrl,
    rating = null,
    overlay,
    onClick,
  }: PosterCardProps) {
    const [hover, setHover] = useState(false)
    const [imgErr, setImgErr] = useState(false)
    const hasImg = posterUrl && !imgErr

    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          width: '100%',
          textAlign: 'left',
          padding: 0,
          border: `1px solid ${hover ? 'var(--border-default)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: 'var(--bg-void)',
          cursor: 'pointer',
          boxShadow: hover ? 'var(--glow-violet), var(--shadow-md)' : 'var(--shadow-poster)',
          transform: hover ? 'var(--lift-poster)' : 'none',
          transition: 'all var(--dur-slow) var(--ease-out-expo)',
        }}
      >
        <div style={{ position: 'relative', aspectRatio: '2 / 3', overflow: 'hidden', background: 'var(--zinc-900)' }}>
          {hasImg ? (
            <img
              src={posterUrl}
              alt={title}
              onError={() => setImgErr(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transform: hover ? 'scale(1.10) rotate(1deg)' : 'none',
                transition: 'transform var(--dur-slower) var(--ease-out-expo)',
              }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' as any,
              textAlign: 'center', padding: '16px',
              background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
            }}>{title}</div>
          )}
          {overlay && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '14px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.1) 60%, transparent)',
              opacity: hover ? 1 : 0, transition: 'opacity var(--dur-slow) var(--ease-standard)',
            }}>
              <span style={{
                fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-bold)' as any, color: 'var(--white)',
                background: 'var(--glass-chip)', backdropFilter: 'blur(var(--blur-md))',
                padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
              }}>{overlay}</span>
            </div>
          )}
        </div>
        <div style={{
          padding: '14px', borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-raised)',
        }}>
          <p style={{
            margin: 0, fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)' as any,
            color: hover ? 'var(--accent)' : 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            transition: 'color var(--dur-base) var(--ease-standard)',
          }}>{title}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 'var(--weight-medium)' as any }}>{year}</span>
            {rating != null && <RatingStars value={rating} readOnly />}
          </div>
        </div>
      </button>
    )
  }
  ```

- [ ] **Step 2: Port MediaRow to components/ui/MediaRow.tsx**
  Create [components/ui/MediaRow.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/ui/MediaRow.tsx):
  ```typescript
  import React, { useState } from 'react'
  import RatingStars from '@/components/RatingStars'
  import { Badge } from './Badge'

  interface MediaRowProps {
    title: string
    year?: string | number
    type?: 'movie' | 'show'
    posterUrl?: string | null
    rating?: number | null
    onRate?: (rating: number) => void
    review?: string | null
    watchedAt?: string | null
    tmdbRating?: number | null
    onClick?: () => void
    actions?: React.ReactNode
  }

  export function MediaRow({
    title,
    year,
    type = 'movie',
    posterUrl,
    rating = null,
    onRate,
    review,
    watchedAt,
    tmdbRating,
    onClick,
    actions,
  }: MediaRowProps) {
    const [hover, setHover] = useState(false)
    const [imgErr, setImgErr] = useState(false)
    const hasImg = posterUrl && !imgErr

    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          padding: '14px',
          borderRadius: 'var(--radius-lg)',
          background: hover ? 'var(--glass-card-hover)' : 'var(--glass-card)',
          border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
          backdropFilter: 'blur(var(--blur-md))',
          boxShadow: hover ? 'var(--glow-violet), var(--inset-hairline)' : 'none',
          transform: hover ? 'translateY(-2px) scale(1.01)' : 'none',
          transition: 'all var(--dur-base) var(--ease-out-expo)',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        {hasImg ? (
          <img src={posterUrl!} alt={title} onError={() => setImgErr(true)} style={{
            width: 64, height: 96, borderRadius: 'var(--radius-md)', objectFit: 'cover',
            boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)', flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: 64, height: 96, borderRadius: 'var(--radius-md)', flexShrink: 0,
            border: '1px solid var(--border-subtle)',
            background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{type === 'show' ? 'TV' : 'Movie'}</span>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '8px' }}>
              <p style={{
                margin: 0, fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)' as any, color: 'var(--text-primary)',
                lineHeight: 'var(--leading-snug)', overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>{title}</p>
              {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <Badge tone="neutral">{type === 'show' ? 'TV' : 'Movie'}</Badge>
              {year && <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{year}</span>}
              {tmdbRating != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)' as any, color: 'var(--amber-400)' }}>
                  ★ {tmdbRating.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ transform: 'scale(0.9)', transformOrigin: 'left' }}>
              <RatingStars value={rating} onChange={onRate} readOnly={!onRate} />
            </div>
            {review && (
              <p style={{
                margin: 0, fontSize: 'var(--text-xs)', fontStyle: 'italic', color: 'var(--text-secondary)',
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-faint)', padding: '6px 8px',
                borderRadius: 'var(--radius-sm)', lineHeight: 'var(--leading-relaxed)',
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>{review}</p>
            )}
            {watchedAt && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}>
                📅 Watched {watchedAt}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Update RatingStars.tsx to match design system tokens**
  Modify [components/RatingStars.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/RatingStars.tsx):
  * Replace the track color from `text-gray-600` to `color: 'var(--zinc-700)'` in inline styles.
  * Replace the rating color from `text-yellow-400` to `color: 'var(--amber-400)'`.
  * Ensure the test selectors `[data-half]` are preserved exactly to keep unit tests passing.

- [ ] **Step 4: Update test assertions in RatingStars.test.tsx**
  Modify [components/__tests__/RatingStars.test.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/__tests__/RatingStars.test.tsx):
  * Change line 27 check from `container.querySelectorAll('.text-yellow-400')` to verify element styling or presence using inline styles, or assert they have color matching `var(--amber-400)`.
  ```typescript
  it('renders filled stars for current value', () => {
    const { container } = render(<RatingStars value={3.5} onChange={vi.fn()} />)
    const stars = container.querySelectorAll('span')
    const filledStars = Array.from(stars).filter(s => s.style.color === 'var(--amber-400)')
    expect(filledStars.length).toBeGreaterThan(0)
  })
  ```

- [ ] **Step 5: Update SpotlightCard.tsx**
  Refactor [components/ui/SpotlightCard.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/ui/SpotlightCard.tsx) to consume design system border variables and background variables (e.g. replacing `#18181B` with `var(--glass-card)`).

- [ ] **Step 6: Verify and commit surfaces and media components**
  Run: `npx vitest run`
  Expected: PASS
  ```bash
  git add components/ui/PosterCard.tsx components/ui/MediaRow.tsx components/RatingStars.tsx components/__tests__/RatingStars.test.tsx components/ui/SpotlightCard.tsx
  git commit -m "feat: port PosterCard and MediaRow components and update RatingStars styles"
  ```

---

## Task 5: App Core Components Integration (MediaCard & CollectionMovieCard)

**Files:**
- Modify: `components/MediaCard.tsx`
- Modify: `components/CollectionMovieCard.tsx`

**Interfaces:**
- Consumes: `PosterCard` and `MediaRow` primitives.
- Produces: Integrated dashboard widgets and collection layouts.

- [ ] **Step 1: Rewrite MediaCard.tsx using MediaRow primitive**
  Modify [components/MediaCard.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/MediaCard.tsx) to compose directly from `MediaRow` (porting over its edit and delete buttons inside the `actions` parameter).

- [ ] **Step 2: Rewrite CollectionMovieCard.tsx using PosterCard primitive**
  Modify [components/CollectionMovieCard.tsx](file:///C:/Users/aideo/Projects/mediatracker/components/CollectionMovieCard.tsx) to compose from `PosterCard` and render watched/watchlisted statuses using badge pills instead of floating icon vectors.

- [ ] **Step 3: Verify build**
  Run: `npx vitest run`
  Expected: PASS

- [ ] **Step 4: Commit integration components**
  ```bash
  git add components/MediaCard.tsx components/CollectionMovieCard.tsx
  git commit -m "refactor: integrate MediaCard and CollectionMovieCard to use design system primitives"
  ```

---

## Task 6: Page-by-Page Migration & Form Refactoring

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/search/page.tsx`
- Modify: `app/movies/page.tsx`
- Modify: `app/shows/page.tsx`
- Modify: `app/watchlist/page.tsx`
- Modify: `app/collections/page.tsx`
- Modify: `app/lists/page.tsx`
- Modify: `components/EditEntryModal.tsx`
- Modify: `components/MediaInfoModal.tsx`
- Modify: `components/DashboardRecentCards.tsx`

**Interfaces:**
- Consumes: `Card`, `StatTile`, `Input`, `Button`, `Badge`, `Eyebrow` primitives.
- Produces: Completed themed interfaces.

- [ ] **Step 1: Refactor EditEntryModal.tsx & MediaInfoModal.tsx**
  Modify the inputs to use `Input` primitive.
  Update the buttons to use the `Button` primitive.
  Update the backdrop overlays to use the scrim color `--scrim` and the modal backgrounds to use `var(--surface-modal)`.

- [ ] **Step 2: Migrate app/page.tsx (Dashboard) & DashboardRecentCards.tsx**
  Replace main grid boxes and headings with `Card`, `Eyebrow`, and Outfit headings. Use `StatTile` for key status indicators.

- [ ] **Step 3: Migrate app/search/page.tsx**
  Rewrite the search layout to follow the `SearchScreen.jsx` mockup structure (layout/padding). Render search fields using the `Input` primitive.

- [ ] **Step 4: Migrate Library pages (app/movies/page.tsx, app/shows/page.tsx, app/watchlist/page.tsx, app/collections/page.tsx, app/lists/page.tsx)**
  Update layouts to align with `LibraryScreen.jsx` mockup grids. Use `Card` and `PosterCard` layout compositions.

- [ ] **Step 5: Verify build**
  Run: `npx vitest run`
  Expected: PASS

- [ ] **Step 6: Commit page migrations**
  ```bash
  git add app/page.tsx app/search/page.tsx app/movies/page.tsx app/shows/page.tsx app/watchlist/page.tsx app/collections/page.tsx app/lists/page.tsx components/EditEntryModal.tsx components/MediaInfoModal.tsx components/DashboardRecentCards.tsx
  git commit -m "refactor: apply design system layout, inputs, and buttons to main application pages and modal overlays"
  ```

---

## Task 7: Remaining Pages styling cleanup & Verification

**Files:**
- Modify: `app/stats/page.tsx`
- Modify: `app/calendar/page.tsx`
- Modify: `app/versus/page.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/import/page.tsx`
- Modify: `app/person/[name]/page.tsx`
- Modify: `app/recommendations/page.tsx`
- Modify: `app/share/page.tsx`
- Modify: `app/show/[id]/page.tsx`
- Modify: `components/SimilarModal.tsx`
- Modify: `components/StatsCharts.tsx`
- Modify: `components/BackButton.tsx`
- Modify: `components/ShareToggle.tsx`
- Modify: `components/EpisodeTracker.tsx`

**Interfaces:**
- Consumes: All primitives and CSS tokens.
- Produces: Redesigned residual pages, modals, and charts with absolute token alignment.

- [ ] **Step 1: Replace recharts themes and components in StatsCharts.tsx**
  Update the color scales in recharts configuration to use the design system colors: `--green-500`, `--amber-400`, `--rust-400`, and `--teal-400`.

- [ ] **Step 2: Clean up color classes and literal hexes in residual page routes**
  Go through residual page files and update styling properties:
  * Swap custom border radius styles for `--radius-*` tokens.
  * Replace remaining hardcoded dark colors with `--bg-base` or `--bg-void`.
  * Standardize headings and controls using `Button` / `Input` / `Card` primitives.

- [ ] **Step 3: Run final grep to check for stray/unmigrated tailwind styles**
  Grep the codebase for leftovers: `git diff | grep -E "text-violet|text-orange|bg-violet|bg-orange|#"`
  Expected: 0 stray background/text color matches outside the dorfmovies design reference folder.

- [ ] **Step 4: Execute final build and run all tests**
  Run: `npm run build`
  Expected: SUCCESS
  Run: `npx vitest run`
  Expected: PASS

- [ ] **Step 5: Commit remaining styles and push to remote**
  ```bash
  git add -A
  git commit -m "style: final design system styling mop-up and verification across all remaining pages"
  git push origin master
  ```
