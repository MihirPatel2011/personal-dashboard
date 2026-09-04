import { useState } from 'react'
import { C, labelSm } from './tokens'

/**
 * A field that reads as plain text until you touch it — so the detail panel
 * keeps the design's quiet typographic look while still being editable.
 */
/**
 * The dropdown twin of EditField — sits in the same label-over-value grid but
 * picks from a managed list (banks, referral partners) instead of free text.
 */
export function SelectField({ label, value, options, onCommit, placeholder = '—', onManage, manageLabel }) {
  // Keep a value that is no longer in the list visible rather than silently
  // reassigning the file to whatever happens to be first.
  const opts = [...new Set(options.filter(Boolean))]
  const orphan = value && !opts.includes(value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <span style={{ ...labelSm, display: 'flex', gap: 8, alignItems: 'baseline' }}>
        {label}
        {onManage ? (
          <span
            role="button"
            tabIndex={0}
            onClick={onManage}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onManage()}
            style={{ color: C.accent, cursor: 'pointer', letterSpacing: '0.12em' }}
          >
            {manageLabel || 'Edit'}
          </span>
        ) : null}
      </span>
      <select
        value={value || ''}
        onChange={(e) => onCommit(e.target.value)}
        style={{
          width: '100%',
          fontSize: 13,
          padding: '4px 6px',
          margin: '-4px -6px',
          borderRadius: 6,
          border: `1px solid ${C.field}`,
          background: C.cardTint,
          color: value ? C.ink : C.muted,
        }}
      >
        <option value="">{placeholder}</option>
        {orphan && <option value={value}>{value}</option>}
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function EditField({
  label,
  value,
  onCommit,
  type = 'text',
  placeholder = '—',
  fontSize = 13,
  style,
  format,
}) {
  // `draft` is null whenever the field is at rest, so the resting value always
  // mirrors the stored one — no syncing needed. Editing money used to mean
  // typing into a formatted string ("$1,150,000"), which appended rather than
  // replaced and committed nonsense; the draft holds the raw value instead.
  const [draft, setDraft] = useState(null)
  const editing = draft !== null
  const shown = editing
    ? draft
    : (value === '' || value === null || value === undefined
        ? ''
        : (format ? format(value) : value))

  const commit = () => {
    if (draft === null) return
    const next = type === 'number'
      ? Number(String(draft).replace(/[^0-9.-]/g, '')) || 0
      : draft
    setDraft(null)
    if (next !== value) onCommit(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, ...style }}>
      {label ? <span style={labelSm}>{label}</span> : null}
      <input
        type={type === 'number' ? 'text' : type}
        value={shown}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setDraft(value === null || value === undefined ? '' : String(value))
          // Typing should replace the figure, not land in the middle of it.
          requestAnimationFrame(() => e.target.select?.())
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur() }
        }}
        style={{
          width: '100%',
          fontSize,
          padding: '4px 6px',
          margin: '-4px -6px',
          borderRadius: 6,
          border: `1px solid ${editing ? C.field : 'transparent'}`,
          background: editing ? C.cardTint : 'transparent',
          color: C.ink,
        }}
      />
    </div>
  )
}
