// A single rapid-logged entry. Click the bullet to cycle a task's state, toggle
// the ★ priority signifier, edit inline, or delete. Editing is one seamless text:
// the first line is the entry, any lines below (added with Shift+Enter) are its
// indented description — same font, same look, just on the next line.
import { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import BulletGlyph from './BulletGlyph';
import { useData } from '../../context/DataContext';
import {
  cycleTaskState, toggleSignifier, TASK_STATE_LABEL, monthLabel, ENTRY_TYPE_MAP,
} from '../../utils/bujo';

function autoGrow(el) { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }

export default function EntryRow({ entry, dateLabel, dateOverdue }) {
  const { updateBujoEntry, deleteBujoEntry } = useData();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const taRef = useRef(null);

  useEffect(() => {
    if (editing && taRef.current) {
      const el = taRef.current;
      el.focus();
      autoGrow(el);
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  const isTask    = entry.type === 'task';
  const priority  = !!entry.signifiers?.priority;
  const abandoned = isTask && entry.state === 'irrelevant';
  const completed = isTask && entry.state === 'complete';
  const origin    = entry.migration?.length ? entry.migration[entry.migration.length - 1] : null;

  function startEdit() {
    setDraft(entry.note ? `${entry.text}\n${entry.note}` : entry.text);
    setEditing(true);
  }
  function cycleBullet() {
    if (!isTask) return;                          // only tasks cycle
    updateBujoEntry(entry.id, { state: cycleTaskState(entry.state) });
  }
  function togglePriority() {
    updateBujoEntry(entry.id, { signifiers: toggleSignifier(entry.signifiers, 'priority') });
  }
  function commit() {
    const lines = draft.split('\n');
    const text  = lines[0].trim();
    const note  = lines.slice(1).join('\n').trim();
    setEditing(false);
    if (!text) return;                            // empty title → keep the original
    const patch = {};
    if (text !== entry.text)         patch.text = text;
    if (note !== (entry.note || '')) patch.note = note;
    if (Object.keys(patch).length)   updateBujoEntry(entry.id, patch);
  }

  return (
    <div className={`bujo-entry${abandoned ? ' abandoned' : ''}${completed ? ' completed' : ''}${priority ? ' priority' : ''}`}>
      {dateLabel && (
        <span className={`bujo-entry-date${dateOverdue ? ' overdue' : ''}`}>{dateLabel}</span>
      )}
      <button
        className={`bujo-sig${priority ? ' on' : ''}`}
        onClick={togglePriority}
        title={priority ? 'Remove priority' : 'Mark priority (★)'}
      >★</button>

      <button
        className={`bujo-bullet${isTask ? ' cyclable' : ''}`}
        onClick={cycleBullet}
        title={isTask ? `${TASK_STATE_LABEL[entry.state]} — click to cycle` : ENTRY_TYPE_MAP[entry.type]?.label}
      >
        <BulletGlyph entry={entry}/>
      </button>

      <div className="bujo-entry-body">
        {editing ? (
          <textarea
            ref={taRef}
            className="bujo-entry-edit"
            rows={1}
            value={draft}
            onChange={e => { setDraft(e.target.value); autoGrow(e.target); }}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
              if (e.key === 'Escape')               setEditing(false);
              // Shift+Enter falls through → a new (description) line in the same text
            }}
          />
        ) : (
          <>
            <span className="bujo-entry-text" onClick={startEdit} title="Click to edit · Shift+Enter for a new line">
              {entry.text || <span className="bujo-entry-empty">(empty)</span>}
              {origin && (
                <span className="bujo-origin">
                  {origin.action === 'migrate' ? '↩ migrated from ' : '↩ scheduled from '}
                  {monthLabel(origin.fromKey.length === 7 ? origin.fromKey : origin.fromKey.slice(0, 7))}
                </span>
              )}
            </span>
            {entry.note && (
              <div className="bujo-entry-note" onClick={startEdit}>{entry.note}</div>
            )}
          </>
        )}
      </div>

      <button className="bujo-entry-del" onClick={() => deleteBujoEntry(entry.id)} title="Delete entry">
        <Trash2 size={13}/>
      </button>
    </div>
  );
}
