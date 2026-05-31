// src/pages/Tasks.jsx — GTD / Things 3 style task manager
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus, Sun, Calendar, Layers, Bookmark, BookOpen,
  FolderOpen, Trash2, Edit3, Check, X,
  Settings2, Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Modal from '../components/common/Modal';
import { fmtShortDate, isToday, isPast } from '../utils';

// ─── Area color palette ──────────────────────────────────────────────────────
const AREA_COLORS = [
  '#60A5FA', '#A78BFA', '#34D399', '#FB923C', '#F472B6',
  '#2DD4BF', '#FBBF24', '#818CF8', '#FB7185', '#22D3EE',
  '#4ADE80', '#E879F9',
];

// ─── Status helpers ───────────────────────────────────────────────────────────
function getEffStatus(t) {
  const s = t.status;
  if (s === 'essential' || s === 'secondary') return 'anytime';
  if (s === 'nd') return 'someday';
  if (s === 'done') return 'logbook';
  if (!s) return 'inbox';
  return s; // 'inbox' | 'anytime' | 'someday' | 'logbook'
}
function inToday(t) {
  const s = t.status;
  if (['logbook', 'done', 'nd', 'someday'].includes(s)) return false;
  if (s === 'essential' || s === 'secondary') return true;
  return !!(t.isToday || isToday(t.deadline));
}
function inUpcoming(t) {
  // Logbook / someday / legacy-done never appear in upcoming
  if (['logbook', 'done', 'nd', 'someday'].includes(t.status)) return false;
  // Items that are "today" don't also show in upcoming
  if (inToday(t)) return false;
  if (!t.deadline) return false;
  const d = new Date(t.deadline + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return d > today;
}

// ─── Task Form Modal ──────────────────────────────────────────────────────────
function TaskFormModal({ task, defaultView, defaultProjectId, projects, areas, onSave, onClose }) {
  const isEdit = !!task;
  function initStatus() {
    if (task?.status) {
      const s = task.status;
      if (s === 'essential' || s === 'secondary') return 'anytime';
      if (s === 'nd') return 'someday';
      if (s === 'done') return 'logbook';
      return s;
    }
    if (defaultView === 'someday') return 'someday';
    if (defaultView === 'logbook') return 'logbook';
    if (defaultView === 'inbox')   return 'inbox';
    return 'anytime';
  }
  const todayStr    = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [f, setF] = useState({
    title:     task?.title     || '',
    notes:     task?.notes     || '',
    deadline:  task?.deadline  || '',
    projectId: task?.projectId || defaultProjectId || '',
    area:      task?.area      || '',
    tags:      task?.tags      || [],
    isToday:   task ? !!(task.isToday || task.status === 'essential' || task.status === 'secondary') : (defaultView === 'today'),
    status:    initStatus(),
  });
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [tagInput, setTagInput] = useState('');

  function addTag(raw) {
    const t = raw.trim().replace(/^#/, '');
    if (!t || f.tags.includes(t)) { setTagInput(''); return; }
    sf('tags', [...f.tags, t]);
    setTagInput('');
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'} size="md">
      <div className="modal-body">
        <div className="field">
          <label>Title *</label>
          <input value={f.title} onChange={e => sf('title', e.target.value)}
            placeholder="What needs to be done?" autoFocus/>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={f.notes} onChange={e => sf('notes', e.target.value)}
            placeholder="Extra context, links…" style={{ minHeight: 60 }}/>
        </div>
        <div className="field">
          <label>Deadline</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={f.deadline} onChange={e => sf('deadline', e.target.value)} style={{ flex: 1, minWidth: 140 }}/>
            <button type="button" className="btn ghost sm" onClick={() => sf('deadline', todayStr)} style={{ flexShrink: 0 }}>Today</button>
            <button type="button" className="btn ghost sm" onClick={() => sf('deadline', tomorrowStr)} style={{ flexShrink: 0 }}>Tomorrow</button>
            <button type="button" className="btn ghost sm" onClick={() => sf('deadline', nextWeekStr)} style={{ flexShrink: 0 }}>Next week</button>
          </div>
        </div>
        <div className="form-grid form-2">
          <div className="field">
            <label>Project</label>
            <select value={f.projectId} onChange={e => sf('projectId', e.target.value)}>
              <option value="">— None —</option>
              {projects.filter(p => p.status !== 'completed').map(p =>
                <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Area</label>
            <select value={f.area} onChange={e => sf('area', e.target.value)}>
              <option value="">— None —</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 10px', minHeight: 38 }}>
            {f.tags.map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--surface-3)', borderRadius: 99, fontSize: 11, color: 'var(--ink-2)', fontWeight: 500 }}>
                #{t}
                <button onClick={() => sf('tags', f.tags.filter(x => x !== t))} style={{ color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}><X size={10}/></button>
              </span>
            ))}
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
                if (e.key === 'Backspace' && !tagInput && f.tags.length) sf('tags', f.tags.slice(0, -1));
              }}
              placeholder={f.tags.length ? '' : 'Add tags (Enter)…'}
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink)', minWidth: 80, flex: 1 }}/>
          </div>
        </div>
        <div className="form-grid form-2">
          <div className="field">
            <label>Bucket</label>
            <select value={f.status} onChange={e => sf('status', e.target.value)}>
              <option value="inbox">Inbox</option>
              <option value="anytime">Anytime</option>
              <option value="someday">Someday</option>
              <option value="logbook">Logbook</option>
            </select>
          </div>
          <div className="field" style={{ justifyContent: 'flex-end', paddingBottom: 2 }}>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={f.isToday} onChange={e => sf('isToday', e.target.checked)}
                style={{ width: 14, height: 14, cursor: 'pointer' }}/>
              ☀️ Pin to Today
            </label>
          </div>
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

// ─── Project Form Modal ───────────────────────────────────────────────────────
function ProjectFormModal({ project, areas, onSave, onClose }) {
  const isEdit = !!project;
  const [f, setF] = useState({
    title:    project?.title    || '',
    notes:    project?.notes    || '',
    area:     project?.area     || '',
    deadline: project?.deadline || '',
    status:   project?.status   || 'active',
  });
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal isOpen={true} onClose={onClose} title={isEdit ? 'Edit Project' : 'New Project'} size="sm">
      <div className="modal-body">
        <div className="field">
          <label>Title *</label>
          <input value={f.title} onChange={e => sf('title', e.target.value)} placeholder="Project name…" autoFocus/>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={f.notes} onChange={e => sf('notes', e.target.value)} placeholder="What is this about?" style={{ minHeight: 60 }}/>
        </div>
        <div className="form-grid form-2">
          <div className="field">
            <label>Area</label>
            <select value={f.area} onChange={e => sf('area', e.target.value)}>
              <option value="">— None —</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Deadline</label>
            <input type="date" value={f.deadline} onChange={e => sf('deadline', e.target.value)}/>
          </div>
        </div>
        <div className="field">
          <label>Status</label>
          <select value={f.status} onChange={e => sf('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!f.title.trim()} onClick={() => onSave(f)}>
          {isEdit ? 'Save' : 'Create Project'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Color Swatches (shared) ─────────────────────────────────────────────────
function ColorSwatches({ selected, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
      {AREA_COLORS.map(c => (
        <button
          key={c}
          onMouseDown={e => { e.preventDefault(); onChange(c); }}
          style={{
            width: 22, height: 22, borderRadius: '50%', background: c, border: 'none',
            outline: selected === c ? `2px solid white` : '2px solid transparent',
            boxShadow: selected === c ? `0 0 0 3px ${c}` : 'none',
            cursor: 'pointer', flexShrink: 0, transition: 'all .12s',
          }}
        />
      ))}
    </div>
  );
}

// ─── Area Manager Modal ───────────────────────────────────────────────────────
function AreaManagerModal({ areas, onAdd, onUpdate, onDelete, onClose }) {
  const [newLabel,  setNewLabel]  = useState('');
  const [newColor,  setNewColor]  = useState(AREA_COLORS[0]);
  const [editId,    setEditId]    = useState(null);
  const [editVal,   setEditVal]   = useState('');
  const [editColor, setEditColor] = useState(AREA_COLORS[0]);

  function commitEdit(id) {
    onUpdate(id, { label: editVal, color: editColor });
    setEditId(null);
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Manage Areas" size="sm">
      <div className="modal-body">
        {/* Existing areas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
          {areas.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.6 }}>
              Areas group your projects by life domain — e.g. Work, Personal, Health.
            </p>
          )}
          {areas.map(a => (
            <div key={a.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 12px' }}>
              {editId === a.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(a.id); if (e.key === 'Escape') setEditId(null); }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 13, color: 'var(--ink)', outline: 'none', width: '100%' }}/>
                  <ColorSwatches selected={editColor} onChange={setEditColor}/>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn ghost sm" onClick={() => setEditId(null)}>Cancel</button>
                    <button className="btn accent sm" onClick={() => commitEdit(a.id)}>Save</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: a.color || AREA_COLORS[0], flexShrink: 0 }}/>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{a.label}</span>
                  <button className="icon-btn sm" onClick={() => { setEditId(a.id); setEditVal(a.label); setEditColor(a.color || AREA_COLORS[0]); }}><Edit3 size={12}/></button>
                  <button className="icon-btn sm danger" onClick={() => onDelete(a.id)}><Trash2 size={12}/></button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* New area form */}
        <div className="section-label" style={{ marginBottom: 10 }}>New Area</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. Work, Health, Personal…"
              onKeyDown={e => { if (e.key === 'Enter' && newLabel.trim()) { onAdd({ label: newLabel.trim(), color: newColor }); setNewLabel(''); setNewColor(AREA_COLORS[0]); } }}
              style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13, outline: 'none' }}/>
            <button className="btn accent sm" disabled={!newLabel.trim()}
              onClick={() => { onAdd({ label: newLabel.trim(), color: newColor }); setNewLabel(''); setNewColor(AREA_COLORS[0]); }}>
              Add
            </button>
          </div>
          <ColorSwatches selected={newColor} onChange={setNewColor}/>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────
function TaskDetail({ task, projects, areas, onUpdate, onDelete, onClose }) {
  const [title,      setTitle]      = useState(task.title);
  const [notes,      setNotes]      = useState(task.notes || '');
  const [checkInput, setCheckInput] = useState('');

  const save = useCallback((field, value) => onUpdate(task.id, { [field]: value }), [task.id, onUpdate]);

  const checklist = task.checklist || [];
  const doneCount = checklist.filter(i => i.done).length;
  const tags      = task.tags || [];
  const eff       = getEffStatus(task);
  const isDone    = eff === 'logbook';

  function addCheckItem() {
    if (!checkInput.trim()) return;
    const item = { id: Date.now().toString(36), title: checkInput.trim(), done: false };
    onUpdate(task.id, { checklist: [...checklist, item] });
    setCheckInput('');
  }

  function toggleCheck(itemId) {
    onUpdate(task.id, { checklist: checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i) });
  }

  function deleteCheck(itemId) {
    onUpdate(task.id, { checklist: checklist.filter(i => i.id !== itemId) });
  }

  return (
    <div className="tasks-detail">
      {/* Header */}
      <div className="tasks-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className={`tasks-detail-check${isDone ? ' done' : ''}`}
            onClick={() => onUpdate(task.id, { status: isDone ? 'anytime' : 'logbook', completedAt: isDone ? null : Date.now() })}>
            {isDone && <Check size={10} strokeWidth={3}/>}
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>
            {isDone ? 'Completed ✓' : 'Mark complete'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="icon-btn sm danger" onClick={onDelete}><Trash2 size={13}/></button>
          <button className="icon-btn sm" onClick={onClose}><X size={13}/></button>
        </div>
      </div>

      {/* Body */}
      <div className="tasks-detail-body">
        {/* Title */}
        <textarea
          className={`tasks-detail-title${isDone ? ' done' : ''}`}
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onBlur={() => title.trim() && title !== task.title && save('title', title.trim())}
          rows={1}
          style={{ marginBottom: 8 }}
        />

        {/* Notes */}
        <textarea
          className="tasks-detail-notes"
          placeholder="Notes…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => notes !== (task.notes || '') && save('notes', notes)}
          style={{ marginBottom: 16 }}
        />

        {/* Field rows */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* Deadline + Today toggle */}
          <div className="tasks-detail-field">
            <span className="tasks-detail-field-label">Deadline</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input type="date" value={task.deadline || ''} onChange={e => save('deadline', e.target.value || null)}
                style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', color: (isPast(task.deadline) && !isToday(task.deadline) && task.deadline) ? 'var(--danger)' : 'var(--ink-2)', flex: 1 }}/>
              <button
                onClick={() => save('isToday', !task.isToday)}
                style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, background: task.isToday ? 'var(--tasks-dim)' : 'var(--surface-3)', color: task.isToday ? 'var(--tasks)' : 'var(--ink-4)', border: `1px solid ${task.isToday ? 'var(--tasks-border)' : 'transparent'}`, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all .15s', flexShrink: 0 }}>
                ☀ Today
              </button>
            </div>
          </div>
          {/* Project */}
          <div className="tasks-detail-field">
            <span className="tasks-detail-field-label">Project</span>
            <select value={task.projectId || ''} onChange={e => save('projectId', e.target.value || null)}
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit', flex: 1 }}>
              <option value="">— None —</option>
              {projects.filter(p => p.status !== 'completed').map(p =>
                <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          {/* Area */}
          <div className="tasks-detail-field">
            <span className="tasks-detail-field-label">Area</span>
            <select value={task.area || ''} onChange={e => save('area', e.target.value || null)}
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit', flex: 1 }}>
              <option value="">— None —</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          {/* Bucket */}
          <div className="tasks-detail-field">
            <span className="tasks-detail-field-label">Bucket</span>
            <select value={eff} onChange={e => save('status', e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit', flex: 1 }}>
              <option value="inbox">Inbox</option>
              <option value="anytime">Anytime</option>
              <option value="someday">Someday</option>
              <option value="logbook">Logbook</option>
            </select>
          </div>
          {/* Tags */}
          {tags.length > 0 && (
            <div className="tasks-detail-field" style={{ flexWrap: 'wrap', alignItems: 'flex-start', gap: 6 }}>
              <span className="tasks-detail-field-label">Tags</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                {tags.map(t => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', background: 'var(--surface-3)', borderRadius: 99, fontSize: 11, color: 'var(--ink-2)' }}>
                    #{t}
                    <button onClick={() => save('tags', tags.filter(x => x !== t))} style={{ color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}><X size={9}/></button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="tasks-checklist">
          <div className="tasks-checklist-header">
            Checklist {checklist.length > 0 && <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>({doneCount}/{checklist.length})</span>}
          </div>
          {checklist.map(item => (
            <div key={item.id} className={`tasks-ci${item.done ? ' done' : ''}`}>
              <button className={`tasks-ci-check${item.done ? ' done' : ''}`} onClick={() => toggleCheck(item.id)}>
                {item.done && <Check size={8} strokeWidth={3}/>}
              </button>
              <span className="tasks-ci-title">{item.title}</span>
              <button className="icon-btn sm danger tasks-ci-del" onClick={() => deleteCheck(item.id)}><X size={9}/></button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, border: '1px dashed var(--border-strong)', flexShrink: 0 }}/>
            <input value={checkInput} onChange={e => setCheckInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCheckItem(); }}
              placeholder="Add checklist item…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink)', fontFamily: 'inherit' }}/>
          </div>
        </div>

        {/* Timestamps */}
        <div style={{ marginTop: 20, fontSize: 11, color: 'var(--ink-4)', lineHeight: 2 }}>
          {task.createdAt && <div>Added {new Date(task.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
          {task.completedAt && <div>Completed {new Date(task.completedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Task Item Row ────────────────────────────────────────────────────────────
function TaskItem({ task, selected, projects, onClick, onComplete }) {
  const eff      = getEffStatus(task);
  const isDone   = eff === 'logbook';
  const proj     = projects.find(p => p.id === task.projectId);
  const deadline = task.deadline;
  const overdue  = deadline && isPast(deadline) && !isToday(deadline);
  const dueToday = deadline && isToday(deadline);
  const tags     = (task.tags || []).slice(0, 2);

  return (
    <div className={`task-item${selected ? ' selected' : ''}${isDone ? ' completed' : ''}`} onClick={onClick}>
      <button
        className={`task-item-check${isDone ? ' done' : ''}`}
        onClick={e => { e.stopPropagation(); onComplete(task); }}>
        {isDone && <Check size={8} strokeWidth={3}/>}
      </button>
      <div className="task-item-body">
        <div className="task-item-title">{task.title}</div>
        {(proj || deadline || tags.length > 0) && (
          <div className="task-item-meta">
            {proj && <span className="task-item-proj">{proj.title}</span>}
            {deadline && (
              <span className={`task-item-dl${overdue ? ' overdue' : dueToday ? ' today' : ''}`}>
                {overdue ? '⚠ ' : ''}{fmtShortDate(deadline)}
              </span>
            )}
            {tags.map(t => <span key={t} className="task-item-tag">#{t}</span>)}
          </div>
        )}
      </div>
      {task.isToday && !isDone && (
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--tasks)', flexShrink: 0, marginTop: 7, title: 'In Today' }}/>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Tasks() {
  const {
    personalTasks,
    addPersonalTask, updatePersonalTask, deletePersonalTask,
    projects    = [],
    addProject, updateProject, deleteProject,
    taskAreas   = [],
    addTaskArea, updateTaskArea, deleteTaskArea,
  } = useData();

  const [view,        setView]        = useState('inbox');
  const [projectView, setProjectView] = useState(null);   // active project id
  const [selTask,     setSelTask]     = useState(null);   // selected task id
  const [showTF,      setShowTF]      = useState(false);  // task form modal
  const [editTask,    setEditTask]    = useState(null);
  const [showPF,      setShowPF]      = useState(false);  // project form modal
  const [editProj,    setEditProj]    = useState(null);
  const [showAM,      setShowAM]      = useState(false);  // area manager modal
  const [quickAdd,      setQuickAdd]      = useState('');
  const [quickDeadline, setQuickDeadline] = useState('');
  const [delItem,       setDelItem]       = useState(null); // { type, item }

  const inboxInputRef = useRef(null);

  // Auto-focus the capture input every time the user enters Inbox
  useEffect(() => {
    if (view === 'inbox') {
      const timer = setTimeout(() => inboxInputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [view]);

  // Always resolve freshest task data from store
  const currentTask = selTask ? (personalTasks.find(t => t.id === selTask) || null) : null;

  // ── View lists ───────────────────────────────────────────────────────────────
  // Inbox: capture only — once a deadline or today-pin is set the task moves to Today/Upcoming
  const inboxList = personalTasks.filter(t => {
    if (t.status !== 'inbox' && t.status) return false; // must be inbox-status or legacy no-status
    return !t.deadline && !t.isToday;                   // no deadline set, not pinned to today
  });
  const todayList    = personalTasks.filter(t => inToday(t) && getEffStatus(t) !== 'logbook');
  const upcomingList = personalTasks.filter(t => inUpcoming(t)).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const anytimeList  = personalTasks.filter(t => getEffStatus(t) === 'anytime' && !inToday(t) && !inUpcoming(t));
  const somedayList  = personalTasks.filter(t => getEffStatus(t) === 'someday');
  const logbookList  = personalTasks.filter(t => getEffStatus(t) === 'logbook')
    .sort((a, b) => (b.completedAt || b.updatedAt || 0) - (a.completedAt || a.updatedAt || 0));

  const inboxCount = inboxList.length;
  const todayCount = todayList.length;

  function getViewTasks() {
    if (view === 'inbox')    return inboxList;
    if (view === 'today')    return todayList;
    if (view === 'upcoming') return upcomingList;
    if (view === 'anytime')  return anytimeList;
    if (view === 'someday')  return somedayList;
    if (view === 'logbook')  return logbookList;
    if (view === 'project' && projectView)
      return personalTasks.filter(t => t.projectId === projectView && getEffStatus(t) !== 'logbook');
    return [];
  }
  const viewTasks  = getViewTasks();
  const activeProj = projectView ? projects.find(p => p.id === projectView) : null;

  // ── Handlers ──────────────────────────────────────────────────────────────────
  async function handleQuickAdd() {
    const t = quickAdd.trim();
    if (!t) return;
    const fallbackDl = view === 'upcoming' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : null;
    const newT = {
      title:     t,
      status:    view === 'someday' ? 'someday' : view === 'inbox' ? 'inbox' : 'anytime',
      isToday:   view === 'today',
      deadline:  quickDeadline || fallbackDl,
      projectId: view === 'project' && projectView ? projectView : null,
    };
    try { await addPersonalTask(newT); setQuickAdd(''); setQuickDeadline(''); }
    catch { toast.error('Failed to add.'); }
  }

  async function handleTaskSave(data) {
    try {
      if (editTask) { await updatePersonalTask(editTask.id, data); toast.success('Task updated.'); }
      else          { await addPersonalTask(data); toast.success('Task added!'); }
    } catch { toast.error('Failed.'); }
    setShowTF(false); setEditTask(null);
  }

  const handleUpdate = useCallback(async (id, patch) => {
    try { await updatePersonalTask(id, patch); }
    catch { toast.error('Failed.'); }
  }, [updatePersonalTask]);

  async function handleComplete(task) {
    const done = getEffStatus(task) === 'logbook';
    try {
      await updatePersonalTask(task.id, {
        status:      done ? 'anytime' : 'logbook',
        completedAt: done ? null : Date.now(),
      });
      if (!done) toast.success('Done! ✓');
    } catch { toast.error('Failed.'); }
  }

  async function handleDelTask(task) {
    try {
      await deletePersonalTask(task.id);
      if (selTask === task.id) setSelTask(null);
      toast.success('Deleted.');
    } catch { toast.error('Failed.'); }
    setDelItem(null);
  }

  async function handleProjSave(data) {
    try {
      if (editProj) { await updateProject(editProj.id, data); toast.success('Project updated.'); }
      else          { await addProject(data); toast.success('Project created!'); }
    } catch { toast.error('Failed.'); }
    setShowPF(false); setEditProj(null);
  }

  async function handleDelProj(proj) {
    try {
      await deleteProject(proj.id);
      if (projectView === proj.id) { setView('inbox'); setProjectView(null); }
      toast.success('Project deleted.');
    } catch { toast.error('Failed.'); }
    setDelItem(null);
  }

  function switchView(newView, projId = null) {
    setView(newView);
    setProjectView(projId);
    setSelTask(null);
  }

  // ── Nav config ────────────────────────────────────────────────────────────────
  const NAV = [
    { id: 'inbox',    label: 'Inbox',    Icon: Inbox,    count: inboxCount },
    { id: 'today',    label: 'Today',    Icon: Sun,      count: todayCount },
    { id: 'upcoming', label: 'Upcoming', Icon: Calendar  },
    { id: 'anytime',  label: 'Anytime',  Icon: Layers    },
    { id: 'someday',  label: 'Someday',  Icon: Bookmark  },
    { id: 'logbook',  label: 'Logbook',  Icon: BookOpen  },
  ];

  const activeProjList = projects.filter(p => p.status !== 'completed');
  const viewLabel      = view === 'project' && activeProj ? activeProj.title : (NAV.find(v => v.id === view)?.label || 'Tasks');
  const ViewIcon       = view === 'project' ? FolderOpen : (NAV.find(v => v.id === view)?.Icon || Layers);
  const showQuickAdd   = view !== 'logbook' && view !== 'projects' && view !== 'inbox';

  return (
    <>
      <div className={`tasks-gtd${currentTask ? ' has-detail' : ''}`}>

        {/* ─── Left Nav ─── */}
        <div className="tasks-nav">
          {/* Smart lists */}
          <div className="tasks-nav-section">
            {NAV.map(({ id, label, Icon, count }) => (
              <button key={id}
                className={`tasks-nav-item${view === id && !projectView ? ' active' : ''}`}
                onClick={() => switchView(id)}>
                <span className="tasks-nicon"><Icon size={14}/></span>
                {label}
                {count > 0 && <span className={`tasks-nbadge${view === id && !projectView ? ' active' : ''}`}>{count}</span>}
              </button>
            ))}
          </div>

          {/* Projects — first */}
          <div className="tasks-nav-section">
            <div className="tasks-nav-slabel">Projects</div>
            <button
              className={`tasks-nav-item${view === 'projects' && !projectView ? ' active' : ''}`}
              onClick={() => switchView('projects')}>
              <span className="tasks-nicon"><FolderOpen size={14}/></span>
              All Projects
            </button>
            {activeProjList.map(p => {
              const remaining  = personalTasks.filter(t => t.projectId === p.id && getEffStatus(t) !== 'logbook').length;
              const areaColor  = p.area ? (taskAreas.find(a => a.id === p.area)?.color || null) : null;
              return (
                <button key={p.id}
                  className={`tasks-nav-sub tasks-nav-proj${view === 'project' && projectView === p.id ? ' active' : ''}`}
                  onClick={() => switchView('project', p.id)}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: areaColor || 'var(--tasks)', flexShrink: 0 }}/>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>{p.title}</span>
                  {remaining > 0 && <span style={{ fontSize: 10, color: 'var(--ink-4)', flexShrink: 0 }}>{remaining}</span>}
                </button>
              );
            })}
            <button className="tasks-nav-add" onClick={() => { setEditProj(null); setShowPF(true); }}>
              <Plus size={11}/> New Project
            </button>
          </div>

          {/* Areas — below projects */}
          <div className="tasks-nav-section">
            <div className="tasks-nav-slabel">Areas</div>
            {taskAreas.map(a => (
              <div key={a.id} className="tasks-nav-sub">
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.color || AREA_COLORS[0], flexShrink: 0 }}/>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</span>
              </div>
            ))}
            <button className="tasks-nav-add" onClick={() => setShowAM(true)}>
              <Settings2 size={11}/> Manage Areas
            </button>
          </div>
        </div>

        {/* ─── Task List ─── */}
        <div className="tasks-list">
          {/* Mobile view pills */}
          <div className="tasks-vpills">
            {NAV.map(({ id, label, count }) => (
              <button key={id} className={`tasks-vpill${view === id && !projectView ? ' active' : ''}`}
                onClick={() => switchView(id)}>
                {label}{count > 0 ? ` (${count})` : ''}
              </button>
            ))}
            <button className={`tasks-vpill${view === 'projects' || view === 'project' ? ' active' : ''}`}
              onClick={() => switchView('projects')}>
              Projects
            </button>
          </div>

          {/* Header */}
          <div className="tasks-lhead">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ViewIcon size={17} style={{ color: 'var(--tasks)' }}/>
                <span className="tasks-lhead-title">{viewLabel}</span>
              </div>
              <div className="tasks-lhead-sub">
                {view === 'inbox'    && (viewTasks.length === 0 ? 'Capture first, organise later' : `${viewTasks.length} captured`)}
                {view === 'today'    && (viewTasks.length === 0 ? 'Nothing due today' : `${viewTasks.length} task${viewTasks.length !== 1 ? 's' : ''}`)}
                {view === 'upcoming' && 'Scheduled tasks'}
                {view === 'anytime'  && 'Available whenever'}
                {view === 'someday'  && 'Deferred ideas'}
                {view === 'logbook'  && `${viewTasks.length} completed`}
                {view === 'projects' && `${projects.filter(p => p.status === 'active').length} active`}
                {view === 'project'  && activeProj && `${viewTasks.length} task${viewTasks.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {view === 'project' && activeProj && (
                <>
                  <button className="icon-btn sm" onClick={() => { setEditProj(activeProj); setShowPF(true); }}><Edit3 size={13}/></button>
                  <button className="icon-btn sm danger" onClick={() => setDelItem({ type: 'project', item: activeProj })}><Trash2 size={13}/></button>
                </>
              )}
              {view === 'projects' && (
                <button className="btn accent sm" onClick={() => { setEditProj(null); setShowPF(true); }}>
                  <Plus size={13}/> New
                </button>
              )}
              {view !== 'logbook' && view !== 'projects' && view !== 'inbox' && (
                <button className="btn accent sm" onClick={() => { setEditTask(null); setShowTF(true); }}>
                  <Plus size={13}/> Add
                </button>
              )}
            </div>
          </div>

          {/* Inbox capture zone — always visible, auto-focused */}
          {view === 'inbox' && (
            <div className="inbox-capture-zone">
              <div className="inbox-capture-field">
                <Plus size={16} style={{ color: 'var(--ink-4)', flexShrink: 0 }}/>
                <input
                  ref={inboxInputRef}
                  className="inbox-capture-input"
                  value={quickAdd}
                  onChange={e => setQuickAdd(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && quickAdd.trim()) handleQuickAdd();
                    if (e.key === 'Escape') setQuickAdd('');
                  }}
                  placeholder="What needs to be captured?"
                />
                {quickAdd && (
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', flexShrink: 0, userSelect: 'none', letterSpacing: '0.01em' }}>
                    ↵ add
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="tasks-lbody">
            {view === 'projects' ? (
              projects.length === 0 ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13.5 }}>
                  No projects yet.<br/>
                  <button className="btn accent sm" style={{ marginTop: 12 }} onClick={() => { setEditProj(null); setShowPF(true); }}>
                    <Plus size={13}/> Create Project
                  </button>
                </div>
              ) : (
                <div className="tasks-proj-grid">
                  {projects.map(p => {
                    const total      = personalTasks.filter(t => t.projectId === p.id).length;
                    const doneN      = personalTasks.filter(t => t.projectId === p.id && getEffStatus(t) === 'logbook').length;
                    const pct        = total > 0 ? Math.round((doneN / total) * 100) : 0;
                    const areaObj    = taskAreas.find(a => a.id === p.area);
                    const areaLabel  = areaObj?.label;
                    const areaColor  = areaObj?.color || null;
                    const projColor  = areaColor || 'var(--tasks)';
                    const isOver     = p.deadline && isPast(p.deadline) && !isToday(p.deadline);
                    return (
                      <div key={p.id} className={`tasks-proj-card${p.status === 'on-hold' ? ' on-hold' : ''}`}
                        onClick={() => switchView('project', p.id)}
                        style={{ borderTop: `3px solid ${projColor}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                          <div className="tasks-proj-title">{p.title}</div>
                          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                            <button className="icon-btn sm" onClick={e => { e.stopPropagation(); setEditProj(p); setShowPF(true); }}><Edit3 size={11}/></button>
                            <button className="icon-btn sm danger" onClick={e => { e.stopPropagation(); setDelItem({ type: 'project', item: p }); }}><Trash2 size={11}/></button>
                          </div>
                        </div>
                        <div className="tasks-proj-meta">
                          {areaLabel && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: areaColor || 'var(--tasks)' }}/>
                              {areaLabel}
                            </span>
                          )}
                          {p.status === 'on-hold' && <span style={{ color: 'var(--warn)' }}>On Hold</span>}
                          {p.deadline && <span style={{ color: isOver ? 'var(--danger)' : 'var(--ink-3)' }}>{isOver ? '⚠ ' : ''}Due {fmtShortDate(p.deadline)}</span>}
                          <span>{total - doneN} remaining · {pct}%</span>
                        </div>
                        <div className="tasks-proj-bar"><div className="tasks-proj-fill" style={{ width: pct + '%', background: projColor }}/></div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : viewTasks.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13.5, lineHeight: 1.8 }}>
                {view === 'inbox'    && (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                    <div>Inbox is clear</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>
                      Type above to start capturing
                    </div>
                  </div>
                )}
                {view === 'today'    && '✨ Nothing scheduled for today.'}
                {view === 'upcoming' && '📅 No upcoming tasks. Set a deadline on a task to see it here.'}
                {view === 'anytime'  && '♾️ No tasks here. Move items out of Inbox to Anytime.'}
                {view === 'someday'  && '🌙 No ideas in Someday.'}
                {view === 'logbook'  && '📚 No completed tasks yet.'}
                {view === 'project'  && '📂 No tasks in this project yet.'}
              </div>
            ) : (
              viewTasks.map(t => (
                <TaskItem
                  key={t.id}
                  task={t}
                  selected={selTask === t.id}
                  projects={projects}
                  onClick={() => setSelTask(selTask === t.id ? null : t.id)}
                  onComplete={handleComplete}
                />
              ))
            )}
          </div>

          {/* Quick add */}
          {showQuickAdd && (
            <div className="tasks-quickadd">
              <Plus size={13} style={{ color: 'var(--ink-4)', flexShrink: 0 }}/>
              <input
                value={quickAdd}
                onChange={e => setQuickAdd(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
                placeholder={`Add to ${viewLabel}…`}
              />
              {quickAdd && (
                <>
                  <input
                    type="date"
                    value={quickDeadline}
                    onChange={e => setQuickDeadline(e.target.value)}
                    title="Set deadline"
                    style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-2)', color: 'var(--ink-2)', fontSize: 12, padding: '4px 8px', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', flexShrink: 0 }}
                  />
                  <button className="btn sm accent" onClick={handleQuickAdd}>Add</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ─── Detail Panel ─── */}
        {currentTask && (
          <TaskDetail
            key={currentTask.id}
            task={currentTask}
            projects={projects}
            areas={taskAreas}
            onUpdate={handleUpdate}
            onDelete={() => setDelItem({ type: 'task', item: currentTask })}
            onClose={() => setSelTask(null)}
          />
        )}
      </div>

      {/* ─── Modals ─── */}
      {showTF && (
        <TaskFormModal
          task={editTask}
          defaultView={view}
          defaultProjectId={view === 'project' ? projectView : null}
          projects={projects}
          areas={taskAreas}
          onSave={handleTaskSave}
          onClose={() => { setShowTF(false); setEditTask(null); }}
        />
      )}
      {showPF && (
        <ProjectFormModal
          project={editProj}
          areas={taskAreas}
          onSave={handleProjSave}
          onClose={() => { setShowPF(false); setEditProj(null); }}
        />
      )}
      {showAM && (
        <AreaManagerModal
          areas={taskAreas}
          onAdd={d => addTaskArea(d)}
          onUpdate={(id, d) => updateTaskArea(id, d)}
          onDelete={id => deleteTaskArea(id)}
          onClose={() => setShowAM(false)}
        />
      )}
      <ConfirmDialog
        isOpen={!!delItem}
        onClose={() => setDelItem(null)}
        onConfirm={() => {
          if (delItem?.type === 'task')    handleDelTask(delItem.item);
          if (delItem?.type === 'project') handleDelProj(delItem.item);
        }}
        title={delItem?.type === 'project' ? 'Delete Project?' : 'Delete Task?'}
        message={delItem?.type === 'project'
          ? `Delete "${delItem?.item?.title}"? Existing tasks won't be deleted.`
          : `Delete "${delItem?.item?.title}"?`}
        confirmLabel="Delete"
      />
    </>
  );
}
