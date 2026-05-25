import { useState } from 'react';
import { Plus, Edit3, Trash2, Search, FileText, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { fmtDate, fmtRelative, initials } from '../../utils';

const CHANNELS   = ['Phone', 'Email', 'In Person', 'Video Call', 'SMS', 'Other'];
const NOTE_TYPES = ['General', 'Application Update', 'Client Follow-up', 'Settlement', 'Discharge', 'Other'];

// ─── Client Form ───────────────────────────────────────────────────────────────
function ClientForm({ client, onSave, onClose }) {
  const isEdit = !!client;
  const [f, setF] = useState({
    name:    client?.name    || '',
    email:   client?.email   || '',
    phone:   client?.phone   || '',
    dob:     client?.dob     || '',
    address: client?.address || '',
    notes:   client?.notes   || '',
  });
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal isOpen={true} onClose={onClose} title={isEdit ? 'Edit Client' : 'Add Client'} size="md">
      <div className="modal-body">
        <div className="form-grid form-2">
          <div className="field">
            <label>Full Name *</label>
            <input value={f.name} onChange={e => sf('name', e.target.value)} placeholder="Jane Smith"/>
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={f.email} onChange={e => sf('email', e.target.value)} placeholder="jane@example.com"/>
          </div>
        </div>
        <div className="form-grid form-2">
          <div className="field">
            <label>Phone</label>
            <input value={f.phone} onChange={e => sf('phone', e.target.value)} placeholder="0400 000 000"/>
          </div>
          <div className="field">
            <label>Date of Birth</label>
            <input type="date" value={f.dob} onChange={e => sf('dob', e.target.value)}/>
          </div>
        </div>
        <div className="field">
          <label>Address</label>
          <input value={f.address} onChange={e => sf('address', e.target.value)} placeholder="123 Main St, Sydney NSW 2000"/>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={f.notes} onChange={e => sf('notes', e.target.value)} placeholder="Any notes about this client…"/>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!f.name.trim()} onClick={() => onSave(f)}>
          {isEdit ? 'Save Changes' : 'Add Client'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Quick Note Form (modal, opened from within client drawer) ─────────────────
function QuickNoteForm({ clientId, clients, onSave, onClose }) {
  const [f, setF] = useState({
    clientId: clientId || '',
    title:    '',
    channel:  '',
    type:     '',
    date:     '',
    body:     '',
  });
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Note" size="md">
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
          Add Note
        </button>
      </div>
    </Modal>
  );
}

// ─── Note Detail Drawer (elevated above client drawer) ─────────────────────────
function NoteDetailDrawer({ note, clientName, onEdit, onDelete, onBack }) {
  if (!note) return null;
  return (
    <>
      {/* Higher z-index so it sits on top of the client drawer */}
      <div
        className="drawer-backdrop"
        style={{ zIndex: 110 }}
        onClick={onBack}
      />
      <div className="drawer" style={{ zIndex: 111 }}>
        <div className="drawer-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="icon-btn sm"
              onClick={onBack}
              title="Back to client"
              style={{ color: 'var(--accent)' }}
            >
              <ChevronLeft size={16}/>
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>{note.title}</h2>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {clientName || '—'}{note.date ? ` · ${fmtDate(note.date)}` : ''}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onBack}>✕</button>
        </div>

        <div className="drawer-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {note.channel && <span className="badge mortgage">{note.channel}</span>}
            {note.type && (
              <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}>
                {note.type}
              </span>
            )}
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

// ─── Client Drawer ─────────────────────────────────────────────────────────────
function ClientDrawer({ client, loans, notes, onEdit, onDelete, onClose, onAddNote, onViewNote }) {
  if (!client) return null;

  const clientLoans = loans.filter(l => l.clientId === client.id);
  const clientNotes = [...notes.filter(n => n.clientId === client.id)]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'var(--mortgage-dim)', color: 'var(--mortgage)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, flexShrink: 0,
            }}>
              {initials(client.name)}
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{client.name}</h2>
              {client.email && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{client.email}</div>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {/* Contact */}
          <div>
            <div className="section-label" style={{ marginBottom: 12 }}>Contact Details</div>
            {[
              ['Phone',   client.phone   || '—'],
              ['Email',   client.email   || '—'],
              ['DOB',     fmtDate(client.dob)],
              ['Address', client.address || '—'],
            ].map(([k, v]) => (
              <div key={k} className="info-row">
                <div className="info-key">{k}</div>
                <div className="info-val">{v}</div>
              </div>
            ))}
          </div>

          {/* Client notes field */}
          {client.notes && (
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>General Notes</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65, background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                {client.notes}
              </div>
            </div>
          )}

          {/* ── CRM Notes ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="section-label">
                Interaction Notes{clientNotes.length > 0 && ` (${clientNotes.length})`}
              </div>
              <button
                className="btn accent sm"
                onClick={() => onAddNote(client.id)}
              >
                <Plus size={11}/> Add Note
              </button>
            </div>

            {clientNotes.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic', padding: '8px 0 4px' }}>
                No interaction notes yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {clientNotes.map(n => (
                  <div
                    key={n.id}
                    onClick={() => onViewNote(n)}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r)',
                      cursor: 'pointer',
                      transition: 'border-color .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                          <FileText size={12} style={{ color: 'var(--mortgage)', flexShrink: 0 }}/>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{n.title}</span>
                          {n.channel && (
                            <span className="badge mortgage" style={{ fontSize: 10, padding: '2px 7px' }}>{n.channel}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: n.body ? 4 : 0 }}>
                          {n.date ? fmtDate(n.date) : fmtRelative(n.createdAt)}
                          {n.type ? ` · ${n.type}` : ''}
                        </div>
                        {n.body && (
                          <div style={{
                            fontSize: 12, color: 'var(--ink-2)',
                            overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            lineHeight: 1.55,
                          }}>
                            {n.body}
                          </div>
                        )}
                      </div>
                      <ChevronLeft size={14} style={{ color: 'var(--ink-3)', flexShrink: 0, transform: 'rotate(180deg)', marginTop: 2 }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loans */}
          {clientLoans.length > 0 && (
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>Loans ({clientLoans.length})</div>
              {clientLoans.map(l => (
                <div key={l.id} style={{ padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 6, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{l.lender || '—'} · {l.objective || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>{l.stage} · {l.status}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Added {fmtRelative(client.createdAt)}</div>
        </div>

        <div className="drawer-foot">
          <button className="btn danger-ghost" onClick={onDelete}><Trash2 size={14}/> Delete</button>
          <button className="btn primary" onClick={onEdit}><Edit3 size={14}/> Edit</button>
        </div>
      </div>
    </>
  );
}

// ─── Clients Page ──────────────────────────────────────────────────────────────
export default function Clients() {
  const {
    clients, loans, notes,
    addClient, updateClient, deleteClient,
    addNote, updateNote, deleteNote,
  } = useData();

  // Client state
  const [search,     setSearch]     = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const [delClient,  setDelClient]  = useState(null);

  // Note state (managed here so the drawer can open/edit/view notes)
  const [showNoteForm,    setShowNoteForm]    = useState(false);
  const [noteClientId,    setNoteClientId]    = useState('');
  const [editNote,        setEditNote]        = useState(null);
  const [viewNote,        setViewNote]        = useState(null);
  const [delNote,         setDelNote]         = useState(null);
  // When a note opens, remember which client to return to
  const [noteOriginClient, setNoteOriginClient] = useState(null);

  const loanCountMap = loans.reduce((acc, l) => {
    if (l.clientId) acc[l.clientId] = (acc[l.clientId] || 0) + 1;
    return acc;
  }, {});
  const noteCountMap = notes.reduce((acc, n) => {
    if (n.clientId) acc[n.clientId] = (acc[n.clientId] || 0) + 1;
    return acc;
  }, {});

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  ).sort((a, b) => a.name.localeCompare(b.name));

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleSave(data) {
    try {
      if (editClient) { await updateClient(editClient.id, data); toast.success('Client updated.'); }
      else            { await addClient(data); toast.success('Client added!'); }
    } catch { toast.error('Failed to save.'); }
    setShowForm(false); setEditClient(null);
  }

  async function handleDelete(id) {
    try { await deleteClient(id); toast.success('Client deleted.'); setViewClient(null); }
    catch { toast.error('Failed.'); }
    setDelClient(null);
  }

  async function handleNoteSave(data) {
    try {
      if (editNote) { await updateNote(editNote.id, data); toast.success('Note updated.'); }
      else          { await addNote(data); toast.success('Note added!'); }
    } catch { toast.error('Failed to save note.'); }
    setShowNoteForm(false); setEditNote(null);
  }

  async function handleNoteDelete(id) {
    try { await deleteNote(id); toast.success('Note deleted.'); }
    catch { toast.error('Failed.'); }
    setDelNote(null);
    // Return to the client the note belonged to
    if (noteOriginClient) {
      setViewClient(noteOriginClient);
      setNoteOriginClient(null);
    }
    setViewNote(null);
  }

  function openNoteDetail(note) {
    setNoteOriginClient(viewClient);  // remember current client
    setViewClient(null);              // hide client drawer
    setViewNote(note);                // show note drawer
  }

  function closeNoteDetail() {
    setViewNote(null);
    if (noteOriginClient) {
      setViewClient(noteOriginClient);
      setNoteOriginClient(null);
    }
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"
            style={{ paddingLeft: 32, padding: '8px 14px 8px 32px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13, width: 220 }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
          <button className="btn accent sm" onClick={() => { setEditClient(null); setShowForm(true); }}>
            <Plus size={13}/> Add Client
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div style={{ padding: '20px 28px' }}>
        {filtered.length === 0 ? (
          <EmptyState emoji="👤" title="No clients yet" description="Add your first client to start building your CRM."
            actionLabel="Add Client" onAction={() => { setEditClient(null); setShowForm(true); }}/>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtered.map(c => (
              <div key={c.id} className="loan-card" onClick={() => setViewClient(c)}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'var(--mortgage-dim)', color: 'var(--mortgage)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>
                    {initials(c.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    {c.email && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{c.email}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {c.phone || '—'}
                    {loanCountMap[c.id] ? (
                      <span style={{ background: 'var(--mortgage-dim)', color: 'var(--mortgage)', padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                        {loanCountMap[c.id]} loan{loanCountMap[c.id] !== 1 ? 's' : ''}
                      </span>
                    ) : null}
                    {noteCountMap[c.id] ? (
                      <span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                        {noteCountMap[c.id]} note{noteCountMap[c.id] !== 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn sm" onClick={e => { e.stopPropagation(); setEditClient(c); setShowForm(true); }}><Edit3 size={12}/></button>
                    <button className="icon-btn sm danger" onClick={e => { e.stopPropagation(); setDelClient(c); }}><Trash2 size={12}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Client Form Modal ── */}
      {showForm && (
        <ClientForm
          client={editClient}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditClient(null); }}
        />
      )}

      {/* ── Client Drawer ── */}
      {viewClient && (
        <ClientDrawer
          client={viewClient}
          loans={loans}
          notes={notes}
          onEdit={() => { setEditClient(viewClient); setViewClient(null); setShowForm(true); }}
          onDelete={() => setDelClient(viewClient)}
          onClose={() => setViewClient(null)}
          onAddNote={(clientId) => {
            setNoteClientId(clientId);
            setEditNote(null);
            setShowNoteForm(true);
          }}
          onViewNote={openNoteDetail}
        />
      )}

      {/* ── Note Detail Drawer (elevated above client drawer) ── */}
      {viewNote && (
        <NoteDetailDrawer
          note={viewNote}
          clientName={clients.find(c => c.id === viewNote.clientId)?.name}
          onEdit={() => {
            setEditNote(viewNote);
            setViewNote(null);
            setShowNoteForm(true);
          }}
          onDelete={() => setDelNote(viewNote)}
          onBack={closeNoteDetail}
        />
      )}

      {/* ── Quick Note Form Modal ── */}
      {showNoteForm && (
        <QuickNoteForm
          clientId={noteClientId}
          clients={clients}
          onSave={handleNoteSave}
          onClose={() => { setShowNoteForm(false); setEditNote(null); }}
        />
      )}

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog
        isOpen={!!delClient} onClose={() => setDelClient(null)}
        onConfirm={() => handleDelete(delClient?.id)}
        title="Delete Client?" message={`Delete "${delClient?.name}"? This won't delete their loans.`}
        confirmLabel="Delete Client"
      />
      <ConfirmDialog
        isOpen={!!delNote} onClose={() => setDelNote(null)}
        onConfirm={() => handleNoteDelete(delNote?.id)}
        title="Delete Note?" message={`Delete "${delNote?.title}"?`}
        confirmLabel="Delete Note"
      />
    </>
  );
}
