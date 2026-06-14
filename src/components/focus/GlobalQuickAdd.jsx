import { useState, useEffect, useRef, useMemo } from 'react';
import { Zap, Flag, Calendar, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../common/Modal';
import { PRIORITY_MAP } from '../../constants';
import { parseTaskInput } from '../../utils/parseTask';
import { isToday, isPast, fmtShortDate } from '../../utils';

// Listens for the global "n" shortcut and offers a one-field task capture that
// understands priority (p1–p4), dates (today/tomorrow/weekday) and area names.
export default function GlobalQuickAdd() {
  const { focusAreas, addFocusTask } = useData();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  // ── Global "n" hotkey ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (open) return;
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const tag = el?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) return;
      e.preventDefault();
      setText('');
      setOpen(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Focus the field once the modal mounts
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  const parsed = useMemo(() => parseTaskInput(text, focusAreas), [text, focusAreas]);
  const p = PRIORITY_MAP[parsed.priority];
  const area = parsed.matchedArea;

  function submit() {
    const title = parsed.title.trim() || text.trim();
    if (!title) return;
    addFocusTask({
      title,
      areaId: parsed.areaId || '',
      projectId: '',
      priority: parsed.priority || 0,
      dueDate: parsed.dueDate || '',
    });
    toast.success('Task captured');
    setText('');
    setOpen(false);
  }

  function dueLabel(d) {
    if (isToday(d)) return 'Today';
    if (isPast(d)) return `Overdue · ${fmtShortDate(d)}`;
    return fmtShortDate(d);
  }
  const dueColor = parsed.dueDate
    ? (isToday(parsed.dueDate) ? 'var(--warn)' : isPast(parsed.dueDate) ? 'var(--danger)' : 'var(--ink-2)')
    : 'var(--ink-2)';

  const hasMeta = area || p || parsed.dueDate;

  return (
    <>
    {/* Floating capture button — mobile only (hidden via CSS on desktop) */}
    <button className="fx-fab" onClick={() => { setText(''); setOpen(true); }} aria-label="Quick add task" title="Quick add task">
      <Plus size={26}/>
    </button>
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Quick capture" size="sm">
      <div className="modal-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={18} style={{ color: 'var(--tasks)', flexShrink: 0 }}/>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder="e.g. Email Raj p2 tomorrow Work"
            style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: 16, color: 'var(--ink)', fontFamily: 'inherit' }}
          />
        </div>

        {/* Live parse preview */}
        {(hasMeta || parsed.title) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingLeft: 28 }}>
            {parsed.title && <span style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{parsed.title}</span>}
            {area && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: area.color + '22', color: area.color, border: `1px solid ${area.color}33` }}>
                {area.icon} {area.name}
              </span>
            )}
            {p && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: p.dim, color: p.color }}>
                <Flag size={11} fill={p.color}/> {p.label}
              </span>
            )}
            {parsed.dueDate && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: dueColor, background: 'var(--surface-3)' }}>
                <Calendar size={11}/> {dueLabel(parsed.dueDate)}
              </span>
            )}
          </div>
        )}

        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.6, paddingLeft: 28 }}>
          Type <b style={{ color: 'var(--ink-2)' }}>p1–p4</b> for priority · <b style={{ color: 'var(--ink-2)' }}>today / tomorrow / a weekday</b> for the due date · an <b style={{ color: 'var(--ink-2)' }}>area name</b> to file it. They're stripped from the title automatically.
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn accent" disabled={!(parsed.title.trim() || text.trim())} onClick={submit}>Add task</button>
      </div>
    </Modal>
    </>
  );
}
