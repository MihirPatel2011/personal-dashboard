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
  const { goals, goalLog, personalTasks, loans, clients, notes, crmTasks, loading } = useData();

  // ── Goals metrics ──────────────────────────────────────────────────────────
  const activeGoals = goals.filter(g => !g.status || g.status === 'active');
  const goalsOnTrack = activeGoals.filter(g => {
    const act = getGoalActuals(g, goalLog);
    const ideal = getGoalIdeal(g, 'year');
    const ps = paceStatus(act.year, g.year?.target, ideal);
    return ps.key !== 'behind';
  }).length;

  // ── Task metrics ───────────────────────────────────────────────────────────
  const essential = personalTasks.find(t => t.status === 'essential');
  const secondary = personalTasks.filter(t => t.status === 'secondary');
  const inboxCount = personalTasks.filter(t => t.status === 'inbox').length;
  const tasksDueToday = personalTasks.filter(t =>
    !['done','nd'].includes(t.status) && isToday(t.dueDate)
  ).length;

  // ── Mortgage metrics ────────────────────────────────────────────────────────
  const activeLoans   = loans.filter(l => ACTIVE_STAGES.includes(l.stage));
  const pipelineValue = activeLoans.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const overdueCrm    = crmTasks.filter(t => !['Done','Cancelled'].includes(t.status) && isPast(t.dueDate) && !isToday(t.dueDate)).length;
  const followUps7    = crmTasks.filter(t => !['Done','Cancelled'].includes(t.status) && isWithinDays(t.dueDate, 7)).length;

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));
  const recentLoans = [...loans].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)).slice(0, 5);
  const recentNotes = [...notes].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)).slice(0, 4);

  const firstName = user?.email?.split('@')[0] || 'Mihir';

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

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
              <span style={{ color: 'var(--tasks)' }}>Today's Focus</span>
            </div>
            <button className="btn ghost sm" onClick={() => navigate('/tasks')} style={{ gap: 4 }}>
              View all <ArrowRight size={12}/>
            </button>
          </div>

          {/* Essential */}
          <div className="essential-dash" onClick={() => navigate('/tasks')} style={{ cursor: 'pointer', marginBottom: 10 }}>
            <div className="ess-label">⭐ Essential</div>
            {essential
              ? <div className="ess-task-title">{essential.title}</div>
              : <div className="ess-empty-hint">No essential task set — tap to add one</div>
            }
          </div>

          {/* Secondary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {secondary.slice(0, 3).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--border-strong)', flexShrink: 0 }}/>
                <span style={{ fontSize: 13, color: 'var(--ink-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
              </div>
            ))}
            {inboxCount > 0 && (
              <div style={{ padding: '8px 12px', background: 'var(--tasks-dim)', border: '1px solid var(--tasks-border)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--tasks)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                {inboxCount} item{inboxCount > 1 ? 's' : ''} waiting in inbox →
              </div>
            )}
          </div>
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
