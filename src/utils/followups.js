// src/utils/followups.js
// Single source of truth for the Client Follow-ups tracker:
// status definitions, the "action needed" rule (what you owe a response on),
// sorting, and the per-client comment thread (reuses mortgage notes).
//
// Follow-up document (RTDB node `followups`):
//   { clientId, status: 'waiting_me' | 'waiting_client' | 'closed',
//     dueDate: 'YYYY-MM-DD' | '', createdAt, updatedAt }
import { isToday, isPast } from './index';

export const STATUSES = [
  { id: 'waiting_me',     label: 'Waiting on me',     short: 'On me',     color: 'var(--warn)', dim: 'var(--warn-dim)', border: 'var(--warn)'  },
  { id: 'waiting_client', label: 'Waiting on client', short: 'On client', color: 'var(--info)', dim: 'var(--info-dim)', border: 'var(--info)'  },
  { id: 'closed',         label: 'Closed',            short: 'Closed',    color: 'var(--ok)',   dim: 'var(--ok-dim)',   border: 'var(--ok)'    },
];
export const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.id, s]));

// You owe the next move: "waiting on me" and due now (no date set, due today, or overdue).
export function actionNeeded(f) {
  return f.status === 'waiting_me' && (!f.dueDate || isPast(f.dueDate) || isToday(f.dueDate));
}

const STATUS_ORDER = { waiting_me: 0, waiting_client: 1, closed: 2 };

// Action-needed first, then by status, then soonest due date, then most recent.
export function sortFollowups(list) {
  return [...list].sort((a, b) => {
    const an = actionNeeded(a), bn = actionNeeded(b);
    if (an !== bn) return an ? -1 : 1;
    const so = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (so) return so;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

// A client's notes, newest first — used as the follow-up comment thread.
export function clientNotes(notes, clientId) {
  return notes
    .filter(n => n.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
}
