// src/pages/mortgage/Pipeline.jsx
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, Search, FileText, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { StageBadge } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import NumberInput from '../../components/common/NumberInput';
import { LOAN_STAGES, LOAN_STATUSES, OBJECTIVES, LENDERS, REFERRERS, STAGE_COLORS, ACTIVE_STAGES } from '../../constants';
import { formatCurrency, fmtDate, fmtRelative } from '../../utils';
import { progress as complianceProgress, stageBlockedBy, blockingItems } from '../../utils/crmCompliance';
import LoanCompliance, { ProgressRing } from '../../components/mortgage/LoanCompliance';

const CHANNELS = ['Phone', 'Email', 'In Person', 'Video Call', 'SMS', 'Other'];
const SETTLED_STAGE = 'Settled';

// ─── Quick Note Modal ──────────────────────────────────────────────────────────
function QuickNoteModal({ clients, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ clientId: '', title: '', channel: '', date: today, body: '' });
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal isOpen={true} onClose={onClose} title="Quick Note" size="md">
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
            <label>Channel</label>
            <select value={f.channel} onChange={e => sf('channel', e.target.value)}>
              <option value="">— Select —</option>
              {CHANNELS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Title *</label>
          <input value={f.title} onChange={e => sf('title', e.target.value)}
            placeholder="e.g. Pre-approval call" autoFocus/>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={f.body} onChange={e => sf('body', e.target.value)}
            placeholder="What was discussed…" style={{ minHeight: 100 }}/>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!f.title.trim()} onClick={() => onSave(f)}>Save Note</button>
      </div>
    </Modal>
  );
}

// ─── Loan Form ─────────────────────────────────────────────────────────────────
function LoanForm({ loan, clients, lenders, stages, statuses, onSave, onClose }) {
  const isEdit = !!loan;
  const [f, setF] = useState({
    clientId:       loan?.clientId       || '',
    clientObj:      loan?.clientObj      || '',
    lender:         loan?.lender         || '',
    objective:      loan?.objective      || '',
    value:          loan?.value          || '',
    status:         loan?.status         || 'Leads',
    stage:          loan?.stage          || 'New Client',
    submissionDate: loan?.submissionDate || '',
    settlementDate: loan?.settlementDate || '',
    comms:          loan?.comms          || '',
    datePaid:       loan?.datePaid       || '',
    referrer:       loan?.referrer       || '',
    notes:          loan?.notes          || '',
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
            <NumberInput value={f.value} onChange={v => sf('value', v)} placeholder="500,000"/>
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
            <NumberInput value={f.comms} onChange={v => sf('comms', v)} placeholder="2,750"/>
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
function LoanDrawer({ loan, clientName, onEdit, onDelete, onClose, onUpdate }) {
  const [tab, setTab] = useState('details');
  if (!loan) return null;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className={`drawer${tab === 'compliance' ? ' wide' : ''}`}>
        <div className="drawer-head">
          <div>
            <h2>{clientName || loan.clientObj || 'Unknown Client'}</h2>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{loan.lender} · {loan.objective}</div>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-tabs">
          <button className={`drawer-tab${tab === 'details' ? ' active' : ''}`} onClick={() => setTab('details')}>Details</button>
          <button className={`drawer-tab${tab === 'compliance' ? ' active' : ''}`} onClick={() => setTab('compliance')}>
            Compliance · {complianceProgress(loan)}%
          </button>
        </div>
        {tab === 'compliance' ? (
          <div className="drawer-body">
            <LoanCompliance loan={loan} clientName={clientName || loan.clientObj || 'Unknown Client'} onUpdate={onUpdate}/>
          </div>
        ) : (
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
        )}
        <div className="drawer-foot">
          <button className="btn danger-ghost" onClick={onDelete}><Trash2 size={14}/> Delete</button>
          <button className="btn primary" onClick={onEdit}><Edit3 size={14}/> Edit</button>
        </div>
      </div>
    </>
  );
}

// ─── Inline Stage Selector ────────────────────────────────────────────────────
function StageSelector({ loan, stages, open, onOpen, onSelect }) {
  return (
    <div
      data-stage-popover
      style={{ position: 'relative' }}
      onClick={e => e.stopPropagation()}
    >
      <button
        className="stage-badge-btn"
        onClick={onOpen}
        title="Click to change stage"
      >
        <StageBadge stage={loan.stage}/>
        <span className="stage-badge-caret">▾</span>
      </button>
      {open && (
        <div className="stage-popover">
          {stages.map(s => {
            const c = STAGE_COLORS[s] || {};
            const blockedGate = loan.stage === s ? null : stageBlockedBy(loan, s);
            const outstanding = blockedGate ? blockingItems(loan, blockedGate) : [];
            return (
              <button
                key={s}
                className={`stage-popover-item${loan.stage === s ? ' active' : ''}${blockedGate ? ' locked' : ''}`}
                disabled={!!blockedGate}
                title={blockedGate
                  ? `Locked — Gate ${blockedGate} incomplete (${outstanding.length} outstanding): ${outstanding.slice(0, 4).map(i => i.label).join('; ')}${outstanding.length > 4 ? '…' : ''}`
                  : undefined}
                onClick={() => onSelect(s)}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.text || 'var(--ink-3)', display: 'inline-block', flexShrink: 0 }}/>
                {s}
                {blockedGate && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-4)' }}>🔒 G{blockedGate}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Pipeline Page ────────────────────────────────────────────────────────────
export default function Pipeline() {
  const { loans, clients, addLoan, updateLoan, deleteLoan, addNote, mortgageSettings } = useData();

  const activeLenders  = mortgageSettings?.lenders  || LENDERS;
  const activeStages   = mortgageSettings?.stages   || LOAN_STAGES;
  const activeStatuses = mortgageSettings?.statuses || LOAN_STATUSES;

  const [selectedStatus,  setSelectedStatus]  = useState('all');
  const [showSettled,     setShowSettled]      = useState(false);
  const [sortBy,          setSortBy]           = useState(() => {
    try { return localStorage.getItem('pipeline.sortBy') || 'recent'; } catch { return 'recent'; }
  });
  const [search,          setSearch]           = useState('');
  const [editStageId,     setEditStageId]      = useState(null); // loan id with open stage picker
  const [showForm,        setShowForm]         = useState(false);
  const [editLoan,        setEditLoan]         = useState(null);
  const [viewLoan,        setViewLoan]         = useState(null);
  const [delLoan,         setDelLoan]          = useState(null);
  const [showNoteForm,    setShowNoteForm]      = useState(false);

  // Close stage popover on outside click
  useEffect(() => {
    if (!editStageId) return;
    const handler = e => {
      if (!e.target.closest('[data-stage-popover]')) setEditStageId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editStageId]);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  // Keep the drawer in sync with live Firebase data (compliance edits update in place)
  const liveViewLoan = viewLoan ? loans.find(x => x.id === viewLoan.id) || null : null;

  // Split settled vs active
  const settledLoans = loans.filter(l => l.stage === SETTLED_STAGE);
  const activeLoans  = loans.filter(l => l.stage !== SETTLED_STAGE);

  const baseLoans = showSettled ? settledLoans : activeLoans;

  const filtered = baseLoans
    .filter(l => {
      const matchStatus = showSettled || selectedStatus === 'all' || l.status === selectedStatus;
      const name = (l.clientObj || clientMap[l.clientId] || '').toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase()) ||
        (l.lender || '').toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'stage') {
        const ai = LOAN_STAGES.indexOf(a.stage);
        const bi = LOAN_STAGES.indexOf(b.stage);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
      if (sortBy === 'settlement') {
        if (!a.settlementDate && !b.settlementDate) return 0;
        if (!a.settlementDate) return 1;
        if (!b.settlementDate) return -1;
        return new Date(a.settlementDate) - new Date(b.settlementDate);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  const countByStatus = s => activeLoans.filter(l => l.status === s).length;
  const pipelineVal   = activeLoans
    .filter(l => ACTIVE_STAGES.includes(l.stage))
    .reduce((s, l) => s + (Number(l.value) || 0), 0);

  // ── Handlers ─────────────────────────────────────────────────────────────────
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

  async function handleQuickNote(data) {
    try { await addNote(data); toast.success('Note saved!'); }
    catch { toast.error('Failed to save note.'); }
    setShowNoteForm(false);
  }

  const handleStageSelect = useCallback(async (loanId, stage) => {
    setEditStageId(null);
    try { await updateLoan(loanId, { stage }); toast.success(`Stage → ${stage}`); }
    catch { toast.error('Failed to update stage.'); }
  }, [updateLoan]);

  function switchToActive() { setShowSettled(false); setSelectedStatus('all'); }
  function switchToSettled() { setShowSettled(true); setSelectedStatus('all'); }

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="crm-toolbar" style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search loans…"
              style={{ paddingLeft: 32, padding: '8px 14px 8px 32px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13, width: 200 }}/>
          </div>
          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUpDown size={13} style={{ color: 'var(--ink-3)' }}/>
            <select value={sortBy} onChange={e => { const v = e.target.value; setSortBy(v); try { localStorage.setItem('pipeline.sortBy', v); } catch {} }}
              style={{ fontSize: 12.5, color: 'var(--ink-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 10px', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
              <option value="recent">Recent</option>
              <option value="stage">By Stage</option>
              <option value="settlement">Settlement Date</option>
            </select>
          </div>
          {/* Pipeline value */}
          {!showSettled && (
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              Pipeline: <strong style={{ color: 'var(--mortgage)' }}>{formatCurrency(pipelineVal, true)}</strong>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost sm" onClick={() => setShowNoteForm(true)}>
            <FileText size={13}/> Note
          </button>
          <button className="btn accent sm" onClick={() => { setEditLoan(null); setShowForm(true); }}>
            <Plus size={13}/> Add Loan
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="crm-body" style={{ padding: '16px 28px 0' }}>
        <div className="pipeline-status-tabs">
          {/* Active loan status tabs */}
          <button
            className={`status-tab${!showSettled && selectedStatus === 'all' ? ' active' : ''}`}
            onClick={() => { switchToActive(); }}
          >
            All <span className="tab-count">{activeLoans.length}</span>
          </button>
          {activeStatuses.filter(s => s !== 'Settled').map(s => (
            <button key={s}
              className={`status-tab${!showSettled && selectedStatus === s ? ' active' : ''}`}
              onClick={() => { setShowSettled(false); setSelectedStatus(s); }}>
              {s} <span className="tab-count">{countByStatus(s)}</span>
            </button>
          ))}
          {/* Separator + Settled tab */}
          <div style={{ width: 1, height: 20, background: 'var(--border-strong)', alignSelf: 'center', margin: '0 6px', flexShrink: 0 }}/>
          <button
            className={`status-tab settled-tab${showSettled ? ' active' : ''}`}
            onClick={switchToSettled}
          >
            ✓ Settled <span className="tab-count">{settledLoans.length}</span>
          </button>
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div className="crm-body" style={{ padding: '16px 28px 28px' }}>
        {filtered.length === 0 ? (
          <EmptyState
            emoji={showSettled ? '🏡' : '🏠'}
            title={showSettled ? 'No settled loans' : 'No loans yet'}
            description={showSettled ? 'Settled loans will appear here.' : 'Add your first loan to start tracking your pipeline.'}
            actionLabel={showSettled ? undefined : 'Add Loan'}
            onAction={showSettled ? undefined : () => { setEditLoan(null); setShowForm(true); }}
          />
        ) : (
          <div className="loan-grid">
            {filtered.map(l => {
              const name = l.clientObj || clientMap[l.clientId] || 'Unknown';
              return (
                <div key={l.id} className="loan-card" onClick={() => setViewLoan(l)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div className="loan-client">{name}</div>
                    <span title={`Compliance ${complianceProgress(l)}%`}><ProgressRing value={complianceProgress(l)} size={30}/></span>
                  </div>
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
                    {/* Inline stage selector */}
                    <StageSelector
                      loan={l}
                      stages={activeStages}
                      open={editStageId === l.id}
                      onOpen={() => setEditStageId(editStageId === l.id ? null : l.id)}
                      onSelect={stage => handleStageSelect(l.id, stage)}
                    />
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

      {/* ── Modals / Drawers ── */}
      {showForm && (
        <LoanForm loan={editLoan} clients={clients} lenders={activeLenders}
          stages={activeStages} statuses={activeStatuses}
          onSave={handleSave} onClose={() => { setShowForm(false); setEditLoan(null); }}/>
      )}
      {showNoteForm && (
        <QuickNoteModal clients={clients} onSave={handleQuickNote} onClose={() => setShowNoteForm(false)}/>
      )}
      {liveViewLoan && (
        <LoanDrawer
          loan={liveViewLoan}
          clientName={clientMap[liveViewLoan.clientId] || liveViewLoan.clientObj}
          onEdit={() => { setEditLoan(liveViewLoan); setViewLoan(null); setShowForm(true); }}
          onDelete={() => setDelLoan(liveViewLoan)}
          onClose={() => setViewLoan(null)}
          onUpdate={data => updateLoan(liveViewLoan.id, data).catch(() => toast.error('Failed to save.'))}
        />
      )}
      <ConfirmDialog
        isOpen={!!delLoan} onClose={() => setDelLoan(null)}
        onConfirm={() => handleDelete(delLoan?.id)}
        title="Delete Loan?"
        message={`Delete loan for "${delLoan?.clientObj || clientMap[delLoan?.clientId]}"?`}
        confirmLabel="Delete Loan"
      />
    </>
  );
}
