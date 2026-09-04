import { C, mono, labelSm } from './tokens'
import { bar } from './format'
import { clickable } from './interaction'

export function XDel({ onClick, size = 16, style, label = 'Delete' }) {
  return (
    <div className="x-del" {...clickable(onClick, label)} style={{ fontSize: size, ...style }}>
      ×
    </div>
  )
}

export function Bar({ pct, color = C.accent, height = 6, style }) {
  return (
    <div style={{ height, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden', ...style }}>
      <div style={bar(pct, color)} />
    </div>
  )
}

export function Empty({ children, style }) {
  return (
    <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, padding: '14px 0 4px', ...style }}>
      {children}
    </div>
  )
}

export function Label({ children, style }) {
  return <div style={{ ...labelSm, ...style }}>{children}</div>
}

export function Progress({ title, pctLabel, left, right, barPct, color }) {
  return (
    <div style={{ padding: '15px 0 0', borderTop: `1px solid ${C.line}`, marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontSize: 13 }}>{title}</span>
        <span style={{ fontFamily: mono, fontSize: 12.5 }}>{pctLabel}</span>
      </div>
      <Bar pct={barPct} color={color} style={{ margin: '9px 0 7px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11.5, color: C.muted }}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  )
}

