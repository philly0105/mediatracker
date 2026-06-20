// DorfMovies UI kit — app shell wiring views + modal + toast together.
function App() {
  const data = window.DORF_DATA;
  const [view, setView] = React.useState('dashboard');
  const [selected, setSelected] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [ratings, setRatings] = React.useState({});
  const [watchedIds, setWatchedIds] = React.useState(new Set(data.watched.map((m) => m.id)));
  const [watchlistIds, setWatchlistIds] = React.useState(new Set(data.watchlist.map((m) => m.id)));

  function showToast(msg) {
    setToast(msg);
    clearTimeout(window.__dorfToast);
    window.__dorfToast = setTimeout(() => setToast(null), 2200);
  }

  function addWatchlist(m) {
    setWatchlistIds((p) => new Set(p).add(m.id));
    showToast(m.title + ' added to watchlist');
  }
  function markWatched(m) {
    setWatchedIds((p) => new Set(p).add(m.id));
    showToast('Marked ' + m.title + ' as watched');
  }

  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });

  let screen;
  if (view === 'dashboard') screen = <DashboardScreen data={data} onOpen={setSelected} />;
  else if (view === 'search') screen = <SearchScreen data={data} onOpen={setSelected} watchedIds={watchedIds} watchlistIds={watchlistIds} />;
  else if (view === 'movies' || view === 'shows' || view === 'watchlist')
    screen = <LibraryScreen view={view} data={data} onOpen={setSelected} ratings={ratings} onRate={(id, v) => setRatings((p) => ({ ...p, [id]: v }))} />;
  else screen = <ComingSoon view={view} />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Ambient orbs */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -192, left: -192, width: 700, height: 700, borderRadius: '50%', filter: 'blur(150px)', opacity: 0.2, background: 'var(--orb-violet)' }} />
        <div style={{ position: 'absolute', bottom: -128, right: -128, width: 600, height: 600, borderRadius: '50%', filter: 'blur(130px)', opacity: 0.2, background: 'var(--orb-orange)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '33%', width: 500, height: 500, borderRadius: '50%', filter: 'blur(120px)', opacity: 0.1, background: 'var(--orb-rose)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', width: '100%' }}>
        <DorfSidebar view={view} onNav={(v) => { setView(v); setSelected(null); }} userEmail="alex@dorf.movies" />
        <main style={{ flex: 1, padding: '40px 40px 64px', minWidth: 0 }}>
          {screen}
        </main>
      </div>

      {selected && (
        <DetailModal m={selected} onClose={() => setSelected(null)}
          isWatched={watchedIds.has(selected.id)} isListed={watchlistIds.has(selected.id)}
          onWatchlist={() => addWatchlist(selected)} onWatched={() => markWatched(selected)} />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 'var(--radius-pill)',
          background: 'var(--glass-panel)', border: '1px solid var(--border-default)', backdropFilter: 'blur(var(--blur-lg))',
          boxShadow: 'var(--shadow-xl)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600,
          animation: 'dorf-fade-up 0.3s var(--ease-out-expo)',
        }}>
          <i data-lucide="check-circle-2" style={{ width: 16, height: 16, color: 'var(--emerald-400)' }} />
          {toast}
        </div>
      )}
    </div>
  );
}

function ComingSoon({ view }) {
  const label = view.charAt(0).toUpperCase() + view.slice(1);
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{label}</h1>
      <div style={{ marginTop: 24, padding: 48, textAlign: 'center', borderRadius: 'var(--radius-2xl)', border: '1px dashed var(--border-default)', background: 'var(--glass-card)' }}>
        <i data-lucide="monitor-play" style={{ width: 40, height: 40, color: 'var(--text-faint)' }} />
        <p style={{ margin: '12px 0 0', color: 'var(--text-secondary)', fontWeight: 500 }}>{label} is part of the full app — not recreated in this kit.</p>
      </div>
    </div>
  );
}

window.DorfApp = App;
