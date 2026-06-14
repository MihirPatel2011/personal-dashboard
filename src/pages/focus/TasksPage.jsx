import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Check, Flag, Calendar, Trash2, Edit3, Archive, ArchiveRestore,
  X, ChevronDown, Folder, Hash, MoreHorizontal, Settings2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { AREA_COLORS, AREA_ICONS, FOCUS_PRIORITIES, PRIORITY_MAP } from '../../constants';
import { isToday, isPast, fmtShortDate } from '../../utils';

// ── Responsive helper ────────────────────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const h = e => setM(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return m;
}

// ── Small generic popover (click-toggled, closes on outside click) ───────────────
function Popover({ open, onClose, children, align = 'left', width }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', [align]: 0, zIndex: 60, marginTop: 6,
      background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)',
      boxShadow: 'var(--shadow)', padding: 6, minWidth: width || 180,
    }}>
      {children}
    </div>
  );
}

// ── Chips / pills ────────────────────────────────────────────────────────────────
function AreaChip({ area, onClick, small }) {
  if (!area) return null;
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, cursor: onClick ? 'pointer' : 'default',
      padding: small ? '2px 8px' : '3px 9px', borderRadius: 99, fontSize: small ? 11 : 11.5, fontWeight: 600,
      background: area.color + '22', color: area.color, border: `1px solid ${area.color}33`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: small ? 10 : 11 }}>{area.icon}</span>{area.name}
    </span>
  );
}

function PriorityFlag({ priority, onClick }) {
  const p = PRIORITY_MAP[priority];
  if (!p) return (
    <button onClick={onClick} className="icon-btn sm" title="Set priority" style={{ color: 'var(--ink-4)' }}><Flag size={14}/></button>
  );
  return (
    <span onClick={onClick} title={p.label} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: p.dim, color: p.color,
    }}>
      <Flag size={11} fill={p.color}/> {p.short}
    </span>
  );
}

function DueChip({ dueDate, onClick }) {
  if (!dueDate) return (
    <button onClick={onClick} className="icon-btn sm" title="Set due date" style={{ color: 'var(--ink-4)' }}><Calendar size={14}/></button>
  );
  const overdue = isPast(dueDate) && !isToday(dueDate);
  const today   = isToday(dueDate);
  const color = overdue ? 'var(--danger)' : today ? 'var(--warn)' : 'var(--ink-3)';
  const bg    = overdue ? 'var(--danger-dim)' : today ? 'var(--warn-dim)' : 'transparent';
  const label = today ? 'Today' : overdue ? `Overdue · ${fmtShortDate(dueDate)}` : fmtShortDate(dueDate);
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, color, background: bg,
    }}>
      <Calendar size={11}/> {label}
    </span>
  );
}

// ── Inline option pickers (desktop hover quick-edit) ────────────────────────────
function AreaProjectPicker({ areas, projects, areaId, projectId, onChange, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const area = areas.find(a => a.id === areaId);
  const project = projects.find(p => p.id === projectId);
  const activeAreas = areas.filter(a => !a.archived);

  return (
    <div style={{ position: 'relative' }}>
      <button className="btn ghost sm" onClick={() => setOpen(o => !o)} style={{ gap: 5 }}>
        {area ? <AreaChip area={area} small/> : <><Folder size={13}/> Area</>}
        {project && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>/ {project.name}</span>}
        <ChevronDown size={11} style={{ opacity: 0.5 }}/>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align={align} width={220}>
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          <button className="fx-menu-item" onClick={() => { onChange({ areaId: '', projectId: '' }); setOpen(false); }}
            style={{ color: !areaId ? 'var(--ink)' : 'var(--ink-3)' }}>
            <X size={12}/> No area
          </button>
          {activeAreas.map(a => {
            const pr = projects.filter(p => p.areaId === a.id && !p.archived);
            return (
              <div key={a.id}>
                <button className="fx-menu-item" onClick={() => { onChange({ areaId: a.id, projectId: '' }); setOpen(false); }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0 }}/>
                  <span>{a.icon} {a.name}</span>
                  {areaId === a.id && !projectId && <Check size={12} style={{ marginLeft: 'auto', color: a.color }}/>}
                </button>
                {pr.map(p => (
                  <button key={p.id} className="fx-menu-item" onClick={() => { onChange({ areaId: a.id, projectId: p.id }); setOpen(false); }}
                    style={{ paddingLeft: 26 }}>
                    <Hash size={11} style={{ color: a.color }}/> {p.name}
                    {projectId === p.id && <Check size={12} style={{ marginLeft: 'auto', color: a.color }}/>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}

function PriorityPicker({ priority, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <span onClick={() => setOpen(o => !o)}><PriorityFlag priority={priority} onClick={() => setOpen(o => !o)}/></span>
      <Popover open={open} onClose={() => setOpen(false)} width={140}>
        {FOCUS_PRIORITIES.map(p => (
          <button key={p.id} className="fx-menu-item" onClick={() => { onChange(p.id); setOpen(false); }}>
            <Flag size={12} fill={p.color} style={{ color: p.color }}/> {p.label}
            {priority === p.id && <Check size={12} style={{ marginLeft: 'auto' }}/>}
          </button>
        ))}
        <button className="fx-menu-item" onClick={() => { onChange(0); setOpen(false); }} style={{ color: 'var(--ink-3)' }}>
          <X size={12}/> None
        </button>
      </Popover>
    </div>
  );
}

function DuePicker({ dueDate, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <DueChip dueDate={dueDate} onClick={() => setOpen(o => !o)}/>
      <Popover open={open} onClose={() => setOpen(false)} width={200}>
        <input type="date" className="fx-date-input" value={dueDate || ''}
          onChange={e => { onChange(e.target.value); setOpen(false); }} autoFocus/>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => { onChange(new Date().toISOString().slice(0,10)); setOpen(false); }}>Today</button>
          {dueDate && <button className="btn ghost sm" onClick={() => { onChange(''); setOpen(false); }}><X size={12}/></button>}
        </div>
      </Popover>
    </div>
  );
}

// ── Priority selector row (used in modals) ───────────────────────────────────────
function PriorityRow({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {FOCUS_PRIORITIES.map(p => {
        const on = value === p.id;
        return (
          <button key={p.id} type="button" onClick={() => onChange(p.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 99,
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            border: `1.5px solid ${on ? p.color : 'var(--border)'}`,
            background: on ? p.dim : 'transparent', color: on ? p.color : 'var(--ink-3)',
          }}><Flag size={12} fill={on ? p.color : 'none'}/> {p.label}</button>
        );
      })}
      <button type="button" onClick={() => onChange(0)} className="chip"
        style={!value ? { borderColor: 'var(--ink-3)', color: 'var(--ink)' } : undefined}>None</button>
    </div>
  );
}

// ── Area / Project edit modal ──────────────────────────────────────────────────
function AreaForm({ initial, onSave, onCancel }) {
  const [name, setName]   = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || AREA_COLORS[0]);
  const [icon, setIcon]   = useState(initial?.icon || AREA_ICONS[0]);
  return (
    <>
      <div className="modal-body">
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Work, Health, Side project" autoFocus/>
        </div>
        <div className="field">
          <label>Color</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AREA_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} style={{
                width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0,
                border: color === c ? '3px solid var(--ink)' : '2px solid transparent',
                transform: color === c ? 'scale(1.12)' : 'scale(1)', transition: 'transform .12s',
              }}/>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {AREA_ICONS.map(em => (
              <button key={em} type="button" onClick={() => setIcon(em)} style={{
                width: 36, height: 36, fontSize: 18, borderRadius: 8, cursor: 'pointer',
                border: icon === em ? `2px solid ${color}` : '1.5px solid var(--border)',
                background: icon === em ? color + '22' : 'var(--surface-2)',
              }}>{em}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn accent" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), color, icon })}>
          {initial ? 'Save area' : 'Add area'}
        </button>
      </div>
    </>
  );
}

function ProjectForm({ initial, areas, defaultAreaId, onSave, onCancel }) {
  const [name, setName]     = useState(initial?.name || '');
  const [areaId, setAreaId] = useState(initial?.areaId || defaultAreaId || (areas[0]?.id || ''));
  return (
    <>
      <div className="modal-body">
        <div className="field">
          <label>Project name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q3 launch" autoFocus/>
        </div>
        <div className="field">
          <label>Area</label>
          <select value={areaId} onChange={e => setAreaId(e.target.value)}>
            {areas.filter(a => !a.archived).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn accent" disabled={!name.trim() || !areaId} onClick={() => onSave({ name: name.trim(), areaId })}>
          {initial ? 'Save project' : 'Add project'}
        </button>
      </div>
    </>
  );
}

// ── Full task edit modal (primary edit surface on mobile) ───────────────────────
function EditTaskModal({ task, areas, projects, onSave, onDelete, onClose }) {
  const [title, setTitle]     = useState(task.title);
  const [areaId, setAreaId]   = useState(task.areaId || '');
  const [projectId, setProjectId] = useState(task.projectId || '');
  const [priority, setPriority] = useState(task.priority || 0);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const areaProjects = projects.filter(p => p.areaId === areaId && !p.archived);

  function chooseProject(pid) {
    setProjectId(pid);
    if (pid) { const pr = projects.find(x => x.id === pid); if (pr) setAreaId(pr.areaId); } // project locks area
  }
  function save() { if (title.trim()) onSave({ title: title.trim(), areaId, projectId, priority, dueDate }); }

  return (
    <>
      <div className="modal-body">
        <div className="field">
          <label>Task</label>
          <input value={title} autoFocus onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); }}/>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 150 }}>
            <label>Area</label>
            <select value={areaId} onChange={e => { setAreaId(e.target.value); setProjectId(''); }}>
              <option value="">No area</option>
              {areas.filter(a => !a.archived).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
          </div>
          {areaId && areaProjects.length > 0 && (
            <div className="field" style={{ flex: 1, minWidth: 150 }}>
              <label>Project</label>
              <select value={projectId} onChange={e => chooseProject(e.target.value)}>
                <option value="">None</option>
                {areaProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="field"><label>Priority</label><PriorityRow value={priority} onChange={setPriority}/></div>
        <div className="field">
          <label>Due date</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ flex: 1 }}/>
            {dueDate && <button className="btn ghost sm" onClick={() => setDueDate('')}><X size={13}/> Clear</button>}
          </div>
        </div>
      </div>
      <div className="modal-foot" style={{ justifyContent: 'space-between' }}>
        <button className="btn danger-ghost" onClick={onDelete}><Trash2 size={14}/> Delete</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn accent" disabled={!title.trim()} onClick={save}>Save</button>
        </div>
      </div>
    </>
  );
}

// ── Manage areas & projects modal (mobile management surface) ───────────────────
function ManageAreasModal({ areas, projects, onNewArea, onEditArea, onArchiveArea, onDeleteArea, onNewProject, onEditProject, onArchiveProject, onClose }) {
  const [showArchived, setShowArchived] = useState(false);
  const vis = areas.filter(a => showArchived ? a.archived : !a.archived).sort((a,b) => (a.order||0)-(b.order||0));
  return (
    <>
      <div className="modal-body">
        <button className="btn accent sm" style={{ alignSelf: 'flex-start' }} onClick={onNewArea}><Plus size={13}/> New area</button>
        {vis.length === 0 && <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '12px 0' }}>{showArchived ? 'No archived areas.' : 'No areas yet.'}</div>}
        {vis.map(a => {
          const pr = projects.filter(p => p.areaId === a.id && (showArchived ? true : !p.archived));
          return (
            <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: a.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{a.icon}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{a.name}</span>
                <button className="icon-btn sm" title="Add project" onClick={() => onNewProject(a.id)}><Plus size={15}/></button>
                <button className="icon-btn sm" title="Edit" onClick={() => onEditArea(a)}><Edit3 size={14}/></button>
                <button className="icon-btn sm" title={a.archived ? 'Restore' : 'Archive'} onClick={() => onArchiveArea(a)}>{a.archived ? <ArchiveRestore size={14}/> : <Archive size={14}/>}</button>
                <button className="icon-btn sm danger" title="Delete" onClick={() => onDeleteArea(a)}><Trash2 size={14}/></button>
              </div>
              {pr.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 0 34px' }}>
                  <Hash size={12} style={{ color: a.color }}/>
                  <span style={{ flex: 1, fontSize: 13, color: p.archived ? 'var(--ink-3)' : 'var(--ink-2)' }}>{p.name}</span>
                  <button className="icon-btn sm" title="Edit" onClick={() => onEditProject(p)}><Edit3 size={13}/></button>
                  <button className="icon-btn sm" title={p.archived ? 'Restore' : 'Archive'} onClick={() => onArchiveProject(p)}>{p.archived ? <ArchiveRestore size={13}/> : <Archive size={13}/>}</button>
                </div>
              ))}
            </div>
          );
        })}
        <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowArchived(v => !v)}>{showArchived ? 'Show active' : 'Show archived'}</button>
      </div>
      <div className="modal-foot"><button className="btn ghost" onClick={onClose}>Done</button></div>
    </>
  );
}

// ── Quick add bar ────────────────────────────────────────────────────────────────
function QuickAdd({ areas, projects, presetAreaId, presetProjectId, onAdd }) {
  const [title, setTitle]     = useState('');
  const [areaId, setAreaId]   = useState(presetAreaId || '');
  const [projectId, setProj]  = useState(presetProjectId || '');
  const [priority, setPrio]   = useState(0);
  const [dueDate, setDue]     = useState('');

  useEffect(() => { setAreaId(presetAreaId || ''); setProj(presetProjectId || ''); }, [presetAreaId, presetProjectId]);

  function submit() {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), areaId, projectId, priority, dueDate });
    setTitle(''); setPrio(0); setDue('');
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-lg)', padding: '12px 14px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Plus size={18} style={{ color: 'var(--tasks)', flexShrink: 0 }}/>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="Add a task…"
          style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: 'var(--ink)', fontFamily: 'inherit' }}
        />
        <button className="btn accent sm" disabled={!title.trim()} onClick={submit}>Add</button>
      </div>
      <div className="fx-quickadd-opts" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingLeft: 28, flexWrap: 'wrap' }}>
        <AreaProjectPicker areas={areas} projects={projects} areaId={areaId} projectId={projectId}
          onChange={({ areaId, projectId }) => { setAreaId(areaId); setProj(projectId); }}/>
        <PriorityPicker priority={priority} onChange={setPrio}/>
        <DuePicker dueDate={dueDate} onChange={setDue}/>
      </div>
    </div>
  );
}

// ── Task row ─────────────────────────────────────────────────────────────────────
function TaskRow({ task, areas, projects, onToggle, onUpdate, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const area = areas.find(a => a.id === task.areaId);
  const project = projects.find(p => p.id === task.projectId);
  const p = PRIORITY_MAP[task.priority];

  useEffect(() => { setDraft(task.title); }, [task.title]);

  function commitTitle() {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== task.title) onUpdate(task.id, { title: v });
    else setDraft(task.title);
  }

  function handleAreaProject({ areaId, projectId }) {
    if (projectId) {
      const pr = projects.find(x => x.id === projectId);
      onUpdate(task.id, { projectId, areaId: pr ? pr.areaId : areaId });
    } else {
      onUpdate(task.id, { areaId, projectId: '' });
    }
  }

  return (
    <div className="fx-task-row" style={{ borderLeft: p ? `3px solid ${p.color}` : '3px solid transparent' }}>
      <button
        onClick={() => onToggle(task)}
        title={task.done ? 'Mark not done' : 'Complete'}
        style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', marginTop: 1,
          border: `2px solid ${task.done ? 'var(--ok)' : (p ? p.color : 'var(--border-strong)')}`,
          background: task.done ? 'var(--ok)' : 'transparent', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
        }}>
        {task.done && <Check size={12} strokeWidth={3}/>}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            value={draft} autoFocus
            onChange={e => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setDraft(task.title); setEditing(false); } }}
            style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: 6, padding: '4px 8px', fontSize: 14, color: 'var(--ink)', fontFamily: 'inherit', outline: 'none' }}
          />
        ) : (
          <div onClick={() => setEditing(true)} style={{
            fontSize: 14, color: task.done ? 'var(--ink-3)' : 'var(--ink)', cursor: 'text',
            textDecoration: task.done ? 'line-through' : 'none', textDecorationColor: 'var(--ink-4)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{task.title}</div>
        )}
        {(area || project || task.dueDate) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
            {area && <AreaChip area={area} small/>}
            {project && <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Hash size={10}/>{project.name}</span>}
            {task.dueDate && <DueChip dueDate={task.dueDate}/>}
          </div>
        )}
      </div>

      {/* Desktop hover quick-edit cluster */}
      <div className="fx-task-actions">
        <PriorityPicker priority={task.priority} onChange={v => onUpdate(task.id, { priority: v })}/>
        <DuePicker dueDate={task.dueDate} onChange={v => onUpdate(task.id, { dueDate: v })}/>
        <AreaProjectPicker areas={areas} projects={projects} areaId={task.areaId} projectId={task.projectId}
          onChange={handleAreaProject} align="right"/>
      </div>
      {/* Always-visible edit affordance (primary on touch) */}
      <button className="icon-btn sm fx-task-edit" onClick={() => onEdit(task)} title="Edit task" style={{ flexShrink: 0 }}><Edit3 size={14}/></button>
    </div>
  );
}

// ── Desktop areas rail ───────────────────────────────────────────────────────────
function AreasRail({ areas, projects, tasks, selAreaId, selProjectId, onSelect, onNewArea, onEditArea, onArchiveArea, onDeleteArea, onNewProject, onEditProject, onArchiveProject }) {
  const [showArchived, setShowArchived] = useState(false);
  const [menuArea, setMenuArea] = useState(null);
  const visAreas = areas.filter(a => showArchived ? a.archived : !a.archived).sort((a,b) => (a.order||0)-(b.order||0));
  const openCount = (areaId) => tasks.filter(t => !t.done && t.areaId === areaId).length;
  const openAll = tasks.filter(t => !t.done).length;

  return (
    <div className="fx-areas-rail">
      <div style={{ padding: '12px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>Areas</span>
        <button className="icon-btn sm" onClick={onNewArea} title="New area"><Plus size={15}/></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        <button className="fx-rail-item" onClick={() => onSelect(null, null)}
          style={{ background: !selAreaId ? 'var(--surface-3)' : 'transparent', boxShadow: !selAreaId ? 'inset 3px 0 0 var(--tasks)' : 'none' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--tasks)' }}/> All tasks
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{openAll}</span>
        </button>

        {visAreas.map(a => {
          const pr = projects.filter(p => p.areaId === a.id && (showArchived ? true : !p.archived));
          const selected = selAreaId === a.id && !selProjectId;
          return (
            <div key={a.id} style={{ marginTop: 2 }}>
              <div style={{ position: 'relative' }}>
                <button className="fx-rail-item" onClick={() => onSelect(a.id, null)}
                  style={{ background: selected ? 'var(--surface-3)' : 'transparent', boxShadow: selected ? `inset 3px 0 0 ${a.color}` : 'none' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 13 }}>{a.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: a.archived ? 'var(--ink-3)' : 'var(--ink-2)' }}>{a.name}</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{openCount(a.id) || ''}</span>
                    <span className="fx-rail-menu-btn" onClick={e => { e.stopPropagation(); setMenuArea(menuArea === a.id ? null : a.id); }}
                      style={{ display: 'flex', padding: 2, borderRadius: 4, color: 'var(--ink-3)' }}><MoreHorizontal size={14}/></span>
                  </span>
                </button>
                <Popover open={menuArea === a.id} onClose={() => setMenuArea(null)} align="right" width={170}>
                  <button className="fx-menu-item" onClick={() => { setMenuArea(null); onNewProject(a.id); }}><Plus size={12}/> Add project</button>
                  <button className="fx-menu-item" onClick={() => { setMenuArea(null); onEditArea(a); }}><Edit3 size={12}/> Edit area</button>
                  <button className="fx-menu-item" onClick={() => { setMenuArea(null); onArchiveArea(a); }}>
                    {a.archived ? <><ArchiveRestore size={12}/> Restore</> : <><Archive size={12}/> Archive</>}
                  </button>
                  <button className="fx-menu-item" onClick={() => { setMenuArea(null); onDeleteArea(a); }} style={{ color: 'var(--danger)' }}><Trash2 size={12}/> Delete</button>
                </Popover>
              </div>
              {pr.map(p => {
                const psel = selProjectId === p.id;
                return (
                  <div key={p.id} style={{ position: 'relative' }}>
                    <button className="fx-rail-item" onClick={() => onSelect(a.id, p.id)}
                      style={{ paddingLeft: 30, background: psel ? 'var(--surface-3)' : 'transparent', boxShadow: psel ? `inset 3px 0 0 ${a.color}` : 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <Hash size={11} style={{ color: a.color }}/>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: p.archived ? 'var(--ink-3)' : 'var(--ink-2)' }}>{p.name}</span>
                      </span>
                      <span className="fx-rail-menu-btn" onClick={e => { e.stopPropagation(); setMenuArea(menuArea === 'p'+p.id ? null : 'p'+p.id); }}
                        style={{ display: 'flex', padding: 2, borderRadius: 4, color: 'var(--ink-3)' }}><MoreHorizontal size={13}/></span>
                    </button>
                    <Popover open={menuArea === 'p'+p.id} onClose={() => setMenuArea(null)} align="right" width={150}>
                      <button className="fx-menu-item" onClick={() => { setMenuArea(null); onEditProject(p); }}><Edit3 size={12}/> Edit</button>
                      <button className="fx-menu-item" onClick={() => { setMenuArea(null); onArchiveProject(p); }}>
                        {p.archived ? <><ArchiveRestore size={12}/> Restore</> : <><Archive size={12}/> Archive</>}
                      </button>
                    </Popover>
                  </div>
                );
              })}
            </div>
          );
        })}
        {visAreas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--ink-3)', fontSize: 12.5 }}>
            {showArchived ? 'No archived areas.' : 'No areas yet. Add one to organise your tasks.'}
          </div>
        )}
      </div>

      <button className="btn ghost sm" onClick={() => setShowArchived(v => !v)}
        style={{ width: '100%', justifyContent: 'center', borderRadius: 0, padding: '10px 0', borderTop: '1px solid var(--border)', fontSize: 12 }}>
        {showArchived ? 'Show active' : 'Show archived'}
      </button>
    </div>
  );
}

// ── Mobile area/project pill bar ─────────────────────────────────────────────────
function MobileAreaBar({ areas, projects, tasks, selAreaId, selProjectId, onSelect, onNewArea, onManage }) {
  const visAreas = areas.filter(a => !a.archived).sort((a,b) => (a.order||0)-(b.order||0));
  const area = areas.find(a => a.id === selAreaId);
  const projs = area ? projects.filter(p => p.areaId === area.id && !p.archived) : [];
  const openAll = tasks.filter(t => !t.done).length;

  const pill = (active, color, children, onClick, key) => (
    <button key={key} onClick={onClick} className="fx-pill"
      style={active ? { borderColor: color, color, background: color + '22', fontWeight: 600 } : undefined}>
      {children}
    </button>
  );

  return (
    <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
      <div className="fx-pillbar">
        {pill(!selAreaId, 'var(--tasks)', <>All <span style={{ opacity: .6 }}>{openAll}</span></>, () => onSelect(null, null), 'all')}
        {visAreas.map(a => pill(selAreaId === a.id, a.color, <>{a.icon} {a.name}</>, () => onSelect(a.id, null), a.id))}
        <button className="fx-pill" onClick={onNewArea} title="New area" style={{ flexShrink: 0 }}><Plus size={13}/></button>
        <button className="fx-pill" onClick={onManage} title="Manage areas" style={{ flexShrink: 0 }}><Settings2 size={13}/></button>
      </div>
      {area && projs.length > 0 && (
        <div className="fx-pillbar" style={{ paddingTop: 0 }}>
          {pill(!selProjectId, area.color, 'All', () => onSelect(area.id, null), 'allp')}
          {projs.map(p => pill(selProjectId === p.id, area.color, <><Hash size={10}/> {p.name}</>, () => onSelect(area.id, p.id), p.id))}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const {
    focusAreas: areas, focusProjects: projects, focusTasks: tasks,
    addFocusArea, updateFocusArea, deleteFocusArea,
    addFocusProject, updateFocusProject,
    addFocusTask, updateFocusTask, deleteFocusTask, toggleFocusTask,
  } = useData();
  const isMobile = useIsMobile();

  const [selAreaId, setSelAreaId]     = useState(null);
  const [selProjectId, setSelProjectId] = useState(null);
  const [sortBy, setSortBy]   = useState('created');
  const [showDone, setShowDone] = useState(false);

  const [areaModal, setAreaModal] = useState(null);
  const [projectModal, setProjectModal] = useState(null);
  const [taskModal, setTaskModal] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => {
    let list = tasks.filter(t => {
      if (selProjectId) return t.projectId === selProjectId;
      if (selAreaId)    return t.areaId === selAreaId;
      return true;
    });
    if (!showDone) list = list.filter(t => !t.done);

    const prioVal = t => (t.priority || 0);
    const dueVal  = t => t.dueDate ? new Date(t.dueDate).getTime() : Infinity;
    list = [...list].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (sortBy === 'priority') return prioVal(b) - prioVal(a) || (b.createdAt||0) - (a.createdAt||0);
      if (sortBy === 'due')      return dueVal(a) - dueVal(b)   || (b.createdAt||0) - (a.createdAt||0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return list;
  }, [tasks, selAreaId, selProjectId, showDone, sortBy]);

  const openCount = filtered.filter(t => !t.done).length;

  function handleAdd(data) { addFocusTask(data); toast.success('Task added'); }
  function handleToggle(task) { toggleFocusTask(task.id, !task.done); if (!task.done) toast.success('Completed ✓'); }

  const saveArea = (data) => {
    if (areaModal?.initial) { updateFocusArea(areaModal.initial.id, data); toast.success('Area updated'); }
    else { addFocusArea({ ...data, order: areas.length }); toast.success('Area added'); }
    setAreaModal(null);
  };
  const saveProject = (data) => {
    if (projectModal?.initial) { updateFocusProject(projectModal.initial.id, data); toast.success('Project updated'); }
    else { addFocusProject(data); toast.success('Project added'); }
    setProjectModal(null);
  };

  const railHandlers = {
    onNewArea: () => setAreaModal({ initial: null }),
    onEditArea: a => setAreaModal({ initial: a }),
    onArchiveArea: a => updateFocusArea(a.id, { archived: !a.archived }),
    onDeleteArea: a => setConfirm({
      title: `Delete "${a.name}"?`,
      message: 'Its projects will be deleted and its tasks moved to Unassigned. This cannot be undone.',
      onConfirm: () => { deleteFocusArea(a.id); if (selAreaId === a.id) { setSelAreaId(null); setSelProjectId(null); } },
    }),
    onNewProject: areaId => setProjectModal({ initial: null, defaultAreaId: areaId }),
    onEditProject: p => setProjectModal({ initial: p }),
    onArchiveProject: p => updateFocusProject(p.id, { archived: !p.archived }),
  };

  return (
    <div className="fx-tasks-layout">
      {isMobile ? (
        <MobileAreaBar areas={areas} projects={projects} tasks={tasks}
          selAreaId={selAreaId} selProjectId={selProjectId}
          onSelect={(a, p) => { setSelAreaId(a); setSelProjectId(p); }}
          onNewArea={railHandlers.onNewArea} onManage={() => setManageOpen(true)}/>
      ) : (
        <AreasRail areas={areas} projects={projects} tasks={tasks}
          selAreaId={selAreaId} selProjectId={selProjectId}
          onSelect={(a, p) => { setSelAreaId(a); setSelProjectId(p); }}
          {...railHandlers}/>
      )}

      <div className="fx-tasks-main">
        <QuickAdd
          areas={areas} projects={projects}
          presetAreaId={selProjectId ? (projects.find(p => p.id === selProjectId)?.areaId || '') : (selAreaId || '')}
          presetProjectId={selProjectId || ''}
          onAdd={handleAdd}
        />

        <div className="fx-sortbar">
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{openCount} open</span>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Sort</span>
          {[['created','Newest'],['due','Due date'],['priority','Priority']].map(([v,l]) => (
            <button key={v} className="chip" onClick={() => setSortBy(v)}
              style={sortBy === v ? { borderColor: 'var(--tasks)', color: 'var(--tasks)', background: 'var(--tasks-dim)' } : undefined}>{l}</button>
          ))}
          <button className="chip" onClick={() => setShowDone(v => !v)}
            style={showDone ? { borderColor: 'var(--tasks)', color: 'var(--tasks)', background: 'var(--tasks-dim)' } : undefined}>
            {showDone ? 'Done shown' : 'Show done'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-3)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 14 }}>Nothing here. Add a task above to get going.</div>
            </div>
          ) : filtered.map(t => (
            <TaskRow key={t.id} task={t} areas={areas} projects={projects}
              onToggle={handleToggle}
              onUpdate={updateFocusTask}
              onEdit={task => setTaskModal(task)}/>
          ))}
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={!!areaModal} onClose={() => setAreaModal(null)} title={areaModal?.initial ? 'Edit area' : 'New area'} size="sm">
        {areaModal && <AreaForm initial={areaModal.initial} onSave={saveArea} onCancel={() => setAreaModal(null)}/>}
      </Modal>
      <Modal isOpen={!!projectModal} onClose={() => setProjectModal(null)} title={projectModal?.initial ? 'Edit project' : 'New project'} size="sm">
        {projectModal && <ProjectForm initial={projectModal.initial} areas={areas} defaultAreaId={projectModal.defaultAreaId} onSave={saveProject} onCancel={() => setProjectModal(null)}/>}
      </Modal>
      <Modal isOpen={!!taskModal} onClose={() => setTaskModal(null)} title="Edit task" size="sm">
        {taskModal && <EditTaskModal task={taskModal} areas={areas} projects={projects}
          onSave={data => { updateFocusTask(taskModal.id, data); setTaskModal(null); toast.success('Task saved'); }}
          onDelete={() => { const t = taskModal; setTaskModal(null); setConfirm({ title: 'Delete task?', message: `"${t.title}" will be permanently removed.`, onConfirm: () => deleteFocusTask(t.id) }); }}
          onClose={() => setTaskModal(null)}/>}
      </Modal>
      <Modal isOpen={manageOpen} onClose={() => setManageOpen(false)} title="Manage areas & projects" size="md">
        {manageOpen && <ManageAreasModal areas={areas} projects={projects} {...railHandlers} onClose={() => setManageOpen(false)}/>}
      </Modal>
      <ConfirmDialog isOpen={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.title} message={confirm?.message}
        onConfirm={() => confirm?.onConfirm()}/>
    </div>
  );
}
