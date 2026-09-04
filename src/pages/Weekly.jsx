// src/pages/Weekly.jsx — the weekly routine: a short list of guideline tasks
// that repeat every week, ticked off per week rather than re-created each time.
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { Bar, Empty, XDel } from '../compass/ui';
import { clickable } from '../compass/interaction';
import { C, serif, mono, card, input, btnDark, labelSm } from '../compass/tokens';
import { THIS_WEEK, shiftWeek, weekLabel } from '../compass/format';

export default function Weekly() {
  const {
    weeklyRoutine, weeklyDone,
    addRoutineItem, removeRoutineItem, setRoutineDone,
  } = useData();

  const [week, setWeek] = useState(THIS_WEEK);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const items = useMemo(
    () => [...weeklyRoutine].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || 0) - (b.createdAt || 0)),
    [weeklyRoutine],
  );
  const done = weeklyDone[week] || {};
  const doneCount = items.filter(i => done[i.id]).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const isThisWeek = week === THIS_WEEK;

  const add = async () => {
    const t = title.trim();
    if (!t) return;
    try {
      await addRoutineItem({ title: t, note: note.trim(), order: items.length });
      setTitle(''); setNote('');
      toast.success('Added to the weekly routine.');
    } catch { toast.error('Failed to add.'); }
  };

  const toggle = (item) =>
    setRoutineDone(week, item.id, !done[item.id]).catch(() => toast.error('Failed.'));

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Weekly</div>
          <div className="page-sub">
            The handful of things that need doing every week. Tick them off as you go.
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>

          {/* ── Week, and how far through it you are ── */}
          <section style={{ ...card, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button className="icon-btn sm" title="Previous week" onClick={() => setWeek(shiftWeek(week, -1))}>‹</button>
              <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 24 }}>
                {weekLabel(week)}
              </h2>
              <button className="icon-btn sm" title="Next week"
                      disabled={week >= THIS_WEEK}
                      onClick={() => setWeek(shiftWeek(week, 1))}>›</button>
              {!isThisWeek && (
                <span {...clickable(() => setWeek(THIS_WEEK), 'Back to this week')}
                      style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.accent, cursor: 'pointer' }}>
                  This week
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 12.5 }}>
                {doneCount} / {items.length}
              </span>
            </div>
            <Bar pct={pct} height={8} style={{ marginTop: 14 }}/>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>
              {items.length
                ? (doneCount === items.length ? 'All done for the week.' : `${items.length - doneCount} still to do`)
                : 'Add the things you do every week below.'}
            </div>
          </section>

          {/* ── The routine ── */}
          <section style={{ ...card, padding: '18px 20px 8px' }}>
            <div style={{ ...labelSm, letterSpacing: '0.14em', marginBottom: 4 }}>The routine</div>
            {items.map(item => {
              const isDone = !!done[item.id];
              return (
                <div key={item.id} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '13px 0', borderTop: `1px solid ${C.line}`, marginTop: 8,
                }}>
                  <div {...clickable(() => toggle(item), isDone ? 'Mark as not done' : 'Mark as done')}
                       style={{
                         width: 18, height: 18, flex: '0 0 18px', marginTop: 1, borderRadius: 5,
                         cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                         fontSize: 11, color: 'var(--bg)',
                         border: `1.5px solid ${isDone ? 'var(--accent)' : 'var(--border-strong)'}`,
                         background: isDone ? 'var(--accent)' : 'transparent',
                       }}>
                    {isDone ? '✓' : ''}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{
                      fontSize: 13, lineHeight: 1.4,
                      color: isDone ? C.muted : 'var(--ink)',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>
                      {item.title}
                    </div>
                    {item.note && <div style={{ fontSize: 11, color: C.muted }}>{item.note}</div>}
                  </div>

                  <XDel
                    size={15}
                    label={`Remove ${item.title} from the routine`}
                    onClick={() => removeRoutineItem(item.id).catch(() => toast.error('Failed.'))}/>
                </div>
              );
            })}

            {!items.length && (
              <Empty>
                Nothing in the routine yet — things like “call ten accountants”, “review the
                pipeline”, or “clear the inbox”.
              </Empty>
            )}
          </section>

          {/* ── Add to the routine ── */}
          <section style={{ ...card, padding: '18px 20px' }}>
            <div style={{ ...labelSm, letterSpacing: '0.14em', marginBottom: 12 }}>Add to the routine</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={title} onChange={e => setTitle(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && add()}
                     placeholder="What needs doing every week?"
                     style={{ ...input, flex: '1 1 240px', padding: '11px 13px', fontSize: 13.5 }}/>
              <input value={note} onChange={e => setNote(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && add()}
                     placeholder="Note (optional)"
                     style={{ ...input, flex: '1 1 160px', padding: '11px 13px' }}/>
              <button onClick={add} style={{ ...btnDark, padding: '10px 18px' }}>
                <Plus size={13}/> Add
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.55 }}>
              These repeat every week. Ticking one off only marks it for the week you are
              looking at — the routine itself stays put.
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
