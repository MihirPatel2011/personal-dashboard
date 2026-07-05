// A "Key" button that opens a dropdown explaining every bullet symbol, the
// priority signifier, and the quick-add keyboard shortcuts.
import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import BulletGlyph from './BulletGlyph';

const BULLETS = [
  { entry: { type: 'task',       state: 'open' },       label: 'Task' },
  { entry: { type: 'task',       state: 'complete' },   label: 'Task complete' },
  { entry: { type: 'task',       state: 'migrated' },   label: 'Task migrated (next month)' },
  { entry: { type: 'task',       state: 'scheduled' },  label: 'Task scheduled (Future Log)' },
  { entry: { type: 'task',       state: 'irrelevant' }, label: 'Task abandoned' },
  { entry: { type: 'note' },       label: 'Note' },
  { entry: { type: 'event' },      label: 'Event' },
  { entry: { type: 'idea' },       label: 'Idea' },
  { entry: { type: 'inProgress' }, label: 'In progress' },
  { entry: { type: 'happened' },   label: 'Something happened' },
  { entry: { type: 'mood' },       label: 'Mood' },
];

export default function LegendButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bujo-legend-wrap">
      <button className="btn ghost sm" onClick={() => setOpen(v => !v)} title="Symbol key">
        <KeyRound size={13}/> Key
      </button>

      {open && (
        <>
          <div className="bujo-legend-backdrop" onClick={() => setOpen(false)}/>
          <div className="bujo-legend-menu">
            <div className="bujo-legend-section">Bullets</div>
            {BULLETS.map(({ entry, label }) => (
              <div key={`${entry.type}-${entry.state || ''}`} className="bujo-legend-row">
                <span className="bujo-legend-glyph"><BulletGlyph entry={entry}/></span>
                <span className="bujo-legend-label">{label}</span>
              </div>
            ))}

            <div className="bujo-legend-section">Signifier</div>
            <div className="bujo-legend-row">
              <span className="bujo-legend-glyph bujo-legend-star">★</span>
              <span className="bujo-legend-label">Priority (toggle on any entry)</span>
            </div>

            <div className="bujo-legend-section">Quick-add</div>
            <div className="bujo-legend-tip"><kbd>Tab</kbd> change bullet type</div>
            <div className="bujo-legend-tip"><kbd>Enter</kbd> add entry</div>
            <div className="bujo-legend-tip">Click a task’s bullet to cycle its state</div>
          </div>
        </>
      )}
    </div>
  );
}
