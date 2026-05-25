import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit3, Check, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  formatCurrency, formatNumber, pct, pctRound,
  tsToDateInput, dateInputToTs, todayTs, oneYearFromTs, fmtShortDate, fmtRelative,
  getGoalActuals, getGoalPeriods, getGoalIdeal, paceStatus, getCycleWeeks,
} from '../utils';
import { GOAL_COLORS, GOAL_GLYPHS } from '../constants';

const fmt = (n, isCur) => isCur ? formatCurrency(n) : formatNumber(n);
const nextCls = goals => GOAL_COLORS[goals.length % GOAL_COLORS.length].cls;

const PERIOD_OPTIONS = [
  { id: 'weekly',     label: 'Weekly',      divisor: 52  },
  { id: 'fortnightly',label: 'Fortnightly', divisor: 26  },
  { id: 'monthly',    label: 'Monthly',     divisor: 12  },
  { id: 'quarterly',  label: 'Quarterly',   divisor: 4   },
  { id: '6weekly',    label: '6-Weekly',    divisor: 8   },
  { id: 'biannual',   label: 'Bi-Annual',   divisor: 2   },
  { id: 'annual',     label: 'Annual only', divisor: 1   },
];

// ─── Goal Modal ────────────────────────────────────────────────────────────────
function GoalModal({ editGoal, allGoals, onSave, onClose }) {
  const isEdit = !!editGoal;
  const blank = {
    label: '', short: '', glyph: '🎯', cls: nextCls(allGoals),
    unit: 'count', step: '1', type: 'northstar', parentId: '',
    yearTarget: '', periodType: 'monthly', autoCalc: true,
    yearStart: tsToDateInput(todayTs()),
    yearEnd:   tsToDateInput(oneYearFromTs(todayTs())),
  };
  const [f, setF] = useState(() => isEdit ? {
    label: editGoal.label, short: editGoal.short || '',
    glyph: editGoal.glyph, cls: editGoal.cls,
    unit: editGoal.unit, step: String(editGoal.step || 1),
    type: editGoal.type, parentId: editGoal.parentId || '',
    yearTarget: String(editGoal.year?.target || ''),
    periodType: editGoal.periodType || 'monthly',
    autoCalc: false,
    yearStart: tsToDateInput(editGoal.yearStart || todayTs()),
    yearEnd:   tsToDateInput(editGoal.yearEnd   || oneYearFromTs(todayTs())),
  } : blank);

  function sf(k, v) {
    setF(prev => {
      const n = { ...prev, [k]: v };
      return n;
    });
  }

  const northStars = allGoals.filter(g => g.type === 'northstar' && (!isEdit || g.id !== editGoal?.id));
  const valid = f.label.trim() && Number(f.yearTarget) > 0;
  const color = GOAL_COLORS.find(c => c.cls === f.cls) || GOAL_COLORS[0];
  const selectedPeriod = PERIOD_OPTIONS.find(p => p.id === f.periodType) || PERIOD_OPTIONS[2];
  const periodTarget = selectedPeriod.divisor > 1
    ? Math.round((Number(f.yearTarget) || 0) / selectedPeriod.divisor)
    : null;

  function submit() {
    if (!valid) return;
    onSave({
      label: f.label.trim(),
      short: f.short.trim() || f.label.split(' ')[0].slice(0, 8),
      glyph: f.glyph || '🎯', cls: f.cls, unit: f.unit,
      step: Number(f.step) || 1, type: f.type,
      parentId: f.parentId || null,
      yearStart: dateInputToTs(f.yearStart),
      yearEnd:   dateInputToTs(f.yearEnd),
      periodType: f.periodType,
      year:   { target: Number(f.yearTarget) || 0 },
      period: { target: periodTarget || 0 },
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
            <button className={`btn${f.type === 'activity'  ? ' primary' : ''}`} onClick={() => sf('type', 'activity')}>⚡ Activity</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
            {f.type === 'northstar' ? 'The outcome you want to achieve.' : 'A leading action that drives your north star.'}
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
                  style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 15, cursor: 'pointer' }}>{g}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {GOAL_COLORS.map(c => (
              <button key={c.cls} onClick={() => sf('cls', c.cls)}
                style={{ width: 26, height: 26, borderRadius: 7, cursor: 'pointer', border: `2px solid ${f.cls === c.cls ? c.fg : 'transparent'}`, background: c.bg }}
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

        {/* Parent link for activities */}
        {f.type === 'activity' && northStars.length > 0 && (
          <div className="field">
            <label>Feeds into (optional)</label>
            <select value={f.parentId} onChange={e => sf('parentId', e.target.value)}>
              <option value="">— None —</option>
              {northStars.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
        )}

        {/* Start / End Dates */}
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
          <div className="section-label" style={{ marginBottom: 8 }}>Targets</div>
          <div className="form-grid form-2" style={{ gap: 10 }}>
            <div className="field">
              <label>Total Target *</label>
              <input type="number" value={f.yearTarget} onChange={e => sf('yearTarget', e.target.value)} placeholder="0"/>
            </div>
            <div className="field">
              <label>Track by period</label>
              <select value={f.periodType} onChange={e => sf('periodType', e.target.value)}>
                {PERIOD_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          {periodTarget !== null && Number(f.yearTarget) > 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
              → {selectedPeriod.label} target: <strong style={{ color: 'var(--goals)' }}>
                {f.unit === 'currency' ? formatCurrency(periodTarget) : formatNumber(periodTarget)}
              </strong> per {selectedPeriod.label.toLowerCase().replace('ly', '').replace('ual', '')} period
            </div>
          )}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" onClick={submit} disabled={!valid}>{isEdit ? 'Save Changes' : 'Create Goal'}</button>
      </div>
    </Modal>
  );
}

// ─── Log Modal (with date + edit support) ──────────────────────────────────────
function LogModal({ goal, editEntry, onSave, onClose }) {
  const isCur = goal.unit === 'currency';
  const today = new Date().toISOString().split('T')[0];
  const [amt,     setAmt]     = useState(editEntry ? String(editEntry.amt) : '');
  const [note,    setNote]    = useState(editEntry?.note || '');
  const [logDate, setLogDate] = useState(
    editEntry?.logDate || editEntry?.ts
      ? editEntry?.logDate || new Date(editEntry.ts).toISOString().split('T')[0]
      : today
  );
  const isEdit = !!editEntry;

  return (
    <Modal isOpen={true} onClose={onClose} title={isEdit ? 'Edit Log Entry' : `Log — ${goal.label}`} size="sm">
      <div className="modal-body">
        <div className="form-grid form-2">
          <div className="field">
            <label>{isCur ? 'Amount ($)' : 'Count'} *</label>
            <input type="number" value={amt} onChange={e => setAmt(e.target.value)}
              placeholder={isCur ? '10000' : '1'} autoFocus step={goal.step || 1}/>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}/>
          </div>
        </div>
        <div className="field">
          <label>Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="What happened?"/>
        </div>
        {!isEdit && (
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
        )}
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!Number(amt)}
          onClick={() => onSave(Number(amt), note, logDate)}>
          {isEdit ? 'Save Changes' : 'Log Entry'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Pace Bar ─────────────────────────────────────────────────────────────────
function PaceBar({ progress, target, ideal, color }) {
  const p = pct(progress, target);
  const barColor = color || (p >= (ideal || 0) ? 'var(--ok)' : 'var(--danger)');
  return (
    <div className="pace-bar">
      <div className="pace-fill" style={{ width: p + '%', background: barColor }}/>
      {ideal != null && <div className="pace-marker" style={{ left: ideal + '%' }}/>}
    </div>
  );
}

// ─── Goal Detail ──────────────────────────────────────────────────────────────
function GoalDetail({ goal, log, onLog, onEdit, onDelete, onEditLog, onDeleteLog }) {
  const act   = getGoalActuals(goal, log);
  const isCur = goal.unit === 'currency';
  const color = GOAL_COLORS.find(c => c.cls === goal.cls) || GOAL_COLORS[0];
  const periodOption = PERIOD_OPTIONS.find(p => p.id === goal.periodType) || PERIOD_OPTIONS[2];

  const annualIdeal  = getGoalIdeal(goal, 'year');
  const periodActual = useMemo(() => {
    if (!goal.period?.target) return 0;
    // Calculate how many full periods have elapsed and sum the current one
    const now = Date.now();
    const start = goal.yearStart || (goal.createdAt || now);
    const elapsed = now - start;
    const total = (goal.yearEnd || (start + 365 * 86400000)) - start;
    const totalPeriods = periodOption.divisor;
    const periodMs = total / totalPeriods;
    const currentPeriodStart = start + Math.floor(elapsed / periodMs) * periodMs;
    return log.filter(l => l.goalId === goal.id && (l.ts || 0) >= currentPeriodStart)
      .reduce((s, l) => s + (Number(l.amt) || 0), 0);
  }, [goal, log, periodOption]);

  const metrics = [
    { label: 'Total',              actual: act.year,   target: goal.year?.target,   period: 'year'  },
    ...(periodOption.divisor > 1 ? [{
      label: periodOption.label.replace('ly', '').replace('ual', '') + ' Period',
      actual: periodActual, target: goal.period?.target, period: 'period'
    }] : []),
  ];

  const goalLog = log.filter(l => l.goalId === goal.id).sort((a, b) => (b.ts || 0) - (a.ts || 0));

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
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>· {periodOption.label}</span>
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
          const ideal  = m.period === 'year' ? annualIdeal : null;
          const status = paceStatus(m.actual, m.target, ideal || 0);
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
            {goalLog.slice(0, 30).map(l => (
              <div key={l.id} className="log-row">
                <div className="log-amount" style={{ color: color.fg }}>+{fmt(l.amt, isCur)}</div>
                <div className="log-note">
                  {l.note || <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>No note</span>}
                </div>
                <div className="log-time">
                  {l.logDate ? fmtShortDate(l.logDate) : fmtRelative(l.ts)}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="icon-btn sm" onClick={() => onEditLog(l)}><Edit3 size={11}/></button>
                  <button className="icon-btn sm danger" onClick={() => onDeleteLog(l.id)}><Trash2 size={11}/></button>
                </div>
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

  function GoalCard({ g }) {
    const act    = getGoalActuals(g, log);
    const ideal  = getGoalIdeal(g, 'year');
    const status = paceStatus(act.year, g.year?.target, ideal);
    const color  = GOAL_COLORS.find(c => c.cls === g.cls) || GOAL_COLORS[0];
    const p      = pctRound(act.year, g.year?.target);
    const PaceIcon = status.key === 'ahead' ? TrendingUp : status.key === 'behind' ? TrendingDown : Minus;
    const paceColor = { ahead: 'var(--ok)', behind: 'var(--danger)', ontrack: 'var(--ink-2)' }[status.key];

    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
        padding: '18px', display: 'flex', flexDirection: 'column', gap: 12,
        cursor: 'pointer', transition: 'border-color .15s',
      }}
        onClick={() => onSelectGoal(g)}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={`goal-icon ${g.cls || 'gc0'}`}>{g.glyph || '🎯'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.label}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{g.unit === 'currency' ? 'Money' : 'Count'} · {(PERIOD_OPTIONS.find(p => p.id === g.periodType) || PERIOD_OPTIONS[2]).label}</div>
          </div>
          <button className="btn sm" onClick={e => { e.stopPropagation(); onLog(g); }}><Plus size={12}/></button>
        </div>
        <div>
          <PaceBar progress={act.year} target={g.year?.target} ideal={ideal} color={color.fg}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 5 }}>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: color.fg, fontSize: 13 }}>{p}%</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: paceColor, fontWeight: 600 }}>
              <PaceIcon size={11}/> {status.label}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
            {g.unit === 'currency' ? formatCurrency(act.year) : formatNumber(act.year)} / {g.unit === 'currency' ? formatCurrency(g.year?.target) : formatNumber(g.year?.target)}
          </div>
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎯</div>
        <h3>No goals yet</h3>
        <p>Add your first North Star goal — the outcome you want to achieve, then add activities that drive you there.</p>
        <button className="btn accent lg" onClick={onAdd}><Plus size={15}/> Add Your First Goal</button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Goals Overview</h2>
        <button className="btn accent" onClick={onAdd}><Plus size={14}/> Add Goal</button>
      </div>

      {northStars.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-label" style={{ marginBottom: 12, color: 'var(--goals)' }}>🎯 North Star Goals</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {northStars.map(g => <GoalCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}
      {activities.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 12, color: 'var(--tasks)' }}>⚡ Activities</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {activities.map(g => <GoalCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Goals Page ──────────────────────────────────────────────────────────
export default function Goals() {
  const { goals, goalLog, addGoal, updateGoal, deleteGoal, addGoalLog, updateGoalLog, deleteGoalLog } = useData();
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [showGoalModal,  setShowGoalModal]  = useState(false);
  const [editGoal,       setEditGoal]       = useState(null);
  const [logGoal,        setLogGoal]        = useState(null);
  const [editLogEntry,   setEditLogEntry]   = useState(null);
  const [delGoal,        setDelGoal]        = useState(null);
  const [delLogId,       setDelLogId]       = useState(null);

  const activeGoals  = goals.filter(g => !g.status || g.status === 'active');
  const selectedGoal = activeGoals.find(g => g.id === selectedGoalId);

  async function handleSaveGoal(data) {
    try {
      if (editGoal) { await updateGoal(editGoal.id, data); toast.success('Goal updated'); }
      else          { await addGoal(data); toast.success('Goal created!'); }
    } catch { toast.error('Failed to save goal.'); }
    setShowGoalModal(false); setEditGoal(null);
  }

  async function handleLog(goal, amt, note, logDate) {
    try {
      const ts = logDate ? new Date(logDate).getTime() : Date.now();
      await addGoalLog({ goalId: goal.id, amt, note: note || '', logDate: logDate || '', ts });
      toast.success(`Logged +${goal.unit === 'currency' ? formatCurrency(amt) : amt}`);
    } catch { toast.error('Failed to log entry.'); }
    setLogGoal(null);
  }

  async function handleEditLog(entry, amt, note, logDate) {
    try {
      const ts = logDate ? new Date(logDate).getTime() : entry.ts;
      await updateGoalLog(entry.id, { ...entry, amt, note: note || '', logDate: logDate || '', ts });
      toast.success('Log entry updated.');
    } catch { toast.error('Failed to update.'); }
    setEditLogEntry(null);
  }

  async function handleDelete(goal) {
    try { await deleteGoal(goal.id); toast.success('Goal deleted.'); }
    catch { toast.error('Failed to delete.'); }
    if (selectedGoalId === goal.id) setSelectedGoalId(null);
    setDelGoal(null);
  }

  async function handleDeleteLog(id) {
    try { await deleteGoalLog(id); toast.success('Entry deleted.'); }
    catch { toast.error('Failed.'); }
    setDelLogId(null);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Goals Tracker</div>
          <div className="page-sub">{activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="page-actions">
          <button className="btn accent" onClick={() => { setEditGoal(null); setShowGoalModal(true); }}><Plus size={14}/> Add Goal</button>
        </div>
      </div>

      <div className="goals-layout">
        {/* Sidebar */}
        <div className="goals-sidebar">
          <button className={`goal-list-item w-full${!selectedGoalId ? ' active' : ''}`} onClick={() => setSelectedGoalId(null)}>
            <span style={{ fontSize: 16 }}>📊</span><span>Overview</span>
          </button>
          {activeGoals.filter(g => g.type === 'northstar').length > 0 && <div className="goals-sidebar-section">North Stars</div>}
          {activeGoals.filter(g => g.type === 'northstar').map(g => {
            const act = getGoalActuals(g, goalLog);
            const p   = pctRound(act.year, g.year?.target);
            return (
              <button key={g.id} className={`goal-list-item w-full${selectedGoalId === g.id ? ' active' : ''}`} onClick={() => setSelectedGoalId(g.id)}>
                <div className={`goal-icon ${g.cls || 'gc0'}`} style={{ width: 22, height: 22, borderRadius: 6, fontSize: 12, flexShrink: 0 }}>{g.glyph}</div>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.label}</span>
                <span className="goal-list-pct">{p}%</span>
              </button>
            );
          })}
          {activeGoals.filter(g => g.type === 'activity').length > 0 && <div className="goals-sidebar-section">Activities</div>}
          {activeGoals.filter(g => g.type === 'activity').map(g => {
            const act = getGoalActuals(g, goalLog);
            const p   = pctRound(act.year, g.year?.target);
            return (
              <button key={g.id} className={`goal-list-item w-full${selectedGoalId === g.id ? ' active' : ''}`} onClick={() => setSelectedGoalId(g.id)}>
                <div className={`goal-icon ${g.cls || 'gc0'}`} style={{ width: 22, height: 22, borderRadius: 6, fontSize: 12, flexShrink: 0 }}>{g.glyph}</div>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.label}</span>
                <span className="goal-list-pct">{p}%</span>
              </button>
            );
          })}
        </div>

        {/* Main */}
        <div className="goals-main">
          {selectedGoal ? (
            <GoalDetail
              goal={selectedGoal} log={goalLog}
              onLog={g => setLogGoal(g)}
              onEdit={g => { setEditGoal(g); setShowGoalModal(true); }}
              onDelete={g => setDelGoal(g)}
              onEditLog={entry => setEditLogEntry(entry)}
              onDeleteLog={id => setDelLogId(id)}
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

      {showGoalModal && (
        <GoalModal editGoal={editGoal} allGoals={activeGoals} onSave={handleSaveGoal} onClose={() => { setShowGoalModal(false); setEditGoal(null); }}/>
      )}
      {logGoal && !editLogEntry && (
        <LogModal goal={logGoal} onSave={(amt, note, date) => handleLog(logGoal, amt, note, date)} onClose={() => setLogGoal(null)}/>
      )}
      {editLogEntry && (
        <LogModal
          goal={activeGoals.find(g => g.id === editLogEntry.goalId) || activeGoals[0]}
          editEntry={editLogEntry}
          onSave={(amt, note, date) => handleEditLog(editLogEntry, amt, note, date)}
          onClose={() => setEditLogEntry(null)}
        />
      )}
      <ConfirmDialog isOpen={!!delGoal} onClose={() => setDelGoal(null)} onConfirm={() => handleDelete(delGoal)}
        title="Delete Goal?" message={`Delete "${delGoal?.label}" and all its log entries?`} confirmLabel="Delete Goal"/>
      <ConfirmDialog isOpen={!!delLogId} onClose={() => setDelLogId(null)} onConfirm={() => handleDeleteLog(delLogId)}
        title="Delete Entry?" message="Remove this log entry?" confirmLabel="Delete"/>
    </>
  );
}
