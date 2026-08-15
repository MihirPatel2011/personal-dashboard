import { useState } from 'react';
import { Plus, Edit3, Trash2, Search, CheckCircle2, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { PriorityBadge } from '../../components/common/Badge';
import QuickAddTask from '../../components/mortgage/QuickAddTask';
import { fmtDate, isToday, isPast, isWithinDays } from '../../utils';

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
function DueDateLabel({ date, status }) {
  if (!date || ['Done', 'Cancelled'].includes(status)) return null;
  const overdue = isPast(date) && !isToday(date);
  const today   = isToday(date);
  const soon    = !overdue && !today && isWithinDays(date, 3);

  const color  = overdue ? 'var(--danger)' : today ? 'var(--tasks)' : soon ? 'var(--warn)' : 'var(--ink-3)';
  const label  = overdue ? `Overdue · ${fmtDate(date)}` : today ? 'Due today' : fmtDate(date);

  return <span style={{ fontSize: 11, color, fontWeight: overdue || today ? 600 : 400 }}>{label}</span>;
}

// ─── CRM Tasks Page ────────────────────────────────────────────────────────────
export default function CRMTasks() {
  const { crmTasks, clients, addCrmTask: addCRMTask, updateCrmTask: updateCRMTask, deleteCrmTask: deleteCRMTask } = useData();
  const [search,     setSearch]    = useState('');
  const [filterSt,   setFilterSt]  = useState('active');
  const [filterPr,   setFilterPr]  = useState('all');
  const [showForm,   setShowForm]  = useState(false);
  const [editTask,   setEditTask]  = useState(null);
  const [delTask,    setDelTask]   = useState(null);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const filtered = crmTasks.filter(t => {
    const active = !['Done', 'Cancelled'].includes(t.status);
    const matchSt = filterSt === 'all' || (filterSt === 'active' ? active : t.status === filterSt);
    const matchPr = filterPr === 'all' || t.priority === filterPr;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (t.title || '').toLowerCase().includes(q) ||
      (clientMap[t.clientId] || '').toLowerCase().includes(q) ||
      (t.type || '').toLowerCase().includes(q);
    return matchSt && matchPr && matchSearch;
  }).sort((a, b) => {
    // Sort: overdue first, then by due date, then by priority weight
    const prW = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    const aOver = isPast(a.dueDate) && !isToday(a.dueDate);
    const bOver = isPast(b.dueDate) && !isToday(b.dueDate);
    if (aOver !== bOver) return aOver ? -1 : 1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate) return -1; if (b.dueDate) return 1;
    return (prW[a.priority] || 2) - (prW[b.priority] || 2);
  });

  const overdue = crmTasks.filter(t => !['Done', 'Cancelled'].includes(t.status) && isPast(t.dueDate) && !isToday(t.dueDate)).length;

  async function handleSave(data) {
    try {
      if (editTask) { await updateCRMTask(editTask.id, data); toast.success('Task updated.'); }
      else          { await addCRMTask(data); toast.success('Task added!'); }
    } catch { toast.error('Failed to save.'); }
    setShowForm(false); setEditTask(null);
  }

  async function handleDelete(id) {
    try { await deleteCRMTask(id); toast.success('Task deleted.'); }
    catch { toast.error('Failed.'); }
    setDelTask(null);
  }

  async function toggleDone(task) {
    const newStatus = task.status === 'Done' ? 'To Do' : 'Done';
    try { await updateCRMTask(task.id, { ...task, status: newStatus }); }
    catch { toast.error('Failed.'); }
  }

  return (
    <>
      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
              style={{ paddingLeft: 32, padding: '8px 14px 8px 32px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13, width: 200 }}/>
          </div>
          <select value={filterSt} onChange={e => setFilterSt(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13 }}>
            <option value="active">Active</option>
            <option value="all">All</option>
            {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterPr} onChange={e => setFilterPr(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13 }}>
            <option value="all">All Priorities</option>
            {TASK_PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          {overdue > 0 && (
            <span style={{ fontSize: 12.5, background: 'var(--danger-dim)', color: 'var(--danger)', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
              {overdue} overdue
            </span>
          )}
        </div>
        <button className="btn accent sm" onClick={() => { setEditTask(null); setShowForm(true); }}>
          <Plus size={13}/> Add Task
        </button>
      </div>

      <div style={{ padding: '20px 28px' }}>
        <QuickAddTask autoFocus/>
        {filtered.length === 0 ? (
          <EmptyState emoji="✅" title="No CRM tasks" description="Add tasks to track follow-ups and client actions."
            actionLabel="Add Task" onAction={() => { setEditTask(null); setShowForm(true); }}/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(t => {
              const done    = t.status === 'Done';
              const overdue = !done && isPast(t.dueDate) && !isToday(t.dueDate);
              return (
                <div key={t.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                    background: 'var(--surface)', border: `1px solid ${overdue ? 'var(--danger-dim)' : 'var(--border)'}`,
                    borderRadius: 'var(--r)', opacity: done ? 0.55 : 1
                  }}>
                  <button
                    onClick={() => toggleDone(t)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginTop: 1, color: done ? 'var(--ok)' : 'var(--ink-3)', flexShrink: 0 }}>
                    {done ? <CheckCircle2 size={16}/> : <Circle size={16}/>}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', textDecoration: done ? 'line-through' : 'none' }}>{t.title}</span>
                      <PriorityBadge priority={t.priority}/>
                      {t.type && <span className="badge" style={{ fontSize: 10.5, background: 'var(--surface-2)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>{t.type}</span>}
                      {t.status !== 'To Do' && (
                        <span className="badge" style={{ fontSize: 10.5, background: 'var(--surface-2)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>{t.status}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {clientMap[t.clientId] && (
                        <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{clientMap[t.clientId]}</span>
                      )}
                      <DueDateLabel date={t.dueDate} status={t.status}/>
                    </div>
                    {t.notes && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>{t.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="icon-btn sm" onClick={() => { setEditTask(t); setShowForm(true); }}><Edit3 size={12}/></button>
                    <button className="icon-btn sm danger" onClick={() => setDelTask(t)}><Trash2 size={12}/></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
