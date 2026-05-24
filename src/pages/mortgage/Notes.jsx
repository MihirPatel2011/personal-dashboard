import { useState } from 'react';
import { Plus, Edit3, Trash2, Search, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { fmtDate, fmtRelative } from '../../utils';

const CHANNELS = ['Phone', 'Email', 'In Person', 'Video Call', 'SMS', 'Other'];
const NOTE_TYPES = ['General', 'Application Update', 'Client Follow-up', 'Settlement', 'Discharge', 'Other'];

// ─── Note Form ─────────────────────────────────────────────────────────────────
function NoteForm({ note, clients, onSave, onClose }) {
  const isEdit = !!note;
  const [f, setF] = useState({
    clientId: note?.clientId || '',
    title:    note?.title    || '',
    channel:  note?.channel  || '',
    type:     note?.type     || '',
    date:     note?.date     || '',
    body:     note?.body     || '',
  });
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal isOpen={true} onClose={onClose} title={isEdit ? 'Edit Note' : 'Add Note'} size="md">
      <div className="modal-body">
        <div className="form-grid form-2">
          <div className="field">
            <label>Client</label>
            <select value={f.clientId} onChange={e => sf('clientId', e.target.value)}>
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={f.date} onChange={e => sf('date', e.target.value)}/>
          </div>
        </div>
        <div className="field">
          <label>Title *</label>
          <input value={f.title} onChange={e => sf('title', e.target.value)} placeholder="e.g. Pre-approval discussion"/>
        </div>
        <div className="form-grid form-2">
          <div className="field">
            <label>Channel</label>
            <select value={f.channel} onChange={e => sf('channel', e.target.value)}>
              <option value="">— Select —</option>
              {CHANNELS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={f.type} onChange={e => sf('type', e.target.value)}>
              <option value="">— Select —</option>
              {NOTE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Notes *</label>
          <textarea value={f.body} onChange={e => sf('body', e.target.value)} placeholder="What was discussed…" style={{ minHeight: 120 }}/>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!f.title.trim() || !f.body.trim()} onClick={() => onSave(f)}>
          {isEdit ? 'Save Changes' : 'Add Note'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Note Detail Modal ──────────────────────────────────────────────────────────
function NoteDetail({ note, clientName, onEdit, onDelete, onClose }) {
  if (!note) return null;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div>
            <h2>{note.title}</h2>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
              {clientName || '—'} {note.date && `· ${fmtDate(note.date)}`}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {note.channel && <span className="badge mortgage">{note.channel}</span>}
            {note.type && <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}>{note.type}</span>}
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Note</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.7, background: 'var(--surface-2)', padding: '14px 16px', borderRadius: 'var(--r)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
              {note.body}
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Added {fmtRelative(note.createdAt)}</div>
        </div>
        <div className="drawer-foot">
          <button className="btn danger-ghost" onClick={onDelete}><Trash2 size={14}/> Delete</button>
          <button className="btn primary" onClick={onEdit}><Edit3 size={14}/> Edit</button>
        </div>
      </div>
    </>
  );
}

// ─── Notes Page ────────────────────────────────────────────────────────────────
export default function Notes() {
  const { notes, clients, addNote, updateNote, deleteNote } = useData();
  const [search,     setSearch]    = useState('');
  const [filterCh,   setFilterCh]  = useState('all');
  const [showForm,   setShowForm]  = useState(false);
  const [editNote,   setEditNote]  = useState(null);
  const [viewNote,   setViewNote]  = useState(null);
  const [delNote,    setDelNote]   = useState(null);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const filtered = notes.filter(n => {
    const matchCh = filterCh === 'all' || n.channel === filterCh;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (n.title || '').toLowerCase().includes(q) ||
      (n.body  || '').toLowerCase().includes(q) ||
      (clientMap[n.clientId] || '').toLowerCase().includes(q);
    return matchCh && matchSearch;
  }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  async function handleSave(data) {
    try {
      if (editNote) { await updateNote(editNote.id, data); toast.success('Note updated.'); }
      else          { await addNote(data); toast.success('Note added!'); }
    } catch { toast.error('Failed to save.'); }
    setShowForm(false); setEditNote(null);
  }

  async function handleDelete(id) {
    try { await deleteNote(id); toast.success('Note deleted.'); setViewNote(null); }
    catch { toast.error('Failed.'); }
    setDelNote(null);
  }

  return (
    <>
      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
              style={{ paddingLeft: 32, padding: '8px 14px 8px 32px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13, width: 220 }}/>
          </div>
          <select value={filterCh} onChange={e => setFilterCh(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13 }}>
            <option value="all">All Channels</option>
            {CHANNELS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn accent sm" onClick={() => { setEditNote(null); setShowForm(true); }}>
          <Plus size={13}/> Add Note
        </button>
      </div>

      <div style={{ padding: '20px 28px' }}>
        {filtered.length === 0 ? (
          <EmptyState emoji="📝" title="No notes yet" description="Keep track of client interactions and important conversations."
            actionLabel="Add Note" onAction={() => { setEditNote(null); setShowForm(true); }}/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(n => (
              <div key={n.id} onClick={() => setViewNote(n)}
                style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', cursor: 'pointer', transition: 'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <FileText size={13} style={{ color: 'var(--mortgage)', flexShrink: 0 }}/>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{n.title}</span>
                      {n.channel && <span className="badge mortgage" style={{ fontSize: 10 }}>{n.channel}</span>}
                      {n.type && <span className="badge" style={{ fontSize: 10, background: 'var(--surface-2)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>{n.type}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>
                      {clientMap[n.clientId] || '—'}{n.date ? ` · ${fmtDate(n.date)}` : ''} · {fmtRelative(n.createdAt)}
                    </div>
                    {n.body && (
                      <div style={{ fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {n.body}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="icon-btn sm" onClick={e => { e.stopPropagation(); setEditNote(n); setShowForm(true); }}><Edit3 size={12}/></button>
                    <button className="icon-btn sm danger" onClick={e => { e.stopPropagation(); setDelNote(n); }}><Trash2 size={12}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <NoteForm note={editNote} clients={clients} onSave={handleSave} onClose={() => { setShowForm(false); setEditNote(null); }}/>}
      {viewNote && (
        <NoteDetail
          note={viewNote}
          clientName={clientMap[viewNote.clientId]}
          onEdit={() => { setEditNote(viewNote); setViewNote(null); setShowForm(true); }}
          onDelete={() => setDelNote(viewNote)}
          onClose={() => setViewNote(null)}
        />
      )}
      <ConfirmDialog
        isOpen={!!delNote} onClose={() => setDelNote(null)}
        onConfirm={() => handleDelete(delNote?.id)}
        title="Delete Note?" message={`Delete "${delNote?.title}"?`}
        confirmLabel="Delete Note"
      />
    </>
  );
}
