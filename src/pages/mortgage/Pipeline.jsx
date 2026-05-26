import { useState } from 'react';
import { Plus, Edit3, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { StageBadge } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { LOAN_STAGES, LOAN_STATUSES, OBJECTIVES, LENDERS, REFERRERS, STAGE_COLORS, ACTIVE_STAGES } from '../../constants';
// settings-aware helpers (used inside component after mortgageSettings is destructured)
import { formatCurrency, fmtDate, fmtRelative } from '../../utils';

// ─── Loan Form ─────────────────────────────────────────────────────────────────
function LoanForm({ loan, clients, lenders, stages, statuses, onSave, onClose }) {
  const isEdit = !!loan;
  const [f, setF] = useState({
    clientId:       loan?.clientId || '',
    clientObj:      loan?.clientObj || '',
    lender:         loan?.lender || '',
    objective:      loan?.objective || '',
    value:          loan?.value || '',
    status:         loan?.status || 'Leads',
    stage:          loan?.stage || 'New Client',
    submissionDate: loan?.submissionDate || '',
    settlementDate: loan?.settlementDate || '',
    comms:          loan?.comms || '',
    datePaid:       loan?.datePaid || '',
    referrer:       loan?.referrer || '',
    notes:          loan?.notes || '',
  });
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));
  const valid = f.clientId || f.clientObj;

  return (
    <Modal isOpen={true} onClose={onClose} title={isEdit ? 'Edit Loan' : 'Add New Loan'} size="lg">
      <div className="modal-body">
        <div className="form-grid form-2">
          <div className="field">
            <label>Client *</label>
            <select value={f.clientId} onChange={e => sf('clientId', e.target.value)}>
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Or enter name manually</label>
            <input value={f.clientObj} onChange={e => sf('clientObj', e.target.value)} placeholder="Client name"/>
          </div>
        </div>
        <div className="form-grid form-3">
          <div className="field">
            <label>Lender</label>
            <select value={f.lender} onChange={e => sf('lender', e.target.value)}>
              <option value="">— Select —</option>
              {lenders.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Objective</label>
            <select value={f.objective} onChange={e => sf('objective', e.target.value)}>
              <option value="">— Select —</option>
              {OBJECTIVES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Loan Value ($)</label>
            <input type="number" value={f.value} onChange={e => sf('value', e.target.value)} placeholder="500000"/>
          </div>
        </div>
        <div className="form-grid form-2">
          <div className="field">
            <label>Pipeline Status</label>
            <select value={f.status} onChange={e => sf('status', e.target.value)}>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Loan Stage</label>
            <select value={f.stage} onChange={e => sf('stage', e.target.value)}>
              {stages.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-grid form-3">
          <div className="field">
            <label>Submission Date</label>
            <input type="date" value={f.submissionDate} onChange={e => sf('submissionDate', e.target.value)}/>
          </div>
          <div className="field">
            <label>Settlement Date</label>
            <input type="date" value={f.settlementDate} onChange={e => sf('settlementDate', e.target.value)}/>
          </div>
          <div className="field">
            <label>Referrer</label>
            <select value={f.referrer} onChange={e => sf('referrer', e.target.value)}>
              <option value="">— Select —</option>
              {REFERRERS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="form-grid form-2">
          <div className="field">
            <label>Commission ($)</label>
            <input type="number" value={f.comms} onChange={e => sf('comms', e.target.value)} placeholder="2750"/>
          </div>
          <div className="field">
            <label>Commission Paid Date</label>
            <input type="date" value={f.datePaid} onChange={e => sf('datePaid', e.target.value)}/>
          </div>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={f.notes} onChange={e => sf('notes', e.target.value)} placeholder="Any additional notes…"/>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!valid} onClick={() => onSave(f)}>
          {isEdit ? 'Save Changes' : 'Add Loan'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Loan Drawer ──────────────────────────────────────────────────────────────
function LoanDrawer({ loan, clientName, onEdit, onDelete, onClose }) {
  if (!loan) return null;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div>
            <h2>{clientName || loan.clientObj || 'Unknown Client'}</h2>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{loan.lender} · {loan.objective}</div>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <StageBadge stage={loan.stage}/>
            <span className="badge mortgage">{loan.status}</span>
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 12 }}>Loan Details</div>
            {[
              ['Value',           loan.value ? formatCurrency(Number(loan.value)) : '—'],
              ['Lender',          loan.lender || '—'],
              ['Objective',       loan.objective || '—'],
              ['Stage',           loan.stage || '—'],
              ['Status',          loan.status || '—'],
              ['Referrer',        loan.referrer || '—'],
              ['Submission Date', fmtDate(loan.submissionDate)],
              ['Settlement Date', fmtDate(loan.settlementDate)],
              ['Commission',      loan.comms ? formatCurrency(Number(loan.comms)) : '—'],
              ['Comm. Paid',      fmtDate(loan.datePaid)],
            ].map(([k, v]) => (
              <div key={k} className="info-row">
                <div className="info-key">{k}</div>
                <div className="info-val">{v}</div>
              </div>
            ))}
          </div>

          {loan.notes && (
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Notes</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65, background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                {loan.notes}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Added {fmtRelative(loan.createdAt)}</div>
        </div>
        <div className="drawer-foot">
          <button className="btn danger-ghost" onClick={onDelete}><Trash2 size={14}/> Delete</button>
          <button className="btn primary" onClick={onEdit}><Edit3 size={14}/> Edit</button>
        </div>
      </div>
    </>
  );
}

// ─── Pipeline Page ────────────────────────────────────────────────────────────
export default function Pipeline() {
  const { loans, clients, addLoan, updateLoan, deleteLoan, mortgageSettings } = useData();

  // Use settings-overridden values if available, else fall back to constants
  const activeLenders  = (mortgageSettings?.lenders  || LENDERS);
  const activeStages   = (mortgageSettings?.stages   || LOAN_STAGES);
  const activeStatuses = (mortgageSettings?.statuses || LOAN_STATUSES);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [search,  setSearch]  = useState('');
  const [showForm,setShowForm]= useState(false);
  const [editLoan,setEditLoan]= useState(null);
  const [viewLoan,setViewLoan]= useState(null);
  const [delLoan, setDelLoan] = useState(null);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));
  const ACTIVE = ACTIVE_STAGES;

  const filtered = loans.filter(l => {
    const matchStatus = selectedStatus === 'all' || l.status === selectedStatus;
    const matchSearch = !search || (l.clientObj || clientMap[l.clientId] || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.lender || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }).sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));

  const countByStatus = status => loans.filter(l => l.status === status).length;
  const pipelineVal = loans.filter(l => ACTIVE.includes(l.stage)).reduce((s,l) => s + (Number(l.value)||0), 0);

  async function handleSave(data) {
    try {
      if (editLoan) { await updateLoan(editLoan.id, data); toast.success('Loan updated.'); }
      else          { await addLoan(data); toast.success('Loan added!'); }
    } catch { toast.error('Failed to save.'); }
    setShowForm(false); setEditLoan(null);
  }

  async function handleDelete(id) {
    try { await deleteLoan(id); toast.success('Loan deleted.'); setViewLoan(null); }
    catch { toast.error('Failed.'); }
    setDelLoan(null);
  }

  return (
    <>
      <div className="crm-toolbar" style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search loans…"
              style={{ paddingLeft: 32, padding: '8px 14px 8px 32px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13, width: 220 }}/>
          </div>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Pipeline: <strong style={{ color: 'var(--mortgage)' }}>{formatCurrency(pipelineVal, true)}</strong></span>
        </div>
        <button className="btn accent sm" onClick={() => { setEditLoan(null); setShowForm(true); }}>
          <Plus size={13}/> Add Loan
        </button>
      </div>

      <div className="crm-body" style={{ padding: '16px 28px 0' }}>
        <div className="pipeline-status-tabs">
          <button className={`status-tab${selectedStatus === 'all' ? ' active' : ''}`} onClick={() => setSelectedStatus('all')}>
            All <span className="tab-count">{loans.length}</span>
          </button>
          {activeStatuses.map(s => (
            <button key={s} className={`status-tab${selectedStatus === s ? ' active' : ''}`} onClick={() => setSelectedStatus(s)}>
              {s} <span className="tab-count">{countByStatus(s)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="crm-body" style={{ padding: '16px 28px 28px' }}>
        {filtered.length === 0 ? (
          <EmptyState emoji="🏠" title="No loans yet" description="Add your first loan to start tracking your pipeline."
            actionLabel="Add Loan" onAction={() => { setEditLoan(null); setShowForm(true); }}/>
        ) : (
          <div className="loan-grid">
            {filtered.map(l => {
              const name = l.clientObj || clientMap[l.clientId] || 'Unknown';
              const c = STAGE_COLORS[l.stage] || {};
              return (
                <div key={l.id} className="loan-card" onClick={() => setViewLoan(l)}>
                  <div className="loan-client">{name}</div>
                  <div className="loan-meta">
                    <span>{l.lender || '—'}</span>
                    <span style={{ color: 'var(--border-strong)' }}>·</span>
                    <span>{l.objective || '—'}</span>
                    {l.referrer && <><span style={{ color: 'var(--border-strong)' }}>·</span><span>{l.referrer}</span></>}
                  </div>
                  {l.value && (
                    <div>
                      <div className="loan-value-label">Loan Value</div>
                      <div className="loan-value">{formatCurrency(Number(l.value))}</div>
                    </div>
                  )}
                  <div className="loan-footer">
                    <StageBadge stage={l.stage}/>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn sm" onClick={e => { e.stopPropagation(); setEditLoan(l); setShowForm(true); }}><Edit3 size={12}/></button>
                      <button className="icon-btn sm danger" onClick={e => { e.stopPropagation(); setDelLoan(l); }}><Trash2 size={12}/></button>
                    </div>
                  </div>
                  {l.settlementDate && (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
                      Settlement: {fmtDate(l.settlementDate)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && <LoanForm loan={editLoan} clients={clients} lenders={activeLenders} stages={activeStages} statuses={activeStatuses} onSave={handleSave} onClose={() => { setShowForm(false); setEditLoan(null); }}/>}
      {viewLoan && (
        <LoanDrawer
          loan={viewLoan}
          clientName={clientMap[viewLoan.clientId] || viewLoan.clientObj}
          onEdit={() => { setEditLoan(viewLoan); setViewLoan(null); setShowForm(true); }}
          onDelete={() => setDelLoan(viewLoan)}
          onClose={() => setViewLoan(null)}
        />
      )}
      <ConfirmDialog
        isOpen={!!delLoan} onClose={() => setDelLoan(null)}
        onConfirm={() => handleDelete(delLoan?.id)}
        title="Delete Loan?" message={`Delete loan for "${delLoan?.clientObj || clientMap[delLoan?.clientId]}"?`}
        confirmLabel="Delete Loan"
      />
    </>
  );
}
