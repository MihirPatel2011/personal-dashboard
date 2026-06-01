// ── Date helpers ──────────────────────────────────────────────────────────────
export function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function getDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// ── Schedule helpers ──────────────────────────────────────────────────────────
export function isHabitScheduledOn(habit, date) {
  const day = date.getDay(); // 0=Sun
  const freq = habit.frequency;
  if (!freq || freq === 'daily') return true;
  if (freq === 'weekdays') return day >= 1 && day <= 5;
  if (freq === 'weekends') return day === 0 || day === 6;
  if (typeof freq === 'object') {
    const keys = ['sun','mon','tue','wed','thu','fri','sat'];
    return !!freq[keys[day]];
  }
  return true;
}

// ── Per-habit stats ───────────────────────────────────────────────────────────
export function getCurrentStreak(habit, completions) {
  const isNeg = habit.type === 'negative';
  const today = new Date(); today.setHours(0,0,0,0);
  const logged = new Set(completions.filter(c => c.habitId === habit.id).map(c => c.date));

  // Negative: streak = clean days. Regular: streak = logged days.
  const todayStr = getDateStr(today);
  if (isNeg && logged.has(todayStr)) return 0; // failed today

  let streak = 0;
  const cur = new Date(today);
  if (!isNeg && !logged.has(todayStr)) cur.setDate(cur.getDate() - 1); // today not logged yet

  for (let i = 0; i < 2000; i++) {
    const ds = getDateStr(cur);
    if (isHabitScheduledOn(habit, cur)) {
      const isLogged = logged.has(ds);
      if (isNeg ? !isLogged : isLogged) streak++;
      else break;
    }
    cur.setDate(cur.getDate() - 1);
    if (streak > 0 && !isHabitScheduledOn(habit, cur) && streak > 1000) break;
  }
  return streak;
}

export function getLongestStreak(habit, completions) {
  const isNeg = habit.type === 'negative';
  const habitComps = completions.filter(c => c.habitId === habit.id).map(c => c.date).sort();
  if (!isNeg && habitComps.length === 0) return 0;

  const logged = new Set(habitComps);
  const start = habitComps.length > 0
    ? new Date(habitComps[0] + 'T00:00:00')
    : (() => { const d = new Date(); d.setDate(d.getDate()-60); d.setHours(0,0,0,0); return d; })();
  const today = new Date(); today.setHours(0,0,0,0);

  let longest = 0, cur = 0;
  const d = new Date(start);
  while (d <= today) {
    const ds = getDateStr(d);
    if (isHabitScheduledOn(habit, d)) {
      const isLogged = logged.has(ds);
      if (isNeg ? !isLogged : isLogged) { cur++; longest = Math.max(longest, cur); }
      else cur = 0;
    }
    d.setDate(d.getDate() + 1);
  }
  return longest;
}

export function getCompletionRate(habit, completions, days = 30) {
  const isNeg = habit.type === 'negative';
  const today = new Date(); today.setHours(0,0,0,0);
  const logged = new Set(completions.filter(c => c.habitId === habit.id).map(c => c.date));
  let scheduled = 0, success = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    if (!isHabitScheduledOn(habit, d)) continue;
    scheduled++;
    const isLogged = logged.has(getDateStr(d));
    if (isNeg ? !isLogged : isLogged) success++;
  }
  return scheduled === 0 ? 0 : Math.round((success / scheduled) * 100);
}

export function getTotalCompletions(habit, completions) {
  return completions.filter(c => c.habitId === habit.id).length;
}

// ── Heatmap (52 weeks × 7 days) ───────────────────────────────────────────────
export function getHeatmapData(habit, completions) {
  const today = new Date(); today.setHours(0,0,0,0);
  const compMap = {};
  completions.filter(c => c.habitId === habit.id).forEach(c => { compMap[c.date] = c.value ?? 1; });

  // Start 364 days ago, aligned to Sunday
  const start = new Date(today); start.setDate(start.getDate() - 364);
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek); // align to Sunday

  const cells = [];
  const cur = new Date(start);
  while (cur <= today) {
    const ds = getDateStr(cur);
    const value = compMap[ds] ?? 0;
    const scheduled = isHabitScheduledOn(habit, cur);
    let intensity = 0;
    if (scheduled && value > 0) {
      if (habit.type === 'count' && habit.targetCount) {
        intensity = Math.min(value / habit.targetCount, 1);
      } else if (habit.type === 'duration' && habit.targetMinutes) {
        intensity = Math.min(value / habit.targetMinutes, 1);
      } else {
        intensity = 1;
      }
    }
    cells.push({ date: ds, value, scheduled, intensity, dayOfWeek: cur.getDay() });
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

// ── Trend (30-day bar + 7-day rolling avg) ────────────────────────────────────
export function getTrendData(habit, completions, days = 30) {
  const today = new Date(); today.setHours(0,0,0,0);
  const compMap = {};
  completions.filter(c => c.habitId === habit.id).forEach(c => { compMap[c.date] = c.value ?? 1; });

  const raw = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = getDateStr(d);
    const scheduled = isHabitScheduledOn(habit, d);
    const value = compMap[ds] ?? 0;
    let done = 0;
    if (scheduled && value > 0) {
      if (habit.type === 'count' && habit.targetCount) done = Math.min(value / habit.targetCount, 1);
      else if (habit.type === 'duration' && habit.targetMinutes) done = Math.min(value / habit.targetMinutes, 1);
      else done = 1;
    }
    raw.push({ date: ds, label: `${d.getMonth()+1}/${d.getDate()}`, done: scheduled ? done : null, scheduled });
  }

  return raw.map((d, i) => {
    const window = raw.slice(Math.max(0, i-6), i+1).filter(x => x.scheduled);
    const avg = window.length === 0 ? 0 : window.reduce((s,x) => s + (x.done ?? 0), 0) / window.length;
    return { ...d, avg: Math.round(avg * 100) / 100 };
  });
}

// ── Best streaks ──────────────────────────────────────────────────────────────
export function getBestStreaks(habit, completions) {
  const isNeg = habit.type === 'negative';
  const habitComps = completions.filter(c => c.habitId === habit.id).map(c => c.date).sort();
  const logged = new Set(habitComps);

  const startDate = habitComps.length > 0
    ? new Date(habitComps[0] + 'T00:00:00')
    : (() => { const d = new Date(); d.setDate(d.getDate()-60); d.setHours(0,0,0,0); return d; })();
  const today = new Date(); today.setHours(0,0,0,0);

  const streaks = [];
  let cur = 0, streakStart = null;
  const d = new Date(startDate);

  while (d <= today) {
    const ds = getDateStr(d);
    if (isHabitScheduledOn(habit, d)) {
      const success = isNeg ? !logged.has(ds) : logged.has(ds);
      if (success) {
        if (cur === 0) streakStart = ds;
        cur++;
      } else {
        if (cur > 0) {
          const prevD = new Date(d); prevD.setDate(prevD.getDate()-1);
          streaks.push({ length: cur, start: streakStart, end: getDateStr(prevD) });
          cur = 0; streakStart = null;
        }
      }
    }
    d.setDate(d.getDate() + 1);
  }
  if (cur > 0) streaks.push({ length: cur, start: streakStart, end: getDateStr(today) });
  return streaks.sort((a,b) => b.length - a.length).slice(0, 3);
}

// ── Aggregate stats ───────────────────────────────────────────────────────────
export function getOverallStats(habits, completions) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = getDateStr(today);
  const active = habits.filter(h => !h.archived);

  const todayScheduled = active.filter(h => isHabitScheduledOn(h, today));
  const todayDone = todayScheduled.filter(h => {
    const c = completions.find(c => c.habitId === h.id && c.date === todayStr);
    if (!c) return h.type === 'negative'; // negative: clean = no log = done
    if (h.type === 'negative') return false;
    if (h.type === 'count') return (c.value ?? 0) >= (h.targetCount || 1);
    if (h.type === 'duration') return (c.value ?? 0) >= (h.targetMinutes || 1);
    return true;
  }).length;

  const todayPct = todayScheduled.length === 0 ? 100 : Math.round((todayDone / todayScheduled.length) * 100);

  const bestCurrentStreak = active.length === 0 ? 0 : Math.max(...active.map(h => getCurrentStreak(h, completions)));
  const longestEver = active.length === 0 ? 0 : Math.max(...active.map(h => getLongestStreak(h, completions)));

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  let perfectDays = 0;
  const cur = new Date(monthStart);
  while (cur <= today) {
    const ds = getDateStr(cur);
    const scheduled = active.filter(h => isHabitScheduledOn(h, cur));
    if (scheduled.length > 0) {
      const allDone = scheduled.every(h => {
        const c = completions.find(cc => cc.habitId === h.id && cc.date === ds);
        if (h.type === 'negative') return !c;
        if (!c) return false;
        if (h.type === 'count') return (c.value ?? 0) >= (h.targetCount || 1);
        if (h.type === 'duration') return (c.value ?? 0) >= (h.targetMinutes || 1);
        return true;
      });
      if (allDone) perfectDays++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return { activeCount: active.length, todayDone, todayTotal: todayScheduled.length, todayPct, bestCurrentStreak, longestEver, perfectDays };
}

export function getDailyCompletionRate(habits, completions, days = 60) {
  const today = new Date(); today.setHours(0,0,0,0);
  const active = habits.filter(h => !h.archived);

  const raw = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = getDateStr(d);
    const sched = active.filter(h => isHabitScheduledOn(h, d));
    if (sched.length === 0) { raw.push({ date: ds, label: `${d.getMonth()+1}/${d.getDate()}`, pct: null }); continue; }
    const done = sched.filter(h => {
      const c = completions.find(cc => cc.habitId === h.id && cc.date === ds);
      if (h.type === 'negative') return !c;
      if (!c) return false;
      if (h.type === 'count') return (c.value ?? 0) >= (h.targetCount || 1);
      if (h.type === 'duration') return (c.value ?? 0) >= (h.targetMinutes || 1);
      return true;
    }).length;
    raw.push({ date: ds, label: `${d.getMonth()+1}/${d.getDate()}`, pct: Math.round((done / sched.length) * 100) });
  }

  return raw.map((d, i) => {
    const window = raw.slice(Math.max(0, i-6), i+1).filter(x => x.pct !== null);
    const avg = window.length === 0 ? null : Math.round(window.reduce((s,x) => s+x.pct, 0) / window.length);
    return { ...d, avg };
  });
}

export function getHabitConsistency(habits, completions, days = 30) {
  return habits
    .filter(h => !h.archived)
    .map(h => ({ id: h.id, name: h.name, icon: h.icon, color: h.color, pct: getCompletionRate(h, completions, days) }))
    .sort((a, b) => b.pct - a.pct);
}

export function getDayOfWeekStats(habits, completions) {
  const today = new Date(); today.setHours(0,0,0,0);
  const active = habits.filter(h => !h.archived);
  const dayTotals = Array(7).fill(0);
  const dayCounts = Array(7).fill(0);

  for (let i = 0; i < 60; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = getDateStr(d);
    const dayIdx = (d.getDay() + 6) % 7; // 0=Mon
    const sched = active.filter(h => isHabitScheduledOn(h, d));
    if (sched.length === 0) continue;
    const done = sched.filter(h => {
      const c = completions.find(cc => cc.habitId === h.id && cc.date === ds);
      if (h.type === 'negative') return !c;
      if (!c) return false;
      if (h.type === 'count') return (c.value ?? 0) >= (h.targetCount || 1);
      if (h.type === 'duration') return (c.value ?? 0) >= (h.targetMinutes || 1);
      return true;
    }).length;
    dayTotals[dayIdx] += done / sched.length;
    dayCounts[dayIdx]++;
  }

  return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((name, i) => ({
    name,
    avg: dayCounts[i] === 0 ? 0 : Math.round((dayTotals[i] / dayCounts[i]) * 100),
  }));
}

export function getCorrelationMatrix(habits, completions) {
  const active = habits.filter(h => !h.archived).slice(0, 6);
  const today = new Date(); today.setHours(0,0,0,0);
  const sets = active.map(h => new Set(completions.filter(c => c.habitId === h.id).map(c => c.date)));

  const matrix = active.map((h1, i) =>
    active.map((h2, j) => {
      if (i === j) return 100;
      let both = 0, total = 0;
      for (let d = 0; d < 60; d++) {
        const dd = new Date(today); dd.setDate(dd.getDate() - d);
        const ds = getDateStr(dd);
        if (isHabitScheduledOn(h1, dd) && isHabitScheduledOn(h2, dd)) {
          total++;
          if (sets[i].has(ds) && sets[j].has(ds)) both++;
        }
      }
      return total === 0 ? 0 : Math.round((both / total) * 100);
    })
  );

  return { habits: active, matrix };
}

// ── Today helpers ─────────────────────────────────────────────────────────────
export function hasLoggedToday(habit, completions) {
  return completions.some(c => c.habitId === habit.id && c.date === getTodayStr());
}

export function getTodayCompletion(habit, completions) {
  return completions.find(c => c.habitId === habit.id && c.date === getTodayStr()) || null;
}

export function isSuccessToday(habit, completions) {
  const c = getTodayCompletion(habit, completions);
  if (habit.type === 'negative') return !c;
  if (!c) return false;
  if (habit.type === 'count') return (c.value ?? 0) >= (habit.targetCount || 1);
  if (habit.type === 'duration') return (c.value ?? 0) >= (habit.targetMinutes || 1);
  return true;
}

// ── Seed data ─────────────────────────────────────────────────────────────────
export function generateSeedData() {
  const today = new Date(); today.setHours(0,0,0,0);
  const daysAgo = n => { const d = new Date(today); d.setDate(d.getDate()-n); return d.toISOString(); };

  const habits = [
    { id: 'h1', name: 'Meditate', icon: '🧘', color: '#00C896', category: 'health', type: 'simple', frequency: 'daily', createdAt: daysAgo(70), archived: false, intention: 'Start each morning with 10 minutes of stillness.' },
    { id: 'h2', name: 'Drink Water', icon: '💧', color: '#5B8CF5', category: 'health', type: 'count', targetCount: 8, frequency: 'daily', createdAt: daysAgo(70), archived: false },
    { id: 'h3', name: 'Read', icon: '📚', color: '#A78BFA', category: 'focus', type: 'duration', targetMinutes: 30, frequency: 'daily', createdAt: daysAgo(70), archived: false, intention: 'Read 30 minutes every day.' },
    { id: 'h4', name: 'Run', icon: '🏃', color: '#F07560', category: 'health', type: 'simple', frequency: 'weekdays', createdAt: daysAgo(70), archived: false },
  ];

  // Pseudo-random seeded generator for deterministic-ish seed data
  let seed = 42;
  function rng() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 4294967296; }

  const completions = [];
  let cId = 1;
  const rates = { h1: 0.82, h2: 0.72, h3: 0.68, h4: 0.86 };
  const notes = {
    h1: ['Really needed this today','Felt much calmer after','Hard to focus but did it','Best session in weeks'],
    h3: ['Finished a great chapter','Could not put it down','Only managed 20 mins','Good reading day'],
  };

  for (let i = 65; i >= 1; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    habits.forEach(h => {
      if (!isHabitScheduledOn(h, d)) return;
      if (rng() > rates[h.id]) return;
      const value = h.type === 'count'
        ? Math.floor(4 + rng() * 5)
        : h.type === 'duration'
        ? Math.floor(15 + rng() * 40)
        : 1;
      const notePool = notes[h.id];
      const note = notePool && rng() < 0.15 ? notePool[Math.floor(rng() * notePool.length)] : '';
      completions.push({
        id: `c${cId++}`, habitId: h.id, date: getDateStr(d), value, note,
        completedAt: new Date(d.getTime() + Math.floor((7 + rng()*14) * 3600000)).toISOString(),
      });
    });
  }

  return { habits, completions };
}
