import { useState } from 'react';
import { Plus, Edit3, Trash2, Search, CheckCircle2, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import { PriorityBadge } from '../components/common/Badge';
import QuickAddTask from '../components/mortgage/QuickAddTask';
import { clickable } from '../compass/interaction';
import { C, mono, card, pill } from '../compass/tokens';
import { fmtDate, isToday, isPast, isWithinDays } from '../utils';

const TASK_STATUSES  = ['To Do', 'In Progress', 'Done', 'Cancelled'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const TASK_TYPES     = ['Follow Up', 'Document Request', 'Application', 'Valuation', 'Settlement', 'Discharge', 'General', 'Other'];

// ─── CRM Task Form ─────────────────────────────────────────────────────────────
function TaskForm({ task, clients, onSave, onClose }) {
  const isEdit = !!task;
  const [f, setF] = useState({
    clientId:  task?.clientId  || '',
    title:     task?.title     || '',
    type:      task?.type      || '',
    priority:  task?.priority  || 'Medium',
    status:    task?.status    || 'To Do',
    dueDate:   task?.dueDate   || '',
    notes:     task?.notes     || '',
  });
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal isOpen={true} onClose={onClose} title={isEdit ? 'Edit Task' : 'Add CRM Task'} size="md">
      <div className="modal-body">
        <div className="field">
          <label>Task Title *</label>
          <input value={f.title} onChange={e => sf('title', e.target.value)} placeholder="e.g. Send pre-approval docs to Jane"/>
        </div>
        <div className="form-grid form-2">
          <div className="field">
            <label>Client</label>
            <select value={f.clientId} onChange={e => sf('clientId', e.target.value)}>
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={f.type} onChange={e => sf('type', e.target.value)}>
              <option value="">— Select —</option>
              {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-grid form-3">
          <div className="field">
            <label>Priority</label>
            <select value={f.priority} onChange={e => sf('priority', e.target.value)}>
              {TASK_PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={f.status} onChange={e => sf('status', e.target.value)}>
              {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Due Date</label>
            <input type="date" value={f.dueDate} onChange={e => sf('dueDate', e.target.value)}/>
          </div>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={f.notes} onChange={e => sf('notes', e.target.value)} placeholder="Any additional context…"/>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!f.title.trim()} onClick={() => onSave(f)}>
          {isEdit ? 'Save Changes' : 'Add Task'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Due Date Label ─────────────────────────────────────────────────────────────
// ─── Tasks ────────────────────────────────────────────────────────────────────
// Compass's list: grouped by when it is due, with up to three starred as the
// day's focus — those are what the dashboard shows.
const GROUP_ORDER = ['Overdue', 'Today', 'Tomorrow', 'Next 7 days', 'Later', 'No date'];
const MAX_FOCUS = 3;

function groupFor(dueDate) {
  if (!dueDate) return 'No date';
  if (isPast(dueDate) && !isToday(dueDate)) return 'Overdue';
  if (isToday(dueDate)) return 'Today';
  if (isWithinDays(dueDate, 1)) return 'Tomorrow';
  if (isWithinDays(dueDate, 7)) return 'Next 7 days';
  return 'Later';
}

export default function Tasks() {
  const { crmTasks, clients, addCrmTask, updateCrmTask, deleteCrmTask } = useData();
  const [search,   setSearch]   = useState('');
  const [filterSt, setFilterSt] = useState('active');
  const [filterPr, setFilterPr] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [delTask,  setDelTask]  = useState(null);
  const [starMsg,  setStarMsg]  = useState('');

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));
  const isDone = t => ['Done', 'Cancelled'].includes(t.status);

  const openTasks = crmTasks.filter(t => !isDone(t));
  const starred = openTasks.filter(t => t.focus);
  const overdueCount = openTasks.filter(t => t.dueDate && isPast(t.dueDate) && !isToday(t.dueDate)).length;

  const filtered = crmTasks.filter(t => {
    const matchSt = filterSt === 'all' || (filterSt === 'active' ? !isDone(t) : t.status === filterSt);
    const matchPr = filterPr === 'all' || t.priority === filterPr;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (t.title || '').toLowerCase().includes(q) ||
      (clientMap[t.clientId] || '').toLowerCase().includes(q) ||
      (t.type || '').toLowerCase().includes(q);
    return matchSt && matchPr && matchSearch;
  });

  const groups = GROUP_ORDER
    .map(name => ({
      name,
      items: filtered
        .filter(t => groupFor(t.dueDate) === name)
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
    }))
    .filter(g => g.items.length);

  async function handleSave(data) {
    try {
      if (editTask) { await updateCrmTask(editTask.id, data); toast.success('Task updated.'); }
      else          { await addCrmTask(data); toast.success('Task added!'); }
    } catch { toast.error('Failed to save.'); }
    setShowForm(false); setEditTask(null);
  }

  async function handleDelete(id) {
    try { await deleteCrmTask(id); toast.success('Task deleted.'); }
    catch { toast.error('Failed.'); }
    setDelTask(null);
  }

  async function toggleDone(t) {
    try { await updateCrmTask(t.id, { status: t.status === 'Done' ? 'To Do' : 'Done' }); }
    catch { toast.error('Failed.'); }
  }

  // Three is the point: a focus list you can actually finish.
  async function toggleFocus(t) {
    if (!t.focus && starred.length >= MAX_FOCUS) {
      setStarMsg(`Focus holds ${MAX_FOCUS} tasks — unstar one before starring another.`);
      return;
    }
    setStarMsg('');
    try { await updateCrmTask(t.id, { focus: !t.focus }); }
    catch { toast.error('Failed.'); }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Tasks</div>
          <div className="page-sub">
            One list with due dates and priority. Star up to three to pin them to Today.
          </div>
        </div>
        <div className="page-actions">
          <button className="btn accent" onClick={() => { setEditTask(null); setShowForm(true); }}>
            <Plus size={13}/> Add Task
          </button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 960 }}>
          <QuickAddTask autoFocus/>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
                style={{ padding: '8px 14px 8px 32px', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13, width: 200 }}/>
            </div>
            <select value={filterSt} onChange={e => setFilterSt(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13 }}>
              <option value="active">Active</option>
              <option value="all">All</option>
              {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterPr} onChange={e => setFilterPr(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13 }}>
              <option value="all">All Priorities</option>
              {TASK_PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
            {overdueCount > 0 && (
              <span style={{ ...pill(false), borderColor: 'var(--danger)', color: 'var(--danger)', cursor: 'default' }}>
                {overdueCount} overdue
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: C.muted }}>
              {openTasks.length} open · {starred.length}/{MAX_FOCUS} starred ·{' '}
              {crmTasks.filter(t => t.status === 'Done').length} done
            </span>
          </div>

          {starMsg && (
            <div style={{ padding: '11px 14px', borderRadius: 9, background: 'var(--danger-dim)', color: C.red, fontSize: 12.5 }}>
              {starMsg}
            </div>
          )}

          {groups.map(g => (
            <section key={g.name} style={{ ...card, padding: '18px 20px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--display)', fontWeight: 400, fontSize: 20 }}>{g.name}</h2>
                <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>
                  {g.items.filter(t => !isDone(t)).length} open
                </span>
              </div>

              {g.items.map(t => {
                const done = isDone(t);
                const late = !done && t.dueDate && isPast(t.dueDate) && !isToday(t.dueDate);
                return (
                  <div key={t.id} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '12px 0', borderTop: `1px solid ${C.line}`, marginTop: 8,
                  }}>
                    <button onClick={() => toggleDone(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1, color: done ? 'var(--ok)' : 'var(--ink-3)', flexShrink: 0 }}
                      title={done ? 'Mark as not done' : 'Mark as done'}>
                      {done ? <CheckCircle2 size={17}/> : <Circle size={17}/>}
                    </button>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{
                        fontSize: 13, lineHeight: 1.4,
                        color: done ? 'var(--ink-3)' : 'var(--ink)',
                        textDecoration: done ? 'line-through' : 'none',
                      }}>
                        {t.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11, color: C.muted }}>
                        {clientMap[t.clientId] && <span>{clientMap[t.clientId]}</span>}
                        <PriorityBadge priority={t.priority}/>
                        {t.type && <span>{t.type}</span>}
                      </div>
                      {t.notes && <div style={{ fontSize: 11.5, color: C.muted }}>{t.notes}</div>}
                    </div>

                    {t.dueDate && (
                      <span style={{
                        fontFamily: mono, fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase',
                        padding: '5px 9px', borderRadius: 99, whiteSpace: 'nowrap', flexShrink: 0,
                        background: late ? 'var(--danger-dim)' : 'var(--surface-3)',
                        color: late ? C.red : C.muted2,
                      }}>
                        {fmtDate(t.dueDate)}
                      </span>
                    )}

                    <div {...clickable(() => toggleFocus(t), t.focus ? 'Unstar task' : 'Star task')}
                         style={{
                           cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '1px 2px', flexShrink: 0,
                           color: t.focus ? 'var(--accent)' : 'var(--ink-4)',
                         }}>
                      {t.focus ? '★' : '☆'}
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className="icon-btn sm" onClick={() => { setEditTask(t); setShowForm(true); }}><Edit3 size={12}/></button>
                      <button className="icon-btn sm danger" onClick={() => setDelTask(t)}><Trash2 size={12}/></button>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}

          {!groups.length && (
            <EmptyState emoji="✅" title="No tasks" description="Add tasks to track follow-ups and client actions."
              actionLabel="Add Task" onAction={() => { setEditTask(null); setShowForm(true); }}/>
          )}
        </div>
      </div>

      {showForm && <TaskForm task={editTask} clients={clients} onSave={handleSave} onClose={() => { setShowForm(false); setEditTask(null); }}/>}
      <ConfirmDialog
        isOpen={!!delTask} onClose={() => setDelTask(null)}
        onConfirm={() => handleDelete(delTask?.id)}
        title="Delete Task?" message={`Delete "${delTask?.title}"?`}
        confirmLabel="Delete Task"
      />
    </>
  );
}
