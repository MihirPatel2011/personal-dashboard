// The Compass style kit, bound to Apex's CSS variables rather than to fixed
// hex values — so these screens follow the paper/ink toggle like the rest of
// the app instead of pinning themselves to light mode.

export const C = {
  accent:   'var(--accent)',
  ink:      'var(--ink)',
  inkSoft:  'var(--ink)',
  paper:    'var(--bg)',
  card:     'var(--surface)',
  cardTint: 'var(--surface-2)',
  line:     'var(--border)',
  lineSoft: 'var(--border)',
  lineFaint:'var(--border)',
  field:    'var(--border-2)',
  muted:    'var(--ink-3)',
  muted2:   'var(--ink-2)',
  dim:      'var(--ink-4)',
  green:    'var(--ok)',
  red:      'var(--danger)',
  blue:     'var(--info)',
  warn:     'var(--warn)',
}

export const serif = 'var(--display)'
export const mono = 'var(--mono)'
export const sans = 'var(--font)'

export const label = {
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: C.muted,
}

export const labelSm = { ...label, fontSize: 9.5, letterSpacing: '0.12em' }

export const card = {
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 14,
  padding: 22,
}

export const input = {
  padding: '9px 11px',
  border: `1px solid ${C.field}`,
  borderRadius: 8,
  background: C.cardTint,
  color: C.ink,
  fontSize: 12.5,
  minWidth: 0,
}

export const inputWhite = { ...input, background: C.card }

export const btnDark = {
  padding: '9px 16px',
  border: 'none',
  borderRadius: 8,
  background: C.ink,
  color: 'var(--bg)',
  fontSize: 12.5,
  cursor: 'pointer',
}

export const btnGhost = {
  padding: '9px 14px',
  border: `1px solid ${C.field}`,
  borderRadius: 8,
  background: C.card,
  color: C.ink,
  fontSize: 12,
  cursor: 'pointer',
}

export const sectionTitle = { margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 22 }

export const pill = (active) => ({
  padding: '7px 14px',
  borderRadius: 99,
  cursor: 'pointer',
  fontSize: 12.5,
  border: `1px solid ${active ? C.ink : C.field}`,
  background: active ? C.ink : C.card,
  color: active ? 'var(--bg)' : C.muted2,
})

export const segment = (active) => ({
  padding: '7px 16px',
  borderRadius: 99,
  cursor: 'pointer',
  fontSize: 12.5,
  background: active ? C.card : 'transparent',
  color: active ? C.ink : C.muted,
  boxShadow: active ? 'var(--shadow-sm)' : 'none',
})

export const segmentWrap = {
  display: 'flex',
  gap: 6,
  padding: 4,
  background: 'var(--surface-3)',
  borderRadius: 99,
}

export const chip = (on) => ({
  padding: '6px 11px',
  borderRadius: 99,
  cursor: 'pointer',
  fontSize: 11.5,
  whiteSpace: 'nowrap',
  border: `1px solid ${on ? C.ink : C.field}`,
  background: on ? C.ink : 'transparent',
  color: on ? 'var(--bg)' : C.muted2,
})

export const linkAction = {
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: C.accent,
  cursor: 'pointer',
}

export const grid = (min, gap = 22) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
  gap,
  alignItems: 'start',
})
