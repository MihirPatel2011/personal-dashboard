import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, CheckSquare, Building2, TrendingUp, AlertCircle, Calendar, DollarSign, ArrowRight, Plus } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, fmtShortDate, getGreeting, getDayLabel, pctRound, getGoalActuals, getGoalPeriods, paceStatus, getGoalIdeal, isToday, isPast, isWithinDays } from '../utils';
import { STAGE_COLORS, ACTIVE_STAGES, ACTIVE_STAGES as ACTIVE } from '../constants';
import { StageBadge } from '../components/common/Badge';

function KpiCard({ icon: Icon, label, value, sub, color, soft, onClick }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color, '--kpi-soft': soft }} onClick={onClick}>
      <div className="kpi-icon"><Icon size={16}/></div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { goals, goalLog, personalTasks, updatePersonalTask, loans, clients, notes, crmTasks, loading } = useData();

  // ── Goals metrics ──────────────────────────────────────────────────────────
  const activeGoals = goals.filter(g => !g.status || g.status === 'active');
  const goalsOnTrack = activeGoals.filter(g => {
    const act = getGoalActuals(g, goalLog);
    const ideal = getGoalIdeal(g, 'year');
    const ps = paceStatus(act.year, g.year?.target, ideal);
    return ps.key !== 'behind';
  }).length;

  // ── Task metrics ───────────────────────────────────────────────────────────
  const todayTasks = personalTasks.filter(t => {
    const s = t.status;
    if (['logbook', 'done', 'nd', 'someday'].includes(s)) return false;
    if (s === 'essential' || s === 'secondary') return true;
    return !!(t.isToday || isToday(t.deadline));
  });

  // Upcoming tasks (future deadline, not today, not done/someday) — next 5
  const upcomingDash = personalTasks
    .filter(t => {
      if (['logbook', 'done', 'nd', 'someday'].includes(t.status)) return false;
      if (!t.deadline) return false;
      const d = new Date(t.deadline + 'T00:00:00');
      const tod = new Date(); tod.setHours(0, 0, 0, 0);
      return d > tod;
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  // Anytime tasks (no deadline, not pinned, not done/someday) — up to 5
  const anytimeDash = personalTasks
    .filter(t => {
      const s = t.status;
      if (['logbook', 'done', 'nd', 'someday'].includes(s)) return false;
      if (s === 'essential' || s === 'secondary') return false;
      if (t.isToday || isToday(t.deadline)) return false;
      if (t.deadline) return false;
      return s === 'anytime' || (!s && false); // explicit anytime only
    })
    .slice(0, 5);

  // Someday tasks — up to 5
  const somedayDash = personalTasks
    .filter(t => t.status === 'nd' || t.status === 'someday')
    .slice(0, 5);

  // Inbox count: only tasks with no deadline and not pinned to today
  const inboxCount = personalTasks.filter(t => {
    if (t.status !== 'inbox' && t.status) return false;
    return !t.deadline && !t.isToday;
  }).length;
  const tasksDueToday = todayTasks.length;

  // ── Focus task — user-selected, persisted in localStorage ─────────────────
  const [focusTaskId, setFocusTaskId] = useState(() => {
    try { return localStorage.getItem('apex.focusTaskId') || null; }
    catch { return null; }
  });
  useEffect(() => {
    try {
      if (focusTaskId) localStorage.setItem('apex.focusTaskId', focusTaskId);
      else             localStorage.removeItem('apex.focusTaskId');
    } catch {}
  }, [focusTaskId]);

  const focusTask = todayTasks.find(t => t.id === focusTaskId) ?? null;
  // Auto-clear if the focused task moves out of today
  useEffect(() => {
    if (focusTaskId && !focusTask) setFocusTaskId(null);
  }, [focusTaskId, focusTask]);

  async function handleDashComplete(task) {
    try {
      await updatePersonalTask(task.id, { status: 'logbook', completedAt: Date.now() });
      if (focusTaskId === task.id) setFocusTaskId(null);
    } catch {}
  }

  // ── Mortgage metrics ────────────────────────────────────────────────────────
  const activeLoans   = loans.filter(l => ACTIVE_STAGES.includes(l.stage));
  const pipelineValue = activeLoans.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const overdueCrm    = crmTasks.filter(t => !['Done','Cancelled'].includes(t.status) && isPast(t.dueDate) && !isToday(t.dueDate)).length;
  const followUps7    = crmTasks.filter(t => !['Done','Cancelled'].includes(t.status) && isWithinDays(t.dueDate, 7)).length;

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));
  const recentLoans = [...loans].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)).slice(0, 5);
  const recentNotes = [...notes].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)).slice(0, 4);

  const rawName   = user?.email?.split('@')[0] || 'Mihir';
  const firstName = rawName.split(/[-._]/)[0];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}/>
        <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>Loading your dashboard…</span>
      </div>
    );
  }

  return (
    <div className="page-body fade-in">
      {/* Greeting */}
      <div className="dash-greeting">
        <div className="dash-greeting-text">{getGreeting()}, {firstName.charAt(0).toUpperCase() + firstName.slice(1)} 👋</div>
        <div className="dash-greeting-sub">{getDayLabel()}</div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        <KpiCard icon={Target}      label="Goals on Track"    value={`${goalsOnTrack}/${activeGoals.length}`}
          color="var(--goals)" soft="var(--goals-dim)" onClick={() => navigate('/goals')}/>
        <KpiCard icon={CheckSquare} label="Tasks Due Today"   value={tasksDueToday}
          sub={inboxCount > 0 ? `${inboxCount} in inbox` : undefined}
          color="var(--tasks)" soft="var(--tasks-dim)" onClick={() => navigate('/tasks')}/>
        <KpiCard icon={TrendingUp}  label="Pipeline Value"    value={formatCurrency(pipelineValue, true)}
          sub={`${activeLoans.length} active loans`}
          color="var(--mortgage)" soft="var(--mortgage-dim)" onClick={() => navigate('/mortgage/pipeline')}/>
        <KpiCard icon={AlertCircle} label="Overdue CRM Tasks" value={overdueCrm}
          sub={followUps7 > 0 ? `${followUps7} due this week` : undefined}
          color={overdueCrm > 0 ? 'var(--danger)' : 'var(--ok)'} soft={overdueCrm > 0 ? 'var(--danger-dim)' : 'var(--ok-dim)'}
          onClick={() => navigate('/mortgage/tasks')}/>
      </div>

      {/* 3-column content */}
      <div className="dash-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

        {/* Goals column */}
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <span className="section-pip" style={{ background: 'var(--goals)' }}/>
              <span style={{ color: 'var(--goals)' }}>Goals</span>
            </div>
            <button className="btn ghost sm" onClick={() => navigate('/goals')} style={{ gap: 4 }}>
              View all <ArrowRight size={12}/>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeGoals.length === 0 && (
              <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                No active goals yet.
              </div>
            )}
            {activeGoals.slice(0, 5).map(g => {
              const act    = getGoalActuals(g, goalLog);
              const pct    = pctRound(act.year, g.year?.target);
              const ideal  = getGoalIdeal(g, 'year');
              const status = paceStatus(act.year, g.year?.target, ideal);
              const fillColor = status.key === 'behind' ? 'var(--danger)' : status.key === 'ahead' ? 'var(--ok)' : 'var(--goals)';
              return (
                <div key={g.id} className="goal-dash-row" onClick={() => navigate('/goals')}>
                  <div className={`goal-icon ${g.cls || 'gc0'}`}>{g.glyph || '🎯'}</div>
                  <div className="goal-dash-info">
                    <div className="goal-dash-name">{g.label}</div>
                    <div style={{ marginTop: 5 }}>
                      <div className="progress-bar" style={{ height: 4 }}>
                        <div className="progress-fill" style={{ width: pct + '%', background: fillColor }}/>
                      </div>
                    </div>
                  </div>
                  <div className="goal-dash-pct">{pct}%</div>
                </div>
              );
            })}
          </div>
          <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => navigate('/goals')}>
            <Plus size={13}/> Add Goal
          </button>
        </div>

        {/* Tasks column */}
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <span className="section-pip" style={{ background: 'var(--tasks)' }}/>
              <span style={{ color: 'var(--tasks)' }}>Tasks</span>
            </div>
            <button className="btn ghost sm" onClick={() => navigate('/tasks')} style={{ gap: 4 }}>
              View all <ArrowRight size={12}/>
            </button>
          </div>

          {/* Focus card — shown when user selects a task */}
          {focusTask ? (
            <div className="dash-focus-card" onClick={() => setFocusTaskId(null)} title="Click to clear focus">
              <div className="ess-label">⭐ Focus</div>
              <div className="dash-focus-title">{focusTask.title}</div>
              {focusTask.deadline && (
                <div style={{ fontSize: 11, color: 'var(--tasks)', marginTop: 4, fontWeight: 600 }}>
                  Due {fmtShortDate(focusTask.deadline)}
                </div>
              )}
            </div>
          ) : (
            <div className="dash-focus-hint">
              Tap a task below to set your focus for today
            </div>
          )}

          {/* Today tasks */}
          {todayTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 2 }}>
              <div className="section-label" style={{ marginBottom: 5 }}>
                Today &middot; {todayTasks.length}
              </div>
              {todayTasks.map(t => (
                <div
                  key={t.id}
                  className={`dash-task-row${focusTaskId === t.id ? ' focus' : ''}`}
                  onClick={() => setFocusTaskId(t.id === focusTaskId ? null : t.id)}
                >
                  <button
                    className="dash-task-check"
                    onClick={e => { e.stopPropagation(); handleDashComplete(t); }}
                    title="Mark complete"
                  />
                  <span className="dash-task-title">{t.title}</span>
                  {t.deadline && !isToday(t.deadline) && (
                    <span style={{ fontSize: 10, color: 'var(--ink-4)', flexShrink: 0 }}>{fmtShortDate(t.deadline)}</span>
                  )}
                  {focusTaskId === t.id && (
                    <span style={{ fontSize: 10, flexShrink: 0, color: 'var(--tasks)' }}>⭐</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0 10px', fontStyle: 'italic' }}>
              Nothing due today
            </div>
          )}

          {/* Upcoming tasks */}
          {upcomingDash.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div className="section-label" style={{ marginBottom: 5 }}>Upcoming</div>
              {upcomingDash.map(t => (
                <div key={t.id} className="dash-upcoming-row" onClick={() => navigate('/tasks')}>
                  <span className="dash-task-title" style={{ fontSize: 12.5 }}>{t.title}</span>
                  <span className="dash-upcoming-date">{fmtShortDate(t.deadline)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Anytime tasks */}
          {anytimeDash.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div className="section-label" style={{ marginBottom: 5 }}>Anytime</div>
              {anytimeDash.map(t => (
                <div key={t.id} className="dash-upcoming-row" onClick={() => navigate('/tasks')}>
                  <span className="dash-task-title" style={{ fontSize: 12.5 }}>{t.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Someday tasks */}
          {somedayDash.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div className="section-label" style={{ marginBottom: 5 }}>Someday</div>
              {somedayDash.map(t => (
                <div key={t.id} className="dash-upcoming-row" onClick={() => navigate('/tasks')}>
                  <span className="dash-task-title" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{t.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Inbox badge */}
          {inboxCount > 0 && (
            <div style={{ marginTop: 10, padding: '7px 12px', background: 'var(--tasks-dim)', border: '1px solid var(--tasks-border)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--tasks)', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
              onClick={() => navigate('/tasks')}>
              {inboxCount} in inbox →
            </div>
          )}
        </div>

        {/* Mortgage column */}
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <span className="section-pip" style={{ background: 'var(--mortgage)' }}/>
              <span style={{ color: 'var(--mortgage)' }}>Pipeline</span>
            </div>
            <button className="btn ghost sm" onClick={() => navigate('/mortgage/pipeline')} style={{ gap: 4 }}>
              View all <ArrowRight size={12}/>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentLoans.length === 0 && (
              <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                No loans in pipeline yet.
              </div>
            )}
            {recentLoans.map(l => {
              const c = STAGE_COLORS[l.stage] || {};
              return (
                <div key={l.id} className="pipeline-mini-row" onClick={() => navigate('/mortgage/pipeline')}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.text || 'var(--mortgage)', flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.clientObj || clientMap[l.clientId] || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{l.lender} · {l.objective}</div>
                  </div>
                  <StageBadge stage={l.stage}/>
                </div>
              );
            })}
          </div>

          {/* Recent notes */}
          {recentNotes.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <div className="section-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Recent Notes
                <button className="btn ghost sm" onClick={() => navigate('/mortgage/notes')} style={{ gap: 4 }}>All <ArrowRight size={11}/></button>
              </div>
              {recentNotes.map(n => (
                <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate('/mortgage/notes')}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{clientMap[n.clientId] || '—'} · {n.channel}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
