// DorfMovies UI kit — Library views (Movies / Shows / Watchlist) as MediaRow grids.
function LibraryScreen({ view, data, onOpen, onRate, ratings }) {
  const { MediaRow, Button } = window.DorfMoviesDesignSystem_f30e74;
  let items, title;
  if (view === 'movies') { items = data.watched.filter((m) => m.type === 'movie'); title = 'Movies'; }
  else if (view === 'shows') { items = data.watched.filter((m) => m.type === 'show'); title = 'Shows'; }
  else { items = data.watchlist; title = 'Watchlist'; }

  const isWatchlist = view === 'watchlist';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{items.length} {isWatchlist ? 'queued' : 'watched'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {items.map((m) => (
          <MediaRow key={m.id} title={m.title} year={m.year} type={m.type} posterUrl={m.poster}
            rating={isWatchlist ? null : (ratings[m.id] ?? m.rating)}
            onRate={isWatchlist ? undefined : (v) => onRate(m.id, v)}
            review={isWatchlist ? undefined : m.review}
            watchedAt={isWatchlist ? undefined : m.watched}
            tmdbRating={isWatchlist ? m.tmdb : undefined}
            onClick={() => onOpen(m)} />
        ))}
      </div>
      {items.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nothing here yet.</p>}
    </div>
  );
}
window.LibraryScreen = LibraryScreen;
