import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit3, Check, X, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  formatCurrency, formatNumber, pct, pctRound,
  tsToDateInput, dateInputToTs, todayTs, oneYearFromTs, fmtShortDate, fmtRelative,
  getGoalActuals, getGoalPeriods, getGoalIdeal, paceStatus, getCycleWeeks, deriveQuarters,
} from '../utils';
import { GOAL_COLORS, GOAL_GLYPHS } from '../constants';

const fmt = (n, isCur) => isCur ? formatCurrency(n) : formatNumber(n);
const nextCls = goals => GOAL_COLORS[goals.length % GOAL_COLORS.length].cls;

// ─── Goal Modal ────────────────────────────────────────────────────────────────
function GoalModal({ editGoal, allGoals, onSave, onClose }) {
  const isEdit = !!editGoal;
  const blank = {
    label: '', short: '', glyph: '🎯', cls: nextCls(allGoals),
    unit: 'count', step: '1', type: 'northstar', parentId: '',
    yearTarget: '', qTarget: '', cycleTarget: '', weekTarget: '',
    autoCalc: true,
    yearStart: tsToDateInput(todayTs()),
    yearEnd:   tsToDateInput(oneYearFromTs(todayTs())),
  };
  const [f, setF] = useState(() => isEdit ? {
    label: editGoal.label, short: editGoal.short || '', glyph: editGoal.glyph,
    cls: editGoal.cls, unit: editGoal.unit, step: String(editGoal.step || 1),
    type: editGoal.type, parentId: editGoal.parentId || '',
    yearTarget: String(editGoal.year?.target || ''),
    qTarget: String(editGoal.q?.target || ''),
    cycleTarget: String(editGoal.cycle?.target || ''),
    weekTarget: String(editGoal.week?.target || ''),
    autoCalc: false,
    yearStart: tsToDateInput(editGoal.yearStart || todayTs()),
    yearEnd:   tsToDateInput(editGoal.yearEnd   || oneYearFromTs(todayTs())),
  } : blank);

  function sf(k, v) {
    setF(prev => {
      const n = { ...prev, [k]: v };
      if (k === 'yearTarget' && prev.autoCalc) {
        const yr = Number(v) || 0;
        n.qTarget = String(Math.round(yr / 4));
        n.cycleTarget = String(Math.round(yr / 8));
        n.weekTarget = String(Math.round(yr / 48));
      }
      return n;
    });
  }

  const northStars = allGoals.filter(g => g.type === 'northstar' && (!isEdit || g.id !== editGoal?.id));
  const valid = f.label.trim() && Number(f.yearTarget) > 0;
  const color = GOAL_COLORS.find(c => c.cls === f.cls) || GOAL_COLORS[0];

  function submit() {
    if (!valid) return;
    onSave({
      label: f.label.trim(),
      short: f.short.trim() || f.label.split(' ')[0].slice(0, 8),
      glyph: f.glyph || '🎯', cls: f.cls, unit: f.unit,
      step: Number(f.step) || 1, type: f.type,
      parentId: f.parentId || null,
      yearStart: dateInputToTs(f.yearStart), yearEnd: dateInputToTs(f.yearEnd),
      year:  { target: Number(f.yearTarget) || 0 },
      q:     { target: Number(f.qTarget)    || 0 },
      cycle: { target: Number(f.cycleTarget)|| 0 },
      week:  { target: Number(f.weekTarget) || 0 },
    });
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={isEdit ? 'Edit Goal' : 'Add New Goal'} size="lg">
      <div className="modal-body">
        {/* Type */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Goal Type</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn${f.type === 'northstar' ? ' primary' : ''}`} onClick={() => sf('type', 'northstar')}>🎯 North Star</button>
            <button className={`btn${f.type === 'activity'  ? ' primary' : ''}`} onClick={() => sf('type', 'activity')}>⚡ Activity / Input</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
            {f.type === 'northstar' ? 'The outcome you want to achieve.' : 'A leading action that drives your north star goal.'}
          </div>
        </div>

        {/* Name */}
        <div className="form-grid form-2">
          <div className="field">
            <label>Goal Name *</label>
            <input value={f.label} onChange={e => sf('label', e.target.value)} placeholder="e.g. Revenue, Workouts, Calls"/>
          </div>
          <div className="field">
            <label>Short Label</label>
            <input value={f.short} onChange={e => sf('short', e.target.value)} placeholder="Rev"/>
          </div>
        </div>

        {/* Icon + color */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Icon & Colour</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: color.bg, color: color.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '1px solid var(--border)', flexShrink: 0 }}>
              {f.glyph || '🎯'}
            </div>
            <input value={f.glyph} onChange={e => sf('glyph', e.target.value)} maxLength={2}
              style={{ width: 52, padding: 8, border: '1px solid var(--border)', borderRadius: 8, fontSize: 20, textAlign: 'center', background: 'var(--surface-2)', color: 'var(--ink)' }}/>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
              {GOAL_GLYPHS.map(g => (
                <button key={g} onClick={() => sf('glyph', g)}
                  style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 15, cursor: 'pointer' }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {GOAL_COLORS.map(c => (
              <button key={c.cls} onClick={() => sf('cls', c.cls)}
                style={{ width: 26, height: 26, borderRadius: 7, cursor: 'pointer', border: `2px solid ${f.cls === c.cls ? c.fg : 'transparent'}`, background: c.bg, transition: 'transform .1s' }}
                title={c.label}/>
            ))}
          </div>
        </div>

        {/* Unit */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Unit</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn sm${f.unit === 'count'    ? ' primary' : ''}`} onClick={() => sf('unit', 'count')}>Number</button>
            <button className={`btn sm${f.unit === 'currency' ? ' primary' : ''}`} onClick={() => sf('unit', 'currency')}>Money ($)</button>
          </div>
        </div>

        {/* Parent */}
        {f.type === 'activity' && northStars.length > 0 && (
          <div className="field">
            <label>Feeds into (optional)</label>
            <select value={f.parentId} onChange={e => sf('parentId', e.target.value)}>
              <option value="">— None —</option>
              {northStars.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
        )}

        {/* Period */}
        <div className="form-grid form-2">
          <div className="field">
            <label>Start Date</label>
            <input type="date" value={f.yearStart} onChange={e => sf('yearStart', e.target.value)}/>
          </div>
          <div className="field">
            <label>End Date</label>
            <input type="date" value={f.yearEnd} onChange={e => sf('yearEnd', e.target.value)}/>
          </div>
        </div>

        {/* Targets */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="section-label">Targets</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer' }}>
              <input type="checkbox" checked={f.autoCalc} onChange={e => sf('autoCalc', e.target.checked)} style={{ width: 'auto' }}/>
              Auto-calculate from annual
            </label>
          </div>
          <div className="form-grid form-2" style={{ gap: 10 }}>
            {[['yearTarget', 'Annual Target *'], ['qTarget', 'Quarterly'], ['cycleTarget', '6-week Cycle'], ['weekTarget', 'Weekly']].map(([key, lbl]) => (
              <div className="field" key={key}>
                <label>{lbl}</label>
                <input type="number" value={f[key]} onChange={e => sf(key, e.target.value)} placeholder="0"
                  readOnly={f.autoCalc && key !== 'yearTarget'}
                  style={{ opacity: f.autoCalc && key !== 'yearTarget' ? .6 : 1 }}/>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" onClick={submit} disabled={!valid}>
          {isEdit ? 'Save Changes' : 'Create Goal'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Log Modal ─────────────────────────────────────────────────────────────────
function LogModal({ goal, onSave, onClose }) {
  const [amt,  setAmt]  = useState('');
  const [note, setNote] = useState('');
  const isCur = goal.unit === 'currency';

  return (
    <Modal isOpen={true} onClose={onClose} title={`Log — ${goal.label}`} size="sm">
      <div className="modal-body">
        <div className="field">
          <label>{isCur ? 'Amount ($)' : 'Count'}</label>
          <input type="number" value={amt} onChange={e => setAmt(e.target.value)}
            placeholder={isCur ? '10000' : '1'} autoFocus step={goal.step || 1}/>
        </div>
        <div className="field">
          <label>Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="What happened?"/>
        </div>
        {/* Quick-add buttons */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Quick Add</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[1, 2, 5, 10, 25, 50].map(n => {
              const v = isCur ? n * (goal.step || 10000) : n * (goal.step || 1);
              return (
                <button key={n} className="btn sm" onClick={() => setAmt(String(v))}>
                  +{isCur ? formatCurrency(v, true) : v}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!Number(amt)} onClick={() => onSave(Number(amt), note)}>
          Log Entry
        </button>
      </div>
    </Modal>
  );
}

// ─── Pace Bar ─────────────────────────────────────────────────────────────────
function PaceBar({ progress, target, ideal, color }) {
  const p = pct(progress, target);
  const barColor = color || (p >= ideal ? 'var(--ok)' : 'var(--danger)');
  return (
    <div className="pace-bar">
      <div className="pace-fill" style={{ width: p + '%', background: barColor }}/>
      {ideal != null && <div className="pace-marker" style={{ left: ideal + '%' }}/>}
    </div>
  );
}

// ─── Goal Detail ──────────────────────────────────────────────────────────────
function GoalDetail({ goal, log, onLog, onEdit, onDelete }) {
  const act    = getGoalActuals(goal, log);
  const gp     = getGoalPeriods(goal);
  const isCur  = goal.unit === 'currency';
  const weeks  = getCycleWeeks(goal, log);
  const color  = GOAL_COLORS.find(c => c.cls === goal.cls) || GOAL_COLORS[0];

  const metrics = [
    { label: 'Annual',  actual: act.year,  target: goal.year?.target,  period: 'year'  },
    { label: 'Quarter', actual: act.q,     target: goal.q?.target,     period: 'q'     },
    { label: '6-Week',  actual: act.cycle, target: goal.cycle?.target, period: 'cycle' },
    { label: 'This Week',actual: act.week, target: goal.week?.target,  period: 'week'  },
  ];

  const goalLog = log.filter(l => l.goalId === goal.id).sort((a,b) => b.ts - a.ts);

  return (
    <div className="fade-in">
      <div className="goal-detail-header">
        <div className={`goal-icon-lg ${goal.cls || 'gc0'}`}>{goal.glyph || '🎯'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 4 }}>{goal.label}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge goals">{goal.type === 'northstar' ? '🎯 North Star' : '⚡ Activity'}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {fmtShortDate(goal.yearStart)} → {fmtShortDate(goal.yearEnd)}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn sm" onClick={() => onLog(goal)}><Plus size={13}/> Log</button>
              <button className="icon-btn sm" onClick={() => onEdit(goal)}><Edit3 size={13}/></button>
              <button className="icon-btn sm danger" onClick={() => onDelete(goal)}><Trash2 size={13}/></button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        {metrics.map(m => {
          const ideal  = getGoalIdeal(goal, m.period);
          const status = paceStatus(m.actual, m.target, ideal);
          const PaceIcon = status.key === 'ahead' ? TrendingUp : status.key === 'behind' ? TrendingDown : Minus;
          const paceColor = { ahead: 'var(--ok)', behind: 'var(--danger)', ontrack: 'var(--ink-2)' }[status.key];
          return (
            <div key={m.period} className="metric-card">
              <div className="metric-label">{m.label}</div>
              <div className="metric-value" style={{ color: color.fg }}>{fmt(m.actual, isCur)}</div>
              <div className="metric-target">of {fmt(m.target || 0, isCur)}</div>
              <div className={`metric-pace ${status.key}`}>
                <PaceIcon size={12}/> {status.label}
              </div>
              <div style={{ marginTop: 8 }}>
                <PaceBar progress={m.actual} target={m.target} ideal={ideal} color={color.fg}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* 6-week breakdown */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-label" style={{ marginBottom: 12 }}>Current 6-Week Cycle</div>
        <div className="week-grid">
          {weeks.map((w, i) => {
            const p = pct(w.actual, w.target);
            return (
              <div key={i} className={`week-cell ${w.status}`}>
                <div className="week-label">{w.label}</div>
                <div className="week-value" style={{ color: w.status === 'now' ? color.fg : 'var(--ink)' }}>
                  {fmt(w.actual, isCur)}
                </div>
                {w.target > 0 && <div className="week-target">/ {fmt(w.target, isCur)}</div>}
                {w.target > 0 && (
                  <div className="week-bar">
                    <div className="week-bar-fill" style={{ width: p + '%', background: w.status === 'now' ? color.fg : p >= 100 ? 'var(--ok)' : 'var(--border-strong)' }}/>
                  </div>
                )}
                <div style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 4 }}>{w.range}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="section-label">Activity Log</div>
          <button className="btn sm" onClick={() => onLog(goal)}><Plus size={12}/> Log Entry</button>
        </div>
        {goalLog.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '16px 0' }}>No entries logged yet.</div>
        ) : (
          <div>
            {goalLog.slice(0, 20).map(l => (
              <div key={l.id} className="log-row">
                <div className="log-amount">+{fmt(l.amt, isCur)}</div>
                <div className="log-note">{l.note || <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>No note</span>}</div>
                <div className="log-time">{fmtRelative(l.ts)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Goals Overview ──────────────────────────────────────────────────────────
function GoalsOverview({ goals, log, onSelectGoal, onAdd, onLog }) {
  const northStars = goals.filter(g => g.type === 'northstar' && (!g.status || g.status === 'active'));
  const activities = goals.filter(g => g.type === 'activity'  && (!g.status || g.status === 'active'));

  function GoalRow({ g }) {
    const act    = getGoalActuals(g, log);
    const ideal  = getGoalIdeal(g, 'year');
    const status = paceStatus(act.year, g.year?.target, ideal);
    const color  = GOAL_COLORS.find(c => c.cls === g.cls) || GOAL_COLORS[0];
    const p      = pctRound(act.year, g.year?.target);
    const PaceIcon = status.key === 'ahead' ? TrendingUp : status.key === 'behind' ? TrendingDown : Minus;
    const paceColor = { ahead: 'var(--ok)', behind: 'var(--danger)', ontrack: 'var(--ink-2)' }[status.key];

    return (
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div className={`goal-icon ${g.cls || 'gc0'}`}>{g.glyph || '🎯'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer', color: 'var(--ink)' }} onClick={() => onSelectGoal(g)}>
              {g.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{g.unit === 'currency' ? 'Money' : 'Count'} · {g.type === 'northstar' ? 'North Star' : 'Activity'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: paceColor }}>
              <PaceIcon size={12}/> {status.label}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: color.fg }}>{p}%</span>
            <button className="btn sm" onClick={() => onLog(g)}><Plus size={12}/></button>
          </div>
        </div>
        <div style={{ marginBottom: 4 }}>
          <PaceBar progress={act.year} target={g.year?.target} ideal={ideal} color={color.fg}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
          <span>{g.unit === 'currency' ? formatCurrency(act.year) : formatNumber(act.year)} of {g.unit === 'currency' ? formatCurrency(g.year?.target) : formatNumber(g.year?.target)}</span>
          <span>Ideal: {ideal}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Goals Overview</h2>
        <button className="btn accent" onClick={onAdd}><Plus size={14}/> Add Goal</button>
      </div>

      {goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <h3>No goals yet</h3>
          <p>Add your first North Star goal — the outcome you want to achieve, then add activities that drive you there.</p>
          <button className="btn accent lg" onClick={onAdd}><Plus size={15}/> Add Your First Goal</button>
        </div>
      ) : (
        <>
          {northStars.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-label" style={{ marginBottom: 12, color: 'var(--goals)' }}>🎯 North Star Goals</div>
              {northStars.map(g => <GoalRow key={g.id} g={g}/>)}
            </div>
          )}
          {activities.length > 0 && (
            <div>
              <div className="section-label" style={{ marginBottom: 12, color: 'var(--tasks)' }}>⚡ Activities</div>
              {activities.map(g => <GoalRow key={g.id} g={g}/>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Goals Page ──────────────────────────────────────────────────────────
export default function Goals() {
  const { goals, goalLog, addGoal, updateGoal, deleteGoal, addGoalLog } = useData();
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [showGoalModal,  setShowGoalModal]  = useState(false);
  const [editGoal,       setEditGoal]       = useState(null);
  const [logGoal,        setLogGoal]        = useState(null);
  const [delGoal,        setDelGoal]        = useState(null);

  const activeGoals = goals.filter(g => !g.status || g.status === 'active');
  const selectedGoal = activeGoals.find(g => g.id === selectedGoalId);

  async function handleSaveGoal(data) {
    try {
      if (editGoal) { await updateGoal(editGoal.id, data); toast.success('Goal updated'); }
      else          { await addGoal(data); toast.success('Goal created!'); }
    } catch { toast.error('Failed to save goal.'); }
    setShowGoalModal(false); setEditGoal(null);
  }

  async function handleLog(goal, amt, note) {
    try {
      await addGoalLog({ goalId: goal.id, amt, note: note || '' });
      toast.success(`Logged +${goal.unit === 'currency' ? formatCurrency(amt) : amt}`);
    } catch { toast.error('Failed to log entry.'); }
    setLogGoal(null);
  }

  async function handleDelete(goal) {
    try { await deleteGoal(goal.id); toast.success('Goal deleted.'); }
    catch { toast.error('Failed to delete.'); }
    if (selectedGoalId === goal.id) setSelectedGoalId(null);
    setDelGoal(null);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Goals Tracker</div>
          <div className="page-sub">{activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="page-actions">
          <button className="btn accent" onClick={() => { setEditGoal(null); setShowGoalModal(true); }}>
            <Plus size={14}/> Add Goal
          </button>
        </div>
      </div>

      <div className="goals-layout">
        {/* Sidebar list */}
        <div className="goals-sidebar">
          <button className={`goal-list-item w-full${!selectedGoalId ? ' active' : ''}`} onClick={() => setSelectedGoalId(null)}>
            <span style={{ fontSize: 16 }}>📊</span>
            <span>Overview</span>
          </button>

          {activeGoals.filter(g => g.type === 'northstar').length > 0 && (
            <div className="goals-sidebar-section">North Stars</div>
          )}
          {activeGoals.filter(g => g.type === 'northstar').map(g => {
            const act = getGoalActuals(g, goalLog);
            const p   = pctRound(act.year, g.year?.target);
            return (
              <button key={g.id} className={`goal-list-item w-full${selectedGoalId === g.id ? ' active' : ''}`}
                onClick={() => setSelectedGoalId(g.id)}>
                <div className={`goal-icon ${g.cls || 'gc0'}`} style={{ width: 22, height: 22, borderRadius: 6, fontSize: 12, flexShrink: 0 }}>{g.glyph}</div>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.label}</span>
                <span className="goal-list-pct">{p}%</span>
              </button>
            );
          })}

          {activeGoals.filter(g => g.type === 'activity').length > 0 && (
            <div className="goals-sidebar-section">Activities</div>
          )}
          {activeGoals.filter(g => g.type === 'activity').map(g => {
            const act = getGoalActuals(g, goalLog);
            const p   = pctRound(act.year, g.year?.target);
            return (
              <button key={g.id} className={`goal-list-item w-full${selectedGoalId === g.id ? ' active' : ''}`}
                onClick={() => setSelectedGoalId(g.id)}>
                <div className={`goal-icon ${g.cls || 'gc0'}`} style={{ width: 22, height: 22, borderRadius: 6, fontSize: 12, flexShrink: 0 }}>{g.glyph}</div>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.label}</span>
                <span className="goal-list-pct">{p}%</span>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div className="goals-main">
          {selectedGoal ? (
            <GoalDetail
              goal={selectedGoal} log={goalLog}
              onLog={g => setLogGoal(g)}
              onEdit={g => { setEditGoal(g); setShowGoalModal(true); }}
              onDelete={g => setDelGoal(g)}
            />
          ) : (
            <GoalsOverview
              goals={activeGoals} log={goalLog}
              onSelectGoal={g => setSelectedGoalId(g.id)}
              onAdd={() => { setEditGoal(null); setShowGoalModal(true); }}
              onLog={g => setLogGoal(g)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showGoalModal && (
        <GoalModal
          editGoal={editGoal} allGoals={activeGoals}
          onSave={handleSaveGoal}
          onClose={() => { setShowGoalModal(false); setEditGoal(null); }}
        />
      )}
      {logGoal && (
        <LogModal goal={logGoal} onSave={(amt, note) => handleLog(logGoal, amt, note)} onClose={() => setLogGoal(null)}/>
      )}
      <ConfirmDialog
        isOpen={!!delGoal} onClose={() => setDelGoal(null)}
        onConfirm={() => handleDelete(delGoal)}
        title="Delete Goal?"
        message={`This will permanently delete "${delGoal?.label}" and all its log entries.`}
        confirmLabel="Delete Goal"
      />
    </>
  );
}
