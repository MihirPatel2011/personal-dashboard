import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Cell,
} from 'recharts';
import { Plus, GripVertical, Archive, ArchiveRestore, Trash2, Edit3, Bell, X, Check, ChevronDown } from 'lucide-react';
import {
  getTodayStr, getDateStr, isHabitScheduledOn,
  getCurrentStreak, getLongestStreak, getCompletionRate, getTotalCompletions,
  getHeatmapData, getTrendData, getBestStreaks, getDayOfWeekStats, getOverallStats,
  getDailyCompletionRate, getHabitConsistency, getCorrelationMatrix,
  hasLoggedToday, getTodayCompletion, isSuccessToday, generateSeedData,
} from '../utils/habitStats';

// ── Constants ─────────────────────────────────────────────────────────────────
const HABIT_COLORS = ['#00C896','#5B8CF5','#A78BFA','#F5A52A','#F07560','#F472B6'];
const PRESET_EMOJIS = ['🧘','💧','📚','🏃','💪','🎯','✍️','🍎','😴','🎸','💰','🌱'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_ABBR  = ['M','T','W','T','F','S','S'];

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

// ── Storage ───────────────────────────────────────────────────────────────────
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

// ── Sub-components ────────────────────────────────────────────────────────────

function CompletionRing({ done, total, size = 72 }) {
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(total === 0 ? 1 : done / total), 80);
    return () => clearTimeout(t);
  }, [done, total]);
  const r = (size - 7) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - animPct);
  const color = animPct >= 1 ? 'var(--ok)' : 'var(--accent)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.23,1,0.32,1), stroke 0.3s' }}/>
    </svg>
  );
}

function SevenDayDots({ habit, completions }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const dots = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = getDateStr(d);
    const sched = isHabitScheduledOn(habit, d);
    const logged = completions.some(c => c.habitId === habit.id && c.date === ds);
    const success = sched && (habit.type === 'negative' ? !logged : logged);
    const dayIdx = (d.getDay() + 6) % 7;
    dots.push({ sched, success, isToday: i === 0, dayIdx, isFuture: false });
  }
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
      {dots.map((dot, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ fontSize: 9, color: 'var(--ink-4)', fontWeight: 600 }}>{DAYS_ABBR[dot.dayIdx]}</div>
          <div style={{
            width: 9, height: 9, borderRadius: '50%',
            background: !dot.sched ? 'transparent'
              : dot.success ? (habit.color || 'var(--accent)')
              : 'var(--surface-3)',
            opacity: !dot.sched ? 0 : dot.success ? 1 : dot.isToday ? 0.4 : 0.3,
            border: dot.isToday && !dot.success && dot.sched ? '1.5px solid var(--border-strong)' : 'none',
            transition: 'background 0.2s, opacity 0.2s',
          }}/>
        </div>
      ))}
    </div>
  );
}

function StreakBadge({ streak, prevStreak }) {
  const [pulse, setPulse] = useState(false);
  const milestones = [7, 14, 30, 60, 100];
  useEffect(() => {
    if (prevStreak !== undefined && streak !== prevStreak && milestones.includes(streak)) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      return () => clearTimeout(t);
    }
  }, [streak]);
  if (!streak) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 99,
      background: 'rgba(245,165,42,0.14)', color: 'var(--warn)',
      fontSize: 11, fontWeight: 700,
      animation: pulse ? 'habitStreakPulse 0.6s cubic-bezier(0.34,1.4,0.64,1)' : 'none',
      flexShrink: 0,
    }}>
      🔥 {streak}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--ink-3)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--ink)', fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? (p.name === 'avg' ? `${Math.round(p.value*100)}%` : `${p.value}%`) : p.value}
        </div>
      ))}
    </div>
  );
}

// ── Habit Form ────────────────────────────────────────────────────────────────
const BLANK_FORM = { name: '', icon: '⭐', color: '#00C896', category: '', type: 'simple', targetCount: 5, targetMinutes: 30, frequency: 'daily', customDays: { mon:true,tue:true,wed:true,thu:true,fri:true,sat:false,sun:false }, reminderTime: '', intention: '' };

function HabitForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial
    ? { ...BLANK_FORM, ...initial, customDays: typeof initial.frequency === 'object' ? initial.frequency : BLANK_FORM.customDays }
    : BLANK_FORM
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const freq = form.frequency === 'custom' ? form.customDays : form.frequency;
    onSave({ ...form, frequency: freq });
  }

  const inputStyle = { padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--r)', fontSize: 13, background: 'var(--surface-2)', color: 'var(--ink)', width: '100%', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' };
  const labelStyle = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--ink-3)', marginBottom: 5, display: 'block' };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '16px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 12, animation: 'habitFormSlide 0.2s cubic-bezier(0.23,1,0.32,1)' }}>
      {/* Name */}
      <div>
        <label style={labelStyle}>Name</label>
        <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g. Meditate" autoFocus onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
      </div>

      {/* Icon + Color row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Icon</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...inputStyle, fontSize: 18, textAlign: 'center', cursor: 'pointer' }}
              value={form.icon} onChange={e => set('icon', e.target.value)}
              onClick={() => setShowEmojiPicker(v => !v)} readOnly/>
            {showEmojiPicker && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 40, background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', padding: 8, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4, marginTop: 4, boxShadow: 'var(--shadow)' }}>
                {PRESET_EMOJIS.map(em => (
                  <button key={em} type="button" onClick={() => { set('icon', em); setShowEmojiPicker(false); }}
                    style={{ fontSize: 16, padding: 4, borderRadius: 4, background: form.icon === em ? 'var(--accent-dim)' : 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Color</label>
          <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
            {HABIT_COLORS.map(c => (
              <button key={c} type="button" onClick={() => set('color', c)} style={{
                width: 24, height: 24, borderRadius: '50%', background: c, border: form.color === c ? `3px solid var(--ink)` : '2px solid transparent',
                cursor: 'pointer', flexShrink: 0, transition: 'transform 0.12s, border-color 0.12s',
                transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
              }}/>
            ))}
          </div>
        </div>
      </div>

      {/* Category */}
      <div>
        <label style={labelStyle}>Category</label>
        <input style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}
          placeholder="health, focus, personal…"
          onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
      </div>

      {/* Type */}
      <div>
        <label style={labelStyle}>Type</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['simple','Simple'],['count','Count'],['duration','Duration'],['negative','Negative']].map(([v,l]) => (
            <button key={v} type="button" onClick={() => set('type', v)} style={{
              flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600, borderRadius: 6,
              border: `1.5px solid ${form.type === v ? 'var(--accent)' : 'var(--border)'}`,
              background: form.type === v ? 'var(--accent-dim)' : 'var(--surface-3)',
              color: form.type === v ? 'var(--accent)' : 'var(--ink-3)',
              cursor: 'pointer', transition: 'all 0.12s',
            }}>{l}</button>
          ))}
        </div>
        {form.type === 'count' && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Daily target:</span>
            <input type="number" min={1} style={{ ...inputStyle, width: 64 }} value={form.targetCount}
              onChange={e => set('targetCount', Number(e.target.value))}
              onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
          </div>
        )}
        {form.type === 'duration' && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Target (min):</span>
            <input type="number" min={1} style={{ ...inputStyle, width: 64 }} value={form.targetMinutes}
              onChange={e => set('targetMinutes', Number(e.target.value))}
              onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
          </div>
        )}
      </div>

      {/* Frequency */}
      <div>
        <label style={labelStyle}>Frequency</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[['daily','Daily'],['weekdays','Weekdays'],['weekends','Weekends'],['custom','Custom']].map(([v,l]) => (
            <button key={v} type="button" onClick={() => set('frequency', v)} style={{
              padding: '5px 12px', fontSize: 11.5, fontWeight: 600, borderRadius: 99,
              border: `1.5px solid ${form.frequency === v ? 'var(--accent)' : 'var(--border)'}`,
              background: form.frequency === v ? 'var(--accent-dim)' : 'transparent',
              color: form.frequency === v ? 'var(--accent)' : 'var(--ink-3)',
              cursor: 'pointer', transition: 'all 0.12s',
            }}>{l}</button>
          ))}
        </div>
        {form.frequency === 'custom' && (
          <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
            {['mon','tue','wed','thu','fri','sat','sun'].map((d, i) => (
              <button key={d} type="button" onClick={() => set('customDays', { ...form.customDays, [d]: !form.customDays[d] })} style={{
                width: 30, height: 28, fontSize: 10, fontWeight: 700,
                borderRadius: 6, border: `1.5px solid ${form.customDays[d] ? 'var(--accent)' : 'var(--border)'}`,
                background: form.customDays[d] ? 'var(--accent-dim)' : 'var(--surface-3)',
                color: form.customDays[d] ? 'var(--accent)' : 'var(--ink-3)',
                cursor: 'pointer', transition: 'all 0.12s',
              }}>{DAYS_ABBR[i]}</button>
            ))}
          </div>
        )}
      </div>

      {/* Reminder */}
      <div>
        <label style={labelStyle}>Reminder (optional)</label>
        <input type="time" style={inputStyle} value={form.reminderTime} onChange={e => set('reminderTime', e.target.value)}
          onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
      </div>

      {/* Intention */}
      <div>
        <label style={labelStyle}>Intention (optional)</label>
        <textarea style={{ ...inputStyle, resize: 'none', minHeight: 56, lineHeight: 1.5 }}
          value={form.intention} onChange={e => set('intention', e.target.value)}
          placeholder="Why does this habit matter to you?"
          onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn ghost sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn accent sm">Save Habit</button>
      </div>
    </form>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────
function HabitDetailPanel({ habit, completions, onEdit, onArchive, onDelete }) {
  const streak  = useMemo(() => getCurrentStreak(habit, completions), [habit, completions]);
  const longest = useMemo(() => getLongestStreak(habit, completions), [habit, completions]);
  const rate    = useMemo(() => getCompletionRate(habit, completions, 30), [habit, completions]);
  const total   = useMemo(() => getTotalCompletions(habit, completions), [habit, completions]);
  const heatmap = useMemo(() => getHeatmapData(habit, completions), [habit, completions]);
  const trend   = useMemo(() => getTrendData(habit, completions, 30), [habit, completions]);
  const best    = useMemo(() => getBestStreaks(habit, completions), [habit, completions]);
  const notes   = useMemo(() =>
    completions.filter(c => c.habitId === habit.id && c.note)
      .sort((a,b) => b.date.localeCompare(a.date)).slice(0,10)
  , [habit, completions]);

  // Group heatmap cells into weeks (columns)
  const weeks = useMemo(() => {
    const cols = [];
    let col = [];
    heatmap.forEach((cell, i) => {
      col.push(cell);
      if (cell.dayOfWeek === 6) { cols.push(col); col = []; }
    });
    if (col.length) cols.push(col);
    return cols;
  }, [heatmap]);

  const metricCards = [
    { label: 'Current Streak', value: streak ? `🔥 ${streak}d` : '—', color: 'var(--warn)' },
    { label: 'Longest Streak', value: longest ? `${longest}d` : '—', color: 'var(--ink)' },
    { label: '30-day Rate', value: `${rate}%`, color: rate >= 80 ? 'var(--ok)' : rate >= 50 ? 'var(--warn)' : 'var(--danger)' },
    { label: 'All-time', value: total, color: 'var(--ink)' },
  ];

  function fmtDate(ds) {
    if (!ds) return '—';
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: habit.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{habit.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</div>
            {habit.category && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{habit.category}</div>}
          </div>
        </div>
        {habit.intention && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55, fontStyle: 'italic', padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--r)', borderLeft: `3px solid ${habit.color || 'var(--accent)'}` }}>
            "{habit.intention}"
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 14px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Metric cards 2×2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {metricCards.map((m, i) => (
            <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: m.color, letterSpacing: '-.02em' }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-3)', marginBottom: 8 }}>Activity</div>
          <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {week.map((cell, ci) => {
                    const opacity = !cell.scheduled ? 0.05 : cell.intensity === 0 ? 0.1 : cell.intensity < 0.5 ? 0.45 : cell.intensity < 1 ? 0.75 : 1;
                    return (
                      <div key={ci} title={`${cell.date}: ${cell.value || 'no entry'}`} style={{
                        width: 9, height: 9, borderRadius: 2,
                        background: cell.intensity > 0 ? (habit.color || 'var(--accent)') : 'var(--surface-3)',
                        opacity,
                        animationDelay: `${(wi * 7 + ci) * 3}ms`,
                        animation: 'habitHeatFadeIn 0.4s ease-out both',
                        transition: 'opacity 0.15s',
                      }}/>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 9, color: 'var(--ink-4)' }}>Less</span>
            {[0.1, 0.35, 0.65, 1].map((op, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: habit.color || 'var(--accent)', opacity: op }}/>
            ))}
            <span style={{ fontSize: 9, color: 'var(--ink-4)' }}>More</span>
          </div>
        </div>

        {/* Trend chart */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-3)', marginBottom: 8 }}>Last 30 Days</div>
          <ResponsiveContainer width="100%" height={80}>
            <ComposedChart data={trend} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
              <XAxis dataKey="label" tick={false} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,1]} tick={{ fontSize: 9, fill: 'var(--ink-4)' }} tickFormatter={v => `${Math.round(v*100)}%`} tickCount={3}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="done" fill={habit.color || 'var(--accent)'} opacity={0.7} radius={[2,2,0,0]}
                label={false} name="done"/>
              <Line dataKey="avg" stroke="var(--ink)" strokeWidth={1.5} dot={false} name="avg"/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Best streaks */}
        {best.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-3)', marginBottom: 8 }}>Best Streaks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {best.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                  <span style={{ fontSize: 14 }}>{['🥇','🥈','🥉'][i]}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--warn)', fontFamily: 'var(--mono)' }}>{s.length}d</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', flex: 1 }}>{fmtDate(s.start)} – {fmtDate(s.end)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes log */}
        {notes.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-3)', marginBottom: 8 }}>Notes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {notes.map((c, i) => (
                <div key={i} style={{ padding: '7px 0', borderBottom: i < notes.length-1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 10, color: 'var(--ink-4)', flexShrink: 0, fontFamily: 'var(--mono)', marginTop: 1 }}>{fmtDate(c.date)}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{c.note}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          <button className="btn ghost sm" style={{ gap: 5 }} onClick={() => onEdit(habit)}><Edit3 size={12}/> Edit</button>
          <button className="btn ghost sm" style={{ gap: 5 }} onClick={() => onArchive(habit)}>
            {habit.archived ? <><ArchiveRestore size={12}/> Restore</> : <><Archive size={12}/> Archive</>}
          </button>
          <button className="btn danger-ghost sm" style={{ gap: 5, marginLeft: 'auto' }} onClick={() => onDelete(habit)}><Trash2 size={12}/> Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Today Habit Card ──────────────────────────────────────────────────────────
function TodayCard({ habit, completions, onToggle, onUpdateValue, isSelected, onSelect }) {
  const completion = getTodayCompletion(habit, completions);
  const success    = isSuccessToday(habit, completions);
  const streak     = useMemo(() => getCurrentStreak(habit, completions), [habit, completions]);
  const [note, setNote]       = useState(completion?.note || '');
  const [noteActive, setNoteActive] = useState(false);
  const prevStreak = useRef(streak);
  useEffect(() => { setNote(completion?.note || ''); }, [completion?.note]);

  function handleNoteBlur() {
    setNoteActive(false);
    if (completion) onUpdateValue(habit, completion.value ?? 1, note);
  }

  const currentVal = completion?.value ?? 0;
  const isNeg = habit.type === 'negative';

  const cardStyle = {
    background: success
      ? `linear-gradient(135deg, ${habit.color}14, var(--surface))`
      : 'var(--surface)',
    border: `1px solid ${success ? (habit.color + '44') : (isSelected ? 'var(--border-2)' : 'var(--border)')}`,
    borderRadius: 'var(--r-lg)',
    padding: '14px 16px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.25s, box-shadow 0.2s',
    boxShadow: isSelected ? `0 0 0 2px ${habit.color || 'var(--accent)'}44` : 'none',
    animation: 'habitCardIn 0.2s cubic-bezier(0.23,1,0.32,1) both',
  };

  const freqLabel = typeof habit.frequency === 'object'
    ? 'Custom'
    : { daily:'Daily', weekdays:'Weekdays', weekends:'Weekends' }[habit.frequency] || 'Daily';

  return (
    <div style={cardStyle} onClick={() => onSelect(habit.id)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Icon + name */}
        <div style={{ width: 36, height: 36, borderRadius: 9, background: habit.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{habit.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: success ? 'var(--ink-3)' : 'var(--ink)', textDecoration: success ? 'line-through' : 'none', textDecorationColor: 'var(--ink-4)' }}>{habit.name}</span>
            <span style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{freqLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
            <SevenDayDots habit={habit} completions={completions}/>
            <StreakBadge streak={streak} prevStreak={prevStreak.current}/>
          </div>
        </div>

        {/* Mark-done control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {habit.type === 'simple' || habit.type === 'negative' ? (
            <button
              onClick={() => onToggle(habit)}
              className={success ? 'habit-check-done' : 'habit-check-btn'}
              style={{
                width: 26, height: 26, borderRadius: '50%',
                border: `2px solid ${success ? (isNeg ? 'var(--danger)' : habit.color || 'var(--accent)') : 'var(--border-strong)'}`,
                background: success ? (isNeg ? 'var(--danger)' : (habit.color || 'var(--accent)')) : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', flexShrink: 0,
                transition: 'background 0.15s, border-color 0.15s, transform 0.12s cubic-bezier(0.34,1.4,0.64,1)',
              }}>
              {success && <Check size={13} strokeWidth={3}/>}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => onUpdateValue(habit, Math.max(0, currentVal - (habit.type === 'duration' ? 5 : 1)), note)}
                style={{ width: 22, height: 22, borderRadius: 6, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, transition: 'background 0.12s' }}>−</button>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: success ? (habit.color || 'var(--accent)') : 'var(--ink-2)', minWidth: 48, textAlign: 'center' }}>
                {currentVal}{habit.type === 'duration' ? 'min' : ''}
                {habit.type === 'count' && habit.targetCount ? `/${habit.targetCount}` : ''}
                {habit.type === 'duration' && habit.targetMinutes ? `/${habit.targetMinutes}` : ''}
              </span>
              <button onClick={() => onUpdateValue(habit, currentVal + (habit.type === 'duration' ? 5 : 1), note)}
                style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${success ? (habit.color || 'var(--accent)') : 'var(--border)'}`, background: success ? (habit.color + '22') : 'var(--surface-2)', color: success ? (habit.color || 'var(--accent)') : 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, transition: 'background 0.12s, border-color 0.12s' }}>+</button>
            </div>
          )}
        </div>
      </div>

      {/* Note field */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          onFocus={() => setNoteActive(true)}
          onBlur={handleNoteBlur}
          placeholder="Add a note…"
          style={{
            width: '100%', background: 'none', border: 'none',
            borderBottom: noteActive ? '1px solid var(--accent)' : '1px solid transparent',
            fontSize: 12, color: 'var(--ink-3)', fontFamily: 'inherit', outline: 'none',
            padding: '2px 0', transition: 'border-color 0.15s',
          }}
        />
      </div>
    </div>
  );
}

// ── Overview Section ──────────────────────────────────────────────────────────
function OverviewSection({ habits, completions }) {
  const stats       = useMemo(() => getOverallStats(habits, completions), [habits, completions]);
  const daily       = useMemo(() => getDailyCompletionRate(habits, completions, 60), [habits, completions]);
  const consistency = useMemo(() => getHabitConsistency(habits, completions, 30), [habits, completions]);
  const dowStats    = useMemo(() => getDayOfWeekStats(habits, completions), [habits, completions]);
  const correlation = useMemo(() => getCorrelationMatrix(habits, completions), [habits, completions]);

  const summaryCards = [
    { label: 'Active Habits', value: stats.activeCount, color: 'var(--accent)' },
    { label: "Today's Done", value: `${stats.todayDone}/${stats.todayTotal}`, sub: `${stats.todayPct}%`, color: stats.todayPct >= 80 ? 'var(--ok)' : stats.todayPct >= 40 ? 'var(--warn)' : 'var(--danger)' },
    { label: 'Best Streak Now', value: stats.bestCurrentStreak ? `🔥 ${stats.bestCurrentStreak}d` : '—', color: 'var(--warn)' },
    { label: 'Perfect Days (Mo)', value: stats.perfectDays, color: 'var(--goals)' },
    { label: 'Longest Ever', value: stats.longestEver ? `${stats.longestEver}d` : '—', color: 'var(--ink)' },
  ];

  return (
    <div style={{ padding: '28px 28px 40px', flexShrink: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.025em', marginBottom: 20, color: 'var(--ink)' }}>Overview</div>

      {/* Summary metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
        {summaryCards.map((c, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color, letterSpacing: '-.03em', lineHeight: 1 }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Chart A: Daily completion rate */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Daily completion — 60 days</div>
          <ResponsiveContainer width="100%" height={120}>
            <ComposedChart data={daily} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
              <XAxis dataKey="label" tick={false} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{ fontSize: 9, fill: 'var(--ink-4)' }} tickFormatter={v => `${v}%`} tickCount={3}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="pct" fill="var(--accent)" opacity={0.6} radius={[2,2,0,0]} name="pct"/>
              <Line dataKey="avg" stroke="var(--accent-bright)" strokeWidth={2} dot={false} name="avg"/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart B: Habit consistency */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Habit consistency — 30 days</div>
          {consistency.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 12, textAlign: 'center', padding: '30px 0' }}>No data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 140, overflowY: 'auto' }}>
              {consistency.map((h, i) => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{h.icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)', minWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                  <div style={{ flex: 1, height: 5, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${h.pct}%`, background: h.color || 'var(--accent)', borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.23,1,0.32,1)' }}/>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: h.pct >= 80 ? 'var(--ok)' : h.pct >= 50 ? 'var(--warn)' : 'var(--danger)', fontWeight: 700, flexShrink: 0 }}>{h.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart C: Best day of week */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Best day of week</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={dowStats} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{ fontSize: 9, fill: 'var(--ink-4)' }} tickFormatter={v => `${v}%`} tickCount={3}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="avg" radius={[3,3,0,0]} name="avg">
                {dowStats.map((entry, index) => (
                  <Cell key={index} fill={entry.avg >= 80 ? 'var(--ok)' : entry.avg >= 50 ? 'var(--accent)' : 'var(--tasks)'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Correlation matrix */}
      {correlation.habits.length > 1 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Habit Correlation (% completed together, last 60 days)</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ width: 80 }}/>
                  {correlation.habits.map(h => (
                    <th key={h.id} style={{ padding: '4px 8px', color: 'var(--ink-3)', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {h.icon} {h.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlation.matrix.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 8px', color: 'var(--ink-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {correlation.habits[i].icon} {correlation.habits[i].name}
                    </td>
                    {row.map((val, j) => {
                      const isDiag = i === j;
                      const bg = isDiag ? 'var(--surface-3)' : val >= 70 ? 'rgba(0,200,150,0.25)' : val >= 40 ? 'rgba(91,140,245,0.15)' : 'var(--surface-2)';
                      return (
                        <td key={j} style={{ padding: '6px 8px', textAlign: 'center', background: bg, borderRadius: 4, fontFamily: 'var(--mono)', color: isDiag ? 'var(--ink-3)' : val >= 70 ? 'var(--ok)' : val >= 40 ? 'var(--info)' : 'var(--ink-3)', fontWeight: isDiag ? 400 : 700 }}>
                          {isDiag ? '—' : `${val}%`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Habits() {
  const [searchParams] = useSearchParams();
  const [data, setData]         = useState(loadData);
  const [selectedId, setSelectedId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [dragId, setDragId]     = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});

  const { habits, completions } = data;

  // Open new-habit form when ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') setShowForm(true);
  }, []);

  // Persist on every change
  useEffect(() => { saveData(data); }, [data]);

  // Cross-tab sync
  useEffect(() => {
    const handler = e => { if (e.key === 'dashboard_habits') setData(loadData()); };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // ── Habit CRUD ──────────────────────────────────────────────────────────────
  function handleSaveHabit(form) {
    if (editingHabit) {
      setData(d => ({ ...d, habits: d.habits.map(h => h.id === editingHabit.id ? { ...h, ...form } : h) }));
    } else {
      const newHabit = { id: genId(), ...form, createdAt: new Date().toISOString(), archived: false };
      setData(d => ({ ...d, habits: [...d.habits, newHabit] }));
    }
    setShowForm(false);
    setEditingHabit(null);
  }

  function handleArchive(habit) {
    setData(d => ({ ...d, habits: d.habits.map(h => h.id === habit.id ? { ...h, archived: !h.archived } : h) }));
    if (selectedId === habit.id) setSelectedId(null);
  }

  function handleDelete(habit) {
    if (!confirm(`Delete "${habit.name}"? This cannot be undone.`)) return;
    setData(d => ({
      habits: d.habits.filter(h => h.id !== habit.id),
      completions: d.completions.filter(c => c.habitId !== habit.id),
    }));
    if (selectedId === habit.id) setSelectedId(null);
  }

  function handleEditHabit(habit) {
    setEditingHabit(habit);
    setShowForm(true);
  }

  // ── Completion CRUD ─────────────────────────────────────────────────────────
  function handleToggle(habit) {
    const todayStr = getTodayStr();
    const existing = completions.find(c => c.habitId === habit.id && c.date === todayStr);
    if (existing) {
      setData(d => ({ ...d, completions: d.completions.filter(c => c.id !== existing.id) }));
    } else {
      const newComp = { id: genId(), habitId: habit.id, date: todayStr, value: 1, note: noteInputs[habit.id] || '', completedAt: new Date().toISOString() };
      setData(d => ({ ...d, completions: [...d.completions, newComp] }));
    }
  }

  function handleUpdateValue(habit, value, note) {
    const todayStr = getTodayStr();
    const existing = completions.find(c => c.habitId === habit.id && c.date === todayStr);
    if (value <= 0 && existing) {
      setData(d => ({ ...d, completions: d.completions.filter(c => c.id !== existing.id) }));
      return;
    }
    if (value <= 0) return;
    if (existing) {
      setData(d => ({ ...d, completions: d.completions.map(c => c.id === existing.id ? { ...c, value, note: note ?? c.note } : c) }));
    } else {
      const newComp = { id: genId(), habitId: habit.id, date: todayStr, value, note: note || '', completedAt: new Date().toISOString() };
      setData(d => ({ ...d, completions: [...d.completions, newComp] }));
    }
  }

  // ── Drag reorder ────────────────────────────────────────────────────────────
  function handleDrop(targetId) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const from = habits.findIndex(h => h.id === dragId);
    const to   = habits.findIndex(h => h.id === targetId);
    if (from === -1 || to === -1) return;
    const arr = [...habits];
    const [removed] = arr.splice(from, 1);
    arr.splice(to, 0, removed);
    setData(d => ({ ...d, habits: arr }));
    setDragId(null); setDragOverId(null);
  }

  // ── Derived state ───────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0,0,0,0);
  const visibleHabits  = habits.filter(h => showArchived ? h.archived : !h.archived);
  const todayHabits    = habits.filter(h => !h.archived && isHabitScheduledOn(h, today));
  const pendingHabits  = todayHabits.filter(h => !isSuccessToday(h, completions));
  const doneHabits     = todayHabits.filter(h => isSuccessToday(h, completions));
  const selectedHabit  = habits.find(h => h.id === selectedId) || null;
  const overallStats   = useMemo(() => getOverallStats(habits, completions), [habits, completions]);
  const allDoneToday   = todayHabits.length > 0 && pendingHabits.length === 0;

  // Date header
  const todayDisplay = today.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">Habits</div>
          <div className="page-sub">Build consistency, track progress</div>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CompletionRing done={overallStats.todayDone} total={overallStats.todayTotal} size={40}/>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', lineHeight: 1 }}>{overallStats.todayDone}/{overallStats.todayTotal}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>today done</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Three-column layout */}
        <div style={{ display: 'flex', height: 600, flexShrink: 0, borderBottom: '1px solid var(--border)' }}>

          {/* ── Left Panel: Habit List ─────────────────────────────────── */}
          <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Toggle: Active / Archived */}
            <div style={{ display: 'flex', padding: '10px 10px 0', gap: 4, flexShrink: 0 }}>
              {[false, true].map(archived => (
                <button key={String(archived)} onClick={() => setShowArchived(archived)} style={{
                  flex: 1, padding: '6px 0', fontSize: 11.5, fontWeight: 600, borderRadius: 99,
                  border: `1.5px solid ${showArchived === archived ? 'var(--accent)' : 'var(--border)'}`,
                  background: showArchived === archived ? 'var(--accent-dim)' : 'transparent',
                  color: showArchived === archived ? 'var(--accent)' : 'var(--ink-3)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>{archived ? 'Archived' : 'Active'}</button>
              ))}
            </div>

            {/* Habit list */}
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px 4px' }}>
              {visibleHabits.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-3)', fontSize: 13 }}>
                  {showArchived ? 'No archived habits.' : 'No habits yet. Add one below!'}
                </div>
              )}
              {visibleHabits.map((habit, i) => {
                const success = isSuccessToday(habit, completions);
                const sched   = isHabitScheduledOn(habit, today);
                return (
                  <div key={habit.id}
                    draggable
                    onDragStart={() => setDragId(habit.id)}
                    onDragOver={e => { e.preventDefault(); setDragOverId(habit.id); }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={() => handleDrop(habit.id)}
                    onClick={() => setSelectedId(selectedId === habit.id ? null : habit.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 8px', borderRadius: 'var(--r)',
                      cursor: 'pointer', transition: 'background 0.12s, box-shadow 0.12s',
                      background: selectedId === habit.id ? 'var(--accent-dim)' : dragOverId === habit.id ? 'var(--surface-2)' : 'transparent',
                      boxShadow: selectedId === habit.id ? 'inset 3px 0 0 var(--accent)' : 'none',
                      opacity: dragId === habit.id ? 0.5 : 1,
                      animationDelay: `${i * 30}ms`,
                      animation: 'habitItemIn 0.18s cubic-bezier(0.23,1,0.32,1) both',
                    }}>
                    <div style={{ cursor: 'grab', color: 'var(--ink-4)', flexShrink: 0, display: 'flex' }}>
                      <GripVertical size={12}/>
                    </div>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: habit.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{habit.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: selectedId === habit.id ? 'var(--ink)' : 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</div>
                    </div>
                    {/* Today status dot */}
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: !sched ? 'transparent'
                        : success ? (habit.color || 'var(--accent)')
                        : 'var(--border-strong)',
                      opacity: !sched ? 0 : 1,
                    }}/>
                  </div>
                );
              })}
            </div>

            {/* New habit button / form */}
            <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)' }}>
              {!showForm ? (
                <button onClick={() => { setEditingHabit(null); setShowForm(true); }}
                  className="btn ghost sm" style={{ width: '100%', justifyContent: 'center', borderRadius: 0, padding: '11px 0', fontSize: 12.5, borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
                  <Plus size={13}/> New habit
                </button>
              ) : (
                <div style={{ maxHeight: 440, overflow: 'auto' }}>
                  <HabitForm
                    initial={editingHabit}
                    onSave={handleSaveHabit}
                    onCancel={() => { setShowForm(false); setEditingHabit(null); }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Center Panel: Today ────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>
            {/* Date + ring header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', marginBottom: 3 }}>Today</div>
                <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.025em', color: 'var(--ink)' }}>{todayDisplay}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <CompletionRing done={overallStats.todayDone} total={overallStats.todayTotal} size={64}/>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.03em', color: 'var(--ink)', lineHeight: 1 }}>{overallStats.todayDone}/{overallStats.todayTotal}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>done</div>
                </div>
              </div>
            </div>

            {/* All done empty state */}
            {allDoneToday ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 48 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ok)', letterSpacing: '-.025em' }}>All done!</div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: 260 }}>You've completed all your habits for today. Incredible consistency!</div>
                <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--warn)', letterSpacing: '-.025em' }}>🔥 {overallStats.bestCurrentStreak}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>best streak</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--goals)', letterSpacing: '-.025em' }}>{overallStats.perfectDays}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>perfect days this month</div>
                  </div>
                </div>
              </div>
            ) : todayHabits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
                <div style={{ fontSize: 14 }}>No habits scheduled for today.</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Add habits in the left panel to get started.</div>
              </div>
            ) : (
              <>
                {/* Pending habits */}
                {pendingHabits.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: doneHabits.length > 0 ? 20 : 0 }}>
                    {pendingHabits.map((habit, i) => (
                      <div key={habit.id} style={{ animationDelay: `${i * 40}ms` }}>
                        <TodayCard
                          habit={habit} completions={completions}
                          onToggle={handleToggle} onUpdateValue={handleUpdateValue}
                          isSelected={selectedId === habit.id} onSelect={id => setSelectedId(selectedId === id ? null : id)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Done section */}
                {doneHabits.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ok)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Check size={11}/> Done · {doneHabits.length}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {doneHabits.map(habit => (
                        <div key={habit.id} style={{ opacity: 0.65, transform: 'none', transition: 'opacity 0.3s' }}>
                          <TodayCard
                            habit={habit} completions={completions}
                            onToggle={handleToggle} onUpdateValue={handleUpdateValue}
                            isSelected={selectedId === habit.id} onSelect={id => setSelectedId(selectedId === id ? null : id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Right Panel: Detail ────────────────────────────────────── */}
          {selectedHabit ? (
            <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'habitPanelIn 0.2s cubic-bezier(0.23,1,0.32,1)' }}>
              <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-3)' }}>Habit detail</span>
                <button className="icon-btn sm" onClick={() => setSelectedId(null)}><X size={13}/></button>
              </div>
              <HabitDetailPanel
                habit={selectedHabit} completions={completions}
                onEdit={handleEditHabit} onArchive={handleArchive} onDelete={handleDelete}
              />
            </div>
          ) : (
            <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--ink-3)' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>👈</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>Select a habit to see<br/>stats and details</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Overview Section ─────────────────────────────────────────── */}
        <OverviewSection habits={habits} completions={completions}/>
      </div>
    </div>
  );
}
