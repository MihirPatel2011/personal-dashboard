// src/utils/bujo.js
// Single source of truth for the Bullet Journal (BuJo) module:
// entry types & glyphs, signifiers, the task state machine, migration rules,
// index generation, log-key/date helpers, and first-load seed data.
//
// Pure logic only — no React, no Firebase. Mirrors the crmCompliance.js style.
//
// Entry document shape (stored in RTDB node `bujoEntries`):
//   { type, state, signifiers:{priority?}, text, logType, logKey,
//     eventDate?, order, migration:[{action,fromType,fromKey,ts}], createdAt, updatedAt }
// Collection document shape (RTDB node `bujoCollections`):
//   { title, order, createdAt, updatedAt }

// ─── Entry types ────────────────────────────────────────────────────────────
// `hasState` types are tasks: their glyph depends on `state` and they cycle.
// Other types render a fixed glyph.
export const ENTRY_TYPES = [
  { id: 'task',       label: 'Task',        glyph: '•', hasState: true  },
  { id: 'note',       label: 'Note',        glyph: '—', hasState: false },
  { id: 'event',      label: 'Event',       glyph: '○', hasState: false },
  { id: 'idea',       label: 'Idea',        glyph: '⚡', hasState: false },
  { id: 'inProgress', label: 'In progress', glyph: '↗', hasState: false },
  { id: 'happened',   label: 'Happened',    glyph: '△', hasState: false },
  { id: 'mood',       label: 'Mood',        glyph: '♡', hasState: false },
];

export const ENTRY_TYPE_MAP = Object.fromEntries(ENTRY_TYPES.map(t => [t.id, t]));

// Order the Quick-add hotkey cycles through.
export const QUICK_ADD_CYCLE = ['task', 'note', 'event', 'idea', 'inProgress', 'happened', 'mood'];

export function nextQuickAddType(typeId) {
  const i = QUICK_ADD_CYCLE.indexOf(typeId);
  return QUICK_ADD_CYCLE[(i + 1) % QUICK_ADD_CYCLE.length];
}

// ─── Task state machine ───────────────────────────────────────────────────────
// Click-cycle order for a task bullet. `irrelevant` (struck-out / abandoned) is
// reached only through the migration flow, never via a stray bullet click.
export const TASK_STATES = ['open', 'complete', 'migrated', 'scheduled'];

export const TASK_STATE_GLYPH = {
  open:       '•',
  complete:   '✕',
  migrated:   '>',
  scheduled:  '<',
  irrelevant: '•',  // rendered with strikethrough by the row
};

export const TASK_STATE_LABEL = {
  open:       'Open task',
  complete:   'Completed',
  migrated:   'Migrated forward',
  scheduled:  'Scheduled to Future Log',
  irrelevant: 'Abandoned',
};

export function cycleTaskState(state) {
  const i = TASK_STATES.indexOf(state);
  // Anything off-cycle (e.g. irrelevant) snaps back to open.
  if (i === -1) return 'open';
  return TASK_STATES[(i + 1) % TASK_STATES.length];
}

// Glyph for any entry given its type + state.
export function glyphFor(entry) {
  const t = ENTRY_TYPE_MAP[entry.type];
  if (!t) return '•';
  if (t.hasState) return TASK_STATE_GLYPH[entry.state] || '•';
  return t.glyph;
}

// ─── Signifiers ─────────────────────────────────────────────────────────────
// Extensible set shown LEFT of the bullet. Priority (★) is the essential one.
export const SIGNIFIERS = [
  { id: 'priority', glyph: '★', label: 'Priority' },
];

export function toggleSignifier(signifiers, id) {
  const next = { ...(signifiers || {}) };
  if (next[id]) delete next[id];
  else next[id] = true;
  return next;
}

// ─── Date / log-key helpers ───────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DOW    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const pad2   = n => String(n).padStart(2, '0');

export function dailyKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}
export const todayKey   = () => dailyKey(new Date());
export const thisMonthKey = () => monthKey(new Date());
export const monthOfDaily = dk => (dk || '').slice(0, 7);

export function parseDaily(dk) {
  const [y, m, d] = dk.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function parseMonth(mk) {
  const [y, m] = mk.split('-').map(Number);
  return { year: y, month: m - 1 };
}

export function addDaysKey(dk, n) {
  const d = parseDaily(dk);
  d.setDate(d.getDate() + n);
  return dailyKey(d);
}
export function addMonthsKey(mk, n) {
  const { year, month } = parseMonth(mk);
  return monthKey(new Date(year, month + n, 1));
}

export function monthLabel(mk) {
  const { year, month } = parseMonth(mk);
  return `${MONTHS[month]} ${year}`;
}
export function dailyLabel(dk) {
  const d = parseDaily(dk);
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function isTodayKey(dk) { return dk === todayKey(); }

// Every date of a month, with day-of-week single-letter initial — for the calendar.
export function monthDays(mk) {
  const { year, month } = parseMonth(mk);
  const total = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    const d   = new Date(year, month, day);
    return {
      day,
      dk:      dailyKey(d),
      dowInit: DOW[d.getDay()][0],   // S M T W T F S
      dow:     d.getDay(),
    };
  });
}

// The next `count` months (starting next month) for the Future Log.
export function futureMonths(count = 12, from = new Date()) {
  const base = monthKey(from);
  return Array.from({ length: count }, (_, i) => addMonthsKey(base, i + 1));
}

// ─── Entry filtering / ordering ───────────────────────────────────────────────
export function sortEntries(entries) {
  return [...entries].sort((a, b) =>
    (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0));
}

export function entriesFor(entries, logType, logKey) {
  return sortEntries(entries.filter(e => e.logType === logType && e.logKey === logKey));
}

export function isOpenTask(e) {
  return e.type === 'task' && e.state === 'open';
}

// ─── Migration ────────────────────────────────────────────────────────────────
// A migrated/scheduled task COPIES into the target log as a fresh open task and
// remembers where it came from; the original is stamped with the closing state.
function originStamp(entry, action) {
  return [
    ...(entry.migration || []),
    { action, fromType: entry.logType, fromKey: entry.logKey, ts: Date.now() },
  ];
}

export function buildMigratedCopy(entry, targetMonthKey, order) {
  return {
    type:       'task',
    state:      'open',
    signifiers: entry.signifiers || {},
    text:       entry.text,
    note:       entry.note || '',
    logType:    'monthly',
    logKey:     targetMonthKey,
    order:      order ?? Date.now(),
    migration:  originStamp(entry, 'migrate'),
  };
}

export function buildScheduledCopy(entry, targetMonthKey, order) {
  return {
    type:       'task',
    state:      'open',
    signifiers: entry.signifiers || {},
    text:       entry.text,
    note:       entry.note || '',
    logType:    'future',
    logKey:     targetMonthKey,
    order:      order ?? Date.now(),
    migration:  originStamp(entry, 'schedule'),
  };
}

// Migrate forward to a specific day (today or later): a fresh open task lands on
// that date's Daily Log; the original keeps its place, marked 'migrated'.
export function buildForwardCopy(entry, targetDailyKey, order) {
  return {
    type:       'task',
    state:      'open',
    signifiers: entry.signifiers || {},
    text:       entry.text,
    note:       entry.note || '',
    logType:    'daily',
    logKey:     targetDailyKey,
    order:      order ?? Date.now(),
    migration:  originStamp(entry, 'migrate'),
  };
}

// ─── Monthly review helpers ───────────────────────────────────────────────────
// Incomplete (open) tasks logged in this month's daily entries, oldest first.
export function monthDailyOpenTasks(entries, mk) {
  return entries
    .filter(e => e.logType === 'daily' && e.type === 'task' && e.state === 'open' && monthOfDaily(e.logKey) === mk)
    .sort((a, b) => a.logKey.localeCompare(b.logKey) || (a.order ?? 0) - (b.order ?? 0));
}
// Tasks parked in the Future Log, soonest month first.
export function futureTasks(entries) {
  return entries
    .filter(e => e.logType === 'future' && e.type === 'task')
    .sort((a, b) => a.logKey.localeCompare(b.logKey) || (a.order ?? 0) - (b.order ?? 0));
}
// An open daily task dated before today is overdue.
export function isOverdueDaily(e) {
  return e.logType === 'daily' && e.type === 'task' && e.state === 'open' && e.logKey < todayKey();
}

// Short labels for chips.
export function dayChip(dk)   { const d = parseDaily(dk); return `${DOW[d.getDay()].slice(0, 3)} ${d.getDate()}`; }
export function monthChip(mk) { const { year, month } = parseMonth(mk); return `${MONTHS[month].slice(0, 3)} ${year}`; }

// ─── Weeks ─────────────────────────────────────────────────────────────────
// The Mon–Sun weeks that overlap a given month. weekKey is the Monday's date.
export function monthWeeks(mk) {
  const { year, month } = parseMonth(mk);
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const start = new Date(first);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));   // back to Monday
  const weeks = [];
  for (let cur = new Date(start); cur <= last; cur.setDate(cur.getDate() + 7)) {
    const ws = new Date(cur);
    const we = new Date(cur); we.setDate(we.getDate() + 6);
    const sameMonth = ws.getMonth() === we.getMonth();
    weeks.push({
      weekKey: dailyKey(ws),
      label: sameMonth
        ? `${MONTHS[ws.getMonth()].slice(0, 3)} ${ws.getDate()} – ${we.getDate()}`
        : `${MONTHS[ws.getMonth()].slice(0, 3)} ${ws.getDate()} – ${MONTHS[we.getMonth()].slice(0, 3)} ${we.getDate()}`,
    });
  }
  return weeks;
}
export function isThisWeek(weekKey) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const mon = new Date(t); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  return dailyKey(mon) === weekKey;
}

// ─── Focus timer formatting ───────────────────────────────────────────────────
export function clockFmt(ms) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
export function durationLabel(ms) {
  const min = Math.round(ms / 60000);
  if (min < 1) return `${Math.max(1, Math.round(ms / 1000))}s`;
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Index generation ─────────────────────────────────────────────────────────
// Derived, never stored. Produces grouped, clickable sections.
export function generateIndex(entries, collections) {
  const monthlyKeys = new Set();
  const futureKeys  = new Set();

  for (const e of entries) {
    if (e.logType === 'monthly')      monthlyKeys.add(e.logKey);
    else if (e.logType === 'daily')   monthlyKeys.add(monthOfDaily(e.logKey));
    else if (e.logType === 'future')  futureKeys.add(e.logKey);
  }
  // Always surface the current month so the Index is never empty.
  monthlyKeys.add(thisMonthKey());

  const countMonthly = mk =>
    entries.filter(e =>
      (e.logType === 'monthly' && e.logKey === mk) ||
      (e.logType === 'daily'   && monthOfDaily(e.logKey) === mk)
    ).length;

  const monthly = [...monthlyKeys].sort().reverse().map(mk => ({
    id:    `m_${mk}`,
    label: monthLabel(mk),
    sub:   `${countMonthly(mk)} ent`,
    route: `/journal/monthly?m=${mk}`,
  }));

  const future = [...futureKeys].sort().map(mk => ({
    id:    `f_${mk}`,
    label: monthLabel(mk),
    sub:   `${entries.filter(e => e.logType === 'future' && e.logKey === mk).length} scheduled`,
    route: `/journal/future`,
  }));

  const cols = [...(collections || [])]
    .sort((a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0))
    .map(c => ({
      id:    `c_${c.id}`,
      label: c.title || 'Untitled',
      sub:   `${entries.filter(e => e.logType === 'collection' && e.logKey === c.id).length} entr`,
      route: `/journal/collections?c=${c.id}`,
    }));

  return [
    { group: 'Monthly Logs', items: monthly },
    { group: 'Future Log',   items: future  },
    { group: 'Collections',  items: cols    },
  ].filter(s => s.items.length);
}

// ─── Seed data ──────────────────────────────────────────────────────────────
// Returns { entries, collections } for first-load population. The Collections'
// `__seedKey` lets the writer link seeded collection entries to the new id.
export function seedData() {
  const today = todayKey();
  const now   = Date.now();
  const e = (o, i) => ({
    signifiers: {}, migration: [], createdAt: now + i, updatedAt: now + i,
    order: now + i, ...o,
  });

  const dailyEntries = [
    e({ type: 'task',  state: 'open', text: 'Set up the Bullet Journal',        logType: 'daily', logKey: today, signifiers: { priority: true } }, 0),
    e({ type: 'task',  state: 'open', text: 'Review this week’s priorities',     logType: 'daily', logKey: today }, 1),
    e({ type: 'event', text: 'Team sync · 2pm',  logType: 'daily', logKey: today, eventDate: today }, 2),
    e({ type: 'note',  text: 'BuJo = rapid logging: short bulleted entries',     logType: 'daily', logKey: today }, 3),
    e({ type: 'idea',  text: 'Try a weekly gratitude collection',                logType: 'daily', logKey: today }, 4),
    e({ type: 'mood',  text: 'Optimistic',                                       logType: 'daily', logKey: today }, 5),
  ];

  const monthlyEntries = [
    e({ type: 'task',  state: 'open', text: 'Plan the month ahead', logType: 'monthly', logKey: thisMonthKey() }, 6),
  ];

  const seedCollection = { __seedKey: 'reading', title: 'Reading List', order: now, createdAt: now, updatedAt: now };
  const collectionEntries = [
    e({ type: 'note', text: '“Atomic Habits” — James Clear',          logType: 'collection', logKey: '__seed:reading' }, 7),
    e({ type: 'task', state: 'open', text: 'Finish chapter 3',         logType: 'collection', logKey: '__seed:reading' }, 8),
  ];

  return {
    collections: [seedCollection],
    entries: [...dailyEntries, ...monthlyEntries, ...collectionEntries],
  };
}
