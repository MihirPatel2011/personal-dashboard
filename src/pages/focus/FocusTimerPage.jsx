import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Square, Check, PencilLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import Modal from '../../components/common/Modal';
import { fmtClock, fmtDuration } from '../../utils/focusStats';

// ── Setup: pick area / project / tasks before starting ──────────────────────────
function SetupPanel({ areas, projects, tasks, sel, setSel }) {
  const activeAreas = areas.filter(a => !a.archived);
  const area = areas.find(a => a.id === sel.areaId);
  const areaProjects = projects.filter(p => p.areaId === sel.areaId && !p.archived);
  const candidateTasks = tasks.filter(t =>
    !t.done &&
    (sel.areaId ? t.areaId === sel.areaId : true) &&
    (sel.projectId ? t.projectId === sel.projectId : true)
  );

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
      <div className="field" style={{ marginBottom: 18 }}>
        <label>Area</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {activeAreas.map(a => {
            const on = sel.areaId === a.id;
            return (
              <button key={a.id} onClick={() => setSel(s => ({ ...s, areaId: a.id, projectId: '', taskIds: [] }))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 99,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${on ? a.color : 'var(--border)'}`,
                  background: on ? a.color + '22' : 'transparent', color: on ? a.color : 'var(--ink-3)',
                }}>{a.icon} {a.name}</button>
            );
          })}
          {activeAreas.length === 0 && <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>Create an area in the Tasks tab first.</span>}
        </div>
      </div>

      {sel.areaId && areaProjects.length > 0 && (
        <div className="field" style={{ marginBottom: 18 }}>
          <label>Project (optional)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button onClick={() => setSel(s => ({ ...s, projectId: '', taskIds: [] }))} className="chip"
              style={!sel.projectId ? { borderColor: area.color, color: area.color, background: area.color+'22' } : undefined}>None</button>
            {areaProjects.map(p => (
              <button key={p.id} onClick={() => setSel(s => ({ ...s, projectId: p.id, taskIds: [] }))} className="chip"
                style={sel.projectId === p.id ? { borderColor: area.color, color: area.color, background: area.color+'22' } : undefined}>{p.name}</button>
            ))}
          </div>
        </div>
      )}

      {sel.areaId && (
        <div className="field">
          <label>Tasks for this session ({sel.taskIds.length} selected)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 6 }}>
            {candidateTasks.length === 0 && <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '10px 8px' }}>No open tasks here — you can still focus without selecting tasks.</div>}
            {candidateTasks.map(t => {
              const on = sel.taskIds.includes(t.id);
              return (
                <button key={t.id} onClick={() => setSel(s => ({ ...s, taskIds: on ? s.taskIds.filter(x => x !== t.id) : [...s.taskIds, t.id] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                    border: 'none', background: on ? 'var(--tasks-dim)' : 'transparent', textAlign: 'left' }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `2px solid ${on ? 'var(--tasks)' : 'var(--border-strong)'}`, background: on ? 'var(--tasks)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    {on && <Check size={11} strokeWidth={3}/>}
                  </span>
                  <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{t.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Manual session log modal ─────────────────────────────────────────────────────
function ManualLogModal({ areas, projects, tasks, onSave, onCancel }) {
  const now = new Date();
  const [areaId, setAreaId] = useState(areas.find(a => !a.archived)?.id || '');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(now.toISOString().slice(0,10));
  const [startTime, setStartTime] = useState('09:00');
  const [minutes, setMinutes] = useState(30);
  const [note, setNote] = useState('');
  const [taskIds, setTaskIds] = useState([]);
  const areaProjects = projects.filter(p => p.areaId === areaId && !p.archived);
  const candidateTasks = tasks.filter(t => (areaId ? t.areaId === areaId : true) && (projectId ? t.projectId === projectId : true));

  function save() {
    const start = new Date(`${date}T${startTime}`).getTime();
    const dur = Math.max(1, Number(minutes)) * 60;
    onSave({
      areaId, projectId, startTime: start, endTime: start + dur * 1000,
      durationSeconds: dur, taskIds, completions: [], note: note.trim(),
    });
  }

  return (
    <>
      <div className="modal-body">
        <div className="field">
          <label>Area</label>
          <select value={areaId} onChange={e => { setAreaId(e.target.value); setProjectId(''); }}>
            {areas.filter(a => !a.archived).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
        </div>
        {areaProjects.length > 0 && (
          <div className="field">
            <label>Project (optional)</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">None</option>
              {areaProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)}/></div>
          <div className="field" style={{ width: 120 }}><label>Start</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}/></div>
          <div className="field" style={{ width: 110 }}><label>Minutes</label><input type="number" min={1} value={minutes} onChange={e => setMinutes(e.target.value)}/></div>
        </div>
        {candidateTasks.length > 0 && (
          <div className="field">
            <label>Tasks worked on (optional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {candidateTasks.map(t => {
                const on = taskIds.includes(t.id);
                return <button key={t.id} className="chip" onClick={() => setTaskIds(on ? taskIds.filter(x=>x!==t.id) : [...taskIds, t.id])}
                  style={on ? { borderColor: 'var(--tasks)', color: 'var(--tasks)', background: 'var(--tasks-dim)' } : undefined}>{t.title}</button>;
              })}
            </div>
          </div>
        )}
        <div className="field"><label>Reflection note (optional)</label><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What did you get done?"/></div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn accent" disabled={!areaId} onClick={save}>Log session</button>
      </div>
    </>
  );
}

// ── Stop / save modal ────────────────────────────────────────────────────────────
function StopModal({ elapsedSeconds, onSave, onCancel }) {
  const [mins, setMins] = useState(Math.max(1, Math.round(elapsedSeconds / 60)));
  const [note, setNote] = useState('');
  return (
    <>
      <div className="modal-body">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Session length</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <input type="number" min={1} value={mins} onChange={e => setMins(e.target.value)}
              style={{ width: 90, textAlign: 'center', fontSize: 26, fontWeight: 800, padding: '6px 8px', background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--ink)', fontFamily: 'var(--mono)' }}/>
            <span style={{ fontSize: 15, color: 'var(--ink-3)' }}>minutes</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>Adjust if you forgot to stop the timer.</div>
        </div>
        <div className="field"><label>Reflection note (optional)</label><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="How did it go? What's next?"/></div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onCancel}>Keep going</button>
        <button className="btn accent" onClick={() => onSave(Math.max(1, Number(mins)) * 60, note.trim())}>Save session</button>
      </div>
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────────
export default function FocusTimerPage() {
  const { focusAreas: areas, focusProjects: projects, focusTasks: tasks,
          addFocusSession, toggleFocusTask } = useData();

  const [sel, setSel] = useState({ areaId: '', projectId: '', taskIds: [] });
  const [status, setStatus] = useState('idle'); // idle | running | paused
  const [accumulated, setAccumulated] = useState(0); // seconds banked across pauses
  const [runningSince, setRunningSince] = useState(null); // ms
  const [sessionStart, setSessionStart] = useState(null); // ms (first start)
  const [completions, setCompletions] = useState([]); // [{ taskId, ts }]
  const [, forceTick] = useState(0);
  const [showStop, setShowStop] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // 1s ticker while running
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => forceTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const elapsed = accumulated + (status === 'running' && runningSince ? (Date.now() - runningSince) / 1000 : 0);

  const area = areas.find(a => a.id === sel.areaId);
  const project = projects.find(p => p.id === sel.projectId);
  const sessionTasks = useMemo(() => tasks.filter(t => sel.taskIds.includes(t.id)), [tasks, sel.taskIds]);
  const doneIds = new Set(completions.map(c => c.taskId));

  function start() {
    if (!sel.areaId) { toast.error('Pick an area first'); return; }
    const now = Date.now();
    setSessionStart(now); setRunningSince(now); setAccumulated(0); setCompletions([]); setStatus('running');
  }
  function pause() {
    setAccumulated(a => a + (Date.now() - runningSince) / 1000);
    setRunningSince(null); setStatus('paused');
  }
  function resume() { setRunningSince(Date.now()); setStatus('running'); }

  function tickTask(t) {
    if (doneIds.has(t.id)) return;
    setCompletions(c => [...c, { taskId: t.id, ts: Date.now() }]);
    toggleFocusTask(t.id, true);
    toast.success(`✓ ${t.title}`);
  }

  function openStop() {
    if (status === 'running') pause();
    setShowStop(true);
  }

  function saveSession(durationSeconds, note) {
    const end = Date.now();
    addFocusSession({
      startTime: sessionStart || (end - durationSeconds * 1000),
      endTime: end,
      durationSeconds,
      areaId: sel.areaId,
      projectId: sel.projectId || '',
      taskIds: sel.taskIds,
      completions,
      note: note || '',
    });
    toast.success(`Logged ${fmtDuration(durationSeconds)} of focus`);
    // reset
    setStatus('idle'); setAccumulated(0); setRunningSince(null); setSessionStart(null);
    setCompletions([]); setShowStop(false);
    setSel(s => ({ ...s, taskIds: [] }));
  }

  function saveManual(data) {
    addFocusSession(data);
    if (data.taskIds?.length) data.taskIds.forEach(id => { const t = tasks.find(x => x.id === id); if (t && !t.done) toggleFocusTask(id, true); });
    toast.success('Session logged');
    setShowManual(false);
  }

  const running = status !== 'idle';
  const clockColor = status === 'running' ? 'var(--tasks)' : status === 'paused' ? 'var(--warn)' : 'var(--ink)';

  return (
    <div style={{ padding: '28px 24px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%' }}>
      {/* Manual log shortcut */}
      <div style={{ width: '100%', maxWidth: 560, display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn ghost sm" onClick={() => setShowManual(true)}><PencilLine size={13}/> Log past session</button>
      </div>

      {/* Big clock */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'clamp(56px, 12vw, 96px)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, color: clockColor, transition: 'color .3s' }}>
          {fmtClock(elapsed)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '.12em' }}>
          {status === 'running' ? 'Focusing' : status === 'paused' ? 'Paused' : 'Ready'}
          {area && <> · <span style={{ color: area.color }}>{area.icon} {area.name}</span></>}
          {project && <> · {project.name}</>}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, margin: '18px 0 28px' }}>
        {status === 'idle' && <button className="btn accent lg" onClick={start} style={{ gap: 8 }}><Play size={16} fill="#fff"/> Start focus</button>}
        {status === 'running' && <button className="btn lg" onClick={pause} style={{ gap: 8 }}><Pause size={16}/> Pause</button>}
        {status === 'paused' && <button className="btn accent lg" onClick={resume} style={{ gap: 8 }}><Play size={16} fill="#fff"/> Resume</button>}
        {running && <button className="btn lg" onClick={openStop} style={{ gap: 8, background: 'var(--danger-dim)', color: 'var(--danger)', borderColor: 'rgba(240,96,96,.3)' }}><Square size={15} fill="currentColor"/> Stop</button>}
      </div>

      {/* Setup (before start) OR live task ticking (during) */}
      {!running ? (
        <SetupPanel areas={areas} projects={projects} tasks={tasks} sel={sel} setSel={setSel}/>
      ) : (
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', marginBottom: 10 }}>
            Tasks · tick them off as you go
          </div>
          {sessionTasks.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '20px' }}>No tasks attached to this session — just focus on the clock.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sessionTasks.map(t => {
                const done = doneIds.has(t.id);
                const comp = completions.find(c => c.taskId === t.id);
                return (
                  <div key={t.id} onClick={() => tickTask(t)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--r)', cursor: done ? 'default' : 'pointer',
                    background: done ? 'var(--ok-dim)' : 'var(--surface)', border: `1px solid ${done ? 'rgba(0,200,150,.3)' : 'var(--border)'}`,
                  }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: `2px solid ${done ? 'var(--ok)' : 'var(--border-strong)'}`, background: done ? 'var(--ok)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      {done && <Check size={13} strokeWidth={3}/>}
                    </span>
                    <span style={{ flex: 1, fontSize: 14, color: done ? 'var(--ink-3)' : 'var(--ink)', textDecoration: done ? 'line-through' : 'none' }}>{t.title}</span>
                    {comp && <span style={{ fontSize: 11, color: 'var(--ok)', fontFamily: 'var(--mono)' }}>{new Date(comp.ts).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Check size={12} style={{ color: 'var(--ok)' }}/> {completions.length} completed this session
          </div>
        </div>
      )}

      <Modal isOpen={showStop} onClose={() => setShowStop(false)} title="Stop & save session" size="sm">
        {showStop && <StopModal elapsedSeconds={elapsed} onSave={saveSession} onCancel={() => { setShowStop(false); if (status === 'paused') resume(); }}/>}
      </Modal>
      <Modal isOpen={showManual} onClose={() => setShowManual(false)} title="Log a past session" size="md">
        {showManual && <ManualLogModal areas={areas} projects={projects} tasks={tasks} onSave={saveManual} onCancel={() => setShowManual(false)}/>}
      </Modal>
    </div>
  );
}
