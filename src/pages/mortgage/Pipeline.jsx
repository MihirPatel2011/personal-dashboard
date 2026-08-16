// src/pages/mortgage/Pipeline.jsx
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit3, Trash2, Copy, Search, FileText, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { StageBadge } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import NumberInput from '../../components/common/NumberInput';
import { LOAN_STAGES, LOAN_STATUSES, OBJECTIVES, LENDERS, REFERRERS, STAGE_COLORS, ACTIVE_STAGES } from '../../constants';
import { formatCurrency, fmtDate, fmtRelative, tsToDateInput } from '../../utils';
import { progress as complianceProgress, stageBlockedBy, blockingItems } from '../../utils/crmCompliance';
import LoanCompliance, { ProgressRing } from '../../components/mortgage/LoanCompliance';

import { clickable } from '../../compass/interaction';
import { XDel } from '../../compass/ui';
import EditField, { SelectField } from '../../compass/EditField';
import { C, mono, card, labelSm } from '../../compass/tokens';

// Compass's clients table: every column can shrink, long values ellipsis, so
// the table always fits its card rather than scrolling sideways.
const ROW_GRID = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0,0.5fr) minmax(0,1.7fr) minmax(0,0.8fr) minmax(0,0.9fr) minmax(0,1fr) minmax(0,1fr)',
  gap: 10,
  alignItems: 'center',
};
const CELL = { minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

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
    ref:            loan?.ref            || '',
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
        <div className="field">
          <label>File ref</label>
          <input value={f.ref} onChange={e => sf('ref', e.target.value)} placeholder="Your own identifier, e.g. 2026-014"/>
        </div>
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

// ─── Loan Panel ───────────────────────────────────────────────────────────────
// Sits beside the table rather than sliding over it, so the file you picked
// stays in view next to the rest of the pipeline.
function LoanPanel({ loan, clientName, lenders, stages, statuses, onEdit, onDelete, onDuplicate, onClose, onUpdate }) {
  const [tab, setTab] = useState('details');
  if (!loan) return null;
  return (
      <aside className="detail-panel">
        <div className="drawer-head">
          <div>
            <h2>{clientName || loan.clientObj || 'Unknown Client'}</h2>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{loan.lender} · {loan.objective}</div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">✕</button>
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
          {/* Every field edits in place — no round trip through the edit modal. */}
          <div className="field-grid">
            <EditField label="File ref" value={loan.ref} placeholder="e.g. 2026-014"
                       onCommit={v => onUpdate({ ref: v })}/>
            <EditField label="Value" value={loan.value ? formatCurrency(Number(loan.value)) : ''}
                       type="number" placeholder="$0"
                       onCommit={v => onUpdate({ value: v })}/>
            <SelectField label="Lender" value={loan.lender} options={lenders} placeholder="Pick a lender"
                         onCommit={v => onUpdate({ lender: v })}/>
            <SelectField label="Objective" value={loan.objective} options={OBJECTIVES} placeholder="Pick one"
                         onCommit={v => onUpdate({ objective: v })}/>
            <SelectField label="Stage" value={loan.stage} options={stages} placeholder="Pick a stage"
                         onCommit={v => onUpdate({ stage: v })}/>
            <SelectField label="Status" value={loan.status} options={statuses} placeholder="Pick a status"
                         onCommit={v => onUpdate({ status: v })}/>
            <SelectField label="Referrer" value={loan.referrer} options={REFERRERS} placeholder="Pick a referrer"
                         onCommit={v => onUpdate({ referrer: v })}/>
            <EditField label="Submitted" value={loan.submissionDate || ''} type="date"
                       onCommit={v => onUpdate({ submissionDate: v })}/>
            <EditField label="Settlement" value={loan.settlementDate || ''} type="date"
                       onCommit={v => onUpdate({ settlementDate: v })}/>
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Notes</div>
            <NotesField value={loan.notes || ''} onCommit={v => onUpdate({ notes: v })}/>
          </div>
          <ConversationLog clientId={loan.clientId} clientName={clientName || loan.clientObj}/>

          <ClientTasks clientId={loan.clientId} clientName={clientName || loan.clientObj}/>

          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Added {fmtRelative(loan.createdAt)}</div>
        </div>
        )}
        <div className="drawer-foot">
          <button className="btn danger-ghost" onClick={onDelete}><Trash2 size={14}/> Delete</button>
          <button className="btn" onClick={onDuplicate}><Copy size={14}/> Duplicate</button>
          <button className="btn primary" onClick={onEdit}><Edit3 size={14}/> Edit</button>
        </div>
      </aside>
  );
}

// ─── Conversation log ─────────────────────────────────────────────────────────
// Compass's log, writing to the same notes node the CRM Notes page reads — a
// call logged here is the same record you will find under Notes.
function ConversationLog({ clientId, clientName }) {
  const { notes, addNote, deleteNote } = useData();
  const [text, setText] = useState('');
  const [channel, setChannel] = useState('');
  const [saving, setSaving] = useState(false);

  const mine = notes
    .filter(n => n.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const save = async () => {
    const body = text.trim();
    if (!body) return;
    if (!clientId) { toast.error('Link this loan to a client first.'); return; }
    // The Notes page leads with the title, so derive a readable one from the
    // opening line rather than saving an untitled note.
    const firstLine = body.split('\n')[0].trim();
    const title = firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
    setSaving(true);
    try {
      await addNote({
        clientId,
        title,
        body,
        channel,
        date: tsToDateInput(Date.now()),
      });
      setText(''); setChannel('');
      toast.success('Note saved.');
    } catch { toast.error('Failed to save note.'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 10 }}>
        Conversation log{clientName ? ` · ${clientName}` : ''}
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Log a call or conversation…"
        style={{
          width: '100%', minHeight: 62, resize: 'vertical', padding: '10px 12px',
          border: '1px solid var(--border-2)', borderRadius: 'var(--r)',
          background: 'var(--surface-2)', color: 'var(--ink)',
          fontSize: 13, lineHeight: 1.55, fontFamily: 'var(--font)',
        }}/>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0 14px', flexWrap: 'wrap' }}>
        <select value={channel} onChange={e => setChannel(e.target.value)}
                style={{ ...panelInput, flex: '0 1 130px', fontSize: 12 }}>
          <option value="">Channel…</option>
          {CHANNELS.map(c => <option key={c}>{c}</option>)}
        </select>
        <button className="btn accent sm" onClick={save} disabled={saving || !text.trim()}>
          {saving ? 'Saving…' : 'Save note'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 260, overflow: 'auto' }}>
        {mine.map(n => (
          <div key={n.id} style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            paddingLeft: 12, borderLeft: '2px solid var(--accent-border)',
          }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
                {n.date ? fmtDate(n.date) : fmtRelative(n.createdAt)}
                {n.channel ? ` · ${n.channel}` : ''}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>
                {n.body || n.title}
              </span>
            </div>
            <XDel size={15} onClick={() => deleteNote(n.id).catch(() => toast.error('Failed.'))}/>
          </div>
        ))}
        {!mine.length && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No conversations logged yet.</div>
        )}
      </div>
    </div>
  );
}

// ─── Tasks for this client ────────────────────────────────────────────────────
// Mirrors Compass: tick one off, add one with a due date, without leaving the
// file. Writes to the same tasks node the CRM Tasks page uses.
function ClientTasks({ clientId, clientName }) {
  const { crmTasks, addCrmTask, updateCrmTask, deleteCrmTask } = useData();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');

  const mine = crmTasks
    .filter(t => t.clientId === clientId)
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  const add = async () => {
    const t = title.trim();
    if (!t) return;
    if (!clientId) { toast.error('Link this loan to a client first.'); return; }
    try {
      await addCrmTask({
        title: t, clientId, type: '', priority: 'Medium',
        status: 'To Do', dueDate: due || '', notes: '',
      });
      setTitle(''); setDue('');
      toast.success('Task added.');
    } catch { toast.error('Failed to add task.'); }
  };

  const toggle = async (t) => {
    // Patch just the status — spreading the whole task back would rewrite every
    // field (and write the id into the record) for a one-field change.
    try { await updateCrmTask(t.id, { status: t.status === 'Done' ? 'To Do' : 'Done' }); }
    catch { toast.error('Failed to update task.'); }
  };

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 10 }}>
        Tasks {clientName ? `for ${clientName}` : 'for this client'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {mine.map(t => {
          const done = t.status === 'Done';
          return (
            <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div {...clickable(() => toggle(t), done ? 'Mark as not done' : 'Mark as done')}
                   style={{
                     width: 17, height: 17, flex: '0 0 17px', marginTop: 1, borderRadius: 5,
                     cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     fontSize: 11, color: 'var(--bg)',
                     border: `1.5px solid ${done ? 'var(--accent)' : 'var(--border-strong)'}`,
                     background: done ? 'var(--accent)' : 'transparent',
                   }}>
                {done ? '✓' : ''}
              </div>
              <div style={{
                flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.4,
                ...(done ? { color: 'var(--ink-3)', textDecoration: 'line-through' } : { color: 'var(--ink)' }),
              }}>
                {t.title}
              </div>
              {t.dueDate && (
                <span style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{fmtDate(t.dueDate)}</span>
              )}
              <XDel size={15} onClick={() => deleteCrmTask(t.id).catch(() => toast.error('Failed.'))}/>
            </div>
          );
        })}
        {!mine.length && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Nothing to do on this file yet.</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <input value={title} onChange={e => setTitle(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && add()}
               placeholder="Add a task…"
               style={{ ...panelInput, flex: '1 1 140px' }}/>
        <input type="date" value={due} onChange={e => setDue(e.target.value)}
               style={{ ...panelInput, flex: '0 1 130px', fontSize: 12.5 }}/>
        <button className="btn accent sm" onClick={add}>Add</button>
      </div>
    </div>
  );
}

// Notes save on blur like every other field in the panel.
function NotesField({ value, onCommit }) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);
  const [last, setLast] = useState(value);
  if (!focused && value !== last) { setLast(value); setLocal(value); }

  return (
    <textarea
      value={local}
      placeholder="Anything worth remembering about this file…"
      onChange={e => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); if (local !== value) onCommit(local); }}
      style={{
        width: '100%', minHeight: 68, resize: 'vertical', padding: '10px 12px',
        border: '1px solid var(--border-2)', borderRadius: 'var(--r)',
        background: 'var(--surface-2)', color: 'var(--ink)',
        fontSize: 13, lineHeight: 1.6, fontFamily: 'var(--font)',
      }}/>
  );
}

const panelInput = {
  padding: '9px 11px', border: '1px solid var(--border-2)', borderRadius: 8,
  background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 12.5, minWidth: 0,
};

// ─── Inline Stage Selector ────────────────────────────────────────────────────
// The menu renders in a portal with fixed positioning: inside the card it gets
// trapped under sibling cards (hover transforms create stacking contexts) and
// clipped by the viewport on the bottom row. Flips upward when space below is short.
function StageSelector({ loan, stages, open, onOpen, onClose, onSelect }) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) { setPos(null); return; }
    const r = btnRef.current.getBoundingClientRect();
    const GAP = 6, MARGIN = 8, MIN_W = 170;
    const wanted     = Math.min(300, stages.length * 33 + 8);
    const spaceBelow = window.innerHeight - r.bottom - GAP - MARGIN;
    const spaceAbove = r.top - GAP - MARGIN;
    const openUp     = spaceBelow < wanted && spaceAbove > spaceBelow;
    setPos({
      left: Math.max(MARGIN, Math.min(r.left, window.innerWidth - MIN_W - MARGIN)),
      ...(openUp
        ? { bottom: window.innerHeight - r.top + GAP }
        : { top: r.bottom + GAP }),
      maxHeight: Math.max(140, Math.min(300, openUp ? spaceAbove : spaceBelow)),
    });
  }, [open, stages.length]);

  // Close on outside scroll/resize so the fixed menu never drifts from its button.
  useEffect(() => {
    if (!open) return;
    const onScroll = e => {
      if (e.target instanceof Element && e.target.closest('[data-stage-popover]')) return;
      onClose();
    };
    const onResize = () => onClose();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, onClose]);

  return (
    <div
      data-stage-popover
      style={{ position: 'relative' }}
      onClick={e => e.stopPropagation()}
    >
      <button
        ref={btnRef}
        className="stage-badge-btn"
        onClick={onOpen}
        title="Click to change stage"
      >
        <StageBadge stage={loan.stage}/>
        <span className="stage-badge-caret">▾</span>
      </button>
      {open && pos && createPortal(
        <div
          className="stage-popover"
          data-stage-popover
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, maxHeight: pos.maxHeight }}
          onClick={e => e.stopPropagation()}
        >
          {stages.map(s => {
            const c = STAGE_COLORS[s] || {};
            const blockedGate = loan.stage === s ? null : stageBlockedBy(loan, s);
            const outstanding = blockedGate ? blockingItems(loan, blockedGate) : [];
            return (
              // Gates are advisory, not a lock: the edit form never enforced
              // them, so blocking here only forced a longer route to the same
              // result. Outstanding items are flagged instead.
              <button
                key={s}
                className={`stage-popover-item${loan.stage === s ? ' active' : ''}${blockedGate ? ' incomplete' : ''}`}
                title={blockedGate
                  ? `Gate ${blockedGate} incomplete (${outstanding.length} outstanding): ${outstanding.slice(0, 4).map(i => i.label).join('; ')}${outstanding.length > 4 ? '…' : ''}`
                  : undefined}
                onClick={() => onSelect(s, blockedGate, outstanding.length)}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.text || 'var(--ink-3)', display: 'inline-block', flexShrink: 0 }}/>
                {s}
                {blockedGate && (
                  <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--warn)' }} aria-label={`Gate ${blockedGate} incomplete`}>
                    ⚠ G{blockedGate}
                  </span>
                )}
              </button>
            );
          })}
        </div>,
        document.body
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
      const q = search.toLowerCase();
      const matchSearch = !search || name.includes(q) ||
        (l.lender || '').toLowerCase().includes(q) ||
        (l.ref || '').toLowerCase().includes(q);
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

  // Same file, new record: everything carries over — including compliance —
  // so a near-identical application starts where the last one finished.
  async function handleDuplicate(loan) {
    if (!loan) return;
    const copy = { ...loan };
    delete copy.id;
    delete copy.createdAt;
    copy.ref = loan.ref ? `${loan.ref}-copy` : '';
    try {
      const newId = await addLoan(copy);
      toast.success('File duplicated.');
      setViewLoan({ ...copy, id: newId });
    } catch { toast.error('Failed to duplicate.'); }
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

  const handleStageSelect = useCallback(async (loanId, stage, blockedGate, outstanding) => {
    setEditStageId(null);
    try {
      await updateLoan(loanId, { stage });
      if (blockedGate) {
        // Moved anyway — say what is still outstanding rather than silently allowing it.
        toast(`Stage → ${stage} · Gate ${blockedGate} still has ${outstanding} outstanding`, { icon: '⚠️' });
      } else {
        toast.success(`Stage → ${stage}`);
      }
    } catch { toast.error('Failed to update stage.'); }
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

      {/* ── Table + detail panel, side by side ── */}
      <div className="crm-body split-view" style={{ padding: '16px 28px 28px' }}>
        <div style={{ minWidth: 0 }}>
        {filtered.length === 0 ? (
          <EmptyState
            emoji={showSettled ? '🏡' : '🏠'}
            title={showSettled ? 'No settled loans' : 'No loans yet'}
            description={showSettled ? 'Settled loans will appear here.' : 'Add your first loan to start tracking your pipeline.'}
            actionLabel={showSettled ? undefined : 'Add Loan'}
            onAction={showSettled ? undefined : () => { setEditLoan(null); setShowForm(true); }}
          />
        ) : (
          <section style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{
              ...ROW_GRID, padding: '11px 16px', background: 'var(--surface-2)',
              borderBottom: `1px solid ${C.line}`, ...labelSm, fontSize: 9, letterSpacing: '0.12em',
            }}>
              <div style={CELL}>Ref</div>
              <div style={CELL}>Client · referrer</div>
              <div style={CELL}>Loan</div>
              <div style={CELL}>Bank</div>
              <div style={CELL}>Stage</div>
              <div style={CELL}>Key date</div>
            </div>

            {filtered.map(l => {
              const name = l.clientObj || clientMap[l.clientId] || 'Unknown';
              const selected = viewLoan?.id === l.id;
              return (
                <div
                  key={l.id}
                  {...clickable(() => setViewLoan(l), `Open ${name}`)}
                  style={{
                    ...ROW_GRID, padding: '12px 16px', cursor: 'pointer',
                    borderBottom: `1px solid ${C.line}`,
                    background: selected ? 'var(--surface-2)' : 'var(--surface)',
                    boxShadow: `inset 2px 0 0 ${selected ? C.accent : 'transparent'}`,
                  }}
                >
                  <div style={{ fontFamily: mono, fontSize: 11.5, color: l.ref ? C.ink : 'var(--ink-4)', ...CELL }} title={l.ref || 'No ref'}>
                    {l.ref || '—'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span title={`Compliance ${complianceProgress(l)}%`} style={{ flex: '0 0 auto', display: 'flex' }}>
                      <ProgressRing value={complianceProgress(l)} size={24}/>
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }} title={name}>
                      <span style={{ fontSize: 13, ...CELL }}>{name}</span>
                      <span style={{ fontSize: 10.5, color: C.muted, ...CELL }}>
                        {l.objective || '—'}{l.referrer ? ` · via ${l.referrer}` : ''}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontFamily: mono, fontSize: 12.5, ...CELL }}>
                    {l.value ? formatCurrency(Number(l.value)) : '—'}
                  </div>

                  <div style={{ fontSize: 12.5, color: l.lender ? C.ink : C.dim, ...CELL }} title={l.lender || ''}>
                    {l.lender || '—'}
                  </div>

                  <div style={{ minWidth: 0 }} onClick={e => e.stopPropagation()}>
                    <StageSelector
                      loan={l}
                      stages={activeStages}
                      open={editStageId === l.id}
                      onOpen={() => setEditStageId(editStageId === l.id ? null : l.id)}
                      onClose={() => setEditStageId(null)}
                      onSelect={stage => handleStageSelect(l.id, stage)}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 12.5, color: C.ink, ...CELL }}>
                        {l.settlementDate ? fmtDate(l.settlementDate) : '—'}
                      </span>
                      <span style={{ fontSize: 10.5, color: C.muted, ...CELL }}>
                        {l.settlementDate ? 'settlement' : (l.status || '')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
                      <button className="icon-btn sm" onClick={e => { e.stopPropagation(); setEditLoan(l); setShowForm(true); }}><Edit3 size={12}/></button>
                      <button className="icon-btn sm danger" onClick={e => { e.stopPropagation(); setDelLoan(l); }}><Trash2 size={12}/></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}
        </div>

        {liveViewLoan ? (
          <LoanPanel
            loan={liveViewLoan}
            clientName={clientMap[liveViewLoan.clientId] || liveViewLoan.clientObj}
            lenders={activeLenders}
            stages={activeStages}
            statuses={activeStatuses}
            onEdit={() => { setEditLoan(liveViewLoan); setShowForm(true); }}
            onDelete={() => setDelLoan(liveViewLoan)}
            onDuplicate={() => handleDuplicate(liveViewLoan)}
            onClose={() => setViewLoan(null)}
            onUpdate={data => updateLoan(liveViewLoan.id, data).catch(() => toast.error('Failed to save.'))}
          />
        ) : (
          <aside className="detail-panel empty">
            <div className="drawer-body">
              <h2 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 24, margin: 0 }}>No file selected</h2>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                Pick a loan on the left to see its details, compliance and tasks here.
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ── Modals ── */}
      {showForm && (
        <LoanForm loan={editLoan} clients={clients} lenders={activeLenders}
          stages={activeStages} statuses={activeStatuses}
          onSave={handleSave} onClose={() => { setShowForm(false); setEditLoan(null); }}/>
      )}
      {showNoteForm && (
        <QuickNoteModal clients={clients} onSave={handleQuickNote} onClose={() => setShowNoteForm(false)}/>
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
