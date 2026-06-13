// ─── Focus stats & formatting helpers ──────────────────────────────────────────
// Pure functions over focusSessions / focusTasks / focusAreas / focusProjects.
// Kept framework-free so they're easy to reason about and test.

const DAY_MS = 86_400_000;

// ── Formatting ──────────────────────────────────────────────────────────────────
/** "01:23:45" elapsed clock for the running timer (seconds → H:MM:SS). */
export function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Human duration, e.g. "2h 5m", "45m", "30s". */
export function fmtDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** Hours as a 1-dp number for charts. */
export function toHours(seconds) {
  return Math.round(((seconds || 0) / 3600) * 10) / 10;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
export function dayStart(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function dateKey(ms)  { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function todayKey()   { return dateKey(Date.now()); }

// ── Aggregations ────────────────────────────────────────────────────────────────
function inRange(session, startMs, endMs) {
  const t = session.startTime || session.createdAt || 0;
  return t >= startMs && t < endMs;
}

/** Total focused seconds across the given sessions. */
export function totalSeconds(sessions) {
  return sessions.reduce((s, x) => s + (x.durationSeconds || 0), 0);
}

/** [{ areaId, name, color, seconds }] sorted desc, only areas with time. */
export function timeByArea(sessions, areas) {
  const byId = {};
  for (const s of sessions) {
    const id = s.areaId || '__none';
    byId[id] = (byId[id] || 0) + (s.durationSeconds || 0);
  }
  return Object.entries(byId)
    .map(([areaId, seconds]) => {
      const a = areas.find(x => x.id === areaId);
      return { areaId, name: a ? a.name : 'Unassigned', color: a ? a.color : 'var(--ink-3)', seconds };
    })
    .filter(x => x.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}

/** [{ projectId, name, color, seconds }] sorted desc. */
export function timeByProject(sessions, projects, areas) {
  const byId = {};
  for (const s of sessions) {
    if (!s.projectId) continue;
    byId[s.projectId] = (byId[s.projectId] || 0) + (s.durationSeconds || 0);
  }
  return Object.entries(byId)
    .map(([projectId, seconds]) => {
      const p = projects.find(x => x.id === projectId);
      const a = p && areas.find(x => x.id === p.areaId);
      return { projectId, name: p ? p.name : 'Unknown', color: a ? a.color : 'var(--ink-3)', seconds };
    })
    .filter(x => x.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}

/**
 * Stacked time-by-area over a date range, bucketed by day/week/month.
 * Returns { rows: [{ label, [areaId]: hours, ... }], areaKeys: [{ id, name, color }] }
 */
export function hoursPerAreaOverRange(sessions, areas, startMs, endMs, granularity = 'day') {
  const buckets = new Map(); // bucketKey -> { label, sortKey, byArea: {areaId: seconds} }

  const bucketFor = (ms) => {
    const d = new Date(ms);
    if (granularity === 'month') {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
      return { key, label, sortKey: key };
    }
    if (granularity === 'week') {
      const ws = new Date(ms); ws.setHours(0,0,0,0); ws.setDate(ws.getDate() - ((ws.getDay()+6)%7));
      const key = dateKey(ws.getTime());
      const label = ws.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
      return { key, label, sortKey: key };
    }
    const key = dateKey(ms);
    const label = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    return { key, label, sortKey: key };
  };

  const used = new Set();
  for (const s of sessions) {
    if (!inRange(s, startMs, endMs)) continue;
    const b = bucketFor(s.startTime || s.createdAt);
    if (!buckets.has(b.key)) buckets.set(b.key, { label: b.label, sortKey: b.sortKey, byArea: {} });
    const id = s.areaId || '__none';
    used.add(id);
    buckets.get(b.key).byArea[id] = (buckets.get(b.key).byArea[id] || 0) + (s.durationSeconds || 0);
  }

  const areaKeys = [...used].map(id => {
    const a = areas.find(x => x.id === id);
    return { id, name: a ? a.name : 'Unassigned', color: a ? a.color : '#888' };
  });

  const rows = [...buckets.values()]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(b => {
      const row = { label: b.label };
      for (const k of areaKeys) row[k.id] = toHours(b.byArea[k.id] || 0);
      return row;
    });

  return { rows, areaKeys };
}

/** Tasks completed per day over a range → [{ label, count }]. */
export function tasksCompletedOverTime(tasks, startMs, endMs) {
  const byDay = {};
  for (const t of tasks) {
    if (!t.done || !t.completedAt) continue;
    if (t.completedAt < startMs || t.completedAt >= endMs) continue;
    const k = dateKey(t.completedAt);
    byDay[k] = (byDay[k] || 0) + 1;
  }
  const rows = [];
  for (let ms = dayStart(startMs); ms < endMs; ms += DAY_MS) {
    const k = dateKey(ms);
    rows.push({ label: new Date(ms).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }), count: byDay[k] || 0 });
  }
  return rows;
}

/**
 * Average seconds between consecutive task completions within one session.
 * Uses the session's `completions` ([{ taskId, ts }]). Returns null if < 2.
 */
export function avgTimeBetweenTasks(session) {
  const c = (session.completions || []).filter(x => x && x.ts).sort((a, b) => a.ts - b.ts);
  if (c.length < 2) return null;
  let total = 0;
  for (let i = 1; i < c.length; i++) total += c[i].ts - c[i - 1].ts;
  return Math.round(total / (c.length - 1) / 1000);
}

/** Today's focused time (seconds) + tasks completed today. */
export function todaySummary(sessions, tasks) {
  const start = dayStart(Date.now());
  const end = start + DAY_MS;
  const todays = sessions.filter(s => {
    const t = s.startTime || s.createdAt || 0;
    return t >= start && t < end;
  });
  const seconds = totalSeconds(todays);
  const tasksDone = tasks.filter(t => t.done && t.completedAt >= start && t.completedAt < end).length;
  return { seconds, tasksDone, sessionCount: todays.length };
}

// ── Range presets ───────────────────────────────────────────────────────────────
export function rangePreset(key) {
  const end = dayStart(Date.now()) + DAY_MS;
  const map = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  const days = map[key] || 30;
  return { startMs: end - days * DAY_MS, endMs: end };
}
