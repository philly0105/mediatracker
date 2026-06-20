// DorfMovies UI kit — media detail modal (the MediaInfoModal recreation).
function DetailModal({ m, onClose, onWatchlist, onWatched, isWatched, isListed }) {
  const { Button, Badge, StarRating } = window.DorfMoviesDesignSystem_f30e74;
  const [err, setErr] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'var(--scrim)', backdropFilter: 'blur(var(--blur-sm))',
      animation: 'dorf-fade-up 0.25s var(--ease-out-expo)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, borderRadius: 'var(--radius-2xl)', overflow: 'hidden', position: 'relative',
        background: 'var(--glass-modal)', border: '1px solid var(--border-default)',
        backdropFilter: 'blur(var(--blur-xl))', boxShadow: 'var(--shadow-xl)',
      }}>
        {/* Backdrop header */}
        <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
          {m.poster && !err ? (
            <img src={m.poster} alt="" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--glass-modal), transparent)' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-default)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i data-lucide="x" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: 24, marginTop: -48, position: 'relative' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {m.poster && !err ? (
              <img src={m.poster} alt={m.title} style={{ width: 80, height: 120, borderRadius: 'var(--radius-md)', objectFit: 'cover', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-default)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 80, height: 120, borderRadius: 'var(--radius-md)', flexShrink: 0, background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))', border: '1px solid var(--border-default)' }} />
            )}
            <div style={{ paddingTop: 52, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>{m.title}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <Badge tone="neutral">{m.type === 'show' ? 'TV Show' : 'Movie'}</Badge>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.year}</span>
                {m.tmdb && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--amber-400)' }}>
                    <i data-lucide="star" style={{ width: 13, height: 13, fill: 'var(--amber-400)' }} /> {m.tmdb}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            {(m.genres || []).map((g) => (
              <span key={g} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--glass-chip)', border: '1px solid var(--border-subtle)', padding: '4px 10px', borderRadius: 'var(--radius-pill)' }}>{g}</span>
            ))}
          </div>

          {m.review && (
            <p style={{ margin: '16px 0 0', fontSize: 13, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-faint)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
              &ldquo;{m.review}&rdquo;
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Button variant="ghost" fullWidth icon={isListed ? 'check' : 'bookmark'} onClick={onWatchlist}>
              {isListed ? 'On Watchlist' : 'Add to Watchlist'}
            </Button>
            <Button variant="primary" fullWidth icon={isWatched ? 'check' : 'plus'} onClick={onWatched}>
              {isWatched ? 'Watched' : 'Mark as Watched'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
window.DetailModal = DetailModal;
