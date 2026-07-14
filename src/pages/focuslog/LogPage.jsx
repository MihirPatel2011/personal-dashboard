// src/pages/focuslog/LogPage.jsx — rapid focus-block capture + day-grouped list.
// Enter in the activity field saves and keeps focus for the next entry.
import { useState, useRef } from 'react';
import { Plus, Edit3, Trash2, CheckCircle2, Circle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { FOCUS_CATEGORIES, FOCUS_CATEGORY_COLORS } from '../../constants';
import { computeDurationMin, parseClientFromActivity, nowLocalInput, fmtDurationMin, fmtClock, groupByDay, fmtDayHeader } from '../../utils/focusLog';

function CategoryTag({ category }) {
  const c = FOCUS_CATEGORY_COLORS[category] || '#94A3B8';
  return <span className="flog-tag" style={{ background: `${c}22`, color: c }}>{category}</span>;
}

export default function LogPage() {
  const { focusLogs, addFocusLog, updateFocusLog, deleteFocusLog } = useData();
  const activityRef = useRef(null);

  // Capture bar state — start prefilled with now (lazy init, reset after save).
  const [start, setStart]       = useState(nowLocalInput);
  const [end, setEnd]           = useState('');
  const [activity, setActivity] = useState('');
  const [category, setCategory] = useState(FOCUS_CATEGORIES[0]); // last-used persists between entries
  const [noClient, setNoClient] = useState(false);               // suggestion dismissed

  const [editId, setEditId]     = useState(null);
  const [editF, setEditF]       = useState(null);
  const [delEntry, setDelEntry] = useState(null);

  const suggested    = noClient ? '' : parseClientFromActivity(activity);
  const dur          = end ? computeDurationMin(start, end) : null;
  const invalidRange = end !== '' && (dur == null || dur < 0);
  const canSave      = activity.trim() !== '' && !invalidRange;

  async function save() {
    if (!canSave) return;
    try {
      await addFocusLog({
        startTime: start, endTime: end, durationMin: end ? dur : null,
        activity: activity.trim(), category, client: suggested, done: false,
      });
      toast.success('Logged.');
      setActivity(''); setEnd(''); setNoClient(false); setStart(nowLocalInput());
      activityRef.current?.focus();
    } catch { toast.error('Failed to save.'); }
  }

  function beginEdit(e) {
    setEditId(e.id);
    setEditF({
      startTime: e.startTime || '', endTime: e.endTime || '',
      activity: e.activity || '', category: e.category || FOCUS_CATEGORIES[0],
      client: e.client || '',
    });
  }
  const sef = (k, v) => setEditF(p => ({ ...p, [k]: v }));
  const editDur     = editF?.endTime ? computeDurationMin(editF.startTime, editF.endTime) : null;
  const editInvalid = !!editF?.endTime && (editDur == null || editDur < 0);

  async function saveEdit() {
    if (!editF.activity.trim() || editInvalid) return;
    try {
      await updateFocusLog(editId, {
        ...editF, activity: editF.activity.trim(), client: editF.client.trim(),
        durationMin: editF.endTime ? editDur : null,
      });
      toast.success('Updated.');
    } catch { toast.error('Failed.'); }
    setEditId(null); setEditF(null);
  }

  async function toggleDone(e) {
    try { await updateFocusLog(e.id, { done: !e.done }); } catch { toast.error('Failed.'); }
  }
  async function handleDelete(id) {
    try { await deleteFocusLog(id); toast.success('Deleted.'); } catch { toast.error('Failed.'); }
    setDelEntry(null);
  }

  const groups = groupByDay(focusLogs);

  return (
    <div style={{ padding: '16px 28px 28px' }}>
      {/* Capture bar */}
      <div className="flog-bar">
        <input ref={activityRef} className="flog-activity" value={activity} autoFocus
          onChange={e => { setActivity(e.target.value); setNoClient(false); }}
          onKeyDown={e => { if (e.key === 'Enter') save(); }}
          placeholder="What are you focusing on? e.g. Zack - Email docs"/>
        <div className="flog-bar-row">
          <label className="flog-field">Start
            <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)}/>
          </label>
          <label className="flog-field">End (optional)
            <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)}/>
          </label>
          {end !== '' && (
            <span className="flog-dur" style={{ color: invalidRange ? 'var(--danger)' : 'var(--ok)' }}>
              {invalidRange ? 'ends before start' : fmtDurationMin(dur)}
            </span>
          )}
          <select className="flog-cat-select" value={category} onChange={e => setCategory(e.target.value)}>
            {FOCUS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button className="btn accent sm" disabled={!canSave} onClick={save}><Plus size={13}/> Log</button>
        </div>
        <div className="chip-row">
          {FOCUS_CATEGORIES.map(c => (
            <button key={c} className={`chip sm${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        {suggested && (
          <div className="flog-client-suggest">
            Client: <strong>{suggested}</strong>
            <button className="icon-btn sm" title="Don't tag a client" onClick={() => setNoClient(true)}><X size={11}/></button>
          </div>
        )}
      </div>

      {/* Day-grouped list */}
      {groups.length === 0 ? (
        <EmptyState emoji="⏱️" title="No focus blocks yet"
          description="Log what you're working on — Enter saves and keeps you typing."/>
      ) : groups.map(g => (
        <div key={g.dayKey} style={{ marginBottom: 22 }}>
          <div className="flog-day-head">{fmtDayHeader(g.dayKey)}</div>
          {g.entries.map(e => editId === e.id ? (
            <div key={e.id} className="flog-row editing">
              <div className="flog-edit-grid">
                <input value={editF.activity} onChange={ev => sef('activity', ev.target.value)} placeholder="Activity"/>
                <input type="datetime-local" value={editF.startTime} onChange={ev => sef('startTime', ev.target.value)}/>
                <input type="datetime-local" value={editF.endTime} onChange={ev => sef('endTime', ev.target.value)}/>
                <select value={editF.category} onChange={ev => sef('category', ev.target.value)}>
                  {FOCUS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input value={editF.client} onChange={ev => sef('client', ev.target.value)} placeholder="Client (optional)"/>
              </div>
              {editInvalid && <div style={{ fontSize: 11, color: 'var(--danger)' }}>End is before start.</div>}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button className="btn ghost sm" onClick={() => { setEditId(null); setEditF(null); }}>Cancel</button>
                <button className="btn accent sm" disabled={!editF.activity.trim() || editInvalid} onClick={saveEdit}>Save</button>
              </div>
            </div>
          ) : (
            <div key={e.id} className="flog-row">
              <button className="flog-check" onClick={() => toggleDone(e)}
                title={e.done ? 'Mark not done' : 'Mark done'}
                style={{ color: e.done ? 'var(--ok)' : 'var(--ink-3)' }}>
                {e.done ? <CheckCircle2 size={15}/> : <Circle size={15}/>}
              </button>
              <span className="flog-time">{fmtClock(e.startTime)}{e.endTime ? `–${fmtClock(e.endTime)}` : ''}</span>
              <span className="flog-text" style={{ textDecoration: e.done ? 'line-through' : 'none', color: e.done ? 'var(--ink-3)' : 'var(--ink)' }}>
                {e.activity}
              </span>
              <CategoryTag category={e.category}/>
              {e.client && <span className="flog-tag" style={{ background: 'var(--mortgage-dim)', color: 'var(--mortgage)' }}>{e.client}</span>}
              {typeof e.durationMin === 'number' && <span className="flog-dur-tag">{fmtDurationMin(e.durationMin)}</span>}
              <span className="flog-actions">
                <button className="icon-btn sm" onClick={() => beginEdit(e)}><Edit3 size={11}/></button>
                <button className="icon-btn sm danger" onClick={() => setDelEntry(e)}><Trash2 size={11}/></button>
              </span>
            </div>
          ))}
        </div>
      ))}

      <ConfirmDialog isOpen={!!delEntry} onClose={() => setDelEntry(null)}
        onConfirm={() => handleDelete(delEntry?.id)}
        title="Delete entry?" message={`Delete "${delEntry?.activity}"?`} confirmLabel="Delete"/>
    </div>
  );
}
