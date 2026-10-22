// DorfMovies UI kit — Search. Pill input filters the dataset live; results are
// MediaRows with watched/watchlist badges.
function SearchScreen({ data, onOpen, watchedIds, watchlistIds }) {
  const { Input, Badge } = window.DorfMoviesDesignSystem_f30e74;
  const [q, setQ] = React.useState('');
  const results = q.trim().length < 1 ? data.all
    : data.all.filter((m) => m.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ maxWidth: 672, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Search</h1>
      <Input icon="search" placeholder="Search movies and TV shows..." value={q}
        onChange={(e) => setQ(e.target.value)} autoFocus />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map((m) => (
          <div key={m.id} style={{ position: 'relative' }}>
            <MediaRowSearch m={m} onOpen={onOpen}
              watched={watchedIds.has(m.id)} listed={watchlistIds.has(m.id)} />
          </div>
        ))}
        {results.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No matches for &ldquo;{q}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}

// Compact search-result row (poster + title + meta + status badge)
function MediaRowSearch({ m, onOpen, watched, listed }) {
  const { Badge } = window.DorfMoviesDesignSystem_f30e74;
  const [hover, setHover] = React.useState(false);
  const [err, setErr] = React.useState(false);
  return (
    <button onClick={() => onOpen(m)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: 12, textAlign: 'left',
        borderRadius: 'var(--radius-lg)', cursor: 'pointer',
        background: hover ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border-soft)', backdropFilter: 'blur(var(--blur-md))',
        transition: 'background var(--dur-fast) var(--ease-standard)',
      }}>
      {m.poster && !err ? (
        <img src={m.poster} alt="" onError={() => setErr(true)} style={{ width: 42, height: 60, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 42, height: 60, borderRadius: 'var(--radius-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))' }}>
          <i data-lucide={m.type === 'show' ? 'tv' : 'film'} style={{ width: 16, height: 16, color: 'var(--text-faint)' }} />
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600, color: '#fff', fontSize: 15 }}>{m.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.year} · {m.type === 'show' ? 'TV Show' : 'Movie'}</span>
          {watched && <Badge tone="emerald" icon="check-circle-2">Watched</Badge>}
          {!watched && listed && <Badge tone="violet" icon="bookmark">Watchlist</Badge>}
        </div>
      </div>
    </button>
  );
}
window.SearchScreen = SearchScreen;
