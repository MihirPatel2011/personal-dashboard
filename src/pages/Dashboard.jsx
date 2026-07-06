// src/pages/Dashboard.jsx — action-first home: check-in, Today list, KPIs, columns.
import { useNavigate } from 'react-router-dom';
import { Target, TrendingUp, AlertCircle, Reply, ArrowRight, Plus, Circle, NotebookPen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getGreeting, getDayLabel, pctRound, getGoalActuals, getGoalIdeal, paceStatus, isToday, isPast, fmtShortDate, fmtRelative } from '../utils';
import { actionNeeded } from '../utils/followups';
import { STAGE_COLORS, ACTIVE_STAGES } from '../constants';
import { StageBadge } from '../components/common/Badge';
import CheckinWidget from '../components/dashboard/CheckinWidget';
import QuickAddTask from '../components/mortgage/QuickAddTask';

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

const NOTE_TYPE_COLORS = { note: '#60A5FA', idea: '#F59E0B', area: '#34D399' };

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { goals, goalLog, loans, clients, crmTasks, followups, personalNotes, updateCrmTask, loading } = useData();

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  // ── Today action list: due/overdue CRM tasks + follow-ups on me ────────────
  const openCrm  = crmTasks.filter(t => !['Done', 'Cancelled'].includes(t.status));
  const dueTasks = openCrm.filter(t => t.dueDate && (isPast(t.dueDate) || isToday(t.dueDate)));
  // Orphaned follow-ups (deleted client) don't count — matches the Follow-ups page.
  const dueFups  = followups.filter(f => clientMap[f.clientId] && actionNeeded(f));
  const dueVal   = x => x.due ? new Date(x.due).getTime() : Number.MAX_SAFE_INTEGER;
  const todayItems = [
    ...dueTasks.map(t => ({
      kind: 'task', id: t.id, title: t.title,
      client: clientMap[t.clientId] || '', due: t.dueDate,
      overdue: isPast(t.dueDate) && !isToday(t.dueDate), raw: t,
    })),
    ...dueFups.map(f => ({
      kind: 'followup', id: f.id, title: `Follow up — ${clientMap[f.clientId] || 'client'}`,
      client: clientMap[f.clientId] || '', due: f.dueDate || '',
      overdue: !!f.dueDate && isPast(f.dueDate) && !isToday(f.dueDate), raw: f,
    })),
  ].sort((a, b) => (a.overdue !== b.overdue ? (a.overdue ? -1 : 1) : dueVal(a) - dueVal(b)));

  async function completeTask(t) {
    try { await updateCrmTask(t.id, { status: 'Done' }); toast.success('Task done.'); }
    catch { toast.error('Failed.'); }
  }

  // ── Goals ───────────────────────────────────────────────────────────────────
  const activeGoals  = goals.filter(g => !g.status || g.status === 'active');
  const goalsOnTrack = activeGoals.filter(g => {
    const act = getGoalActuals(g, goalLog);
    return paceStatus(act.year, g.year?.target, getGoalIdeal(g, 'year')).key !== 'behind';
  }).length;

  // ── Mortgage ────────────────────────────────────────────────────────────────
  const activeLoans   = loans.filter(l => ACTIVE_STAGES.includes(l.stage));
  const pipelineValue = activeLoans.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const overdueCrm    = dueTasks.filter(t => isPast(t.dueDate) && !isToday(t.dueDate)).length;
  const recentLoans   = [...loans].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
  const recentPNotes  = [...personalNotes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 4);

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
      {/* Greeting + check-in */}
      <div className="dash-greeting" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="dash-greeting-text">{getGreeting()}, {firstName.charAt(0).toUpperCase() + firstName.slice(1)} 👋</div>
          <div className="dash-greeting-sub">{getDayLabel()}</div>
        </div>
        <CheckinWidget/>
      </div>

      {/* Today — the one list that matters */}
      <div className="dash-section" style={{ marginBottom: 24 }}>
        <div className="dash-section-header">
          <div className="dash-section-title">
            <span className="section-pip" style={{ background: 'var(--accent)' }}/>
            <span style={{ color: 'var(--accent)' }}>Today</span>
            {todayItems.length > 0 && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>· {todayItems.length} to action</span>}
          </div>
        </div>
        {todayItems.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '18px 0', textAlign: 'center' }}>
            Nothing due — you're clear. ✨
          </div>
        ) : (
          <div className="today-list">
            {todayItems.map(item => (
              <div key={`${item.kind}-${item.id}`} className={`today-row${item.overdue ? ' overdue' : ''}`}
                onClick={() => navigate(item.kind === 'task' ? '/mortgage/tasks' : '/mortgage/followups')}>
                {item.kind === 'task' ? (
                  <button title="Mark done" onClick={e => { e.stopPropagation(); completeTask(item.raw); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ink-3)', flexShrink: 0, display: 'flex' }}>
                    <Circle size={16}/>
                  </button>
                ) : (
                  <Reply size={15} style={{ color: 'var(--info)', flexShrink: 0 }}/>
                )}
                <span className="today-kind" style={item.kind === 'task'
                  ? { background: 'var(--mortgage-dim)', color: 'var(--mortgage)' }
                  : { background: 'var(--info-dim)',     color: 'var(--info)' }}>
                  {item.kind === 'task' ? 'Task' : 'Follow-up'}
                </span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                  {item.kind === 'task' && item.client && <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}> · {item.client}</span>}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: item.overdue ? 700 : 500, color: item.overdue ? 'var(--danger)' : 'var(--warn)', flexShrink: 0 }}>
                  {item.overdue ? `Overdue · ${fmtShortDate(item.due)}` : item.due ? 'Due today' : 'No date'}
                </span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <QuickAddTask defaultDueToday/>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        <KpiCard icon={Target} label="Goals on Track" value={`${goalsOnTrack}/${activeGoals.length}`}
          color="var(--goals)" soft="var(--goals-dim)" onClick={() => navigate('/goals')}/>
        <KpiCard icon={TrendingUp} label="Pipeline Value" value={formatCurrency(pipelineValue, true)}
          sub={`${activeLoans.length} active loans`}
          color="var(--mortgage)" soft="var(--mortgage-dim)" onClick={() => navigate('/mortgage/pipeline')}/>
        <KpiCard icon={Reply} label="Follow-ups On Me" value={dueFups.length}
          color={dueFups.length > 0 ? 'var(--warn)' : 'var(--ok)'} soft={dueFups.length > 0 ? 'var(--warn-dim)' : 'var(--ok-dim)'}
          onClick={() => navigate('/mortgage/followups')}/>
        <KpiCard icon={AlertCircle} label="Overdue CRM Tasks" value={overdueCrm}
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
              <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No active goals yet.</div>
            )}
            {activeGoals.slice(0, 5).map(g => {
              const act    = getGoalActuals(g, goalLog);
              const pct    = pctRound(act.year, g.year?.target);
              const status = paceStatus(act.year, g.year?.target, getGoalIdeal(g, 'year'));
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

        {/* Pipeline column */}
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
              <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No loans in pipeline yet.</div>
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
        </div>

        {/* Notes & Ideas column */}
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <span className="section-pip" style={{ background: '#60A5FA' }}/>
              <span style={{ color: '#60A5FA' }}>Notes &amp; Ideas</span>
            </div>
            <button className="btn ghost sm" onClick={() => navigate('/notes')} style={{ gap: 4 }}>
              View all <ArrowRight size={12}/>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentPNotes.length === 0 && (
              <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                Nothing captured yet.
              </div>
            )}
            {recentPNotes.map(n => (
              <div key={n.id} className="dash-task-row" onClick={() => navigate('/notes')}>
                <NotebookPen size={13} style={{ color: NOTE_TYPE_COLORS[n.noteType] || 'var(--ink-3)', flexShrink: 0 }}/>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.title || 'Untitled'}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--ink-3)', flexShrink: 0 }}>{fmtRelative(n.updatedAt)}</span>
              </div>
            ))}
          </div>
          <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => navigate('/notes')}>
            <Plus size={13}/> New Note
          </button>
        </div>
      </div>
    </div>
  );
}
