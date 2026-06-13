import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Timer, TrendingUp, AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, fmtShortDate, getGreeting, getDayLabel, pctRound, getGoalActuals, getGoalPeriods, paceStatus, getGoalIdeal, isToday, isPast, isWithinDays } from '../utils';
import { fmtDuration, todaySummary } from '../utils/focusStats';
import { STAGE_COLORS, ACTIVE_STAGES, ACTIVE_STAGES as ACTIVE, PRIORITY_MAP } from '../constants';
import { StageBadge } from '../components/common/Badge';
import HabitsWidget from '../components/habits/HabitsWidget';

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
  const { goals, goalLog, loans, clients, notes, crmTasks, focusTasks, focusSessions, focusAreas, loading } = useData();

  // ── Focus metrics ────────────────────────────────────────────────────────────
  const focusToday   = todaySummary(focusSessions, focusTasks);
  const openTasks    = focusTasks.filter(t => !t.done);
  const overdueTasks = openTasks.filter(t => isPast(t.dueDate) && !isToday(t.dueDate)).length;
  const upcomingTasks = [...openTasks]
    .sort((a, b) => {
      const av = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bv = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return av - bv || (b.priority || 0) - (a.priority || 0);
    })
    .slice(0, 5);
  const areaById = Object.fromEntries(focusAreas.map(a => [a.id, a]));

  // ── Goals metrics ──────────────────────────────────────────────────────────
  const activeGoals = goals.filter(g => !g.status || g.status === 'active');
  const goalsOnTrack = activeGoals.filter(g => {
    const act = getGoalActuals(g, goalLog);
    const ideal = getGoalIdeal(g, 'year');
    const ps = paceStatus(act.year, g.year?.target, ideal);
    return ps.key !== 'behind';
  }).length;

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
        <KpiCard icon={Timer} label="Focus Today" value={fmtDuration(focusToday.seconds)}
          sub={`${focusToday.tasksDone} tasks done · ${openTasks.length} open`}
          color="var(--tasks)" soft="var(--tasks-dim)" onClick={() => navigate('/focus/timer')}/>
        <KpiCard icon={TrendingUp}  label="Pipeline Value"    value={formatCurrency(pipelineValue, true)}
          sub={`${activeLoans.length} active loans`}
          color="var(--mortgage)" soft="var(--mortgage-dim)" onClick={() => navigate('/mortgage/pipeline')}/>
        <KpiCard icon={AlertCircle} label="Overdue CRM Tasks" value={overdueCrm}
          sub={followUps7 > 0 ? `${followUps7} due this week` : undefined}
          color={overdueCrm > 0 ? 'var(--danger)' : 'var(--ok)'} soft={overdueCrm > 0 ? 'var(--danger-dim)' : 'var(--ok-dim)'}
          onClick={() => navigate('/mortgage/tasks')}/>
      </div>

      {/* Habits widget — full width above the 3-column grid */}
      <div style={{ marginBottom: 20 }}>
        <HabitsWidget/>
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

        {/* Focus column — native tasks + today's focus */}
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <span className="section-pip" style={{ background: 'var(--tasks)' }}/>
              <span style={{ color: 'var(--tasks)' }}>Focus</span>
            </div>
            <button className="btn ghost sm" onClick={() => navigate('/focus/tasks')} style={{ gap: 4 }}>
              View all <ArrowRight size={12}/>
            </button>
          </div>

          {/* Today's focus summary */}
          <div
            onClick={() => navigate('/focus/timer')}
            style={{ cursor: 'pointer', padding: '14px 16px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--tasks-dim)', marginBottom: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tasks)', letterSpacing: '-.03em', lineHeight: 1 }}>{fmtDuration(focusToday.seconds)}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>focused today</div>
              </div>
              <div style={{ width: 1, height: 30, background: 'var(--border-2)' }}/>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ok)', letterSpacing: '-.03em', lineHeight: 1 }}>{focusToday.tasksDone}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>tasks done</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--tasks)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Timer size={14}/> Start
              </div>
            </div>
          </div>

          {/* Upcoming tasks */}
          {upcomingTasks.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>
              No open tasks. <span style={{ color: 'var(--tasks)', cursor: 'pointer' }} onClick={() => navigate('/focus/tasks')}>Add one →</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {overdueTasks > 0 && (
                <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, marginBottom: 4 }}>{overdueTasks} overdue</div>
              )}
              {upcomingTasks.map(t => {
                const area = areaById[t.areaId];
                const p = PRIORITY_MAP[t.priority];
                const overdue = isPast(t.dueDate) && !isToday(t.dueDate);
                return (
                  <div key={t.id} className="dash-task-row" onClick={() => navigate('/focus/tasks')}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: p ? p.color : (area ? area.color : 'var(--border-strong)') }}/>
                    <span className="dash-task-title" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    {t.dueDate && <span style={{ fontSize: 10.5, color: overdue ? 'var(--danger)' : isToday(t.dueDate) ? 'var(--warn)' : 'var(--ink-3)', flexShrink: 0 }}>{isToday(t.dueDate) ? 'Today' : fmtShortDate(t.dueDate)}</span>}
                  </div>
                );
              })}
            </div>
          )}
          <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => navigate('/focus/tasks')}>
            <Plus size={13}/> Add Task
          </button>
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
