import { STAGE_COLORS } from '../../constants';

export function StageBadge({ stage }) {
  const c = STAGE_COLORS[stage] || { bg: 'rgba(100,120,140,0.14)', text: '#7090A8' };
  return (
    <span style={{ background: c.bg, color: c.text, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.3 }}>
      {stage}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const map = {
    High:   { bg: 'rgba(239,68,68,0.14)',  text: '#EF4444' },
    Medium: { bg: 'rgba(245,158,11,0.14)', text: '#F59E0B' },
    Low:    { bg: 'rgba(34,197,94,0.14)',  text: '#22C55E' },
  };
  const c = map[priority] || { bg: 'var(--surface-3)', text: 'var(--ink-3)' };
  return (
    <span style={{ background: c.bg, color: c.text, display: 'inline-flex', padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    'To do':      { bg: 'var(--surface-3)',           text: 'var(--ink-3)' },
    'In progress':{ bg: 'rgba(96,165,250,0.14)',      text: '#60A5FA'       },
    Done:         { bg: 'rgba(34,197,94,0.14)',       text: '#22C55E'       },
    Cancelled:    { bg: 'rgba(239,68,68,0.14)',       text: '#EF4444'       },
  };
  const c = map[status] || { bg: 'var(--surface-3)', text: 'var(--ink-3)' };
  return (
    <span style={{ background: c.bg, color: c.text, display: 'inline-flex', padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}
