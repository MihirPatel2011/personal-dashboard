import { useState, useRef, useEffect } from 'react';
import { Plus, X, Trash2, Edit3, Timer, Play, Pause, Check, Star, Circle, Tag, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { PERSONAL_TASK_PRIORITIES } from '../constants';
import { fmtFocus, fmtShortDate, isToday, isPast } from '../utils';

const CATEGORY_COLORS = [
  { bg: 'rgba(96,165,250,0.18)',  fg: '#60A5FA' },
  { bg: 'rgba(167,139,250,0.18)', fg: '#A78BFA' },
  { bg: 'rgba(52,211,153,0.18)',  fg: '#34D399' },
  { bg: 'rgba(251,146,60,0.18)',  fg: '#FB923C' },
  { bg: 'rgba(244,114,182,0.18)', fg: '#F472B6' },
  { bg: 'rgba(45,212,191,0.18)',  fg: '#2DD4BF' },
  { bg: 'rgba(251,191,36,0.18)',  fg: '#FBBF24' },
  { bg: 'rgba(239,68,68,0.18)',   fg: '#F87171' },
];

const getPri = id => PERSONAL_TASK_PRIORITIES.find(p => p.id === id);

// ─── Category Manager Modal ─────────────────────────────────────────────────
function CategoryManager({ allCategories, onAdd, onDelete, onClose }) {
  const [newLabel, setNewLabel] = useState('');
  const [colorIdx, setColorIdx] = useState(0);

  function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    const color = CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length];
    onAdd({ label, bg: color.bg, color: color.fg });
    setNewLabel(''); setColorIdx(c => (c + 1) % CATEGORY_COLORS.length);
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Manage Categories" size="sm">
      <div className="modal-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {allCategories.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '10px 0' }}>No custom categories yet.</div>
          )}
          {allCategories.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
              <span style={{ flex: 1, padding: '2px 10px', borderRadius: 99, background: c.bg, color: c.color, fontSize: 12, fontWeight: 600, display: 'inline-block' }}>{c.label}</span>
              <button className="icon-btn sm danger" onClick={() => onDelete(c.id)}><Trash2 size={12}/></button>
            </div>
          ))}
        </div>
        <div className="section-label" style={{ marginBottom: 8 }}>Add New Category</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Category name…"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13 }}/>
          <div style={{ display: 'flex', gap: 4 }}>
            {CATEGORY_COLORS.map((c, i) => (
              <button key={i} onClick={() => setColorIdx(i)}
                style={{ width: 18, height: 18, borderRadius: '50%', background: c.fg, border: colorIdx === i ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer' }}/>
            ))}
          </div>
          <button className="btn accent sm" onClick={handleAdd} disabled={!newLabel.trim()}>Add</button>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}

// ─── Task Form Modal ────────────────────────────────────────────────────────────
function TaskForm({ task, allCategories, onSave, onClose }) {
  const isEdit = !!task;
  const [title,    setTitle]    = useState(task?.title    || '');
  const [notes,    setNotes]    = useState(task?.notes    || '');
  const [priority, setPriority] = useState(task?.priority || '');
  const [category, setCategory] = useState(task?.category || '');
  const [dueDate,  setDueDate]  = useState(task?.dueDate  || '');

  return (
    <Modal isOpen={true} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'} size="md">
      <div className="modal-body">
        <div className="field">
          <label>Task *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus/>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Context, links, anything helpful…" style={{ minHeight: 70 }}/>
        </div>
        <div className="form-grid form-3" style={{ gap: 10 }}>
          <div className="field">
            <label>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="">None</option>
              {PERSONAL_TASK_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.symbol} {p.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">None</option>
              {allCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!title.trim()}
          onClick={() => onSave({ title: title.trim(), notes, priority: priority || null, category: category || null, dueDate: dueDate || null })}>
          {isEdit ? 'Save Changes' : 'Add to Inbox'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Clarify Modal ─────────────────────────────────────────────────────────────
function ClarifyModal({ task, tasks, onClassify, onClose }) {
  const [ndReason, setNdReason] = useState('');
  const [step,     setStep]     = useState('choose');
  const essential = tasks.find(t => t.status === 'essential');
  const secCount  = tasks.filter(t => t.status === 'secondary').length;

  return (
    <Modal isOpen={true} onClose={onClose} title="What is this, really?" size="sm">
      {step === 'choose' ? (
        <>
          <div className="modal-body">
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 15, fontWeight: 500, marginBottom: 12 }}>
              {task.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { key: 'essential', icon: '⭐', title: 'Make this my Essential', sub: 'The ONE most important thing today', color: 'var(--accent-border)', textColor: 'var(--accent)', bg: 'var(--accent-dim)' },
                { key: 'secondary', icon: '○',  title: 'Secondary',              sub: `Important, but not top priority · ${secCount}/3 used` },
                { key: 'nd',        icon: '⊘',  title: 'Not Doing',              sub: 'Intentionally saying no' },
                { key: 'delete',    icon: '🗑', title: 'Delete it',             sub: "It doesn't deserve attention" },
              ].map(opt => (
                <button key={opt.key}
                  disabled={opt.key === 'secondary' && secCount >= 3}
                  onClick={() => { if (opt.key === 'nd') { setStep('nd'); return; } onClassify(task, opt.key, essential); onClose(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', border: `1.5px solid ${opt.color || 'var(--border)'}`, borderRadius: 'var(--r-lg)', background: opt.bg || 'var(--surface-2)', cursor: 'pointer', textAlign: 'left', opacity: opt.key === 'secondary' && secCount >= 3 ? .4 : 1, transition: 'opacity .12s' }}>
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <span style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: opt.textColor || 'var(--ink)', fontSize: 14 }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{opt.sub}</div>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="modal-foot"><button className="btn ghost" onClick={onClose}>Cancel</button></div>
        </>
      ) : (
        <>
          <div className="modal-body">
            <p style={{ color: 'var(--ink-2)', lineHeight: 1.6 }}>Why are you intentionally not doing this?</p>
            <div className="field">
              <label>Reason (optional)</label>
              <input value={ndReason} onChange={e => setNdReason(e.target.value)}
                placeholder="e.g. Not aligned with my current goal…" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') { onClassify(task, 'nd', null, ndReason); onClose(); }}}/>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={() => setStep('choose')}>Back</button>
            <button className="btn primary" onClick={() => { onClassify(task, 'nd', null, ndReason); onClose(); }}>Add to Not Doing</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Focus Timer ────────────────────────────────────────────────────────────────
function FocusOverlay({ task, onEnd, onComplete }) {
  const [minutes,  setMinutes]  = useState(25);
  const [started,  setStarted]  = useState(false);
  const [paused,   setPaused]   = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const intervalRef = useRef(null);
  const startRef    = useRef(0);
  const pausedAtRef = useRef(0);
  const totalPaused = useRef(0);

  function start() {
    startRef.current = Date.now(); totalPaused.current = 0;
    setStarted(true);
    intervalRef.current = setInterval(() => setElapsed(Date.now() - startRef.current - totalPaused.current), 500);
  }
  function togglePause() {
    if (paused) { totalPaused.current += Date.now() - pausedAtRef.current; setPaused(false); }
    else        { pausedAtRef.current = Date.now(); setPaused(true); }
  }
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const dur = minutes * 60_000;
  const remaining = Math.max(0, dur - elapsed);
  const progress  = started ? Math.min(1, elapsed / dur) : 0;
  const circ  = 2 * Math.PI * 90;
  const isDone = started && remaining === 0;

  return (
    <div className="focus-overlay">
      <div className="focus-task-label"><Star size={13}/> Focus Session</div>
      <div className="focus-task-name">{task.title}</div>
      {!started ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            {[15, 25, 45, 60].map(m => (
              <button key={m} className={`btn${minutes === m ? ' accent' : ''}`} onClick={() => setMinutes(m)}>{m}m</button>
            ))}
          </div>
          <div className="focus-controls">
            <button className="btn ghost lg" onClick={onEnd}><X size={15}/> Cancel</button>
            <button className="btn accent lg" onClick={start}><Play size={15}/> Begin {minutes} min</button>
          </div>
        </>
      ) : (
        <>
          <div className="focus-ring-wrap">
            <svg viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="var(--surface-3)" strokeWidth="8"/>
              <circle cx="100" cy="100" r="90" fill="none"
                stroke={isDone ? 'var(--ok)' : 'var(--accent)'}
                strokeWidth="8" strokeDasharray={circ}
                strokeDashoffset={circ * (1 - progress)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset .5s linear' }}/>
            </svg>
            <div className="focus-ring-center">
              <div className="focus-time" style={{ color: isDone ? 'var(--ok)' : undefined }}>{fmtFocus(remaining)}</div>
              <div className="focus-time-sub">{isDone ? 'Done!' : paused ? 'Paused' : 'Remaining'}</div>
            </div>
          </div>
          <div className="focus-controls">
            {!isDone && <button className="btn lg" onClick={togglePause}>{paused ? <><Play size={15}/> Resume</> : <><Pause size={15}/> Pause</>}</button>}
            <button className="btn accent lg" onClick={onComplete}><Check size={15}/> {isDone ? 'Complete & Close' : 'Mark Complete'}</button>
          </div>
          {!isDone && <button style={{ marginTop: 20, color: 'var(--ink-4)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }} onClick={onEnd}>End session without completing</button>}
        </>
      )}
    </div>
  );
}

// ─── Main Tasks Page ────────────────────────────────────────────────────────────
export default function Tasks() {
  const { personalTasks, addPersonalTask, updatePersonalTask, deletePersonalTask,
          taskCategories, addTaskCategory, deleteTaskCategory } = useData();

  const [showForm,      setShowForm]     = useState(false);
  const [editTask,      setEditTask]     = useState(null);
  const [clarifyTask,   setClarify]      = useState(null);
  const [focusTask,     setFocusTask]    = useState(null);
  const [delTask,       setDelTask]      = useState(null);
  const [inboxInput,    setInboxInput]   = useState('');
  const [showDone,      setShowDone]     = useState(false);
  const [showND,        setShowND]       = useState(false);
  const [showCatMgr,    setShowCatMgr]  = useState(false);
  // Inline inbox editing
  const [inboxEditId,   setInboxEditId]  = useState(null);
  const [inboxEditVal,  setInboxEditVal] = useState('');

  const essential = personalTasks.find(t => t.status === 'essential');
  const secondary = personalTasks.filter(t => t.status === 'secondary');
  const inbox     = personalTasks.filter(t => t.status === 'inbox');
  const nd        = personalTasks.filter(t => t.status === 'nd');
  const done      = personalTasks.filter(t => t.status === 'done').sort((a,b) => b.updatedAt - a.updatedAt);

  // All categories: built-in defaults + custom
  const builtInCategories = [
    { id: 'work',     label: 'Work',     bg: 'rgba(96,165,250,0.15)',  color: '#60A5FA' },
    { id: 'personal', label: 'Personal', bg: 'rgba(244,114,182,0.15)', color: '#F472B6' },
    { id: 'finance',  label: 'Finance',  bg: 'rgba(52,211,153,0.15)',  color: '#34D399' },
    { id: 'mortgage', label: 'Mortgage', bg: 'rgba(45,212,191,0.15)',  color: '#2DD4BF' },
    { id: 'health',   label: 'Health',   bg: 'rgba(251,146,60,0.15)',  color: '#FB923C' },
    { id: 'learning', label: 'Learning', bg: 'rgba(167,139,250,0.15)', color: '#A78BFA' },
  ];
  const allCategories = [...builtInCategories, ...taskCategories];
  const getCat = id => allCategories.find(c => c.id === id);

  async function addInbox(title) {
    if (!title.trim()) return;
    try { await addPersonalTask({ title: title.trim(), status: 'inbox' }); }
    catch { toast.error('Failed to add task.'); }
    setInboxInput('');
  }

  async function saveInboxEdit(task) {
    if (!inboxEditVal.trim()) return;
    try { await updatePersonalTask(task.id, { title: inboxEditVal.trim() }); toast.success('Updated.'); }
    catch { toast.error('Failed.'); }
    setInboxEditId(null); setInboxEditVal('');
  }

  async function classify(task, status, currentEssential, ndReason) {
    try {
      if (status === 'essential' && currentEssential)
        await updatePersonalTask(currentEssential.id, { status: 'secondary' });
      const updates = { status };
      if (status === 'nd' && ndReason) updates.ndReason = ndReason;
      await updatePersonalTask(task.id, updates);
      toast.success(status === 'essential' ? '⭐ Set as your Essential' : status === 'nd' ? 'Moved to Not Doing' : 'Task classified');
    } catch { toast.error('Failed to update.'); }
  }

  async function complete(task) {
    try { await updatePersonalTask(task.id, { status: 'done' }); toast.success('Task completed! 🎉'); }
    catch { toast.error('Failed.'); }
  }

  async function uncomplete(task) {
    try { await updatePersonalTask(task.id, { status: 'inbox' }); }
    catch { toast.error('Failed.'); }
  }

  async function handleSave(data) {
    try {
      if (editTask) { await updatePersonalTask(editTask.id, data); toast.success('Task updated.'); }
      else          { await addPersonalTask({ ...data, status: 'inbox' }); toast.success('Task added.'); }
    } catch { toast.error('Failed.'); }
    setShowForm(false); setEditTask(null);
  }

  async function handleDelete(task) {
    try { await deletePersonalTask(task.id); toast.success('Deleted.'); }
    catch { toast.error('Failed.'); }
    setDelTask(null);
  }

  function TaskRow({ task, showComplete = true, showActions = true }) {
    const pri     = getPri(task.priority);
    const cat     = getCat(task.category);
    const overdue = task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate);
    const dueToday = task.dueDate && isToday(task.dueDate);
    return (
      <div className={`task-row${task.status === 'done' ? ' done' : ''}`}>
        {showComplete && (
          <div className={`task-check${task.status === 'done' ? ' checked' : ''}`}
            onClick={() => task.status === 'done' ? uncomplete(task) : complete(task)}>
            {task.status === 'done' && <Check size={10}/>}
          </div>
        )}
        <div className="task-body">
          <div className="task-title">{task.title}</div>
          <div className="task-meta">
            {pri && <span style={{ fontSize: 11, fontWeight: 600, color: pri.color }}>{pri.symbol}</span>}
            {cat && <span style={{ fontSize: 11, fontWeight: 500, padding: '1px 7px', borderRadius: 99, background: cat.bg, color: cat.color }}>{cat.label}</span>}
            {task.dueDate && (
              <span style={{ fontSize: 11, color: overdue ? 'var(--danger)' : dueToday ? 'var(--warn)' : 'var(--ink-3)', fontWeight: overdue || dueToday ? 600 : 400 }}>
                {overdue ? '⚠ Overdue' : dueToday ? 'Due today' : fmtShortDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>
        {showActions && (
          <div className="task-actions">
            {task.status !== 'done' && <button className="icon-btn sm" title="Focus Timer" onClick={() => setFocusTask(task)}><Timer size={13}/></button>}
            <button className="icon-btn sm" title="Edit" onClick={() => { setEditTask(task); setShowForm(true); }}><Edit3 size={13}/></button>
            <button className="icon-btn sm danger" title="Delete" onClick={() => setDelTask(task)}><Trash2 size={13}/></button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {focusTask && <FocusOverlay task={focusTask} onEnd={() => setFocusTask(null)} onComplete={() => { complete(focusTask); setFocusTask(null); }}/>}

      <div className="page-header">
        <div>
          <div className="page-title">Task Manager</div>
          <div className="page-sub">{essential ? '1 essential' : 'No essential set'} · {secondary.length} secondary · {inbox.length} in inbox</div>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={() => setShowCatMgr(true)} title="Manage Categories"><Tag size={14}/> Categories</button>
          <button className="btn accent" onClick={() => { setEditTask(null); setShowForm(true); }}><Plus size={14}/> Add Task</button>
        </div>
      </div>

      <div className="tasks-layout">
        <div className="tasks-main">
          {/* Essential */}
          <div className="task-section">
            <div className="essential-card">
              <div className="ess-card-label"><Star size={12}/> Essential · The ONE thing</div>
              {essential ? (
                <>
                  <div className="ess-card-title">{essential.title}</div>
                  <div className="ess-card-actions">
                    <button className="btn sm" style={{ background: 'var(--ok)', color: '#0B0A08', borderColor: 'var(--ok)' }} onClick={() => complete(essential)}><Check size={13}/> Complete</button>
                    <button className="btn sm" onClick={() => setFocusTask(essential)}><Timer size={13}/> Focus</button>
                    <button className="btn sm ghost" onClick={() => { setEditTask(essential); setShowForm(true); }}><Edit3 size={13}/></button>
                    <button className="icon-btn sm danger" onClick={() => setDelTask(essential)}><Trash2 size={13}/></button>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--ink-3)', fontSize: 14, fontStyle: 'italic' }}>
                  No essential set — clarify a task from your inbox to make it your #1 priority.
                </div>
              )}
            </div>
          </div>

          {/* Secondary */}
          <div className="task-section">
            <div className="task-section-label"><Circle size={12}/> Secondary ({secondary.length}/3)</div>
            {secondary.map(t => <TaskRow key={t.id} task={t}/>)}
            {secondary.length < 3 && (
              <div className="task-add-row" onClick={() => { setEditTask(null); setShowForm(true); }}>
                <Plus size={14} style={{ color: 'var(--ink-4)', flexShrink: 0 }}/>
                <input className="task-add-input" placeholder="Add secondary task…" readOnly/>
              </div>
            )}
          </div>

          {/* Inbox */}
          <div className="task-section">
            <div className="task-section-label">📥 Inbox ({inbox.length})</div>
            {inbox.map(t => {
              const isEditing = inboxEditId === t.id;
              return (
                <div key={t.id} className="inbox-row">
                  <div className="inbox-dot"/>
                  {isEditing ? (
                    <input
                      className="task-add-input"
                      value={inboxEditVal}
                      autoFocus
                      onChange={e => setInboxEditVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveInboxEdit(t);
                        if (e.key === 'Escape') { setInboxEditId(null); setInboxEditVal(''); }
                      }}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <div className="inbox-title">{t.title}</div>
                  )}
                  {isEditing ? (
                    <button className="btn sm accent" onClick={() => saveInboxEdit(t)}>Save</button>
                  ) : (
                    <>
                      <button className="icon-btn sm" title="Edit" onClick={() => { setInboxEditId(t.id); setInboxEditVal(t.title); }}><Edit3 size={12}/></button>
                      <button className="clarify-btn" onClick={() => setClarify(t)}>Clarify →</button>
                      <button className="icon-btn sm danger" onClick={() => setDelTask(t)}><Trash2 size={12}/></button>
                    </>
                  )}
                </div>
              );
            })}
            <div className="task-add-row" onClick={e => e.currentTarget.querySelector('input')?.focus()}>
              <Plus size={14} style={{ color: 'var(--ink-4)', flexShrink: 0 }}/>
              <input className="task-add-input" value={inboxInput} onChange={e => setInboxInput(e.target.value)}
                placeholder="Capture a task…"
                onKeyDown={e => { if (e.key === 'Enter') addInbox(inboxInput); }}/>
              {inboxInput && <button className="btn sm accent" onClick={() => addInbox(inboxInput)}>Add</button>}
            </div>
          </div>
        </div>

        {/* Side */}
        <div className="tasks-side">
          <div style={{ marginBottom: 24 }}>
            <button className="task-section-label" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', width: '100%', marginBottom: 10 }}
              onClick={() => setShowND(!showND)}>
              ⊘ Not Doing ({nd.length}) {showND ? '↑' : '↓'}
            </button>
            {showND && nd.map(t => (
              <div key={t.id} style={{ padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 6 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'line-through' }}>{t.title}</div>
                {t.ndReason && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3, fontStyle: 'italic' }}>{t.ndReason}</div>}
              </div>
            ))}
          </div>
          <div>
            <button className="task-section-label" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', width: '100%', marginBottom: 10 }}
              onClick={() => setShowDone(!showDone)}>
              ✓ Completed ({done.length}) {showDone ? '↑' : '↓'}
            </button>
            {showDone && done.slice(0, 30).map(t => <TaskRow key={t.id} task={t} showComplete={true} showActions={false}/>)}
          </div>
        </div>
      </div>

      {showForm && <TaskForm task={editTask} allCategories={allCategories} onSave={handleSave} onClose={() => { setShowForm(false); setEditTask(null); }}/>}
      {clarifyTask && <ClarifyModal task={clarifyTask} tasks={personalTasks} onClassify={(t, s, e, r) => classify(t, s, e, r)} onClose={() => setClarify(null)}/>}
      {showCatMgr && (
        <CategoryManager
          allCategories={taskCategories}
          onAdd={data => addTaskCategory(data)}
          onDelete={id => deleteTaskCategory(id)}
          onClose={() => setShowCatMgr(false)}
        />
      )}
      <ConfirmDialog isOpen={!!delTask} onClose={() => setDelTask(null)} onConfirm={() => handleDelete(delTask)}
        title="Delete Task?" message={`Delete "${delTask?.title}"?`} confirmLabel="Delete"/>
    </>
  );
}
