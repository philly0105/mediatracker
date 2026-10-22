// DorfMovies UI kit — Dashboard. Eyebrow + gradient hero, bento stat tiles,
// and the "Recently Watched" poster grid.
function DashboardScreen({ data, onOpen }) {
  const { Eyebrow, SpotlightCard, GlassCard, StatTile, PosterCard, Button } = window.DorfMoviesDesignSystem_f30e74;
  const s = data.stats;
  const cont = data.watched.find((m) => m.type === 'show');

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 48 }}>
      {/* Hero */}
      <div style={{ position: 'relative' }}>
        <div className="dorf-grid" style={{ position: 'absolute', inset: '-24px -24px auto', height: 320, opacity: 0.15, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', paddingLeft: 8 }}>
          <div style={{ marginBottom: 14 }}><Eyebrow icon="sparkles">Welcome back</Eyebrow></div>
          <h1 style={{
            margin: 0, fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05,
            background: 'linear-gradient(160deg, var(--zinc-100) 40%, var(--zinc-400))',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>Dashboard</h1>
          <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 15 }}>
            Your personal media collection and viewing analytics.
          </p>
        </div>
      </div>

      {/* Bento stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <SpotlightCard spotlightColor="rgba(211,168,92,0.14)" style={{ gridColumn: 'span 1' }}>
          <StatTile icon="calendar" tone="orange" tag={'Year ' + new Date().getFullYear()}
            value={s.thisYear} caption="Watched this year" captionIcon="trending-up" />
        </SpotlightCard>
        <SpotlightCard spotlightColor="rgba(124,154,106,0.16)" style={{ gridColumn: 'span 1' }}>
          <StatTile icon="flame" tone="violet" tag="Priority" value={s.mustWatch} caption="Must Watch titles" />
        </SpotlightCard>
        <SpotlightCard spotlightColor="rgba(196,128,95,0.12)" style={{ gridColumn: 'span 2' }}>
          <div onClick={() => cont && onOpen(cont)} style={{ position: 'relative', overflow: 'hidden', height: '100%', cursor: 'pointer', padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {cont && (
              <img src={cont.poster} alt="" onError={(e) => (e.currentTarget.style.display = 'none')}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, filter: 'blur(4px)', mixBlendMode: 'luminosity' }} />
            )}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ width: 48, height: 48, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--rose-tint-bg)', border: '1px solid var(--rose-tint-border)', color: 'var(--rose-400)', boxShadow: 'var(--glow-live)' }}>
                <i data-lucide="play" style={{ width: 16, height: 16, fill: 'var(--rose-400)' }} />
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--rose-tint-bg)', border: '1px solid var(--rose-tint-border)', padding: '6px 12px', borderRadius: 'var(--radius-pill)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rose-500)', boxShadow: '0 0 8px var(--rose-500)', animation: 'dorf-pulse 1.6s ease-in-out infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--rose-400)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Live Now</span>
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--rust-300)' }}>Continuing</span>
              <p style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>{cont ? cont.title : '—'}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.4)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <i data-lucide="clock" style={{ width: 13, height: 13 }} /> Updated today
              </span>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* Recently watched */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingLeft: 8 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Recently Watched</h2>
          <Button variant="link" iconRight="arrow-right">View all</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
          {data.watched.slice(0, 5).map((m) => (
            <PosterCard key={m.id} title={m.title} year={m.year} posterUrl={m.poster}
              rating={m.rating} overlay={'Watched ' + m.watched} onClick={() => onOpen(m)} />
          ))}
        </div>
      </div>
    </div>
  );
}
window.DashboardScreen = DashboardScreen;
