import { useState } from 'react';
import { Plus, Edit3, Trash2, Search, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { fmtDate, fmtRelative, initials } from '../../utils';

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

// ─── Client Drawer ─────────────────────────────────────────────────────────────
function ClientDrawer({ client, loans, onEdit, onDelete, onClose }) {
  if (!client) return null;
  const clientLoans = loans.filter(l => l.clientId === client.id);

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
              fontSize: 15, fontWeight: 700, flexShrink: 0
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
          <div>
            <div className="section-label" style={{ marginBottom: 12 }}>Contact Details</div>
            {[
              ['Phone',    client.phone   || '—'],
              ['Email',    client.email   || '—'],
              ['DOB',      fmtDate(client.dob)],
              ['Address',  client.address || '—'],
            ].map(([k, v]) => (
              <div key={k} className="info-row">
                <div className="info-key">{k}</div>
                <div className="info-val">{v}</div>
              </div>
            ))}
          </div>

          {client.notes && (
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Notes</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65, background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                {client.notes}
              </div>
            </div>
          )}

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
  const { clients, loans, addClient, updateClient, deleteClient } = useData();
  const [search,      setSearch]      = useState('');
  const [showForm,    setShowForm]    = useState(false);
  const [editClient,  setEditClient]  = useState(null);
  const [viewClient,  setViewClient]  = useState(null);
  const [delClient,   setDelClient]   = useState(null);

  const loanCountMap = loans.reduce((acc, l) => {
    if (l.clientId) acc[l.clientId] = (acc[l.clientId] || 0) + 1;
    return acc;
  }, {});

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  ).sort((a, b) => a.name.localeCompare(b.name));

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

  return (
    <>
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
                    fontSize: 13, fontWeight: 700, flexShrink: 0
                  }}>
                    {initials(c.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    {c.email && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{c.email}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {c.phone || '—'}
                    {loanCountMap[c.id] ? (
                      <span style={{ marginLeft: 8, background: 'var(--mortgage-dim)', color: 'var(--mortgage)', padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                        {loanCountMap[c.id]} loan{loanCountMap[c.id] !== 1 ? 's' : ''}
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

      {showForm && <ClientForm client={editClient} onSave={handleSave} onClose={() => { setShowForm(false); setEditClient(null); }}/>}
      {viewClient && (
        <ClientDrawer
          client={viewClient}
          loans={loans}
          onEdit={() => { setEditClient(viewClient); setViewClient(null); setShowForm(true); }}
          onDelete={() => setDelClient(viewClient)}
          onClose={() => setViewClient(null)}
        />
      )}
      <ConfirmDialog
        isOpen={!!delClient} onClose={() => setDelClient(null)}
        onConfirm={() => handleDelete(delClient?.id)}
        title="Delete Client?" message={`Delete "${delClient?.name}"? This won't delete their loans.`}
        confirmLabel="Delete Client"
      />
    </>
  );
}
