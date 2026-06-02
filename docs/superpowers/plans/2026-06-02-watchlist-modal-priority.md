# Watchlist Interactivity & Priority Shifting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to click watchlist cards to open a detailed media info modal, and allow moving items between priority queues ("Must Watch", "Want to Watch", "Someday") from both the card directly and inside the modal.

**Architecture:** Convert the watchlist page to a React Client Component that fetches items via an API endpoint, manages client-side state for instant interactive updates, and utilizes Framer Motion to animate cards moving between priority groups. Add a GET handler to the watchlist API route and extend the `MediaInfoModal` to display custom priority controls when viewed from the watchlist.

**Tech Stack:** Next.js (App Router), React, Supabase, Framer Motion, Lucide Icons

---

## Proposed Changes

### 1. Watchlist API GET Handler

#### [MODIFY] [app/api/watchlist/route.ts](file:///C:/Users/aideo/Brain%202.0/Claude%20Code%20Projects/MediaTracker/app/api/watchlist/route.ts)
- Implement `GET` handler to fetch the watchlist items for the authenticated user, ordered by `added_at` descending and including cached `media` relations.

### 2. MediaInfoModal Extensions

#### [MODIFY] [components/MediaInfoModal.tsx](file:///C:/Users/aideo/Brain%202.0/Claude%20Code%20Projects/MediaTracker/components/MediaInfoModal.tsx)
- Update props interface to optionally accept:
  - `currentPriority?: WatchlistPriority`
  - `onUpdatePriority?: (priority: WatchlistPriority) => Promise<void>`
  - `onRemoveFromWatchlist?: () => Promise<void>`
- Inside the modal, if `currentPriority` is provided:
  - Render a "Watchlist Priority" row displaying the 3 priority options as buttons (Must Watch, Want to Watch, Someday).
  - Highlight the active priority button with its corresponding color scheme. Clicking another priority triggers `onUpdatePriority`.
  - Replace the default "Add to Watchlist" button in the footer actions with a "Remove from Watchlist" button that triggers `onRemoveFromWatchlist`.

### 3. Interactive Client-Side Watchlist Page

#### [MODIFY] [app/watchlist/page.tsx](file:///C:/Users/aideo/Brain%202.0/Claude%20Code%20Projects/MediaTracker/app/watchlist/page.tsx)
- Convert to `'use client'` component.
- Add client-side loading, error, and items states.
- Fetch watchlist items from `/api/watchlist` on mount.
- Add small glassmorphic move action buttons at the top right of each watchlist card:
  - If priority is `must_watch`: show buttons to move to `want_to_watch` (Sparkles) and `someday` (Inbox).
  - If priority is `want_to_watch`: show buttons to move to `must_watch` (Flame) and `someday` (Inbox).
  - If priority is `someday`: show buttons to move to `must_watch` (Flame) and `want_to_watch` (Sparkles).
  - Position buttons next to the movie title and style them to highlight with themed colors on hover (rose, orange, zinc). Stop click propagation to avoid opening the modal.
- Connect card click to open `MediaInfoModal`.
- Wrap grids and cards with `motion.div` and `AnimatePresence` using `layout` attributes so moving or removing items animates the layout changes smoothly across the columns.

---

## Verification Plan

### Automated Tests
- Run production build:
  ```powershell
  $env:NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"; $env:NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-key"; npm run build
  ```

### Manual Verification
1. Open the `/watchlist` tab.
2. Verify loading skeletons/state.
3. Click a watchlist card, confirm it opens the `MediaInfoModal` with the correct runtime, casting, overview, and customized priority footer actions.
4. Click one of the other priorities in the modal, verify the item moves to that list.
5. Click one of the move buttons directly on a card, verify it moves instantly to the corresponding list with a smooth layout transition.
6. Click "Remove from Watchlist" in the modal, verify it deletes the item and animate-removes it.
7. Click "Mark as Watched" in the modal, verify it adds it to watch history, deletes it from watchlist, and animate-removes it.
