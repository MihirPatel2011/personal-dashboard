import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Check, Flag, Calendar, Trash2, Edit3, Archive, ArchiveRestore,
  X, ChevronDown, Folder, Hash, MoreHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { AREA_COLORS, AREA_ICONS, FOCUS_PRIORITIES, PRIORITY_MAP } from '../../constants';
import { isToday, isPast, fmtShortDate } from '../../utils';

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
  const label = today ? 'Today' : overdue ? `${fmtShortDate(dueDate)}` : fmtShortDate(dueDate);
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, color, background: bg,
    }}>
      <Calendar size={11}/> {label}
    </span>
  );
}

// ── Inline option pickers shared by QuickAdd and rows ───────────────────────────
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

function PriorityPicker({ priority, onChange, asFlag = true }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <span onClick={() => setOpen(o => !o)}>
        {asFlag
          ? <PriorityFlag priority={priority} onClick={() => setOpen(o => !o)}/>
          : <button className="btn ghost sm"><Flag size={13}/> Priority</button>}
      </span>
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
                width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0,
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
                width: 32, height: 32, fontSize: 17, borderRadius: 8, cursor: 'pointer',
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
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-lg)', padding: '12px 14px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Plus size={18} style={{ color: 'var(--tasks)', flexShrink: 0 }}/>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="Add a task…  (just type and press Enter)"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: 'var(--ink)', fontFamily: 'inherit' }}
        />
        <button className="btn accent sm" disabled={!title.trim()} onClick={submit}>Add</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingLeft: 28, flexWrap: 'wrap' }}>
        <AreaProjectPicker areas={areas} projects={projects} areaId={areaId} projectId={projectId}
          onChange={({ areaId, projectId }) => { setAreaId(areaId); setProj(projectId); }}/>
        <PriorityPicker priority={priority} onChange={setPrio}/>
        <DuePicker dueDate={dueDate} onChange={setDue}/>
      </div>
    </div>
  );
}

// ── Task row (inline editable) ───────────────────────────────────────────────────
function TaskRow({ task, areas, projects, onToggle, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const area = areas.find(a => a.id === task.areaId);
  const project = projects.find(p => p.id === task.projectId);
  const p = PRIORITY_MAP[task.priority];
  const overdue = !task.done && isPast(task.dueDate) && !isToday(task.dueDate);

  useEffect(() => { setDraft(task.title); }, [task.title]);

  function commitTitle() {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== task.title) onUpdate(task.id, { title: v });
    else setDraft(task.title);
  }

  // selecting a project locks the area to that project's area
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
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          {area && <AreaChip area={area} small/>}
          {project && <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Hash size={10}/>{project.name}</span>}
          {task.dueDate && <DueChip dueDate={task.dueDate}/>}
        </div>
      </div>

      {/* Inline controls (appear on hover via CSS) */}
      <div className="fx-task-actions" style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <PriorityPicker priority={task.priority} onChange={v => onUpdate(task.id, { priority: v })}/>
        <DuePicker dueDate={task.dueDate} onChange={v => onUpdate(task.id, { dueDate: v })}/>
        <AreaProjectPicker areas={areas} projects={projects} areaId={task.areaId} projectId={task.projectId}
          onChange={handleAreaProject} align="right"/>
        <button className="icon-btn sm" onClick={() => onDelete(task)} title="Delete"><Trash2 size={13}/></button>
      </div>
      {overdue && <span style={{ position: 'absolute', right: 8, top: 8, fontSize: 9, fontWeight: 700, color: 'var(--danger)', letterSpacing: '.05em' }}>OVERDUE</span>}
    </div>
  );
}

// ── Areas & Projects rail ────────────────────────────────────────────────────────
function AreasRail({ areas, projects, tasks, selAreaId, selProjectId, onSelect, onNewArea, onEditArea, onArchiveArea, onDeleteArea, onNewProject, onEditProject, onArchiveProject }) {
  const [showArchived, setShowArchived] = useState(false);
  const [menuArea, setMenuArea] = useState(null);
  const visAreas = areas.filter(a => showArchived ? a.archived : !a.archived).sort((a,b) => (a.order||0)-(b.order||0));
  const openCount = (areaId) => tasks.filter(t => !t.done && t.areaId === areaId).length;
  const openAll = tasks.filter(t => !t.done).length;

  return (
    <div style={{ width: 244, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>Areas</span>
        <button className="icon-btn sm" onClick={onNewArea} title="New area"><Plus size={15}/></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {/* All tasks */}
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
              {/* Projects */}
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

// ── Main page ────────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const {
    focusAreas: areas, focusProjects: projects, focusTasks: tasks,
    addFocusArea, updateFocusArea, deleteFocusArea,
    addFocusProject, updateFocusProject,
    addFocusTask, updateFocusTask, deleteFocusTask, toggleFocusTask,
  } = useData();

  const [selAreaId, setSelAreaId]     = useState(null);
  const [selProjectId, setSelProjectId] = useState(null);
  const [sortBy, setSortBy]   = useState('created'); // created | due | priority
  const [showDone, setShowDone] = useState(false);

  const [areaModal, setAreaModal] = useState(null);     // { initial } | null
  const [projectModal, setProjectModal] = useState(null); // { initial, defaultAreaId } | null
  const [confirm, setConfirm] = useState(null);

  // ── Filtering ───────────────────────────────────────────────────────────────
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
      if (a.done !== b.done) return a.done ? 1 : -1;       // done sink to bottom
      if (sortBy === 'priority') return prioVal(b) - prioVal(a) || (b.createdAt||0) - (a.createdAt||0);
      if (sortBy === 'due')      return dueVal(a) - dueVal(b)   || (b.createdAt||0) - (a.createdAt||0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return list;
  }, [tasks, selAreaId, selProjectId, showDone, sortBy]);

  const openCount = filtered.filter(t => !t.done).length;

  // ── Handlers ──────────────────────────────────────────────────────────────────
  function handleAdd(data) {
    addFocusTask(data);
    toast.success('Task added');
  }
  function handleToggle(task) {
    toggleFocusTask(task.id, !task.done);
    if (!task.done) toast.success('Completed ✓');
  }

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

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <AreasRail
        areas={areas} projects={projects} tasks={tasks}
        selAreaId={selAreaId} selProjectId={selProjectId}
        onSelect={(a, p) => { setSelAreaId(a); setSelProjectId(p); }}
        onNewArea={() => setAreaModal({ initial: null })}
        onEditArea={a => setAreaModal({ initial: a })}
        onArchiveArea={a => { updateFocusArea(a.id, { archived: !a.archived }); }}
        onDeleteArea={a => setConfirm({
          title: `Delete "${a.name}"?`,
          message: 'Its projects will be deleted and its tasks moved to Unassigned. This cannot be undone.',
          onConfirm: () => { deleteFocusArea(a.id); if (selAreaId === a.id) { setSelAreaId(null); setSelProjectId(null); } },
        })}
        onNewProject={areaId => setProjectModal({ initial: null, defaultAreaId: areaId })}
        onEditProject={p => setProjectModal({ initial: p })}
        onArchiveProject={p => updateFocusProject(p.id, { archived: !p.archived })}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px' }}>
        <QuickAdd
          areas={areas} projects={projects}
          presetAreaId={selProjectId ? (projects.find(p => p.id === selProjectId)?.areaId || '') : (selAreaId || '')}
          presetProjectId={selProjectId || ''}
          onAdd={handleAdd}
        />

        {/* Sort / filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{openCount} open</span>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Sort</span>
          {[['created','Newest'],['due','Due date'],['priority','Priority']].map(([v,l]) => (
            <button key={v} className="chip" onClick={() => setSortBy(v)}
              style={sortBy === v ? { borderColor: 'var(--tasks)', color: 'var(--tasks)', background: 'var(--tasks-dim)' } : undefined}>{l}</button>
          ))}
          <button className="chip" onClick={() => setShowDone(v => !v)}
            style={showDone ? { borderColor: 'var(--tasks)', color: 'var(--tasks)', background: 'var(--tasks-dim)' } : undefined}>
            {showDone ? 'Hiding nothing' : 'Show done'}
          </button>
        </div>

        {/* List */}
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
              onDelete={task => setConfirm({ title: 'Delete task?', message: `"${task.title}" will be permanently removed.`, onConfirm: () => deleteFocusTask(task.id) })}/>
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
      <ConfirmDialog isOpen={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.title} message={confirm?.message}
        onConfirm={() => confirm?.onConfirm()}/>
    </div>
  );
}
