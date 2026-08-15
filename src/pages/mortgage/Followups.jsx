import { useState } from 'react';
import { Search, Trash2, UserPlus, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { fmtDate, fmtRelative, isToday, isPast, isWithinDays, initials, tsToDateInput, todayTs } from '../../utils';
import { STATUSES, actionNeeded, sortFollowups, clientNotes } from '../../utils/followups';

// ─── Inline segmented status control ────────────────────────────────────────────
function StatusPills({ value, onChange, size }) {
  return (
    <div className="fu-pills" onClick={e => e.stopPropagation()}>
      {STATUSES.map(s => {
        const on = value === s.id;
        return (
          <button
            key={s.id}
            className={`fu-pill${on ? ' active' : ''}`}
            style={on ? { background: s.dim, color: s.color, borderColor: s.border } : undefined}
            onClick={() => onChange(s.id)}
            title={s.label}
          >
            {size === 'lg' ? s.label : s.short}
          </button>
        );
      })}
    </div>
  );
}

// ─── Next-action due-date label (overdue / today / soon) ─────────────────────────
function DueLabel({ date, status }) {
  if (status === 'closed') return null;
  if (!date) return <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>No due date</span>;
  const overdue = isPast(date) && !isToday(date);
  const today   = isToday(date);
  const soon    = !overdue && !today && isWithinDays(date, 3);
  const color   = overdue ? 'var(--danger)' : today ? 'var(--warn)' : soon ? 'var(--warn)' : 'var(--ink-3)';
  const label   = overdue ? `Overdue · ${fmtDate(date)}` : today ? 'Due today' : `Due ${fmtDate(date)}`;
  return <span style={{ fontSize: 11, color, fontWeight: overdue || today ? 600 : 400 }}>{label}</span>;
}

// ─── Add-client picker (only clients not already tracked) ───────────────────────
function AddClientModal({ clients, tracked, onAdd, onClose }) {
  const [clientId, setClientId] = useState('');
  const available = clients
    .filter(c => !tracked.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Modal isOpen={true} onClose={onClose} title="Add client to tracker" size="sm">
      <div className="modal-body">
        {available.length === 0 ? (
          <p style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>
            Every client is already on the board. Add new clients from the Clients tab first.
          </p>
        ) : (
          <div className="field">
            <label>Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">— Select client —</option>
              {available.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!clientId} onClick={() => onAdd(clientId)}>Add to tracker</button>
      </div>
    </Modal>
  );
}

// ─── Detail drawer: status, due date, comment thread (reuses notes) ─────────────
function FollowupDrawer({ followup, client, notes, onClose, onStatus, onDue, onAddComment, onDeleteComment, onRemove }) {
  const [comment, setComment] = useState('');
  if (!followup || !client) return null;
  const thread = clientNotes(notes, client.id);

  function submitComment() {
    const t = comment.trim();
    if (!t) return;
    setComment('');
    onAddComment(t);
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', background: 'var(--mortgage-dim)', color: 'var(--mortgage)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0,
            }}>{initials(client.name)}</div>
            <div>
              <h2 style={{ margin: 0 }}>{client.name}</h2>
              {client.phone && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{client.phone}</div>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={16}/></button>
        </div>

        <div className="drawer-body">
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Status</div>
            <StatusPills value={followup.status} size="lg" onChange={onStatus}/>
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Next action due</div>
            <input
              type="date"
              value={followup.dueDate || ''}
              onChange={e => onDue(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13.5 }}
            />
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Comments{thread.length > 0 && ` (${thread.length})`}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment(); }}
                placeholder="Add a comment… (e.g. 'left voicemail', 'emailed docs')"
                style={{ flex: 1, minHeight: 60, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13.5, resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button className="btn accent sm" disabled={!comment.trim()} onClick={submitComment}><Send size={12}/> Add comment</button>
            </div>

            {thread.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>No comments yet. These also appear under the client in the Notes tab.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {thread.map(n => (
                  <div key={n.id} className="fu-comment" style={{ padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {n.date ? fmtDate(n.date) : fmtRelative(n.createdAt)}
                        {n.channel ? ` · ${n.channel}` : ''}{n.type ? ` · ${n.type}` : ''}
                      </div>
                      <button className="fu-comment-del icon-btn sm danger" onClick={() => onDeleteComment(n.id)} title="Delete comment"><Trash2 size={11}/></button>
                    </div>
                    {n.title && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{n.title}</div>}
                    {n.body && <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.body}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn danger-ghost" onClick={onRemove}><Trash2 size={14}/> Remove from tracker</button>
        </div>
      </div>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
const FILTERS = [
  { id: 'active',         label: 'Active' },
  { id: 'waiting_me',     label: 'Waiting on me' },
  { id: 'waiting_client', label: 'Waiting on client' },
  { id: 'closed',         label: 'Closed' },
  { id: 'all',            label: 'All' },
];

export default function Followups() {
  const { followups, clients, notes, addFollowup, updateFollowup, deleteFollowup, addNote, deleteNote } = useData();
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('active');
  const [showAdd,  setShowAdd]  = useState(false);
  const [viewId,   setViewId]   = useState(null);
  const [delTarget, setDelTarget] = useState(null);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const tracked   = new Set(followups.map(f => f.clientId));

  // Drop orphaned follow-ups whose client was deleted.
  const valid = followups.filter(f => clientMap[f.clientId]);

  const filtered = sortFollowups(valid.filter(f => {
    const matchFilter =
      filter === 'all'    ? true :
      filter === 'active' ? f.status !== 'closed' :
      f.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !search || (clientMap[f.clientId]?.name || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  }));

  const owed = valid.filter(actionNeeded).length;
  const viewFollowup = valid.find(f => f.id === viewId) || null;

  async function handleAdd(clientId) {
    setShowAdd(false);
    try { await addFollowup({ clientId }); toast.success('Added to tracker.'); }
    catch { toast.error('Failed to add.'); }
  }
  async function setStatus(f, status) {
    try { await updateFollowup(f.id, { status }); } catch { toast.error('Failed.'); }
  }
  async function setDue(f, dueDate) {
    try { await updateFollowup(f.id, { dueDate }); } catch { toast.error('Failed.'); }
  }
  async function addComment(f, text) {
    try {
      await addNote({
        clientId: f.clientId,
        title:    `Follow-up · ${fmtDate(tsToDateInput(todayTs()))}`,
        type:     'Client Follow-up',
        channel:  '',
        date:     tsToDateInput(todayTs()),
        body:     text,
      });
      toast.success('Comment added.');
    } catch { toast.error('Failed to add comment.'); }
  }
  async function removeComment(id) {
    try { await deleteNote(id); toast.success('Comment deleted.'); } catch { toast.error('Failed.'); }
  }
  async function handleRemove(id) {
    try { await deleteFollowup(id); toast.success('Removed from tracker.'); setViewId(null); }
    catch { toast.error('Failed.'); }
    setDelTarget(null);
  }

  return (
    <>
      {/* Toolbar */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"
              style={{ paddingLeft: 32, padding: '8px 14px 8px 32px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13, width: 200 }}/>
          </div>
          <div className="fu-filters">
            {FILTERS.map(f => (
              <button key={f.id} className={`fu-filter${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
        </div>
        <button className="btn accent sm" onClick={() => setShowAdd(true)}><UserPlus size={13}/> Add client</button>
      </div>

      {/* Summary banner */}
      <div className={`fu-summary${owed > 0 ? ' owed' : ''}`}>
        {owed > 0
          ? <><strong>{owed}</strong> client{owed !== 1 ? 's are' : ' is'} waiting on you — clear these first.</>
          : <>You're all caught up. Nothing waiting on you right now. ✓</>}
      </div>

      {/* List */}
      <div style={{ padding: '16px 28px 28px' }}>
        {filtered.length === 0 ? (
          <EmptyState
            emoji="📞"
            title={valid.length === 0 ? 'No clients tracked yet' : 'Nothing here'}
            description={valid.length === 0
              ? 'Add the clients you’re actively managing. Each day, clear everyone “waiting on you”.'
              : 'No follow-ups match this filter.'}
            actionLabel={valid.length === 0 ? 'Add client' : undefined}
            onAction={valid.length === 0 ? () => setShowAdd(true) : undefined}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(f => {
              const c = clientMap[f.clientId];
              const last = clientNotes(notes, f.clientId)[0];
              return (
                <div key={f.id} className={`fu-row${actionNeeded(f) ? ' action' : ''}`} onClick={() => setViewId(f.id)}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: 'var(--mortgage-dim)', color: 'var(--mortgage)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>{initials(c.name)}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                      <DueLabel date={f.dueDate} status={f.status}/>
                      {last && <span style={{ fontSize: 11.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>“{last.body || last.title}”</span>}
                    </div>
                  </div>

                  <StatusPills value={f.status} onChange={s => setStatus(f, s)}/>
                  <button className="icon-btn sm danger" onClick={e => { e.stopPropagation(); setDelTarget(f); }} title="Remove from tracker"><Trash2 size={12}/></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddClientModal clients={clients} tracked={tracked} onAdd={handleAdd} onClose={() => setShowAdd(false)}/>
      )}

      {viewFollowup && (
        <FollowupDrawer
          followup={viewFollowup}
          client={clientMap[viewFollowup.clientId]}
          notes={notes}
          onClose={() => setViewId(null)}
          onStatus={s => setStatus(viewFollowup, s)}
          onDue={d => setDue(viewFollowup, d)}
          onAddComment={t => addComment(viewFollowup, t)}
          onDeleteComment={removeComment}
          onRemove={() => setDelTarget(viewFollowup)}
        />
      )}

      <ConfirmDialog
        isOpen={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={() => handleRemove(delTarget?.id)}
        title="Remove from tracker?"
        message={`Stop tracking follow-ups for "${clientMap[delTarget?.clientId]?.name || 'this client'}"? Their notes are kept.`}
        confirmLabel="Remove"
      />
    </>
  );
}
