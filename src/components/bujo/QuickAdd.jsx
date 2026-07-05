// Keyboard-first capture: type the entry, press Tab to cycle the bullet type,
// Enter to save. Shift+Enter just starts a new line underneath in the same text —
// the first line becomes the entry, any lines below it become its description.
import { useState, useRef } from 'react';
import BulletGlyph from './BulletGlyph';
import { useData } from '../../context/DataContext';
import { nextQuickAddType, ENTRY_TYPE_MAP, todayKey } from '../../utils/bujo';

function autoGrow(el) { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }

export default function QuickAdd({ logType, logKey, placeholder = 'Add an entry…' }) {
  const { addBujoEntry } = useData();
  const [value, setValue] = useState('');
  const [type, setType]   = useState('task');
  const ref = useRef(null);

  const meta = ENTRY_TYPE_MAP[type];

  function cycleType() { setType(t => nextQuickAddType(t)); }

  async function submit() {
    const lines = value.split('\n');
    const text  = lines[0].trim();
    if (!text) return;
    const note  = lines.slice(1).join('\n').trim();
    const entry = { type, text, logType, logKey, order: Date.now() };
    if (note)              entry.note = note;
    if (type === 'task')   entry.state = 'open';
    if (type === 'event')  entry.eventDate = logType === 'daily' ? logKey : todayKey();
    setValue(''); setType('task');
    if (ref.current) ref.current.style.height = 'auto';
    await addBujoEntry(entry);
  }

  return (
    <div className="bujo-quickadd">
      <button
        type="button"
        className="bujo-quickadd-type"
        onClick={cycleType}
        title={`${meta.label} — click or press Tab to change type`}
      >
        <BulletGlyph entry={{ type, state: 'open' }}/>
      </button>
      <textarea
        ref={ref}
        className="bujo-quickadd-input"
        rows={1}
        value={value}
        placeholder={`${placeholder}  ·  ${meta.label}`}
        onChange={e => { setValue(e.target.value); autoGrow(e.target); }}
        onKeyDown={e => {
          if (e.key === 'Tab')                       { e.preventDefault(); cycleType(); }
          else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          // Shift+Enter falls through → a new line in the same text
        }}
      />
    </div>
  );
}
