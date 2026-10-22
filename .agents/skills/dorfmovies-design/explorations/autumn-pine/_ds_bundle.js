/* @ds-bundle: {"format":3,"namespace":"DorfMoviesDesignSystem_f30e74","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"IconChip","sourcePath":"components/core/IconChip.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"MediaRow","sourcePath":"components/media/MediaRow.jsx"},{"name":"PosterCard","sourcePath":"components/media/PosterCard.jsx"},{"name":"StarRating","sourcePath":"components/media/StarRating.jsx"},{"name":"NavItem","sourcePath":"components/navigation/NavItem.jsx"},{"name":"GlassCard","sourcePath":"components/surfaces/GlassCard.jsx"},{"name":"SpotlightCard","sourcePath":"components/surfaces/SpotlightCard.jsx"},{"name":"StatTile","sourcePath":"components/surfaces/StatTile.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"7955a7a17239","components/core/Button.jsx":"c804cab51962","components/core/Eyebrow.jsx":"d5b21b1e8e7e","components/core/IconChip.jsx":"5ab9da9d3c8b","components/core/Input.jsx":"ba603a80a65f","components/media/MediaRow.jsx":"07ea92ad197e","components/media/PosterCard.jsx":"a30d0da216bb","components/media/StarRating.jsx":"9588798ad45e","components/navigation/NavItem.jsx":"c0e9acb15254","components/surfaces/GlassCard.jsx":"4b43a6db1459","components/surfaces/SpotlightCard.jsx":"39ad594543b8","components/surfaces/StatTile.jsx":"b960c9249f98","ui_kits/dorfmovies/App.jsx":"f810535819ab","ui_kits/dorfmovies/DashboardScreen.jsx":"2cf2b96a40a5","ui_kits/dorfmovies/DetailModal.jsx":"60cd22baab00","ui_kits/dorfmovies/LibraryScreen.jsx":"93f2cf975412","ui_kits/dorfmovies/SearchScreen.jsx":"71da677c7cb7","ui_kits/dorfmovies/Sidebar.jsx":"1cf757be7e33","ui_kits/dorfmovies/data.js":"d4508606eca3"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DorfMoviesDesignSystem_f30e74 = window.DorfMoviesDesignSystem_f30e74 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies Badge — tiny uppercase tracked label on a low-alpha accent tint.
 * Used for "WATCHED", "WATCHLIST", "TV", "PRIORITY", media-type tags, etc.
 */
const TONES = {
  violet: {
    color: 'var(--violet-400)',
    bg: 'var(--violet-tint-bg)',
    border: 'var(--violet-tint-border)'
  },
  orange: {
    color: 'var(--orange-400)',
    bg: 'var(--orange-tint-bg)',
    border: 'var(--orange-tint-border)'
  },
  rose: {
    color: 'var(--rose-400)',
    bg: 'var(--rose-tint-bg)',
    border: 'var(--rose-tint-border)'
  },
  emerald: {
    color: 'var(--emerald-400)',
    bg: 'var(--emerald-tint-bg)',
    border: 'var(--emerald-tint-border)'
  },
  amber: {
    color: 'var(--amber-400)',
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.20)'
  },
  neutral: {
    color: 'var(--text-muted)',
    bg: 'var(--glass-chip)',
    border: 'var(--border-faint)'
  }
};
function Badge({
  children,
  tone = 'neutral',
  icon,
  dot = false,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-2xs)',
      fontWeight: 'var(--weight-bold)',
      letterSpacing: 'var(--tracking-widest)',
      textTransform: 'uppercase',
      lineHeight: 1,
      color: t.color,
      background: t.bg,
      border: `1px solid ${t.border}`,
      padding: '4px 8px',
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'currentColor',
      boxShadow: '0 0 8px currentColor',
      animation: 'dorf-pulse 1.6s ease-in-out infinite'
    }
  }), icon && /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      width: 12,
      height: 12
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies Button.
 * Pill-shaped. Three variants: solid white "primary", translucent "ghost",
 * and a bare "link" (text + optional arrow). Hover lifts brightness; the
 * primary darkens to zinc-200.
 */
function Button({
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
}) {
  const [hover, setHover] = React.useState(false);
  const pads = {
    sm: {
      padding: '7px 14px',
      fontSize: 'var(--text-sm)'
    },
    md: {
      padding: '10px 20px',
      fontSize: 'var(--text-base)'
    },
    lg: {
      padding: '12px 26px',
      fontSize: 'var(--text-md)'
    }
  }[size];
  const variants = {
    primary: {
      background: hover && !disabled ? 'var(--btn-primary-bg-hover)' : 'var(--btn-primary-bg)',
      color: 'var(--btn-primary-fg)',
      border: '1px solid transparent'
    },
    ghost: {
      background: hover && !disabled ? 'var(--btn-ghost-bg-hover)' : 'var(--btn-ghost-bg)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-default)',
      backdropFilter: 'blur(var(--blur-md))'
    },
    accent: {
      background: hover && !disabled ? 'var(--violet-tint-border)' : 'var(--violet-tint-bg)',
      color: 'var(--violet-300)',
      border: '1px solid var(--violet-tint-border)'
    },
    link: {
      background: hover ? 'var(--btn-ghost-bg)' : 'transparent',
      color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
      border: '1px solid transparent'
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: disabled ? undefined : onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    disabled: disabled,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      width: fullWidth ? '100%' : 'auto',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-out-expo)',
      whiteSpace: 'nowrap',
      ...pads,
      ...variants,
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      width: 16,
      height: 16
    }
  }), children, iconRight && /*#__PURE__*/React.createElement("i", {
    "data-lucide": iconRight,
    style: {
      width: 16,
      height: 16,
      transform: hover ? 'translateX(3px)' : 'none',
      transition: 'transform var(--dur-base) var(--ease-out-expo)'
    }
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies Eyebrow — a small pill containing a wide-tracked uppercase label
 * and (optionally) a leading accent icon. The "WELCOME BACK" treatment.
 */
function Eyebrow({
  children,
  icon,
  tone = 'violet',
  style,
  ...rest
}) {
  const color = {
    violet: 'var(--violet-300)',
    orange: 'var(--orange-400)',
    rose: 'var(--rose-400)',
    neutral: 'var(--text-muted)'
  }[tone] || 'var(--violet-300)';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '5px 12px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--glass-chip)',
      border: '1px solid var(--border-default)',
      backdropFilter: 'blur(var(--blur-md))',
      boxShadow: 'var(--shadow-sm)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-bold)',
      letterSpacing: 'var(--tracking-widest)',
      textTransform: 'uppercase',
      color,
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      width: 14,
      height: 14
    }
  }), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/IconChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies IconChip — a round tint "well" with a centered Lucide icon.
 * The standard adornment at the top of bento stat cards. Scales to 110% when
 * its `hover` prop is set (drive from the parent card's hover state).
 */
const TONES = {
  violet: {
    color: 'var(--violet-400)',
    bg: 'var(--violet-tint-bg)',
    border: 'var(--violet-tint-border)'
  },
  orange: {
    color: 'var(--orange-400)',
    bg: 'var(--orange-tint-bg)',
    border: 'var(--orange-tint-border)'
  },
  rose: {
    color: 'var(--rose-400)',
    bg: 'var(--rose-tint-bg)',
    border: 'var(--rose-tint-border)'
  },
  emerald: {
    color: 'var(--emerald-400)',
    bg: 'var(--emerald-tint-bg)',
    border: 'var(--emerald-tint-border)'
  }
};
function IconChip({
  icon,
  tone = 'violet',
  size = 40,
  hover = false,
  glow = false,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.violet;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: '50%',
      background: t.bg,
      border: `1px solid ${t.border}`,
      color: t.color,
      boxShadow: glow ? `0 0 15px ${t.bg}` : 'none',
      transform: hover ? 'scale(1.1)' : 'none',
      transition: 'transform var(--dur-slow) var(--ease-out-expo)',
      flexShrink: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      width: Math.round(size * 0.45),
      height: Math.round(size * 0.45)
    }
  }));
}
Object.assign(__ds_scope, { IconChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconChip.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies Input — pill text field on a translucent fill. Border brightens
 * to 30% white on focus. Supports an optional leading Lucide icon and a
 * `multiline` (textarea) mode which switches to a rounded-2xl shape.
 */
function Input({
  icon,
  multiline = false,
  rows = 4,
  value,
  onChange,
  placeholder,
  type = 'text',
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const base = {
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--text-primary)',
    background: 'var(--surface-input)',
    border: `1px solid ${focus ? 'var(--border-focus)' : 'var(--border-default)'}`,
    outline: 'none',
    transition: 'border-color var(--dur-fast) var(--ease-standard)',
    backdropFilter: 'blur(var(--blur-md))'
  };
  if (multiline) {
    return /*#__PURE__*/React.createElement("textarea", _extends({
      rows: rows,
      value: value,
      onChange: onChange,
      placeholder: placeholder,
      onFocus: () => setFocus(true),
      onBlur: () => setFocus(false),
      style: {
        ...base,
        resize: 'none',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 18px',
        ...style
      }
    }, rest));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%'
    }
  }, icon && /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      position: 'absolute',
      left: 18,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 16,
      height: 16,
      color: 'var(--text-muted)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...base,
      borderRadius: 'var(--radius-sm)',
      padding: icon ? '11px 16px 11px 42px' : '11px 16px',
      ...style
    }
  }, rest)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/media/StarRating.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies StarRating — five ★ glyphs over a gray track, amber fill clipped
 * by width to support half-stars. Interactive (hover + click in 0.5 steps)
 * unless `readOnly`.
 */
function StarRating({
  value = null,
  onChange,
  readOnly = false,
  size = 24,
  showValue = true,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(null);
  const display = hover ?? value ?? 0;
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseLeave: () => setHover(null),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '2px',
      ...style
    }
  }, rest), [1, 2, 3, 4, 5].map(star => {
    const full = display >= star;
    const half = !full && display >= star - 0.5;
    return /*#__PURE__*/React.createElement("div", {
      key: star,
      style: {
        position: 'relative',
        width: size,
        height: size
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--zinc-700)',
        fontSize: size,
        lineHeight: 1
      }
    }, "\u2605"), (full || half) && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        inset: 0,
        color: 'var(--amber-400)',
        fontSize: size,
        lineHeight: 1,
        overflow: 'hidden',
        width: full ? '100%' : '50%'
      }
    }, "\u2605"), !readOnly && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      onMouseEnter: () => setHover(star - 0.5),
      onClick: () => onChange && onChange(star - 0.5),
      style: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: '50%',
        height: '100%',
        cursor: 'pointer'
      }
    }), /*#__PURE__*/React.createElement("div", {
      onMouseEnter: () => setHover(star),
      onClick: () => onChange && onChange(star),
      style: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: '50%',
        height: '100%',
        cursor: 'pointer'
      }
    })));
  }), showValue && value != null && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: '8px',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-secondary)',
      fontWeight: 'var(--weight-medium)'
    }
  }, value, "/5"));
}
Object.assign(__ds_scope, { StarRating });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/media/StarRating.jsx", error: String((e && e.message) || e) }); }

// components/media/MediaRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies MediaRow — the horizontal "watch entry" card: a small 2:3 poster
 * thumb beside a title, type/year meta, an interactive star rating, and
 * optional review snippet. Lifts slightly on hover (glass-card treatment).
 */
function MediaRow({
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
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [imgErr, setImgErr] = React.useState(false);
  const hasImg = posterUrl && !imgErr;
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
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
      ...style
    }
  }, rest), hasImg ? /*#__PURE__*/React.createElement("img", {
    src: posterUrl,
    alt: title,
    onError: () => setImgErr(true),
    style: {
      width: 64,
      height: 96,
      borderRadius: 'var(--radius-md)',
      objectFit: 'cover',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-subtle)',
      flexShrink: 0
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 96,
      borderRadius: 'var(--radius-md)',
      flexShrink: 0,
      border: '1px solid var(--border-subtle)',
      background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": type === 'show' ? 'tv' : 'film',
    style: {
      width: 18,
      height: 18,
      color: 'var(--text-faint)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--text-primary)',
      lineHeight: 'var(--leading-snug)',
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '6px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "neutral"
  }, type === 'show' ? 'TV' : 'Movie'), year && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      color: 'var(--text-muted)'
    }
  }, year), tmdbRating != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--amber-400)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "star",
    style: {
      width: 12,
      height: 12,
      fill: 'var(--amber-400)'
    }
  }), " ", tmdbRating))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      transform: 'scale(0.9)',
      transformOrigin: 'left'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StarRating, {
    value: rating,
    onChange: onRate,
    readOnly: !onRate,
    size: 20,
    showValue: false
  })), review && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      fontStyle: 'italic',
      color: 'var(--text-secondary)',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border-faint)',
      padding: '6px 8px',
      borderRadius: 'var(--radius-sm)',
      lineHeight: 'var(--leading-relaxed)',
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical'
    }
  }, review), watchedAt && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: 'var(--text-2xs)',
      color: 'var(--text-faint)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "calendar",
    style: {
      width: 12,
      height: 12
    }
  }), " Watched ", watchedAt))));
}
Object.assign(__ds_scope, { MediaRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/media/MediaRow.jsx", error: String((e && e.message) || e) }); }

// components/media/PosterCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies PosterCard — portrait 2:3 poster artwork in a rounded well, with
 * a title + year footer on a frosted strip. On hover the poster zooms/rotates
 * slightly, a violet glow appears, and a date pill fades up over the art.
 */
function PosterCard({
  title,
  year,
  posterUrl,
  rating = null,
  overlay,
  onClick,
  width,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [imgErr, setImgErr] = React.useState(false);
  const hasImg = posterUrl && !imgErr;
  return /*#__PURE__*/React.createElement("button", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      width: width || '100%',
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
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: '2 / 3',
      overflow: 'hidden',
      background: 'var(--zinc-900)'
    }
  }, hasImg ? /*#__PURE__*/React.createElement("img", {
    src: posterUrl,
    alt: title,
    onError: () => setImgErr(true),
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: hover ? 'scale(1.10) rotate(1deg)' : 'none',
      transition: 'transform var(--dur-slower) var(--ease-out-expo)'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-secondary)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-bold)',
      textAlign: 'center',
      padding: '16px',
      background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))'
    }
  }, title), overlay && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'flex-end',
      padding: '14px',
      background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.1) 60%, transparent)',
      opacity: hover ? 1 : 0,
      transition: 'opacity var(--dur-slow) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--white)',
      background: 'var(--glass-chip)',
      backdropFilter: 'blur(var(--blur-md))',
      padding: '5px 10px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-default)'
    }
  }, overlay))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-raised)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      fontWeight: 'var(--weight-bold)',
      color: hover ? 'var(--violet-300)' : 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      transition: 'color var(--dur-base) var(--ease-standard)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      fontWeight: 'var(--weight-medium)'
    }
  }, year), rating != null && /*#__PURE__*/React.createElement(__ds_scope.StarRating, {
    value: rating,
    readOnly: true,
    size: 14,
    showValue: false
  }))));
}
Object.assign(__ds_scope, { PosterCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/media/PosterCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies NavItem — a sidebar row: Lucide icon + label, pill hover, and an
 * active state that fills with a glass pill and tints the icon violet.
 */
function NavItem({
  icon,
  label,
  active = false,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: '11px 16px',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-medium)',
      color: active ? 'var(--text-primary)' : hover ? 'var(--zinc-300)' : 'var(--text-secondary)',
      background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
      border: `1px solid ${active ? 'var(--border-default)' : 'transparent'}`,
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'color var(--dur-base) var(--ease-standard), background var(--dur-base) var(--ease-standard)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      width: 16,
      height: 16,
      flexShrink: 0,
      color: active ? 'var(--accent)' : hover ? 'var(--zinc-300)' : 'var(--text-muted)',
      transform: hover ? 'scale(1.1)' : 'none',
      transition: 'transform var(--dur-base) var(--ease-out-expo)'
    }
  }), /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/GlassCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies GlassCard — the workhorse surface. Translucent dark fill +
 * backdrop blur + hairline border. On hover it lifts, brightens its border,
 * and casts a colored glow (violet by default).
 */
const GLOWS = {
  violet: 'var(--glow-violet)',
  rose: 'var(--glow-rose)',
  orange: 'var(--glow-orange)',
  none: 'none'
};
function GlassCard({
  children,
  glow = 'violet',
  interactive = true,
  padding = 'var(--space-6)',
  style,
  onClick,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const lifted = interactive && hover;
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      borderRadius: 'var(--radius-lg)',
      background: lifted ? 'var(--glass-card-hover)' : 'var(--glass-card)',
      border: `1px solid ${lifted ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
      backdropFilter: 'blur(var(--blur-md))',
      WebkitBackdropFilter: 'blur(var(--blur-md))',
      boxShadow: lifted ? `${GLOWS[glow] || GLOWS.violet}, var(--inset-hairline)` : 'none',
      transform: lifted ? 'var(--lift-hover)' : 'none',
      transition: 'all var(--dur-slow) var(--ease-out-expo)',
      cursor: interactive && onClick ? 'pointer' : 'default',
      padding,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { GlassCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/GlassCard.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/SpotlightCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies SpotlightCard — large-radius glass card with a soft radial
 * "spotlight" that follows the cursor and fades in on hover. Used for the
 * dashboard bento stat tiles.
 */
function SpotlightCard({
  children,
  spotlightColor = 'rgba(216, 166, 78, 0.10)',
  padding = 0,
  style,
  ...rest
}) {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState({
    x: 0,
    y: 0
  });
  const [opacity, setOpacity] = React.useState(0);
  const [hover, setHover] = React.useState(false);
  function onMove(e) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({
      x: e.clientX - r.left,
      y: e.clientY - r.top
    });
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    ref: ref,
    onMouseMove: onMove,
    onMouseEnter: () => {
      setOpacity(1);
      setHover(true);
    },
    onMouseLeave: () => {
      setOpacity(0);
      setHover(false);
    },
    style: {
      position: 'relative',
      overflow: 'hidden',
      minWidth: 0,
      borderRadius: 'var(--radius-2xl)',
      background: 'var(--bg-raised)',
      border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
      backdropFilter: 'blur(var(--blur-lg))',
      WebkitBackdropFilter: 'blur(var(--blur-lg))',
      boxShadow: hover ? 'var(--glow-violet), var(--shadow-xl)' : 'var(--shadow-xl)',
      transition: 'border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)',
      padding,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      pointerEvents: 'none',
      position: 'absolute',
      inset: '-1px',
      zIndex: 0,
      opacity,
      transition: 'opacity var(--dur-base) var(--ease-standard)',
      background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 40%)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      height: '100%',
      width: '100%'
    }
  }, children));
}
Object.assign(__ds_scope, { SpotlightCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/SpotlightCard.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/StatTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DorfMovies StatTile — the bento dashboard stat: an icon chip + small eyebrow
 * label up top, then a giant gradient numeral and a caption. Meant to be
 * dropped inside a SpotlightCard.
 */
const GRADIENTS = {
  orange: 'linear-gradient(135deg, var(--amber-300), var(--amber-500))',
  amber: 'linear-gradient(135deg, var(--amber-300), var(--amber-500))',
  violet: 'linear-gradient(135deg, var(--green-300), var(--green-600))',
  green: 'linear-gradient(135deg, var(--green-300), var(--green-600))',
  gold: 'linear-gradient(135deg, var(--green-300), var(--green-600))',
  rose: 'linear-gradient(135deg, var(--rust-300), var(--rust-500))',
  rust: 'linear-gradient(135deg, var(--rust-300), var(--rust-500))',
  teal: 'linear-gradient(135deg, var(--teal-300), var(--teal-500))',
  white: 'linear-gradient(135deg, var(--zinc-100), var(--zinc-400))'
};
function StatTile({
  value,
  label,
  icon,
  tone = 'violet',
  tag,
  caption,
  captionIcon,
  hover = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 'var(--space-8)',
      padding: 'var(--space-6)',
      height: '100%',
      boxSizing: 'border-box',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconChip, {
    icon: icon,
    tone: tone,
    hover: hover
  }), tag && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      fontWeight: 'var(--weight-bold)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'var(--text-muted)',
      background: 'var(--zinc-900)',
      padding: '4px 7px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-subtle)',
      whiteSpace: 'nowrap',
      flexShrink: 1,
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, tag)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-6xl)',
      fontWeight: 'var(--weight-extrabold)',
      lineHeight: 'var(--leading-none)',
      letterSpacing: 'var(--tracking-tighter)',
      background: GRADIENTS[tone] || GRADIENTS.violet,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent'
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginTop: '8px'
    }
  }, captionIcon && /*#__PURE__*/React.createElement("i", {
    "data-lucide": captionIcon,
    style: {
      width: 14,
      height: 14,
      color: `var(--${tone}-500)`
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-secondary)'
    }
  }, caption || label))));
}
Object.assign(__ds_scope, { StatTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/StatTile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dorfmovies/App.jsx
try { (() => {
// DorfMovies UI kit — app shell wiring views + modal + toast together.
function App() {
  const data = window.DORF_DATA;
  const [view, setView] = React.useState('dashboard');
  const [selected, setSelected] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [ratings, setRatings] = React.useState({});
  const [watchedIds, setWatchedIds] = React.useState(new Set(data.watched.map(m => m.id)));
  const [watchlistIds, setWatchlistIds] = React.useState(new Set(data.watchlist.map(m => m.id)));
  function showToast(msg) {
    setToast(msg);
    clearTimeout(window.__dorfToast);
    window.__dorfToast = setTimeout(() => setToast(null), 2200);
  }
  function addWatchlist(m) {
    setWatchlistIds(p => new Set(p).add(m.id));
    showToast(m.title + ' added to watchlist');
  }
  function markWatched(m) {
    setWatchedIds(p => new Set(p).add(m.id));
    showToast('Marked ' + m.title + ' as watched');
  }
  React.useEffect(() => {
    window.lucide && window.lucide.createIcons();
  });
  let screen;
  if (view === 'dashboard') screen = /*#__PURE__*/React.createElement(DashboardScreen, {
    data: data,
    onOpen: setSelected
  });else if (view === 'search') screen = /*#__PURE__*/React.createElement(SearchScreen, {
    data: data,
    onOpen: setSelected,
    watchedIds: watchedIds,
    watchlistIds: watchlistIds
  });else if (view === 'movies' || view === 'shows' || view === 'watchlist') screen = /*#__PURE__*/React.createElement(LibraryScreen, {
    view: view,
    data: data,
    onOpen: setSelected,
    ratings: ratings,
    onRate: (id, v) => setRatings(p => ({
      ...p,
      [id]: v
    }))
  });else screen = /*#__PURE__*/React.createElement(ComingSoon, {
    view: view
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      minHeight: '100vh',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -192,
      left: -192,
      width: 700,
      height: 700,
      borderRadius: '50%',
      filter: 'blur(150px)',
      opacity: 0.2,
      background: 'var(--orb-violet)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: -128,
      right: -128,
      width: 600,
      height: 600,
      borderRadius: '50%',
      filter: 'blur(130px)',
      opacity: 0.2,
      background: 'var(--orb-orange)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '50%',
      left: '33%',
      width: 500,
      height: 500,
      borderRadius: '50%',
      filter: 'blur(120px)',
      opacity: 0.1,
      background: 'var(--orb-rose)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement(DorfSidebar, {
    view: view,
    onNav: v => {
      setView(v);
      setSelected(null);
    },
    userEmail: "alex@dorf.movies"
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      padding: '40px 40px 64px',
      minWidth: 0
    }
  }, screen)), selected && /*#__PURE__*/React.createElement(DetailModal, {
    m: selected,
    onClose: () => setSelected(null),
    isWatched: watchedIds.has(selected.id),
    isListed: watchlistIds.has(selected.id),
    onWatchlist: () => addWatchlist(selected),
    onWatched: () => markWatched(selected)
  }), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 28,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 60,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 20px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--glass-panel)',
      border: '1px solid var(--border-default)',
      backdropFilter: 'blur(var(--blur-lg))',
      boxShadow: 'var(--shadow-xl)',
      color: 'var(--text-primary)',
      fontSize: 14,
      fontWeight: 600,
      animation: 'dorf-fade-up 0.3s var(--ease-out-expo)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "check-circle-2",
    style: {
      width: 16,
      height: 16,
      color: 'var(--emerald-400)'
    }
  }), toast));
}
function ComingSoon({
  view
}) {
  const label = view.charAt(0).toUpperCase() + view.slice(1);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1180,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 24,
      fontWeight: 700,
      letterSpacing: '-0.02em'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      padding: 48,
      textAlign: 'center',
      borderRadius: 'var(--radius-2xl)',
      border: '1px dashed var(--border-default)',
      background: 'var(--glass-card)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "monitor-play",
    style: {
      width: 40,
      height: 40,
      color: 'var(--text-faint)'
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 0',
      color: 'var(--text-secondary)',
      fontWeight: 500
    }
  }, label, " is part of the full app \u2014 not recreated in this kit.")));
}
window.DorfApp = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dorfmovies/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dorfmovies/DashboardScreen.jsx
try { (() => {
// DorfMovies UI kit — Dashboard. Eyebrow + gradient hero, bento stat tiles,
// and the "Recently Watched" poster grid.
function DashboardScreen({
  data,
  onOpen
}) {
  const {
    Eyebrow,
    SpotlightCard,
    GlassCard,
    StatTile,
    PosterCard,
    Button
  } = window.DorfMoviesDesignSystem_f30e74;
  const s = data.stats;
  const cont = data.watched.find(m => m.type === 'show');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 48
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dorf-grid",
    style: {
      position: 'absolute',
      inset: '-24px -24px auto',
      height: 320,
      opacity: 0.15,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      paddingLeft: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    icon: "sparkles"
  }, "Welcome back")), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 48,
      fontWeight: 800,
      letterSpacing: '-0.04em',
      lineHeight: 1.05,
      background: 'linear-gradient(160deg, var(--zinc-100) 40%, var(--zinc-400))',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent'
    }
  }, "Dashboard"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      color: 'var(--text-secondary)',
      fontWeight: 500,
      fontSize: 15
    }
  }, "Your personal media collection and viewing analytics."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(SpotlightCard, {
    spotlightColor: "rgba(211,168,92,0.14)",
    style: {
      gridColumn: 'span 1'
    }
  }, /*#__PURE__*/React.createElement(StatTile, {
    icon: "calendar",
    tone: "orange",
    tag: 'Year ' + new Date().getFullYear(),
    value: s.thisYear,
    caption: "Watched this year",
    captionIcon: "trending-up"
  })), /*#__PURE__*/React.createElement(SpotlightCard, {
    spotlightColor: "rgba(124,154,106,0.16)",
    style: {
      gridColumn: 'span 1'
    }
  }, /*#__PURE__*/React.createElement(StatTile, {
    icon: "flame",
    tone: "violet",
    tag: "Priority",
    value: s.mustWatch,
    caption: "Must Watch titles"
  })), /*#__PURE__*/React.createElement(SpotlightCard, {
    spotlightColor: "rgba(196,128,95,0.12)",
    style: {
      gridColumn: 'span 2'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => cont && onOpen(cont),
    style: {
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
      cursor: 'pointer',
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }
  }, cont && /*#__PURE__*/React.createElement("img", {
    src: cont.poster,
    alt: "",
    onError: e => e.currentTarget.style.display = 'none',
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      opacity: 0.1,
      filter: 'blur(4px)',
      mixBlendMode: 'luminosity'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 48,
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--rose-tint-bg)',
      border: '1px solid var(--rose-tint-border)',
      color: 'var(--rose-400)',
      boxShadow: 'var(--glow-live)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "play",
    style: {
      width: 16,
      height: 16,
      fill: 'var(--rose-400)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'var(--rose-tint-bg)',
      border: '1px solid var(--rose-tint-border)',
      padding: '6px 12px',
      borderRadius: 'var(--radius-pill)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--rose-500)',
      boxShadow: '0 0 8px var(--rose-500)',
      animation: 'dorf-pulse 1.6s ease-in-out infinite'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: 'var(--rose-400)',
      textTransform: 'uppercase',
      letterSpacing: '0.12em'
    }
  }, "Live Now"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--rust-300)'
    }
  }, "Continuing"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: '#fff'
    }
  }, cont ? cont.title : '—'), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      fontSize: 12,
      color: 'var(--text-secondary)',
      background: 'rgba(0,0,0,0.4)',
      padding: '5px 10px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "clock",
    style: {
      width: 13,
      height: 13
    }
  }), " Updated today"))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      paddingLeft: 8
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: '-0.02em'
    }
  }, "Recently Watched"), /*#__PURE__*/React.createElement(Button, {
    variant: "link",
    iconRight: "arrow-right"
  }, "View all")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 20
    }
  }, data.watched.slice(0, 5).map(m => /*#__PURE__*/React.createElement(PosterCard, {
    key: m.id,
    title: m.title,
    year: m.year,
    posterUrl: m.poster,
    rating: m.rating,
    overlay: 'Watched ' + m.watched,
    onClick: () => onOpen(m)
  })))));
}
window.DashboardScreen = DashboardScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dorfmovies/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dorfmovies/DetailModal.jsx
try { (() => {
// DorfMovies UI kit — media detail modal (the MediaInfoModal recreation).
function DetailModal({
  m,
  onClose,
  onWatchlist,
  onWatched,
  isWatched,
  isListed
}) {
  const {
    Button,
    Badge,
    StarRating
  } = window.DorfMoviesDesignSystem_f30e74;
  const [err, setErr] = React.useState(false);
  React.useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      background: 'var(--scrim)',
      backdropFilter: 'blur(var(--blur-sm))',
      animation: 'dorf-fade-up 0.25s var(--ease-out-expo)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: 440,
      borderRadius: 'var(--radius-2xl)',
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--glass-modal)',
      border: '1px solid var(--border-default)',
      backdropFilter: 'blur(var(--blur-xl))',
      boxShadow: 'var(--shadow-xl)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 150,
      overflow: 'hidden'
    }
  }, m.poster && !err ? /*#__PURE__*/React.createElement("img", {
    src: m.poster,
    alt: "",
    onError: () => setErr(true),
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'center 20%'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to top, var(--glass-modal), transparent)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 32,
      height: 32,
      borderRadius: '50%',
      border: '1px solid var(--border-default)',
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(8px)',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "x",
    style: {
      width: 16,
      height: 16
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      marginTop: -48,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16
    }
  }, m.poster && !err ? /*#__PURE__*/React.createElement("img", {
    src: m.poster,
    alt: m.title,
    style: {
      width: 80,
      height: 120,
      borderRadius: 'var(--radius-md)',
      objectFit: 'cover',
      boxShadow: 'var(--shadow-md)',
      border: '1px solid var(--border-default)',
      flexShrink: 0
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80,
      height: 120,
      borderRadius: 'var(--radius-md)',
      flexShrink: 0,
      background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
      border: '1px solid var(--border-default)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 52,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 20,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: '#fff'
    }
  }, m.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, m.type === 'show' ? 'TV Show' : 'Movie'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, m.year), m.tmdb && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--amber-400)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "star",
    style: {
      width: 13,
      height: 13,
      fill: 'var(--amber-400)'
    }
  }), " ", m.tmdb)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginTop: 16
    }
  }, (m.genres || []).map(g => /*#__PURE__*/React.createElement("span", {
    key: g,
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      background: 'var(--glass-chip)',
      border: '1px solid var(--border-subtle)',
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)'
    }
  }, g))), m.review && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '16px 0 0',
      fontSize: 13,
      fontStyle: 'italic',
      color: 'var(--text-secondary)',
      lineHeight: 1.6,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border-faint)',
      padding: '12px 14px',
      borderRadius: 'var(--radius-md)'
    }
  }, "\u201C", m.review, "\u201D"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    fullWidth: true,
    icon: isListed ? 'check' : 'bookmark',
    onClick: onWatchlist
  }, isListed ? 'On Watchlist' : 'Add to Watchlist'), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    icon: isWatched ? 'check' : 'plus',
    onClick: onWatched
  }, isWatched ? 'Watched' : 'Mark as Watched')))));
}
window.DetailModal = DetailModal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dorfmovies/DetailModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dorfmovies/LibraryScreen.jsx
try { (() => {
// DorfMovies UI kit — Library views (Movies / Shows / Watchlist) as MediaRow grids.
function LibraryScreen({
  view,
  data,
  onOpen,
  onRate,
  ratings
}) {
  const {
    MediaRow,
    Button
  } = window.DorfMoviesDesignSystem_f30e74;
  let items, title;
  if (view === 'movies') {
    items = data.watched.filter(m => m.type === 'movie');
    title = 'Movies';
  } else if (view === 'shows') {
    items = data.watched.filter(m => m.type === 'show');
    title = 'Shows';
  } else {
    items = data.watchlist;
    title = 'Watchlist';
  }
  const isWatchlist = view === 'watchlist';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 24,
      fontWeight: 700,
      letterSpacing: '-0.02em'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 14
    }
  }, items.length, " ", isWatchlist ? 'queued' : 'watched')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: 12
    }
  }, items.map(m => /*#__PURE__*/React.createElement(MediaRow, {
    key: m.id,
    title: m.title,
    year: m.year,
    type: m.type,
    posterUrl: m.poster,
    rating: isWatchlist ? null : ratings[m.id] ?? m.rating,
    onRate: isWatchlist ? undefined : v => onRate(m.id, v),
    review: isWatchlist ? undefined : m.review,
    watchedAt: isWatchlist ? undefined : m.watched,
    tmdbRating: isWatchlist ? m.tmdb : undefined,
    onClick: () => onOpen(m)
  }))), items.length === 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, "Nothing here yet."));
}
window.LibraryScreen = LibraryScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dorfmovies/LibraryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dorfmovies/SearchScreen.jsx
try { (() => {
// DorfMovies UI kit — Search. Pill input filters the dataset live; results are
// MediaRows with watched/watchlist badges.
function SearchScreen({
  data,
  onOpen,
  watchedIds,
  watchlistIds
}) {
  const {
    Input,
    Badge
  } = window.DorfMoviesDesignSystem_f30e74;
  const [q, setQ] = React.useState('');
  const results = q.trim().length < 1 ? data.all : data.all.filter(m => m.title.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 672,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 24,
      fontWeight: 700,
      letterSpacing: '-0.02em'
    }
  }, "Search"), /*#__PURE__*/React.createElement(Input, {
    icon: "search",
    placeholder: "Search movies and TV shows...",
    value: q,
    onChange: e => setQ(e.target.value),
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, results.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(MediaRowSearch, {
    m: m,
    onOpen: onOpen,
    watched: watchedIds.has(m.id),
    listed: watchlistIds.has(m.id)
  }))), results.length === 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-secondary)',
      fontSize: 14
    }
  }, "No matches for \u201C", q, "\u201D.")));
}

// Compact search-result row (poster + title + meta + status badge)
function MediaRowSearch({
  m,
  onOpen,
  watched,
  listed
}) {
  const {
    Badge
  } = window.DorfMoviesDesignSystem_f30e74;
  const [hover, setHover] = React.useState(false);
  const [err, setErr] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(m),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: 12,
      textAlign: 'left',
      borderRadius: 'var(--radius-lg)',
      cursor: 'pointer',
      background: hover ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
      border: '1px solid var(--border-soft)',
      backdropFilter: 'blur(var(--blur-md))',
      transition: 'background var(--dur-fast) var(--ease-standard)'
    }
  }, m.poster && !err ? /*#__PURE__*/React.createElement("img", {
    src: m.poster,
    alt: "",
    onError: () => setErr(true),
    style: {
      width: 42,
      height: 60,
      borderRadius: 'var(--radius-md)',
      objectFit: 'cover',
      flexShrink: 0
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 60,
      borderRadius: 'var(--radius-md)',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": m.type === 'show' ? 'tv' : 'film',
    style: {
      width: 16,
      height: 16,
      color: 'var(--text-faint)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: 600,
      color: '#fff',
      fontSize: 15
    }
  }, m.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, m.year, " \xB7 ", m.type === 'show' ? 'TV Show' : 'Movie'), watched && /*#__PURE__*/React.createElement(Badge, {
    tone: "emerald",
    icon: "check-circle-2"
  }, "Watched"), !watched && listed && /*#__PURE__*/React.createElement(Badge, {
    tone: "violet",
    icon: "bookmark"
  }, "Watchlist"))));
}
window.SearchScreen = SearchScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dorfmovies/SearchScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dorfmovies/Sidebar.jsx
try { (() => {
// DorfMovies UI kit — fixed sidebar rail. Uses NavItem primitive.
function DorfSidebar({
  view,
  onNav,
  userEmail
}) {
  const {
    NavItem
  } = window.DorfMoviesDesignSystem_f30e74;
  const items = [{
    id: 'dashboard',
    icon: 'home',
    label: 'Dashboard'
  }, {
    id: 'search',
    icon: 'search',
    label: 'Search'
  }, {
    id: 'calendar',
    icon: 'calendar',
    label: 'Calendar'
  }, {
    id: 'movies',
    icon: 'film',
    label: 'Movies'
  }, {
    id: 'shows',
    icon: 'tv',
    label: 'Shows'
  }, {
    id: 'watchlist',
    icon: 'list-todo',
    label: 'Watchlist'
  }, {
    id: 'collections',
    icon: 'library',
    label: 'Collections'
  }, {
    id: 'recommendations',
    icon: 'sparkles',
    label: 'Recommendations'
  }, {
    id: 'versus',
    icon: 'swords',
    label: 'Versus'
  }, {
    id: 'stats',
    icon: 'bar-chart-3',
    label: 'Stats'
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 256,
      flexShrink: 0,
      alignSelf: 'stretch',
      background: 'var(--bg-base)',
      borderRight: '1px solid var(--border-subtle)',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 24,
      letterSpacing: '0.01em',
      margin: '4px 8px 28px'
    }
  }, "Dorf", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--brand-mark)'
    }
  }, "Movies")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      flex: 1
    }
  }, items.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.id,
    icon: it.icon,
    label: it.label,
    active: view === it.id,
    onClick: () => onNav(it.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-subtle)',
      paddingTop: 12,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(NavItem, {
    icon: "settings",
    label: "Settings",
    active: view === 'settings',
    onClick: () => onNav('settings')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      marginTop: 8,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(255,255,255,0.01)',
      border: '1px solid var(--border-faint)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: 'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(userEmail),
    alt: "",
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'var(--zinc-800)',
      border: '1px solid var(--border-subtle)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, userEmail.split('@')[0]), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 10,
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, userEmail)))));
}
window.DorfSidebar = DorfSidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dorfmovies/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dorfmovies/data.js
try { (() => {
// DorfMovies UI-kit sample data. Poster paths are TMDB; components fall back to
// a tinted title well if any image fails to load.
window.DORF_DATA = function () {
  const IMG = 'https://image.tmdb.org/t/p/w500';
  const titles = [{
    id: 1,
    title: 'Dune: Part Two',
    year: 2024,
    type: 'movie',
    poster: IMG + '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    rating: 4.5,
    tmdb: 8.2,
    genres: ['Sci-Fi', 'Adventure'],
    runtime: 166,
    director: 'Denis Villeneuve',
    review: 'Operatic, overwhelming, and the best blockbuster filmmaking in years.',
    watched: '2026-06-12'
  }, {
    id: 2,
    title: 'Oppenheimer',
    year: 2023,
    type: 'movie',
    poster: IMG + '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    rating: 4.5,
    tmdb: 8.1,
    genres: ['Drama', 'History'],
    runtime: 181,
    director: 'Christopher Nolan',
    review: 'A towering, relentless character study.',
    watched: '2026-06-09'
  }, {
    id: 3,
    title: 'Poor Things',
    year: 2023,
    type: 'movie',
    poster: IMG + '/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg',
    rating: 4,
    tmdb: 7.8,
    genres: ['Comedy', 'Romance'],
    runtime: 141,
    director: 'Yorgos Lanthimos',
    review: 'Gloriously strange and fearless.',
    watched: '2026-06-03'
  }, {
    id: 4,
    title: 'Past Lives',
    year: 2023,
    type: 'movie',
    poster: IMG + '/rKcXP15JNQfNAFgKQDuUbZ4pBL.jpg',
    rating: 5,
    tmdb: 7.9,
    genres: ['Romance', 'Drama'],
    runtime: 105,
    director: 'Celine Song',
    review: 'Quietly devastating. The ending wrecked me.',
    watched: '2026-05-28'
  }, {
    id: 5,
    title: 'The Zone of Interest',
    year: 2023,
    type: 'movie',
    poster: IMG + '/hUu9zyZmDd8VZegKi1iK1Vk0eL6.jpg',
    rating: 4.5,
    tmdb: 7.4,
    genres: ['Drama', 'War'],
    runtime: 105,
    director: 'Jonathan Glazer',
    review: 'Chilling in the most banal, unforgettable way.',
    watched: '2026-05-20'
  }, {
    id: 6,
    title: 'Severance',
    year: 2022,
    type: 'show',
    poster: IMG + '/lFf6LLrQjYldcZItzOkGmMMigP7.jpg',
    rating: 5,
    tmdb: 8.7,
    genres: ['Sci-Fi', 'Thriller'],
    runtime: 50,
    director: 'Dan Erickson',
    review: 'Hypnotic. Season two stuck the landing.',
    watched: '2026-06-08'
  }, {
    id: 7,
    title: 'Shogun',
    year: 2024,
    type: 'show',
    poster: IMG + '/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg',
    rating: 4.5,
    tmdb: 8.6,
    genres: ['Drama', 'History'],
    runtime: 60,
    director: 'Justin Marks',
    review: 'Sumptuous and patient. A masterclass.',
    watched: '2026-05-31'
  }, {
    id: 8,
    title: 'The Bear',
    year: 2022,
    type: 'show',
    poster: IMG + '/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg',
    rating: 4,
    tmdb: 8.4,
    genres: ['Comedy', 'Drama'],
    runtime: 30,
    director: 'Christopher Storer',
    review: 'Anxiety as television. I mean that as praise.',
    watched: '2026-05-15'
  }];
  const watchlist = [{
    id: 9,
    title: 'Challengers',
    year: 2024,
    type: 'movie',
    poster: IMG + '/H6vke7zGiuLsz4v4RPeReb9rsv.jpg',
    tmdb: 7.1,
    genres: ['Drama', 'Romance'],
    priority: 'must_watch'
  }, {
    id: 10,
    title: 'Nosferatu',
    year: 2024,
    type: 'movie',
    poster: IMG + '/5qGIxdEO841C0tdY8vOdLoRVrr0.jpg',
    tmdb: 6.8,
    genres: ['Horror'],
    priority: 'must_watch'
  }, {
    id: 11,
    title: 'Fallout',
    year: 2024,
    type: 'show',
    poster: IMG + '/AnsSKR9LuK0T9bAGV5Onp4y50R5.jpg',
    tmdb: 8.3,
    genres: ['Sci-Fi'],
    priority: 'want_to_watch'
  }, {
    id: 12,
    title: 'Anora',
    year: 2024,
    type: 'movie',
    poster: IMG + '/qXOQv7bgQ8z8WD4yk5pXJ8vHqz.jpg',
    tmdb: 7.0,
    genres: ['Comedy', 'Drama'],
    priority: 'someday'
  }];
  return {
    watched: titles,
    watchlist,
    all: titles.concat(watchlist),
    stats: {
      thisYear: 42,
      mustWatch: 2,
      movies: 31,
      shows: 11,
      episodes: 214,
      hours: 388
    }
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dorfmovies/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.IconChip = __ds_scope.IconChip;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.MediaRow = __ds_scope.MediaRow;

__ds_ns.PosterCard = __ds_scope.PosterCard;

__ds_ns.StarRating = __ds_scope.StarRating;

__ds_ns.NavItem = __ds_scope.NavItem;

__ds_ns.GlassCard = __ds_scope.GlassCard;

__ds_ns.SpotlightCard = __ds_scope.SpotlightCard;

__ds_ns.StatTile = __ds_scope.StatTile;

})();
