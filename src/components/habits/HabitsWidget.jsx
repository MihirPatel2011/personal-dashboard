import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Plus } from 'lucide-react';
import {
  isHabitScheduledOn, isSuccessToday, hasLoggedToday, getTodayCompletion,
  getTodayStr, getDateStr, getOverallStats, getCurrentStreak, generateSeedData,
} from '../../utils/habitStats';

function loadData() {
  try {
    const raw = localStorage.getItem('dashboard_habits');
    if (raw) return JSON.parse(raw);
  } catch {}
  return generateSeedData();
}

function saveData(data) {
  try { localStorage.setItem('dashboard_habits', JSON.stringify(data)); } catch {}
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

export default function HabitsWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState(loadData);

  const { habits, completions } = data;

  useEffect(() => { saveData(data); }, [data]);

  useEffect(() => {
    const handler = e => { if (e.key === 'dashboard_habits') setData(loadData()); };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const today = new Date(); today.setHours(0,0,0,0);
  const todayHabits = habits.filter(h => !h.archived && isHabitScheduledOn(h, today));
  const stats = useMemo(() => getOverallStats(habits, completions), [habits, completions]);
  const bestStreak = useMemo(() => {
    const active = habits.filter(h => !h.archived);
    return active.length === 0 ? 0 : Math.max(...active.map(h => getCurrentStreak(h, completions)));
  }, [habits, completions]);

  const pct = stats.todayPct;
  const barColor = pct >= 80 ? 'var(--ok)' : pct >= 40 ? 'var(--warn)' : 'var(--danger)';

  function handleToggle(e, habit) {
    e.stopPropagation();
    const todayStr = getTodayStr();
    const existing = completions.find(c => c.habitId === habit.id && c.date === todayStr);
    if (existing) {
      setData(d => ({ ...d, completions: d.completions.filter(c => c.id !== existing.id) }));
    } else {
      setData(d => ({ ...d, completions: [...d.completions, { id: genId(), habitId: habit.id, date: todayStr, value: 1, note: '', completedAt: new Date().toISOString() }] }));
    }
  }

  function handleUpdateCount(e, habit, delta) {
    e.stopPropagation();
    const todayStr = getTodayStr();
    const existing = completions.find(c => c.habitId === habit.id && c.date === todayStr);
    const newVal = (existing?.value ?? 0) + delta;
    if (newVal <= 0 && existing) {
      setData(d => ({ ...d, completions: d.completions.filter(c => c.id !== existing.id) }));
    } else if (newVal > 0 && existing) {
      setData(d => ({ ...d, completions: d.completions.map(c => c.id === existing.id ? { ...c, value: newVal } : c) }));
    } else if (newVal > 0) {
      setData(d => ({ ...d, completions: [...d.completions, { id: genId(), habitId: habit.id, date: todayStr, value: newVal, note: '', completedAt: new Date().toISOString() }] }));
    }
  }

  const displayHabits = todayHabits.slice(0, 6);

  return (
    <div className="dash-section" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div className="dash-section-header" style={{ marginBottom: 0, paddingBottom: 10, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div className="dash-section-title">
          <span className="section-pip" style={{ background: 'var(--accent)' }}/>
          <span style={{ color: 'var(--accent)' }}>Habits</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
          {stats.todayDone}<span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>/{stats.todayTotal}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99,
          transition: 'width 0.6s cubic-bezier(0.23,1,0.32,1), background 0.3s',
        }}/>
      </div>

      {/* Habit rows */}
      <div style={{ flex: 1, overflow: 'auto', marginTop: 6 }}>
        {todayHabits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 8px', color: 'var(--ink-3)', fontSize: 12 }}>
            No habits scheduled today.
          </div>
        ) : displayHabits.map((habit, i) => {
          const success    = isSuccessToday(habit, completions);
          const completion = getTodayCompletion(habit, completions);
          const streak     = getCurrentStreak(habit, completions);
          const val        = completion?.value ?? 0;

          // 7-day mini dots
          const miniDots = [];
          for (let d = 6; d >= 0; d--) {
            const dd = new Date(today); dd.setDate(dd.getDate() - d);
            const ds = getDateStr(dd);
            const sched = isHabitScheduledOn(habit, dd);
            const logged = completions.some(c => c.habitId === habit.id && c.date === ds);
            const ok = sched && (habit.type === 'negative' ? !logged : logged);
            miniDots.push({ ok, sched, isToday: d === 0 });
          }

          return (
            <div key={habit.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 2px', borderBottom: i < displayHabits.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'opacity 0.2s',
              animationDelay: `${i * 25}ms`,
              animation: 'slideUp 0.18s cubic-bezier(0.23,1,0.32,1) both',
            }}>
              {/* Color dot + name */}
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: habit.color || 'var(--accent)', flexShrink: 0 }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 12.5, fontWeight: 500,
                  color: success ? 'var(--ink-3)' : 'var(--ink-2)',
                  textDecoration: success ? 'line-through' : 'none',
                  textDecorationColor: 'var(--ink-4)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                }}>{habit.name}</span>
              </div>

              {/* Mini 7-day dots */}
              <div style={{ display: 'flex', gap: 2.5, flexShrink: 0 }}>
                {miniDots.map((dot, di) => (
                  <div key={di} style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: !dot.sched ? 'transparent'
                      : dot.ok ? (habit.color || 'var(--accent)')
                      : 'var(--surface-3)',
                    opacity: !dot.sched ? 0 : dot.ok ? 1 : dot.isToday ? 0.4 : 0.25,
                  }}/>
                ))}
              </div>

              {/* Streak */}
              {streak > 0 && (
                <span style={{ fontSize: 10.5, color: 'var(--warn)', fontWeight: 700, flexShrink: 0 }}>🔥{streak}</span>
              )}

              {/* Check control */}
              <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {habit.type === 'count' || habit.type === 'duration' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <button onClick={e => handleUpdateCount(e, habit, -1)} style={{
                      width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)',
                      background: 'var(--surface-2)', color: 'var(--ink-3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, lineHeight: 1,
                    }}>−</button>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: success ? (habit.color || 'var(--accent)') : 'var(--ink-3)', minWidth: 22, textAlign: 'center', fontWeight: 700 }}>
                      {val}{habit.type === 'duration' ? 'm' : ''}
                    </span>
                    <button onClick={e => handleUpdateCount(e, habit, habit.type === 'duration' ? 5 : 1)} style={{
                      width: 22, height: 22, borderRadius: 4,
                      border: `1px solid ${success ? (habit.color || 'var(--accent)') : 'var(--border)'}`,
                      background: success ? ((habit.color || '#00C896') + '22') : 'var(--surface-2)',
                      color: success ? (habit.color || 'var(--accent)') : 'var(--ink-3)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, lineHeight: 1,
                    }}>+</button>
                  </div>
                ) : (
                  <button onClick={e => handleToggle(e, habit)} style={{
                    width: 26, height: 26, borderRadius: '50%',
                    border: `2px solid ${success ? (habit.color || 'var(--accent)') : 'var(--border-strong)'}`,
                    background: success ? (habit.color || 'var(--accent)') : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', flexShrink: 0,
                    transition: 'background 0.15s, border-color 0.15s, transform 0.12s cubic-bezier(0.34,1.4,0.64,1)',
                  }}>
                    {success && <Check size={11} strokeWidth={3}/>}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {todayHabits.length > 6 && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', padding: '6px 0' }}>
            +{todayHabits.length - 6} more
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)', flexShrink: 0, marginTop: 4 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
          {bestStreak > 0 ? <>🔥 Best streak: <strong style={{ color: 'var(--warn)' }}>{bestStreak}d</strong></> : 'No streaks yet'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn ghost sm" onClick={() => navigate('/habits?new=1')} style={{ gap: 4 }}>
            <Plus size={11}/> Add
          </button>
          <button className="btn ghost sm" onClick={() => navigate('/habits')} style={{ gap: 4 }}>
            View all <ArrowRight size={11}/>
          </button>
        </div>
      </div>
    </div>
  );
}
