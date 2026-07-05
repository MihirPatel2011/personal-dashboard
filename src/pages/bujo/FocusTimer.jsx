// Focus Timer — pick a task (or type one), run a stopwatch, then log the session
// as a △ entry in today's Daily Log. Styled to sit on the journal's paper: a
// hand-drawn clock dial, handwriting labels, warm controls.
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import BulletGlyph from '../../components/bujo/BulletGlyph';
import { clockFmt, durationLabel, todayKey } from '../../utils/bujo';

const R = 104;
const C = 2 * Math.PI * R;

export default function FocusTimer() {
  const { bujoEntries, addBujoEntry } = useData();
  const [taskText, setTaskText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [running, setRunning]   = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const accRef   = useRef(0);   // accumulated ms across pauses
  const startRef = useRef(0);   // timestamp of the current run segment

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(accRef.current + (Date.now() - startRef.current)), 200);
    return () => clearInterval(id);
  }, [running]);

  function start() { if (running) return; startRef.current = Date.now(); setRunning(true); }
  function pause() {
    if (!running) return;
    accRef.current += Date.now() - startRef.current;
    setElapsed(accRef.current);
    setRunning(false);
  }
  function reset() { setRunning(false); accRef.current = 0; setElapsed(0); }

  async function log() {
    if (elapsed < 1000) { toast.error('Start the timer first.'); return; }
    const t    = taskText.trim();
    const text = `Focused ${durationLabel(elapsed)}${t ? ` · ${t}` : ''}`;
    await addBujoEntry({ type: 'happened', text, logType: 'daily', logKey: todayKey(), order: Date.now(), focusMs: elapsed });
    toast.success('Logged to today’s Daily Log');
    reset();
    setTaskText('');
  }

  const openTasks = bujoEntries
    .filter(e => e.type === 'task' && e.state === 'open')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const suggestions = openTasks.filter(e => e.text.toLowerCase().includes(taskText.toLowerCase()));
  const todaysFocus = bujoEntries
    .filter(e => e.logType === 'daily' && e.logKey === todayKey() && e.focusMs)
    .reduce((s, e) => s + e.focusMs, 0);

  // Ring sweeps once per minute — a quiet sense of motion while running.
  const progress = (elapsed % 60000) / 60000;
  const offset   = C * (1 - progress);

  return (
    <div className="bujo-page">
      <div className="bujo-section-head">
        <h2>Focus</h2>
        <p className="bujo-section-sub">Pick something to work on, run the timer, then log it to today.</p>
      </div>

      <div className="bujo-focus">
        <div className="bujo-focus-task">
          <span className="bujo-focus-task-label">Working on</span>
          <div className="bujo-focus-picker">
            <input
              className="bujo-focus-input"
              value={taskText}
              placeholder="a task…"
              onChange={e => { setTaskText(e.target.value); setPickerOpen(true); }}
              onFocus={() => setPickerOpen(true)}
              onBlur={() => setPickerOpen(false)}
            />
            {pickerOpen && suggestions.length > 0 && (
              <div className="bujo-focus-menu">
                {suggestions.map(e => (
                  <button
                    key={e.id}
                    className="bujo-focus-option"
                    onMouseDown={ev => { ev.preventDefault(); setTaskText(e.text); setPickerOpen(false); }}
                  >
                    <BulletGlyph entry={e}/>
                    <span className="bujo-focus-option-text">{e.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`bujo-focus-dial${running ? ' running' : ''}`}>
          <svg className="bujo-focus-ring" viewBox="0 0 240 240">
            <circle className="track" cx="120" cy="120" r={R}/>
            <circle
              className="prog" cx="120" cy="120" r={R}
              style={{ strokeDasharray: C, strokeDashoffset: offset }}
            />
          </svg>
          <div className="bujo-focus-clock">{clockFmt(elapsed)}</div>
        </div>

        <div className="bujo-focus-controls">
          {running
            ? <button className="bujo-focus-btn" onClick={pause}><Pause size={15}/> Pause</button>
            : <button className="bujo-focus-btn primary" onClick={start}><Play size={15}/> {elapsed > 0 ? 'Resume' : 'Start'}</button>}
          <button className="bujo-focus-btn ghost" onClick={reset} disabled={elapsed === 0 && !running}><RotateCcw size={14}/> Reset</button>
          <button className="bujo-focus-btn log" onClick={log} disabled={elapsed < 1000}><CheckCircle2 size={15}/> Log session</button>
        </div>

        {todaysFocus > 0 && (
          <div className="bujo-focus-today">△ Focused today · <strong>{durationLabel(todaysFocus)}</strong></div>
        )}
      </div>
    </div>
  );
}
