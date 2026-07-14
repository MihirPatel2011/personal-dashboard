// src/utils/focusLog.js — pure helpers for the Focus Log module.
// Times are local 'YYYY-MM-DDTHH:mm' strings (datetime-local format).
// Timed/untimed rule (spec §3): if a set of logs contains ≥1 entry with a
// numeric durationMin, stats are minutes-based and untimed entries are
// excluded; otherwise stats fall back to entry counts.

const pad = n => String(n).padStart(2, '0');
const MONTHS3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function nowLocalInput(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// May return a negative number (end before start) — callers treat <0 as invalid.
export function computeDurationMin(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const ms = new Date(endTime) - new Date(startTime);
  return isNaN(ms) ? null : Math.round(ms / 60000);
}

// 'Zack - Email docs' → 'Zack'; no separator → ''
export function parseClientFromActivity(activity) {
  const m = (activity || '').match(/^([^-–]{1,30}?)\s*[-–]\s+/);
  return m ? m[1].trim() : '';
}

export function fmtDurationMin(min) { // 85 → '1h 25m'
  if (min == null) return '';
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function fmtClock(isoLocal) { return isoLocal ? isoLocal.slice(11, 16) : ''; }
export function dayKeyOf(isoLocal) { return (isoLocal || '').slice(0, 10); }

export function fmtDayHeader(dayKey) { // '2026-07-06' → 'Monday, Jul 6'
  const d = new Date(dayKey + 'T00:00');
  if (isNaN(d)) return dayKey;
  return `${DAYS_FULL[d.getDay()]}, ${MONTHS3[d.getMonth()]} ${d.getDate()}`;
}

export function fmtHour(h) { // 14 → '2pm'
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n}${h < 12 ? 'am' : 'pm'}`;
}

// [{ dayKey, entries }] — newest day first, entries newest-start first.
export function groupByDay(logs) {
  const map = {};
  for (const l of logs) {
    const k = dayKeyOf(l.startTime);
    if (!k) continue;
    (map[k] = map[k] || []).push(l);
  }
  return Object.keys(map).sort((a, b) => b.localeCompare(a)).map(k => ({
    dayKey: k,
    entries: map[k].sort((a, b) => (b.startTime || '').localeCompare(a.startTime || '')),
  }));
}

// ─── Periods ──────────────────────────────────────────────────────────────
export const PERIODS = [
  { id: '30d',     label: '30 days' },
  { id: 'week',    label: 'Week' },
  { id: 'month',   label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year',    label: 'Year' },
];

export function periodRange(id, now = new Date()) {
  const s = new Date(now); s.setHours(0, 0, 0, 0);
  const e = new Date(now); e.setHours(23, 59, 59, 999);
  if (id === '30d') { s.setDate(s.getDate() - 29); return { start: s, end: e }; }
  if (id === 'week') {
    s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday start
    const we = new Date(s); we.setDate(s.getDate() + 6); we.setHours(23, 59, 59, 999);
    return { start: s, end: we };
  }
  if (id === 'month') {
    s.setDate(1);
    const me = new Date(s.getFullYear(), s.getMonth() + 1, 0); me.setHours(23, 59, 59, 999);
    return { start: s, end: me };
  }
  if (id === 'quarter') {
    const q = Math.floor(s.getMonth() / 3);
    const qs = new Date(s.getFullYear(), q * 3, 1);
    const qe = new Date(s.getFullYear(), q * 3 + 3, 0); qe.setHours(23, 59, 59, 999);
    return { start: qs, end: qe };
  }
  const ys = new Date(s.getFullYear(), 0, 1);
  const ye = new Date(s.getFullYear(), 11, 31); ye.setHours(23, 59, 59, 999);
  return { start: ys, end: ye };
}

export function filterByPeriod(logs, range) {
  return logs.filter(l => {
    const t = new Date(l.startTime);
    return !isNaN(t) && t >= range.start && t <= range.end;
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────
export function splitTimed(logs) {
  const timed = logs.filter(l => typeof l.durationMin === 'number' && l.durationMin > 0);
  return { timed, untimedCount: logs.length - timed.length, useMinutes: timed.length > 0 };
}

// { cells: number[24], useMinutes, untimedCount } — weight by startTime hour.
export function hourHistogram(logs) {
  const { timed, untimedCount, useMinutes } = splitTimed(logs);
  const src = useMinutes ? timed : logs;
  const cells = Array(24).fill(0);
  for (const l of src) {
    const h = new Date(l.startTime).getHours();
    if (!isNaN(h)) cells[h] += useMinutes ? l.durationMin : 1;
  }
  return { cells, useMinutes, untimedCount };
}

// { hour, category } for the busiest hour, or null when the period is empty.
export function peakWindow(logs) {
  const { cells, useMinutes } = hourHistogram(logs);
  const max = Math.max(...cells);
  if (max <= 0) return null;
  const hour = cells.indexOf(max);
  const counts = {};
  for (const l of logs) {
    if (new Date(l.startTime).getHours() !== hour) continue;
    const w = useMinutes ? (typeof l.durationMin === 'number' ? l.durationMin : 0) : 1;
    counts[l.category || 'Other'] = (counts[l.category || 'Other'] || 0) + w;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { hour, category: top && top[1] > 0 ? top[0] : null };
}

// [{ name, value }] sorted desc — minutes or counts per the timed rule.
export function categoryBreakdown(logs) {
  const { timed, useMinutes } = splitTimed(logs);
  const src = useMinutes ? timed : logs;
  const map = {};
  for (const l of src) {
    const k = l.category || 'Other';
    map[k] = (map[k] || 0) + (useMinutes ? l.durationMin : 1);
  }
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

// { buckets: [{ label, value }], useMinutes } — value is hours (1dp) or counts.
// Buckets: per-day (30d/week/month), per-week (quarter), per-month (year).
export function volumeTrend(logs, periodId, range) {
  const { timed, useMinutes } = splitTimed(logs);
  const src = useMinutes ? timed : logs;
  const val = l => (useMinutes ? l.durationMin / 60 : 1);
  let buckets;
  if (periodId === 'year') {
    buckets = MONTHS3.map(m => ({ label: m, value: 0 }));
    for (const l of src) {
      const d = new Date(l.startTime);
      if (!isNaN(d)) buckets[d.getMonth()].value += val(l);
    }
  } else if (periodId === 'quarter') {
    buckets = [];
    for (let ws = new Date(range.start); ws <= range.end; ws.setDate(ws.getDate() + 7)) {
      buckets.push({ label: `${ws.getDate()}/${ws.getMonth() + 1}`, value: 0 });
    }
    for (const l of src) {
      const t = new Date(l.startTime).getTime();
      const i = Math.floor((t - range.start.getTime()) / (7 * 86400000));
      if (buckets[i]) buckets[i].value += val(l);
    }
  } else {
    buckets = [];
    const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    for (let d = new Date(range.start); d <= range.end; d.setDate(d.getDate() + 1)) {
      buckets.push({ key: keyOf(d), label: `${d.getDate()}/${d.getMonth() + 1}`, value: 0 });
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    for (const l of src) {
      const k = dayKeyOf(l.startTime);
      if (k in idx) buckets[idx[k]].value += val(l);
    }
  }
  for (const b of buckets) b.value = Math.round(b.value * 10) / 10;
  return { buckets, useMinutes };
}

// { items: [{ name, value }], useMinutes } — top n clients; no-client entries excluded.
export function topClients(logs, n = 5) {
  const withClient = logs.filter(l => (l.client || '').trim());
  const { useMinutes } = splitTimed(withClient);
  const map = {};
  for (const l of withClient) {
    const key = l.client.trim().toLowerCase();
    const v = useMinutes ? (typeof l.durationMin === 'number' ? l.durationMin : 0) : 1;
    if (!map[key]) map[key] = { name: l.client.trim(), value: 0 };
    map[key].value += v;
  }
  return {
    items: Object.values(map).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, n),
    useMinutes,
  };
}
