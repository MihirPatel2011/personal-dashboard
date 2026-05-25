import { useState } from 'react';
import { Plus, Trash2, Edit3, Check, X, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import { LENDERS, LOAN_STAGES, LOAN_STATUSES } from '../../constants';

// ─── Editable List ─────────────────────────────────────────────────────────────
function EditableList({ title, description, items, onSave }) {
  const [list,    setList]    = useState(items);
  const [input,   setInput]   = useState('');
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [dirty,   setDirty]   = useState(false);

  function add() {
    const v = input.trim();
    if (!v || list.includes(v)) return;
    setList(l => [...l, v]);
    setInput('');
    setDirty(true);
  }

  function remove(idx) {
    setList(l => l.filter((_, i) => i !== idx));
    setDirty(true);
  }

  function startEdit(idx) {
    setEditIdx(idx);
    setEditVal(list[idx]);
  }

  function saveEdit(idx) {
    const v = editVal.trim();
    if (!v) { setEditIdx(null); return; }
    setList(l => l.map((x, i) => i === idx ? v : x));
    setEditIdx(null);
    setDirty(true);
  }

  async function handleSave() {
    try { await onSave(list); toast.success(`${title} saved.`); setDirty(false); }
    catch { toast.error('Failed to save.'); }
  }

  function reset() {
    setList(items);
    setDirty(false);
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '20px 22px', marginBottom: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 3 }}>{title}</div>
          {description && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{description}</div>}
        </div>
        {dirty && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn ghost sm" onClick={reset}>Reset</button>
            <button className="btn accent sm" onClick={handleSave}><Check size={12}/> Save</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {list.map((item, idx) => (
          <div key={idx} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', padding: '5px 10px'
          }}>
            {editIdx === idx ? (
              <input
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEdit(idx);
                  if (e.key === 'Escape') setEditIdx(null);
                }}
                style={{ width: Math.max(60, editVal.length * 8), fontSize: 13, background: 'transparent', border: 'none', color: 'var(--ink)', outline: 'none' }}
              />
            ) : (
              <span style={{ fontSize: 13, color: 'var(--ink)' }}>{item}</span>
            )}
            {editIdx === idx ? (
              <button onClick={() => saveEdit(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ok)', padding: 2 }}><Check size={11}/></button>
            ) : (
              <button onClick={() => startEdit(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2 }}><Edit3 size={11}/></button>
            )}
            <button onClick={() => remove(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2 }}><X size={11}/></button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Add new ${title.toLowerCase().slice(0, -1)}…`}
          onKeyDown={e => e.key === 'Enter' && add()}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13 }}
        />
        <button className="btn accent sm" onClick={add} disabled={!input.trim()}><Plus size={13}/> Add</button>
      </div>
    </div>
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────
export default function Settings() {
  const { mortgageSettings, saveMortgageSettings } = useData();

  // Use saved settings if they exist, otherwise fall back to defaults from constants
  const currentLenders  = mortgageSettings?.lenders  || LENDERS;
  const currentStages   = mortgageSettings?.stages   || LOAN_STAGES;
  const currentStatuses = mortgageSettings?.statuses || LOAN_STATUSES;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 760 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Mortgage Settings</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          Customise the selectable options throughout the Mortgage CRM. Changes are saved per-section.
        </div>
      </div>

      <EditableList
        title="Lenders"
        description="Banks and non-bank lenders available when adding loans."
        items={currentLenders}
        onSave={arr => saveMortgageSettings('lenders', arr)}
      />

      <EditableList
        title="Loan Stages"
        description="Workflow stages a loan moves through from application to settlement."
        items={currentStages}
        onSave={arr => saveMortgageSettings('stages', arr)}
      />

      <EditableList
        title="Pipeline Statuses"
        description="High-level pipeline status used for tab filtering on the Pipeline page."
        items={currentStatuses}
        onSave={arr => saveMortgageSettings('statuses', arr)}
      />
    </div>
  );
}
