import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import Modal from '../components/common/Modal';
import { Bar, Empty, XDel } from '../compass/ui';
import { clickable } from '../compass/interaction';
import { annualView, monthlyView } from '../compass/goals';
import {
  C, serif, mono, sans, card, inputWhite, btnDark, btnGhost, labelSm, grid,
  segment, segmentWrap,
} from '../compass/tokens';
import {
  TODAY, THIS_MONTH, THIS_YEAR, CURRENT_QUARTER,
  monthLabel, dateLabel, unitVal, quarterOf,
} from '../compass/format';

// Goals follow the Compass model: up to three goals for the year, each split
// into quarters, with monthly goals that can roll their progress into one.

export default function Goals() {
  const { goalsV2, addGoalV2, updateGoalV2, deleteGoalV2, addGoalV2Log, delGoalV2Log, editGoalV2Log } = useData();
  const [modal, setModal] = useState(null); // { kind, goalId }

  const goals = useMemo(
    () => goalsV2.map(g => ({
      ...g,
      target: Number(g.target) || 0,
      qTargets: g.qTargets || [0, 0, 0, 0],
      logs: Object.entries(g.logs || {}).map(([id, l]) => ({ id, ...l, amount: Number(l.amount) || 0 })),
    })),
    [goalsV2],
  );

  const annual = useMemo(
    () => goals.filter(g => g.type === 'annual').map(g => annualView(g, goals)),
    [goals],
  );
  const monthly = useMemo(
    () => goals.filter(g => g.type === 'monthly')
      .sort((a, b) => (b.month || '').localeCompare(a.month || ''))
      .map(g => monthlyView(g, goals)),
    [goals],
  );

  const openModal = (kind, goalId) => setModal({ kind, goalId });
  const closeModal = () => setModal(null);
  const modalGoal = modal?.goalId ? goals.find(g => g.id === modal.goalId) : null;

  const removeGoal = async (g) => {
    await deleteGoalV2(g.id, goals);
    toast.success('Goal deleted');
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Goals</div>
          <div className="page-sub">
            Three goals for the year, each broken into quarters, with monthly goals feeding them.
          </div>
        </div>
        <div className="page-actions">
          <button className="btn accent" onClick={() => openModal('newGoal')}>Add New Goal</button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          <div style={{
            display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap',
            paddingBottom: 14, borderBottom: `1px solid ${C.line}`,
          }}>
            <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 26 }}>
              {THIS_YEAR} — three goals
            </h2>
            <span style={{ fontSize: 12.5, color: C.muted }}>
              {annual.length} of 3 set · Q{CURRENT_QUARTER + 1} in progress
            </span>
          </div>

          {annual.length ? (
            <div style={grid(300, 18)}>
              {annual.map(v => (
                <AnnualCard key={v.goal.id} v={v} onDelete={() => removeGoal(v.goal)} openModal={openModal} />
              ))}
            </div>
          ) : (
            <section style={card}>
              <Empty style={{ padding: 0 }}>
                No yearly goals yet. Set up to three — each splits into quarters, and monthly
                goals can roll into them.
              </Empty>
            </section>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 22 }}>Monthly goals</h2>
              <span style={{ fontSize: 12, color: C.muted }}>
                {monthly.length
                  ? `${monthly.filter(g => g.parent).length} of ${monthly.length} feed a yearly goal`
                  : 'None yet — monthly goals roll into the three above.'}
              </span>
            </div>
            {monthly.length ? (
              <div style={grid(280, 14)}>
                {monthly.map(v => (
                  <MonthlyCard key={v.goal.id} v={v} onDelete={() => removeGoal(v.goal)} openModal={openModal} />
                ))}
              </div>
            ) : (
              <section style={card}>
                <Empty style={{ padding: 0 }}>
                  Add a monthly goal to break a yearly target into something you can hit this month.
                </Empty>
              </section>
            )}
          </div>
        </div>
      </div>

      <NewGoalModal
        open={modal?.kind === 'newGoal'}
        close={closeModal}
        annual={annual.map(v => v.goal)}
        onSave={addGoalV2}
      />
      <LogModal
        open={modal?.kind === 'log'}
        goal={modalGoal}
        close={closeModal}
        onSave={addGoalV2Log}
      />
      <HistoryModal
        open={modal?.kind === 'history'}
        goal={modalGoal}
        goals={goals}
        close={closeModal}
        onDelete={delGoalV2Log}
        onEdit={editGoalV2Log}
      />
      <TargetsModal
        open={modal?.kind === 'targets'}
        goal={modalGoal}
        close={closeModal}
        onSave={updateGoalV2}
      />
    </>
  );
}

/* ─── Cards ─────────────────────────────────────────────────────────────── */

function AnnualCard({ v, onDelete, openModal }) {
  const g = v.goal;
  return (
    <section style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ ...labelSm, letterSpacing: '0.14em' }}>{g.tag}</span>
        <XDel size={17} onClick={onDelete} />
      </div>
      <h3 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 23, lineHeight: 1.2 }}>{g.title}</h3>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: serif, fontSize: 34, lineHeight: 1 }}>{v.current}</span>
          <span style={{ fontSize: 12, color: C.muted }}>of {v.target} · {v.pct}%</span>
        </div>
        <Bar pct={v.pct} height={8} style={{ marginTop: 12 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ ...labelSm, fontSize: 9, letterSpacing: '0.14em' }}>Quarter targets</span>
          <span {...clickable(() => openModal('targets', g.id))}
                style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.accent, cursor: 'pointer' }}>
            Adjust
          </span>
        </div>
        {v.qSums.map((sum, i) => {
          const target = g.qTargets?.[i] || 0;
          const qp = target ? Math.round((sum / target) * 100) : 0;
          const now = i === CURRENT_QUARTER;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontFamily: mono, fontSize: 9.5, letterSpacing: '0.08em', padding: '3px 7px',
                borderRadius: 5, flex: '0 0 auto',
                background: now ? 'var(--accent-dim)' : 'var(--surface-3)',
                color: now ? C.accent : C.muted,
              }}>Q{i + 1}</span>
              <Bar pct={qp} height={5} color={now ? C.accent : 'var(--ink-4)'} style={{ flex: 1, minWidth: 0 }} />
              <span style={{ fontFamily: mono, fontSize: 10.5, color: C.muted2, flex: '0 0 auto', whiteSpace: 'nowrap' }}>
                {unitVal(g.unit, sum)} / {unitVal(g.unit, target)}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
        {[['This month', v.monthLabelValue], ['This week', v.weekLabelValue], ['Left to target', v.remaining]]
          .map(([l, val]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ ...labelSm, fontSize: 9 }}>{l}</span>
              <span style={{ fontSize: 13.5 }}>{val}</span>
            </div>
          ))}
      </div>

      {v.kids.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
          <div style={{ ...labelSm, fontSize: 9, letterSpacing: '0.14em' }}>Monthly goals feeding this</div>
          {v.kids.map(k => {
            const kt = k.logs.reduce((a, l) => a + l.amount, 0);
            return (
              <div key={k.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontFamily: mono, fontSize: 10.5, color: C.muted, flex: '0 0 34px' }}>
                  {monthLabel(k.month).split(' ')[0]}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {k.title}
                </span>
                <span style={{ fontFamily: mono, fontSize: 11, flex: '0 0 auto', whiteSpace: 'nowrap', color: C.muted2 }}>
                  {unitVal(k.unit, kt)} / {unitVal(k.unit, k.target)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button onClick={() => openModal('log', g.id)} style={{ ...btnDark, flex: 1, padding: '9px 12px', fontSize: 12 }}>
          Log progress
        </button>
        <button onClick={() => openModal('history', g.id)} style={btnGhost}>History</button>
      </div>
    </section>
  );
}

function MonthlyCard({ v, onDelete, openModal }) {
  const g = v.goal;
  return (
    <section style={card}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{
          fontFamily: mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '4px 8px', borderRadius: 6, background: 'var(--surface-3)', color: C.muted2,
        }}>{monthLabel(g.month)}</span>
        <span style={{
          fontFamily: mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '4px 8px', borderRadius: 6,
          background: v.parent ? 'var(--accent-dim)' : 'var(--surface-3)',
          color: v.parent ? C.accent : C.muted,
        }}>
          {v.parent ? `Feeds Q${quarterOf(`${g.month}-01`) + 1} · ${v.parent.tag}` : 'Standalone'}
        </span>
        <XDel onClick={onDelete} style={{ marginLeft: 'auto' }} />
      </div>
      <h3 style={{ margin: '0 0 12px', fontFamily: serif, fontWeight: 400, fontSize: 21, lineHeight: 1.2 }}>{g.title}</h3>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: serif, fontSize: 28, lineHeight: 1 }}>{v.current}</span>
        <span style={{ fontSize: 12, color: C.muted }}>of {v.target} · {v.pct}%</span>
      </div>
      <Bar pct={v.pct} color={v.parent ? C.accent : 'var(--ink-4)'} style={{ margin: '14px 0 16px' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => openModal('log', g.id)} style={{ ...btnDark, padding: '8px 14px', fontSize: 12 }}>
          Log progress
        </button>
        <button onClick={() => openModal('history', g.id)} style={{ ...btnGhost, padding: '8px 14px' }}>
          History
        </button>
      </div>
    </section>
  );
}

/* ─── Modals ────────────────────────────────────────────────────────────── */

const fieldLabel = { display: 'flex', flexDirection: 'column', gap: 6, ...labelSm };
const textInput = {
  padding: '11px 13px', border: `1px solid ${C.field}`, borderRadius: 9,
  background: C.cardTint, fontFamily: sans, fontSize: 14, letterSpacing: 0,
  textTransform: 'none', color: C.ink,
};

function NewGoalModal({ open, close, annual, onSave }) {
  const full = annual.length >= 3;
  const [type, setType] = useState('annual');
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('money');
  const [month, setMonth] = useState(THIS_MONTH);
  const [link, setLink] = useState(false);
  const [parent, setParent] = useState('');

  // Reset each time it opens, and default to monthly once the year is full.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setType(full ? 'monthly' : 'annual');
    setLink(full && annual.length > 0);
    setParent(annual[0]?.id || '');
    setTitle(''); setTag(''); setTarget('');
  }
  if (!open && wasOpen) setWasOpen(false);

  const save = async () => {
    const t = title.trim();
    const tgt = parseFloat(String(target).replace(/[^0-9.]/g, ''));
    if (!t || !tgt) { toast.error('Give the goal a name and a target'); return; }
    const monthly = type === 'monthly';
    if (!monthly && full) { toast.error('Three yearly goals is the limit'); return; }
    const q = tgt / 4;
    await onSave({
      type: monthly ? 'monthly' : 'annual',
      tag: tag.trim() || 'Personal',
      title: t,
      unit,
      target: tgt,
      month: monthly ? month : '',
      parentId: monthly && link ? (parent || annual[0]?.id || '') : '',
      qTargets: monthly ? [0, 0, 0, 0] : [q, q, q, q],
    });
    toast.success('Goal created');
    close();
  };

  if (!open) return null;

  return (
    <Modal isOpen title="New goal" onClose={close}>
      <div className="modal-body">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          Yearly goals track quarters. Monthly goals can roll into a yearly one.
        </div>
        <div style={{ ...segmentWrap, width: 'fit-content' }}>
          <div {...clickable(() => !full && setType('annual'))}
               style={{ ...segment(type === 'annual'), ...(full ? { opacity: 0.42 } : null) }}>
            {full ? 'Yearly (3 of 3)' : 'Yearly goal'}
          </div>
          <div {...clickable(() => setType('monthly'))} style={segment(type === 'monthly')}>Monthly goal</div>
        </div>

        <label style={fieldLabel}>
          Goal
          <input value={title} onChange={e => setTitle(e.target.value)}
                 placeholder="e.g. Settle $18M in loans" style={textInput} />
        </label>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ ...fieldLabel, flex: '1 1 130px' }}>
            Area
            <input value={tag} onChange={e => setTag(e.target.value)} placeholder="Mortgage broking"
                   style={{ ...textInput, fontSize: 13, padding: '10px 12px' }} />
          </label>
          <label style={{ ...fieldLabel, flex: '0 1 120px' }}>
            Target
            <input value={target} onChange={e => setTarget(e.target.value)} placeholder="5000000"
                   style={{ ...textInput, fontFamily: mono, fontSize: 13, padding: '10px 12px' }} />
          </label>
          <label style={{ ...fieldLabel, flex: '0 1 120px' }}>
            Measured in
            <select value={unit} onChange={e => setUnit(e.target.value)}
                    style={{ ...textInput, fontSize: 13, padding: '10px 11px' }}>
              <option value="money">Dollars</option>
              <option value="count">Count</option>
            </select>
          </label>
        </div>

        {type === 'monthly' && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 14, padding: 16,
            borderRadius: 11, background: C.cardTint, border: `1px solid ${C.line}`,
          }}>
            <label style={fieldLabel}>
              Month
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                     style={{ ...textInput, background: C.card, fontSize: 13, padding: '10px 12px' }} />
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer', lineHeight: 1.5 }}>
              <input type="checkbox" checked={link} onChange={e => setLink(e.target.checked)}
                     disabled={!annual.length}
                     style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--accent)' }} />
              <span>
                {annual.length
                  ? 'Roll this into a yearly goal — progress logged here counts toward it and its quarter.'
                  : 'Create a yearly goal first to roll monthly progress into it.'}
              </span>
            </label>
            {link && annual.length > 0 && (
              <select value={parent} onChange={e => setParent(e.target.value)}
                      style={{ ...inputWhite, padding: '10px 11px', borderRadius: 9, fontSize: 13 }}>
                {annual.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button onClick={close} style={{ ...btnGhost, padding: '10px 16px', borderRadius: 9, fontSize: 12.5 }}>Cancel</button>
          <button onClick={save} style={{ ...btnDark, padding: '10px 20px', borderRadius: 9 }}>Create goal</button>
        </div>
      </div>
      </div>
    </Modal>
  );
}

function LogModal({ open, goal, close, onSave }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(TODAY);
  const [note, setNote] = useState('');
  const [wasOpen, setWasOpen] = useState(false);

  if (open && !wasOpen) { setWasOpen(true); setAmount(''); setNote(''); setDate(TODAY); }
  if (!open && wasOpen) setWasOpen(false);
  if (!open || !goal) return null;

  const save = async () => {
    const amt = parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
    if (!amt) { toast.error('Enter an amount'); return; }
    await onSave(goal.id, { date: date || TODAY, amount: amt, note: note.trim() || 'Logged' });
    toast.success('Progress logged');
    close();
  };

  return (
    <Modal isOpen title="Log progress" onClose={close}>
      <div className="modal-body">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, color: C.muted }}>{goal.title}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ ...fieldLabel, flex: '0 1 140px' }}>
            {goal.unit === 'money' ? 'Amount $' : 'How many'}
            <input value={amount} onChange={e => setAmount(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && save()}
                   style={{ ...textInput, fontFamily: mono }} />
          </label>
          <label style={{ ...fieldLabel, flex: '0 1 160px' }}>
            Date
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                   style={{ ...textInput, fontSize: 13, padding: '10px 12px' }} />
          </label>
        </div>
        <label style={fieldLabel}>
          What was it
          <input value={note} onChange={e => setNote(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && save()}
                 placeholder="e.g. Two refinances settled"
                 style={{ ...textInput, fontSize: 13.5 }} />
        </label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button onClick={close} style={{ ...btnGhost, padding: '10px 16px', borderRadius: 9, fontSize: 12.5 }}>Cancel</button>
          <button onClick={save} style={{ ...btnDark, padding: '10px 20px', borderRadius: 9 }}>Save entry</button>
        </div>
      </div>
      </div>
    </Modal>
  );
}

function HistoryModal({ open, goal, goals, close, onDelete, onEdit }) {
  const [editId, setEditId] = useState(null);
  if (!open || !goal) return null;
  const v = annualView(goal, goals);
  const logs = (goal.type === 'annual' ? v.logs : goal.logs)
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const total = logs.reduce((a, l) => a + l.amount, 0);

  return (
    <Modal isOpen title="History" onClose={close}>
      <div className="modal-body">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, color: C.muted }}>{goal.title}</div>
        {logs.map(l => (
          editId === l.id ? (
            <LogEditRow
              key={l.id}
              log={l}
              unit={goal.unit}
              onCancel={() => setEditId(null)}
              onSave={async (entry) => {
                await onEdit(l.goalId || goal.id, l.id, entry);
                setEditId(null);
                toast.success('Entry updated');
              }}
            />
          ) : (
            <div key={l.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontFamily: mono, fontSize: 10.5, color: C.muted, flex: '0 0 52px' }}>{dateLabel(l.date)}</span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.note}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{l.src || 'Logged directly'}</span>
              </div>
              <span style={{ fontFamily: mono, fontSize: 12.5, whiteSpace: 'nowrap' }}>{unitVal(goal.unit, l.amount)}</span>
              <span {...clickable(() => setEditId(l.id), 'Edit entry')}
                    style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.accent, cursor: 'pointer', flex: '0 0 auto' }}>
                Edit
              </span>
              <XDel size={15} onClick={() => onDelete(l.goalId || goal.id, l.id)} />
            </div>
          )
        ))}
        {!logs.length && <Empty style={{ padding: 0 }}>Nothing logged against this goal yet.</Empty>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8 }}>
          <span style={{ fontSize: 12.5, color: C.muted }}>{logs.length} entries</span>
          <span style={{ fontFamily: serif, fontSize: 22 }}>{unitVal(goal.unit, total)}</span>
        </div>
      </div>
      </div>
    </Modal>
  );
}

// One log entry, opened for correction in place.
function LogEditRow({ log, unit, onSave, onCancel }) {
  const [amount, setAmount] = useState(String(log.amount ?? ''));
  const [date, setDate] = useState(log.date || TODAY);
  const [note, setNote] = useState(log.note || '');

  const save = () => {
    const amt = parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
    if (!amt) { toast.error('Enter an amount'); return; }
    onSave({ amount: amt, date: date || TODAY, note: note.trim() || 'Logged' });
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8, padding: 12,
      borderRadius: 10, background: C.cardTint, border: `1px solid ${C.line}`,
    }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={amount} onChange={e => setAmount(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && save()}
               placeholder={unit === 'money' ? 'Amount' : 'How many'}
               style={{ ...goalInput, flex: '0 1 110px', fontFamily: mono }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
               style={{ ...goalInput, flex: '0 1 145px' }} />
      </div>
      <input value={note} onChange={e => setNote(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && save()}
             placeholder="What was it"
             style={{ ...goalInput, width: '100%' }} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ ...btnGhost, padding: '7px 12px', fontSize: 12 }}>Cancel</button>
        <button onClick={save} style={{ ...btnDark, padding: '7px 14px', fontSize: 12 }}>Save</button>
      </div>
    </div>
  );
}

const goalInput = {
  padding: '9px 11px', border: `1px solid ${C.field}`, borderRadius: 8,
  background: C.card, color: C.ink, fontSize: 13, minWidth: 0,
};

// Quarter targets default to an even split; this lets them be shaped to the
// year you actually expect.
function TargetsModal({ open, goal, close, onSave }) {
  const [vals, setVals] = useState(['', '', '', '']);
  const [loadedFor, setLoadedFor] = useState(null);

  if (open && goal && loadedFor !== goal.id) {
    setLoadedFor(goal.id);
    setVals((goal.qTargets || [0, 0, 0, 0]).map(v => String(v ?? 0)));
  }
  if (!open && loadedFor) setLoadedFor(null);
  if (!open || !goal) return null;

  const nums = vals.map(v => parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0);
  const sum = nums.reduce((a, b) => a + b, 0);
  const diff = sum - (Number(goal.target) || 0);

  const save = async () => {
    await onSave(goal.id, { qTargets: nums });
    toast.success('Quarter targets updated');
    close();
  };

  const split = () => {
    const q = (Number(goal.target) || 0) / 4;
    setVals([q, q, q, q].map(String));
  };

  return (
    <Modal isOpen title="Quarter targets" onClose={close}>
      <div className="modal-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            {goal.title} · year target {unitVal(goal.unit, goal.target)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))', gap: 12 }}>
            {vals.map((v, i) => (
              <label key={i} style={fieldLabel}>
                Q{i + 1}
                <input value={v}
                       onChange={e => setVals(prev => prev.map((x, j) => (j === i ? e.target.value : x)))}
                       onKeyDown={e => e.key === 'Enter' && save()}
                       style={{ ...textInput, fontFamily: mono, fontSize: 13, padding: '10px 12px' }} />
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: C.muted }}>
              Quarters total <span style={{ fontFamily: mono, color: C.ink }}>{unitVal(goal.unit, sum)}</span>
              {diff !== 0 && (
                <span style={{ color: 'var(--warn)' }}>
                  {' · '}{diff > 0 ? 'over' : 'under'} the year target by {unitVal(goal.unit, Math.abs(diff))}
                </span>
              )}
            </span>
            <span {...clickable(split, 'Split evenly')}
                  style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.accent, cursor: 'pointer' }}>
              Split evenly
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button onClick={close} style={{ ...btnGhost, padding: '10px 16px', borderRadius: 9, fontSize: 12.5 }}>Cancel</button>
            <button onClick={save} style={{ ...btnDark, padding: '10px 20px', borderRadius: 9 }}>Save targets</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
