import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Clock, CheckCircle2, Timer, Flame, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  fmtDuration, totalSeconds, timeByArea, timeByProject,
  hoursPerAreaOverRange, tasksCompletedOverTime, avgTimeBetweenTasks,
  todaySummary, rangePreset,
} from '../../utils/focusStats';

function ChartTooltip({ active, payload, label, hours }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
      <div style={{ color: 'var(--ink-3)', marginBottom: 4 }}>{label}</div>
      {payload.filter(p => p.value > 0).map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill || 'var(--ink)', fontWeight: 600 }}>
          {p.name}: {hours ? `${p.value}h` : p.value}
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, marginBottom: 8 }}><Icon size={15}/>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-3)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function BarList({ rows, total }) {
  if (rows.length === 0) return <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>No focus time logged in this range.</div>;
  const max = Math.max(...rows.map(r => r.seconds), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)', minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
          <div style={{ flex: 1, height: 8, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(r.seconds / max) * 100}%`, background: r.color, borderRadius: 99, transition: 'width .6s var(--ease-out)' }}/>
          </div>
          <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-2)', minWidth: 64, textAlign: 'right' }}>{fmtDuration(r.seconds)}</span>
          {total > 0 && <span style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 36, textAlign: 'right' }}>{Math.round(r.seconds / total * 100)}%</span>}
        </div>
      ))}
    </div>
  );
}

function Panel({ title, right, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ── Session history row ──────────────────────────────────────────────────────────
function SessionRow({ s, areas, projects, tasks, onDelete }) {
  const [open, setOpen] = useState(false);
  const area = areas.find(a => a.id === s.areaId);
  const project = projects.find(p => p.id === s.projectId);
  const completedCount = (s.completions?.length) || 0;
  const gap = avgTimeBetweenTasks(s);
  const d = new Date(s.startTime || s.createdAt);

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', cursor: 'pointer' }}>
        <span style={{ color: 'var(--ink-4)', flexShrink: 0 }}>{open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</span>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--mono)', minWidth: 92, flexShrink: 0 }}>
          {d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })} {d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
        </span>
        {area && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: area.color + '22', color: area.color, flexShrink: 0 }}>{area.icon} {area.name}</span>}
        {project && <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>/ {project.name}</span>}
        <span style={{ flex: 1 }}/>
        {completedCount > 0 && <span style={{ fontSize: 11.5, color: 'var(--ok)', flexShrink: 0 }}>✓ {completedCount}</span>}
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--tasks)', minWidth: 56, textAlign: 'right', flexShrink: 0 }}>{fmtDuration(s.durationSeconds)}</span>
      </div>
      {open && (
        <div style={{ padding: '4px 4px 14px 38px', fontSize: 12.5, color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gap != null && <div style={{ color: 'var(--ink-3)' }}>⏱ Avg time between completions: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmtDuration(gap)}</span></div>}
          {s.completions?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {s.completions.map((c, i) => {
                const t = tasks.find(x => x.id === c.taskId);
                return <div key={i} style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--ink-4)', fontFamily: 'var(--mono)', fontSize: 11 }}>{new Date(c.ts).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</span><span>{t ? t.title : '(task removed)'}</span></div>;
              })}
            </div>
          )}
          {s.note && <div style={{ fontStyle: 'italic', color: 'var(--ink-2)', borderLeft: `3px solid ${area?.color || 'var(--tasks)'}`, paddingLeft: 10 }}>"{s.note}"</div>}
          <button className="btn danger-ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => onDelete(s)}><Trash2 size={12}/> Delete session</button>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────────
export default function StatsPage() {
  const { focusAreas: areas, focusProjects: projects, focusTasks: tasks, focusSessions: sessions, deleteFocusSession } = useData();
  const [rangeKey, setRangeKey] = useState('30d');
  const [gran, setGran] = useState('day');
  const [confirm, setConfirm] = useState(null);

  const { startMs, endMs } = useMemo(() => rangePreset(rangeKey), [rangeKey]);
  const ranged = useMemo(() => sessions.filter(s => {
    const t = s.startTime || s.createdAt || 0; return t >= startMs && t < endMs;
  }), [sessions, startMs, endMs]);

  const today = useMemo(() => todaySummary(sessions, tasks), [sessions, tasks]);
  const byArea = useMemo(() => timeByArea(ranged, areas), [ranged, areas]);
  const byProject = useMemo(() => timeByProject(ranged, projects, areas), [ranged, projects, areas]);
  const rangeTotal = totalSeconds(ranged);
  const { rows: areaRangeRows, areaKeys } = useMemo(() => hoursPerAreaOverRange(ranged, areas, startMs, endMs, gran), [ranged, areas, startMs, endMs, gran]);
  const tasksOverTime = useMemo(() => tasksCompletedOverTime(tasks, startMs, endMs), [tasks, startMs, endMs]);
  const tasksDoneInRange = tasksOverTime.reduce((s, r) => s + r.count, 0);

  const history = useMemo(() => [...sessions].sort((a, b) => (b.startTime || b.createdAt || 0) - (a.startTime || a.createdAt || 0)), [sessions]);

  const rangeLabels = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', '365d': 'Last year' };

  return (
    <div style={{ padding: '20px 24px 48px' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <SummaryCard icon={Clock}        label="Today's focus"  value={fmtDuration(today.seconds)} sub={`${today.sessionCount} session${today.sessionCount===1?'':'s'}`} color="var(--tasks)"/>
        <SummaryCard icon={CheckCircle2} label="Done today"      value={today.tasksDone} sub="tasks completed" color="var(--ok)"/>
        <SummaryCard icon={Timer}        label={rangeLabels[rangeKey]} value={fmtDuration(rangeTotal)} sub={`${ranged.length} sessions`} color="var(--goals)"/>
        <SummaryCard icon={Flame}        label="Tasks done"     value={tasksDoneInRange} sub={rangeLabels[rangeKey].toLowerCase()} color="var(--warn)"/>
      </div>

      {/* Range controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Range</span>
        {Object.entries(rangeLabels).map(([k, l]) => (
          <button key={k} className="chip" onClick={() => setRangeKey(k)}
            style={rangeKey === k ? { borderColor: 'var(--tasks)', color: 'var(--tasks)', background: 'var(--tasks-dim)' } : undefined}>{l}</button>
        ))}
        <span style={{ flex: 1 }}/>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Group by</span>
        {[['day','Day'],['week','Week'],['month','Month']].map(([k, l]) => (
          <button key={k} className="chip" onClick={() => setGran(k)}
            style={gran === k ? { borderColor: 'var(--tasks)', color: 'var(--tasks)', background: 'var(--tasks-dim)' } : undefined}>{l}</button>
        ))}
      </div>

      {/* Time by area / project */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Panel title="Time by area"><BarList rows={byArea} total={rangeTotal}/></Panel>
        <Panel title="Time by project"><BarList rows={byProject} total={rangeTotal}/></Panel>
      </div>

      {/* Hours per area over range (stacked) */}
      <div style={{ marginBottom: 16 }}>
        <Panel title={`Hours per area · ${rangeLabels[rangeKey].toLowerCase()} (by ${gran})`}>
          {areaRangeRows.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>No data in this range.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={areaRangeRows} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: 'var(--ink-4)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`}/>
                <Tooltip content={<ChartTooltip hours/>} cursor={{ fill: 'var(--surface-2)' }}/>
                {areaKeys.map(k => <Bar key={k.id} dataKey={k.id} name={k.name} stackId="a" fill={k.color} radius={[2,2,0,0]}/>)}
              </BarChart>
            </ResponsiveContainer>
          )}
          {areaKeys.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
              {areaKeys.map(k => (
                <span key={k.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--ink-3)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: k.color }}/> {k.name}
                </span>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Tasks completed over time */}
      <div style={{ marginBottom: 16 }}>
        <Panel title="Tasks completed over time">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={tasksOverTime} margin={{ top: 4, right: 8, bottom: 0, left: -28 }}>
              <XAxis dataKey="label" tick={false} axisLine={false} tickLine={false}/>
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ink-4)' }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>} cursor={{ fill: 'var(--surface-2)' }}/>
              <Bar dataKey="count" name="Tasks" fill="var(--ok)" radius={[2,2,0,0]}>
                {tasksOverTime.map((r, i) => <Cell key={i} fill={r.count > 0 ? 'var(--ok)' : 'var(--surface-3)'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* History log */}
      <Panel title="Session history">
        {history.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>No sessions yet. Start the focus timer to build your log.</div>
        ) : (
          <div>
            {history.map(s => (
              <SessionRow key={s.id} s={s} areas={areas} projects={projects} tasks={tasks}
                onDelete={sess => setConfirm({ onConfirm: () => { deleteFocusSession(sess.id); toast.success('Session deleted'); } })}/>
            ))}
          </div>
        )}
      </Panel>

      <ConfirmDialog isOpen={!!confirm} onClose={() => setConfirm(null)}
        title="Delete session?" message="This focus session log will be permanently removed."
        onConfirm={() => confirm?.onConfirm()}/>
    </div>
  );
}
