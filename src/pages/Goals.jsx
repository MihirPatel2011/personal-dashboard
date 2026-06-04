import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit3, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  formatCurrency, formatNumber, pctRound,
  tsToDateInput, dateInputToTs, fmtShortDate, fmtRelative,
  paceStatus,
} from '../utils';
import { GOAL_COLORS, GOAL_GLYPHS } from '../constants';

const fmt = (n, isCur) => isCur ? formatCurrency(n) : formatNumber(n);
const nextCls = gs => GOAL_COLORS[gs.length % GOAL_COLORS.length].cls;

// ── 2026 Period constants ─────────────────────────────────────────────────────
const YEAR    = 2026;
const Y_START = new Date(YEAR, 0, 1).getTime();
const Y_END   = new Date(YEAR + 1, 0, 1).getTime(); // exclusive

const MONTHS_FULL = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

const QUARTERS = [
  { idx: 0, label: 'Q1', range: 'Jan – Mar', start: new Date(YEAR,0,1).getTime(), end: new Date(YEAR,3,1).getTime() },
  { idx: 1, label: 'Q2', range: 'Apr – Jun', start: new Date(YEAR,3,1).getTime(), end: new Date(YEAR,6,1).getTime() },
  { idx: 2, label: 'Q3', range: 'Jul – Sep', start: new Date(YEAR,6,1).getTime(), end: new Date(YEAR,9,1).getTime() },
  { idx: 3, label: 'Q4', range: 'Oct – Dec', start: new Date(YEAR,9,1).getTime(), end: new Date(YEAR+1,0,1).getTime() },
];

const MONTHS_2026 = Array.from({ length: 12 }, (_, i) => ({
  idx: i, label: MONTHS_FULL[i], short: MONTHS_FULL[i].slice(0, 3),
  start: new Date(YEAR, i, 1).getTime(),
  end:   new Date(YEAR, i + 1, 1).getTime(),
}));

function nowQIdx() {
  const now = Date.now();
  const i = QUARTERS.findIndex(q => now >= q.start && now < q.end);
  return i === -1 ? 3 : i;
}
function nowMIdx() { return new Date().getMonth(); }

function getWeek(offset = 0) {
  const now = new Date();
  const dow = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((dow + 6) % 7) + offset * 7);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 7);
  const last = new Date(sun.getTime() - 1);
  const d = (d) => `${d.getDate()} ${MONTHS_FULL[d.getMonth()].slice(0, 3)}`;
  return { start: mon.getTime(), end: sun.getTime(), label: `${d(mon)} – ${d(last)}` };
}

// ── Data helpers ──────────────────────────────────────────────────────────────
function sumLogs(log, goalId, start, end) {
  return log
    .filter(l => l.goalId === goalId && (l.ts || 0) >= start && (l.ts || 0) < end)
    .reduce((s, l) => s + (Number(l.amt) || 0), 0);
}
function windowIdeal(start, end) {
  const now = Date.now();
  if (now >= end)  return 100;
  if (now < start) return 0;
  return Math.round((now - start) / (end - start) * 100);
}
function getQTarget(goal, qi)       { return goal.qTargets?.[`q${qi}`]       || (goal.year?.target ? Math.round(goal.year.target / 4)  : 0); }
function getMTarget(goal, mi)       { return goal.mTargets?.[`m${mi}`]       || (goal.year?.target ? Math.round(goal.year.target / 12) : 0); }
function getWTarget(goal, weekStart){ return goal.wTargets?.[`w${weekStart}`]|| (goal.year?.target ? Math.round(goal.year.target / 52) : 0); }

// ── Pace Bar ──────────────────────────────────────────────────────────────────
function PaceBar({ actual, target, ideal, color }) {
  const p = pctRound(actual, target);
  const barColor = color || (p >= (ideal || 0) ? 'var(--ok)' : 'var(--danger)');
  return (
    <div className="pace-bar" style={{ height: 6 }}>
      <div className="pace-fill" style={{ width: p + '%', background: barColor }}/>
      {ideal != null && <div className="pace-marker" style={{ left: ideal + '%' }}/>}
    </div>
  );
}

// ── Goal Modal ────────────────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { id: 'weekly', label: 'Weekly', divisor: 52 }, { id: 'fortnightly', label: 'Fortnightly', divisor: 26 },
  { id: 'monthly', label: 'Monthly', divisor: 12 }, { id: 'quarterly', label: 'Quarterly', divisor: 4 },
  { id: '6weekly', label: '6-Weekly', divisor: 8 }, { id: 'annual', label: 'Annual only', divisor: 1 },
];

function GoalModal({ editGoal, allGoals, onSave, onClose }) {
  const isEdit = !!editGoal;
  const blank = {
    label: '', short: '', glyph: '🎯', cls: nextCls(allGoals),
    unit: 'count', step: '1', type: 'northstar', parentId: '',
    yearTarget: '', periodType: 'monthly', autoCalc: true,
    yearStart: tsToDateInput(new Date(YEAR, 0, 1).getTime()),
    yearEnd:   tsToDateInput(new Date(YEAR, 11, 31).getTime()),
  };
  const [f, setF] = useState(() => isEdit ? {
    label: editGoal.label, short: editGoal.short || '', glyph: editGoal.glyph, cls: editGoal.cls,
    unit: editGoal.unit, step: String(editGoal.step || 1), type: editGoal.type,
    parentId: editGoal.parentId || '', yearTarget: String(editGoal.year?.target || ''),
    periodType: editGoal.periodType || 'monthly', autoCalc: false,
    yearStart: tsToDateInput(editGoal.yearStart || new Date(YEAR,0,1).getTime()),
    yearEnd:   tsToDateInput(editGoal.yearEnd   || new Date(YEAR,11,31).getTime()),
  } : blank);
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));

  const northStars = allGoals.filter(g => g.type === 'northstar' && (!isEdit || g.id !== editGoal?.id));
  const valid = f.label.trim() && Number(f.yearTarget) > 0;
  const color = GOAL_COLORS.find(c => c.cls === f.cls) || GOAL_COLORS[0];
  const selPeriod = PERIOD_OPTIONS.find(p => p.id === f.periodType) || PERIOD_OPTIONS[2];
  const periodTarget = selPeriod.divisor > 1 ? Math.round((Number(f.yearTarget) || 0) / selPeriod.divisor) : null;

  function submit() {
    if (!valid) return;
    onSave({
      label: f.label.trim(), short: f.short.trim() || f.label.split(' ')[0].slice(0, 8),
      glyph: f.glyph || '🎯', cls: f.cls, unit: f.unit,
      step: Number(f.step) || 1, type: f.type, parentId: f.parentId || null,
      yearStart: dateInputToTs(f.yearStart), yearEnd: dateInputToTs(f.yearEnd),
      periodType: f.periodType,
      year:   { target: Number(f.yearTarget) || 0 },
      period: { target: periodTarget || 0 },
    });
  }

  return (
    <Modal isOpen title={isEdit ? 'Edit Goal' : 'New Goal'} onClose={onClose} size="lg">
      <div className="modal-body">
        {/* Type */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Goal type</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn${f.type === 'northstar' ? ' primary' : ''}`} onClick={() => sf('type', 'northstar')}>🎯 North Star</button>
            <button className={`btn${f.type === 'activity'  ? ' primary' : ''}`} onClick={() => sf('type', 'activity')}>⚡ Activity</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>
            {f.type === 'northstar' ? 'The outcome you want to achieve.' : 'A leading action that drives your north star.'}
          </div>
        </div>

        {/* Name */}
        <div className="form-grid form-2">
          <div className="field"><label>Goal Name *</label>
            <input value={f.label} onChange={e => sf('label', e.target.value)} placeholder="e.g. Revenue, Workouts"/></div>
          <div className="field"><label>Short Label</label>
            <input value={f.short} onChange={e => sf('short', e.target.value)} placeholder="Rev"/></div>
        </div>

        {/* Icon + color */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Icon & colour</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: color.bg, color: color.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '1px solid var(--border)', flexShrink: 0 }}>{f.glyph || '🎯'}</div>
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
                style={{ width: 26, height: 26, borderRadius: 7, cursor: 'pointer', border: `2px solid ${f.cls === c.cls ? c.fg : 'transparent'}`, background: c.bg }}/>
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

        {f.type === 'activity' && northStars.length > 0 && (
          <div className="field"><label>Feeds into (optional)</label>
            <select value={f.parentId} onChange={e => sf('parentId', e.target.value)}>
              <option value="">— None —</option>
              {northStars.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
        )}

        {/* Targets */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Annual target (2026)</div>
          <div className="form-grid form-2" style={{ gap: 10 }}>
            <div className="field"><label>Total Target *</label>
              <input type="number" value={f.yearTarget} onChange={e => sf('yearTarget', e.target.value)} placeholder="0"/></div>
            <div className="field"><label>Track by period</label>
              <select value={f.periodType} onChange={e => sf('periodType', e.target.value)}>
                {PERIOD_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          {periodTarget !== null && Number(f.yearTarget) > 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
              Auto-split: <strong style={{ color: 'var(--goals)' }}>{f.unit === 'currency' ? formatCurrency(periodTarget) : formatNumber(periodTarget)}</strong> per {selPeriod.label.toLowerCase()} period (you can override per period on the page)
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

// ── Log Modal ─────────────────────────────────────────────────────────────────
function LogModal({ goal, editEntry, onSave, onClose }) {
  const isCur = goal.unit === 'currency';
  const today = new Date().toISOString().split('T')[0];
  const [amt,     setAmt]     = useState(editEntry ? String(editEntry.amt) : '');
  const [note,    setNote]    = useState(editEntry?.note || '');
  const [logDate, setLogDate] = useState(
    editEntry?.logDate || (editEntry?.ts ? new Date(editEntry.ts).toISOString().split('T')[0] : today)
  );
  const isEdit = !!editEntry;
  return (
    <Modal isOpen title={isEdit ? 'Edit Log Entry' : `Log — ${goal.label}`} onClose={onClose} size="sm">
      <div className="modal-body">
        <div className="form-grid form-2">
          <div className="field"><label>{isCur ? 'Amount ($)' : 'Count'} *</label>
            <input type="number" value={amt} onChange={e => setAmt(e.target.value)}
              placeholder={isCur ? '10000' : '1'} autoFocus step={goal.step || 1}/></div>
          <div className="field"><label>Date</label>
            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}/></div>
        </div>
        <div className="field"><label>Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="What happened?"/></div>
        {!isEdit && (
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Quick Add</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[1,2,5,10,25,50].map(n => {
                const v = isCur ? n*(goal.step||10000) : n*(goal.step||1);
                return <button key={n} className="btn sm" onClick={() => setAmt(String(v))}>+{isCur ? formatCurrency(v,true) : v}</button>;
              })}
            </div>
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!Number(amt)} onClick={() => onSave(Number(amt), note, logDate)}>
          {isEdit ? 'Save Changes' : 'Log Entry'}
        </button>
      </div>
    </Modal>
  );
}

// ── Yearly Goal Card ──────────────────────────────────────────────────────────
function YearlyGoalCard({ goal, log, onEdit, onDelete, onLog }) {
  const actual = sumLogs(log, goal.id, Y_START, Y_END);
  const target = goal.year?.target || 0;
  const p      = pctRound(actual, target);
  const ideal  = windowIdeal(Y_START, Y_END);
  const status = paceStatus(actual, target, ideal);
  const color  = GOAL_COLORS.find(c => c.cls === goal.cls) || GOAL_COLORS[0];
  const isCur  = goal.unit === 'currency';
  const PaceIcon = status.key === 'ahead' ? TrendingUp : status.key === 'behind' ? TrendingDown : Minus;
  const paceColor = { ahead: 'var(--ok)', behind: 'var(--danger)', ontrack: 'var(--ink-2)' }[status.key];

  return (
    <div className="kpi-card" style={{ '--kpi-color': color.fg, '--kpi-soft': color.bg, cursor: 'default', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, position: 'relative', zIndex: 1 }}>
        <div className={`kpi-icon ${goal.cls || 'gc0'}`} style={{ background: color.bg, color: color.fg, fontSize: 18 }}>{goal.glyph || '🎯'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.label}</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>
            {goal.type === 'northstar' ? '🎯 North Star' : '⚡ Activity'} · 2026
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button className="icon-btn sm" onClick={() => onEdit(goal)}><Edit3 size={12}/></button>
          <button className="icon-btn sm danger" onClick={() => onDelete(goal)}><Trash2 size={12}/></button>
        </div>
      </div>

      {/* Big number */}
      <div className="kpi-value" style={{ color: color.fg, position: 'relative', zIndex: 1 }}>
        {fmt(actual, isCur)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, marginBottom: 12, position: 'relative', zIndex: 1 }}>
        of {fmt(target, isCur)} · <strong style={{ color: p >= ideal ? 'var(--ok)' : 'var(--ink-2)' }}>{p}%</strong>
      </div>

      {/* Progress */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 10 }}>
        <PaceBar actual={actual} target={target} ideal={ideal} color={color.fg}/>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: paceColor, display: 'flex', alignItems: 'center', gap: 4 }}>
          <PaceIcon size={11}/> {status.label}
        </span>
        <button className="btn sm" onClick={() => onLog(goal)}><Plus size={12}/> Log</button>
      </div>
    </div>
  );
}

// ── Add Goal Placeholder Card ─────────────────────────────────────────────────
function AddGoalCard({ onClick, disabled }) {
  return (
    <div onClick={disabled ? undefined : onClick} style={{
      background: 'var(--surface)', border: `1.5px dashed ${disabled ? 'var(--border)' : 'var(--border-2)'}`,
      borderRadius: 'var(--r-lg)', padding: '24px 18px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 8, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'border-color 0.15s, background 0.15s',
      minHeight: 180,
    }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)'; }}}
      onMouseLeave={e => { e.currentTarget.style.borderColor = disabled ? 'var(--border)' : 'var(--border-2)'; e.currentTarget.style.background = 'var(--surface)'; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
        <Plus size={16}/>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>
        {disabled ? '4 goal maximum' : 'Add goal'}
      </div>
    </div>
  );
}

// ── Period Goal Card (compact) ────────────────────────────────────────────────
function PeriodCard({ goal, log, start, end, target, onLog, onUpdateTarget }) {
  const actual  = sumLogs(log, goal.id, start, end);
  const p       = pctRound(actual, target);
  const ideal   = windowIdeal(start, end);
  const status  = paceStatus(actual, target, ideal);
  const color   = GOAL_COLORS.find(c => c.cls === goal.cls) || GOAL_COLORS[0];
  const isCur   = goal.unit === 'currency';
  const isPast  = Date.now() >= end;
  const PaceIcon = status.key === 'ahead' ? TrendingUp : status.key === 'behind' ? TrendingDown : Minus;
  const paceColor = { ahead: 'var(--ok)', behind: 'var(--danger)', ontrack: 'var(--ink-2)' }[status.key];

  const [editingTgt, setEditingTgt] = useState(false);
  const [tgtInput, setTgtInput]     = useState(String(target));

  function commitTarget() {
    setEditingTgt(false);
    const v = Number(tgtInput);
    if (v > 0 && v !== target) onUpdateTarget(v);
  }

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${actual > 0 ? color.fg + '33' : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)', padding: '14px 16px',
      animation: 'slideUp 0.18s var(--ease-out) both',
    }}>
      {/* Goal name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <div className={`goal-icon ${goal.cls || 'gc0'}`} style={{ width: 24, height: 24, borderRadius: 6, fontSize: 12, flexShrink: 0 }}>{goal.glyph}</div>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 12.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.label}</span>
        <button className="btn sm" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => onLog(goal)}><Plus size={11}/></button>
      </div>

      {/* Actual */}
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em', color: color.fg, lineHeight: 1, marginBottom: 4 }}>
        {fmt(actual, isCur)}
      </div>

      {/* Target (click to edit) */}
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>target:</span>
        {editingTgt ? (
          <input autoFocus value={tgtInput}
            onChange={e => setTgtInput(e.target.value)}
            onBlur={commitTarget}
            onKeyDown={e => { if (e.key === 'Enter') commitTarget(); if (e.key === 'Escape') { setEditingTgt(false); setTgtInput(String(target)); }}}
            style={{ width: 72, background: 'none', border: 'none', borderBottom: '1px solid var(--accent)', color: 'var(--ink)', fontSize: 11, fontFamily: 'inherit', outline: 'none', padding: '0 2px' }}
          />
        ) : (
          <span
            onClick={() => { setTgtInput(String(target)); setEditingTgt(true); }}
            title="Click to edit target"
            style={{ cursor: 'pointer', textDecoration: 'underline dotted', textDecorationColor: 'var(--ink-4)', textUnderlineOffset: 3 }}>
            {fmt(target, isCur)}
          </span>
        )}
        <span style={{ color: 'var(--ink-4)' }}>({p}%)</span>
      </div>

      {/* Progress */}
      <PaceBar actual={actual} target={target} ideal={isPast ? 100 : ideal} color={color.fg}/>

      {/* Pace */}
      <div style={{ marginTop: 7, fontSize: 10.5, fontWeight: 600, color: paceColor, display: 'flex', alignItems: 'center', gap: 3 }}>
        <PaceIcon size={10}/> {status.label}
        {isPast && <span style={{ color: 'var(--ink-4)', fontWeight: 400, marginLeft: 4 }}>· completed</span>}
      </div>
    </div>
  );
}

// ── Period Section (navigable row of cards) ───────────────────────────────────
function PeriodSection({ title, icon, periodLabel, isCurrent, canGoPrev, canGoNext, onPrev, onNext, goals, log, getTarget, onUpdateTarget, onLog }) {
  return (
    <div style={{ marginBottom: 36 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--goals)', whiteSpace: 'nowrap' }}>
          {icon} {title}
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button className="icon-btn sm" onClick={onPrev} disabled={!canGoPrev}><ChevronLeft size={13}/></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180, justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{periodLabel}</span>
            {isCurrent && (
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 99, border: '1px solid var(--accent-border)' }}>Now</span>
            )}
          </div>
          <button className="icon-btn sm" onClick={onNext} disabled={!canGoNext}><ChevronRight size={13}/></button>
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(goals.length, 4)}, 1fr)`, gap: 14 }}>
        {goals.slice(0, 4).map((goal, i) => (
          <div key={goal.id} style={{ animationDelay: `${i * 40}ms` }}>
            <PeriodCard
              goal={goal} log={log}
              start={getTarget(goal).start} end={getTarget(goal).end}
              target={getTarget(goal).target}
              onLog={onLog}
              onUpdateTarget={v => onUpdateTarget(goal, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Goals Page ───────────────────────────────────────────────────────────
export default function Goals() {
  const { goals, goalLog, addGoal, updateGoal, deleteGoal, addGoalLog, updateGoalLog, deleteGoalLog } = useData();

  const [showModal,    setShowModal]    = useState(false);
  const [editGoal,     setEditGoal]     = useState(null);
  const [logGoal,      setLogGoal]      = useState(null);
  const [editLogEntry, setEditLogEntry] = useState(null);
  const [delGoal,      setDelGoal]      = useState(null);

  // Period navigation state
  const [qIdx,    setQIdx]    = useState(nowQIdx);
  const [mIdx,    setMIdx]    = useState(nowMIdx);
  const [wOffset, setWOffset] = useState(0);

  const week = getWeek(wOffset);

  const activeGoals = goals.filter(g => !g.status || g.status === 'active');
  const atMax = activeGoals.length >= 4;

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleSaveGoal(data) {
    try {
      if (editGoal) { await updateGoal(editGoal.id, data); toast.success('Goal updated'); }
      else          { await addGoal(data); toast.success('Goal created!'); }
    } catch { toast.error('Failed to save goal.'); }
    setShowModal(false); setEditGoal(null);
  }

  async function handleLog(goal, amt, note, logDate) {
    try {
      const ts = logDate ? new Date(logDate).getTime() : Date.now();
      await addGoalLog({ goalId: goal.id, amt, note: note || '', logDate: logDate || '', ts });
      toast.success(`Logged +${goal.unit === 'currency' ? formatCurrency(amt) : amt}`);
    } catch { toast.error('Failed to log.'); }
    setLogGoal(null);
  }

  async function handleEditLog(entry, amt, note, logDate) {
    try {
      const ts = logDate ? new Date(logDate).getTime() : entry.ts;
      await updateGoalLog(entry.id, { ...entry, amt, note: note || '', logDate: logDate || '', ts });
      toast.success('Entry updated.');
    } catch { toast.error('Failed.'); }
    setEditLogEntry(null);
  }

  async function handleDelete(goal) {
    try { await deleteGoal(goal.id); toast.success('Goal deleted.'); }
    catch { toast.error('Failed to delete.'); }
    setDelGoal(null);
  }

  async function handleUpdateQTarget(goal, qi, value) {
    try { await updateGoal(goal.id, { qTargets: { ...(goal.qTargets || {}), [`q${qi}`]: value } }); }
    catch { toast.error('Failed.'); }
  }
  async function handleUpdateMTarget(goal, mi, value) {
    try { await updateGoal(goal.id, { mTargets: { ...(goal.mTargets || {}), [`m${mi}`]: value } }); }
    catch { toast.error('Failed.'); }
  }
  async function handleUpdateWTarget(goal, weekStart, value) {
    try { await updateGoal(goal.id, { wTargets: { ...(goal.wTargets || {}), [`w${weekStart}`]: value } }); }
    catch { toast.error('Failed.'); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const q = QUARTERS[qIdx];
  const m = MONTHS_2026[mIdx];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Goals 2026</div>
          <div className="page-sub">{activeGoals.length} / 4 goals · Jan 1 – Dec 31</div>
        </div>
        <div className="page-actions">
          <button className="btn accent" disabled={atMax}
            title={atMax ? 'Maximum 4 goals reached' : undefined}
            onClick={() => { setEditGoal(null); setShowModal(true); }}>
            <Plus size={14}/> Add Goal
          </button>
        </div>
      </div>

      <div className="page-body fade-in">

        {/* ── YEARLY GOAL CARDS ─────────────────────────────────────────── */}
        {activeGoals.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <div className="empty-icon">🎯</div>
            <h3>No goals yet</h3>
            <p>Add up to 4 goals for 2026. Set annual targets, then break them down by quarter, month, and week.</p>
            <button className="btn accent lg" onClick={() => setShowModal(true)}><Plus size={15}/> Add Your First Goal</button>
          </div>
        ) : (
          <>
            {/* Yearly cards + add placeholder */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(activeGoals.length + (atMax ? 0 : 1), 4)}, 1fr)`, gap: 16, marginBottom: 44 }}>
              {activeGoals.slice(0, 4).map(g => (
                <YearlyGoalCard key={g.id} goal={g} log={goalLog}
                  onEdit={g => { setEditGoal(g); setShowModal(true); }}
                  onDelete={g => setDelGoal(g)}
                  onLog={g => setLogGoal(g)}
                />
              ))}
              {!atMax && (
                <AddGoalCard onClick={() => { setEditGoal(null); setShowModal(true); }} disabled={false}/>
              )}
            </div>

            {/* ── THIS QUARTER ─────────────────────────────────────────── */}
            <PeriodSection
              title="This Quarter" icon="📅"
              periodLabel={`${q.label} · ${q.range} ${YEAR}`}
              isCurrent={qIdx === nowQIdx()}
              canGoPrev={qIdx > 0} canGoNext={qIdx < 3}
              onPrev={() => setQIdx(i => i - 1)} onNext={() => setQIdx(i => i + 1)}
              goals={activeGoals} log={goalLog}
              onLog={g => setLogGoal(g)}
              getTarget={goal => ({ start: q.start, end: q.end, target: getQTarget(goal, qIdx) })}
              onUpdateTarget={(goal, v) => handleUpdateQTarget(goal, qIdx, v)}
            />

            {/* ── THIS MONTH ───────────────────────────────────────────── */}
            <PeriodSection
              title="This Month" icon="🗓"
              periodLabel={`${m.label} ${YEAR}`}
              isCurrent={mIdx === nowMIdx()}
              canGoPrev={mIdx > 0} canGoNext={mIdx < 11}
              onPrev={() => setMIdx(i => i - 1)} onNext={() => setMIdx(i => i + 1)}
              goals={activeGoals} log={goalLog}
              onLog={g => setLogGoal(g)}
              getTarget={goal => ({ start: m.start, end: m.end, target: getMTarget(goal, mIdx) })}
              onUpdateTarget={(goal, v) => handleUpdateMTarget(goal, mIdx, v)}
            />

            {/* ── THIS WEEK ────────────────────────────────────────────── */}
            <PeriodSection
              title="This Week" icon="📆"
              periodLabel={week.label}
              isCurrent={wOffset === 0}
              canGoPrev={true} canGoNext={wOffset < 0 ? true : false}
              onPrev={() => setWOffset(o => o - 1)} onNext={() => setWOffset(o => Math.min(0, o + 1))}
              goals={activeGoals} log={goalLog}
              onLog={g => setLogGoal(g)}
              getTarget={goal => ({ start: week.start, end: week.end, target: getWTarget(goal, week.start) })}
              onUpdateTarget={(goal, v) => handleUpdateWTarget(goal, week.start, v)}
            />
          </>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <GoalModal editGoal={editGoal} allGoals={activeGoals}
          onSave={handleSaveGoal} onClose={() => { setShowModal(false); setEditGoal(null); }}/>
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
    </>
  );
}
