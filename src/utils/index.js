// ─── Currency & Numbers ───────────────────────────────────────────────────────
export function formatCurrency(n, compact = false) {
  const v = Math.round(Math.abs(Number(n) || 0));
  if (compact && v >= 1_000_000) return (n < 0 ? '-' : '') + '$' + (v / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (compact && v >= 1_000) return (n < 0 ? '-' : '') + '$' + (v / 1_000).toFixed(0) + 'k';
  return (n < 0 ? '-$' : '$') + v.toLocaleString('en-AU');
}

export function formatNumber(n) {
  return Math.round(Math.abs(Number(n) || 0)).toLocaleString();
}

export function pct(actual, target) {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((actual / target) * 1000) / 10));
}

export function pctRound(actual, target) {
  return Math.round(pct(actual, target));
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function todayTs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function tsToDateInput(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function dateInputToTs(str) {
  if (!str) return todayTs();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function oneYearFromTs(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()).getTime();
}

export function fmtDate(val) {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  if (isNaN(d)) return '—';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function fmtShortDate(val) {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  if (isNaN(d)) return '—';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - (typeof ts === 'string' ? new Date(ts).getTime() : ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return fmtShortDate(ts);
}

export function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return d.getTime() === t.getTime();
}

export function isPast(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return d < t;
}

export function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function isThisYear(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr).getFullYear() === new Date().getFullYear();
}

export function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  const limit = new Date(t); limit.setDate(limit.getDate() + days);
  return d >= t && d <= limit;
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getDayLabel() {
  const d = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return `${days[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ─── Goals math ───────────────────────────────────────────────────────────────
const DAY_MS  = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
const CYCLE_MS = 42 * DAY_MS;

export function deriveQuarters(yearStartTs) {
  const d = new Date(yearStartTs);
  const sy = d.getFullYear(), sm = d.getMonth(), sd = d.getDate();
  return Array.from({ length: 4 }, (_, i) => ({
    idx:    i,
    label:  `Q${i + 1}`,
    qStart: new Date(sy + Math.floor((sm + i * 3) / 12), (sm + i * 3) % 12, sd).getTime(),
    qEnd:   new Date(sy + Math.floor((sm + (i + 1) * 3) / 12), (sm + (i + 1) * 3) % 12, sd).getTime(),
  }));
}

export function getGoalPeriods(goal) {
  const now = Date.now();
  const yearStart = goal.yearStart || todayTs();
  const yearEnd   = goal.yearEnd   || oneYearFromTs(yearStart);
  const quarters  = deriveQuarters(yearStart);

  let qIdx = 3;
  for (let i = 0; i < 3; i++) {
    if (now < quarters[i].qEnd) { qIdx = i; break; }
  }
  if (now < quarters[0].qStart) qIdx = 0;
  const { qStart, qEnd } = quarters[qIdx];

  const qElapsed   = Math.max(0, now - qStart);
  const cycleIdx   = Math.floor(qElapsed / CYCLE_MS);
  const cycleStart = qStart + cycleIdx * CYCLE_MS;
  const cycleEnd   = cycleStart + CYCLE_MS;

  const cElapsed  = Math.max(0, now - cycleStart);
  const weekIdx   = Math.floor(cElapsed / WEEK_MS);
  const weekStart = cycleStart + weekIdx * WEEK_MS;
  const weekEnd   = weekStart + WEEK_MS;

  return {
    yearStart, yearEnd,
    qStart, qEnd, qIdx, qName: `Q${qIdx + 1}`,
    cycleStart, cycleEnd, cycleIdx,
    weekStart, weekEnd, weekIdx,
    quarters,
  };
}

export function getGoalActuals(goal, logArr) {
  const gp = getGoalPeriods(goal);
  const goalLog = logArr.filter(l => l.goalId === goal.id);
  const sum = (s, e) => goalLog.filter(l => l.ts >= s && l.ts < e).reduce((a, l) => a + (l.amt || 0), 0);
  const pastQ = (goal.pastQSummaries || []).reduce((a, q) => a + (q.actual || 0), 0);
  return {
    year:  sum(gp.yearStart,  gp.yearEnd) + pastQ,
    q:     sum(gp.qStart,     gp.qEnd),
    cycle: sum(gp.cycleStart, gp.cycleEnd),
    week:  sum(gp.weekStart,  gp.weekEnd),
  };
}

export function getGoalIdeal(goal, type) {
  const gp  = getGoalPeriods(goal);
  const now = Date.now();
  const cl  = v => Math.round(Math.min(100, Math.max(0, v)));
  if (type === 'year')  return cl((now - gp.yearStart)  / (gp.yearEnd  - gp.yearStart)  * 100);
  if (type === 'q')     return cl((now - gp.qStart)     / (gp.qEnd     - gp.qStart)     * 100);
  if (type === 'cycle') return cl((now - gp.cycleStart) / (gp.cycleEnd - gp.cycleStart) * 100);
  if (type === 'week')  return cl((now - gp.weekStart)  / (gp.weekEnd  - gp.weekStart)  * 100);
  return 0;
}

export function paceStatus(progress, target, ideal) {
  if (!target) return { key: 'ontrack', label: 'On pace', delta: 0 };
  const delta = (progress / target * 100) - ideal;
  if (delta <= -8)  return { key: 'behind',  label: 'Behind',  delta };
  if (delta >   5)  return { key: 'ahead',   label: 'Ahead',   delta };
  return                   { key: 'ontrack', label: 'On pace', delta };
}

export function getCycleWeeks(goal, logArr) {
  const gp  = getGoalPeriods(goal);
  const now = Date.now();
  return Array.from({ length: 6 }, (_, i) => {
    const start  = gp.cycleStart + i * WEEK_MS;
    const end    = start + WEEK_MS;
    const status = end <= now ? 'done' : start <= now ? 'now' : 'next';
    const actual = logArr.filter(l => l.goalId === goal.id && l.ts >= start && l.ts < end).reduce((s, l) => s + (l.amt || 0), 0);
    const target = goal.cycle?.target > 0 ? Math.round(goal.cycle.target / 6) : 0;
    const ws = new Date(start), we = new Date(end - 1);
    const range  = `${MONTHS[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}`;
    return { label: `W${i + 1}`, range, actual, target, status };
  });
}

// ─── IDs ─────────────────────────────────────────────────────────────────────
export function genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function toArr(snap) {
  if (!snap) return [];
  const v = typeof snap === 'object' && !Array.isArray(snap) ? snap : {};
  return Object.entries(v).map(([id, val]) => ({ id, ...val }));
}

// ─── Misc ─────────────────────────────────────────────────────────────────────
export function initials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export function fmtFocus(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
