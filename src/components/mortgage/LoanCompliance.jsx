// src/components/mortgage/LoanCompliance.jsx
// Compliance tab content for the loan drawer: file-setup selectors,
// BID card, smart checklist grouped by gate, gate readouts and audit summary.
// All rules/logic live in utils/crmCompliance.js — this file only renders.
import { useState } from 'react';
import { MessageSquare, Printer, CheckCircle2, ScrollText } from 'lucide-react';
import {
  FILE_TYPES, LOAN_PURPOSES, FILE_FLAGS, GATES, GATE_LABELS,
  BID_ITEM_IDS, BID_QUESTIONS,
  visibleItems, gateComplete, blockingItems, progress,
} from '../../utils/crmCompliance';

// ─── Progress ring (also used on loan cards) ──────────────────────────────────
export function ProgressRing({ value = 0, size = 30, stroke = 3 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0 }} aria-label={`Compliance ${value}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-2)" strokeWidth={stroke}/>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={value === 100 ? 'var(--ok)' : 'var(--mortgage)'} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .3s var(--ease-out)' }}/>
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size * 0.3} fontWeight="700" fill="var(--ink-3)">{value}</text>
    </svg>
  );
}

// ─── Yes / No / N/A segmented control ─────────────────────────────────────────
function YesNoNa({ value, onChange }) {
  return (
    <div className="seg mini">
      {['yes', 'no', 'na'].map(s => (
        <button key={s}
          className={`seg-btn${value === s ? ` active ${s}` : ''}`}
          onClick={() => onChange(value === s ? null : s)}>
          {s === 'na' ? 'N/A' : s.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ─── Audit summary (plain printable window) ───────────────────────────────────
function esc(s = '') {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function openAuditSummary(loan, clientName) {
  const checklist = loan.checklist || {};
  const comments  = loan.comments  || {};
  const ft        = FILE_TYPES.find(t => t.id === loan.fileType)?.label || '—';
  const purposes  = (loan.loanPurpose || []).map(p => LOAN_PURPOSES.find(x => x.id === p)?.label || p).join(', ') || '—';
  const flagsOn   = FILE_FLAGS.filter(f => (loan.flags || {})[f.id]).map(f => f.label).join(', ') || 'None';

  const gateHtml = GATES.map(g => {
    const items = visibleItems(loan, g);
    if (!items.length) return '';
    const done = items.filter(i => ['yes', 'na'].includes(checklist[i.id])).length;
    const rows = items.map(i => {
      const s   = checklist[i.id];
      const lbl = s === 'yes' ? 'YES' : s === 'no' ? 'NO' : s === 'na' ? 'N/A' : '—';
      const cmt = comments[i.id] ? `<div class="cmt">${esc(comments[i.id])}</div>` : '';
      return `<tr class="${s === 'yes' || s === 'na' ? '' : 'open'}"><td class="st">${lbl}</td><td>${esc(i.label)}${cmt}</td></tr>`;
    }).join('');
    return `<h2>${esc(GATE_LABELS[g])} — ${done} of ${items.length} complete</h2><table>${rows}</table>`;
  }).join('');

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>Audit Summary — ${esc(clientName)}</title><style>
    body{font-family:-apple-system,'Segoe UI',sans-serif;color:#111;max-width:760px;margin:32px auto;padding:0 20px;font-size:13px;line-height:1.5}
    h1{font-size:20px;margin:0 0 2px}
    .meta{color:#555;margin-bottom:22px}
    h2{font-size:14px;border-bottom:2px solid #111;padding-bottom:4px;margin:22px 0 6px}
    table{width:100%;border-collapse:collapse}
    td{padding:6px 8px;border-bottom:1px solid #ddd;vertical-align:top}
    .st{width:46px;font-weight:700;white-space:nowrap}
    tr.open .st{color:#B91C1C}
    .cmt{color:#555;font-style:italic;margin-top:2px}
    .print-btn{float:right;padding:6px 14px;cursor:pointer}
    @media print{.print-btn{display:none}}
  </style></head><body>
    <button class="print-btn" onclick="window.print()">Print</button>
    <h1>Compliance Audit Summary</h1>
    <div class="meta">
      ${esc(clientName)} · ${esc(loan.lender || '—')} · ${esc(loan.objective || '—')}<br/>
      File type: ${esc(ft)} · Purpose: ${esc(purposes)} · Flags: ${esc(flagsOn)}<br/>
      Status-only record — documents stored in iOutsource. Generated ${new Date().toLocaleString()}
    </div>
    ${gateHtml}
  </body></html>`);
  w.document.close();
}

// ─── Checklist row ────────────────────────────────────────────────────────────
function ChecklistRow({ item, status, comment, commentOpen, onStatus, onToggleComment, onCommentChange, onCommentBlur }) {
  return (
    <div className={`cmp-row${status === 'yes' || status === 'na' ? '' : ' incomplete'}`}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cmp-label">{item.label}</div>
        <div className="cmp-io">Stored in iOutsource</div>
        {(commentOpen || comment) && (
          <input className="cmp-comment" value={comment} placeholder="Comment…"
            onChange={e => onCommentChange(e.target.value)} onBlur={onCommentBlur}/>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <YesNoNa value={status} onChange={onStatus}/>
        <button className={`icon-btn sm${comment ? ' has-comment' : ''}`} title="Comment" onClick={onToggleComment}>
          <MessageSquare size={13}/>
        </button>
      </div>
    </div>
  );
}

// ─── Main compliance panel ────────────────────────────────────────────────────
export default function LoanCompliance({ loan, clientName, onUpdate }) {
  const checklist = loan.checklist   || {};
  const comments  = loan.comments    || {};
  const flags     = loan.flags       || {};
  const purposes  = loan.loanPurpose || [];

  const [draftComments, setDraftComments] = useState(comments);
  const [openComments,  setOpenComments]  = useState({});
  const [prevLoanId,    setPrevLoanId]    = useState(loan.id);
  if (prevLoanId !== loan.id) { // reset drafts when a different file is opened
    setPrevLoanId(loan.id);
    setDraftComments(loan.comments || {});
    setOpenComments({});
  }

  const setStatus    = (id, status) => onUpdate({ checklist: { ...checklist, [id]: status } });
  const saveComment  = id => onUpdate({ comments: { ...comments, [id]: draftComments[id]?.trim() || null } });
  const draftComment = (id, v) => setDraftComments(p => ({ ...p, [id]: v }));
  const togglePurpose = p => onUpdate({ loanPurpose: purposes.includes(p) ? purposes.filter(x => x !== p) : [...purposes, p] });
  const toggleFlag    = k => onUpdate({ flags: { ...flags, [k]: !flags[k] } });

  const rowProps = item => ({
    item,
    status:          checklist[item.id] || null,
    comment:         draftComments[item.id] || '',
    commentOpen:     !!openComments[item.id],
    onStatus:        s => setStatus(item.id, s),
    onToggleComment: () => setOpenComments(p => ({ ...p, [item.id]: !p[item.id] })),
    onCommentChange: v => draftComment(item.id, v),
    onCommentBlur:   () => saveComment(item.id),
  });

  const pctVal   = progress(loan);
  const bidItems = BID_ITEM_IDS.map(id => visibleItems(loan, 1).find(i => i.id === id)).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── File setup selectors ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-label">File Setup</div>
          <button className="btn ghost sm" onClick={() => openAuditSummary(loan, clientName)}>
            <Printer size={13}/> Audit summary
          </button>
        </div>
        <div className="seg">
          {FILE_TYPES.map(t => (
            <button key={t.id}
              className={`seg-btn${loan.fileType === t.id ? ' active' : ''}`}
              onClick={() => onUpdate({ fileType: loan.fileType === t.id ? null : t.id })}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {LOAN_PURPOSES.map(p => (
            <button key={p.id} className={`chip${purposes.includes(p.id) ? ' active' : ''}`}
              onClick={() => togglePurpose(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {FILE_FLAGS.map(f => (
            <button key={f.id} className={`chip sm${flags[f.id] ? ' active' : ''}`}
              onClick={() => toggleFlag(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overall progress ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ProgressRing value={pctVal} size={38}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>
            Compliance progress — visible mandatory items
          </div>
          <div className="cmp-bar"><div className="cmp-bar-fill" style={{ width: `${pctVal}%` }}/></div>
        </div>
      </div>

      {/* ── BID card ── */}
      <div className="bid-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <ScrollText size={15} style={{ color: 'var(--mortgage)' }}/>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mortgage)' }}>Best Interests Duty</div>
        </div>
        {bidItems.map(item => (
          <div key={item.id} className="bid-q">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div className="cmp-label" style={{ fontWeight: 600 }}>{BID_QUESTIONS[item.id]}</div>
              <YesNoNa value={checklist[item.id] || null} onChange={s => setStatus(item.id, s)}/>
            </div>
            <textarea className="cmp-comment" rows={2} value={draftComments[item.id] || ''}
              placeholder="Notes for audit…"
              onChange={e => draftComment(item.id, e.target.value)}
              onBlur={() => saveComment(item.id)}/>
          </div>
        ))}
      </div>

      {/* ── Checklist by gate ── */}
      {GATES.map(gate => {
        const items = visibleItems(loan, gate).filter(i => !(gate === 1 && BID_ITEM_IDS.includes(i.id)));
        const all   = visibleItems(loan, gate);
        const open  = blockingItems(loan, gate);
        const done  = gateComplete(loan, gate);
        return (
          <div key={gate} className="cmp-gate">
            <div className="cmp-gate-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="section-label" style={{ color: done ? 'var(--ok)' : 'var(--ink-2)' }}>
                  {GATE_LABELS[gate]}
                </span>
                {done && <CheckCircle2 size={14} style={{ color: 'var(--ok)' }}/>}
              </div>
              <span className={`badge ${done ? 'success' : 'outline'}`}>
                {all.length - open.length} of {all.length} complete
              </span>
            </div>
            {items.map(item => <ChecklistRow key={item.id} {...rowProps(item)}/>)}
          </div>
        );
      })}
    </div>
  );
}
