// DorfMovies UI kit — fixed sidebar rail. Uses NavItem primitive.
function DorfSidebar({ view, onNav, userEmail }) {
  const { NavItem } = window.DorfMoviesDesignSystem_f30e74;
  const items = [
    { id: 'dashboard', icon: 'home', label: 'Dashboard' },
    { id: 'search', icon: 'search', label: 'Search' },
    { id: 'calendar', icon: 'calendar', label: 'Calendar' },
    { id: 'movies', icon: 'film', label: 'Movies' },
    { id: 'shows', icon: 'tv', label: 'Shows' },
    { id: 'watchlist', icon: 'list-todo', label: 'Watchlist' },
    { id: 'collections', icon: 'library', label: 'Collections' },
    { id: 'recommendations', icon: 'sparkles', label: 'Recommendations' },
    { id: 'versus', icon: 'swords', label: 'Versus' },
    { id: 'stats', icon: 'bar-chart-3', label: 'Stats' },
  ];

  return (
    <aside style={{
      width: 256, flexShrink: 0, alignSelf: 'stretch',
      background: 'var(--bg-base)', borderRight: '1px solid var(--border-subtle)',
      padding: '24px 16px', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: '0.01em', margin: '4px 8px 28px' }}>
        Dorf<span style={{ color: 'var(--brand-mark)' }}>Movies</span>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {items.map((it) => (
          <NavItem key={it.id} icon={it.icon} label={it.label}
            active={view === it.id} onClick={() => onNav(it.id)} />
        ))}
      </nav>
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 8 }}>
        <NavItem icon="settings" label="Settings" active={view === 'settings'} onClick={() => onNav('settings')} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginTop: 8,
          borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-faint)',
        }}>
          <img src={'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(userEmail)}
            alt="" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--zinc-800)', border: '1px solid var(--border-subtle)' }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail.split('@')[0]}</p>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
window.DorfSidebar = DorfSidebar;
