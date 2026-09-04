import { STAGE_COLORS } from '../../constants';

// Compass sets small labels in mono caps rather than bold sans.
const chip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 9px',
  borderRadius: 6,
  fontFamily: 'var(--mono)',
  fontSize: 9.5,
  fontWeight: 500,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  lineHeight: 1.3,
};

export function StageBadge({ stage }) {
  const c = STAGE_COLORS[stage] || { bg: 'var(--surface-3)', text: 'var(--ink-3)' };
  return <span style={{ ...chip, background: c.bg, color: c.text }}>{stage}</span>;
}

export function PriorityBadge({ priority }) {
  const map = {
    Urgent: { bg: 'var(--danger-dim)', text: 'var(--danger)' },
    High:   { bg: 'var(--cat-5-dim)',  text: 'var(--cat-5)'  },
    Medium: { bg: 'var(--warn-dim)',   text: 'var(--warn)'   },
    Low:    { bg: 'var(--cat-3-dim)',  text: 'var(--cat-3)'  },
  };
  const c = map[priority] || { bg: 'var(--surface-3)', text: 'var(--ink-3)' };
  return <span style={{ ...chip, padding: '3px 8px', background: c.bg, color: c.text }}>{priority}</span>;
}
