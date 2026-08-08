// The overlay is owned by KeyboardShortcuts (mounted once in the layout);
// other components ask it to open via a window event rather than threading
// state through context.
export const SEARCH_OVERLAY_EVENT = 'dorfmovies:open-search'

export function openSearchOverlay() {
  window.dispatchEvent(new Event(SEARCH_OVERLAY_EVENT))
}
