// Renders the precise BuJo symbol for an entry's type + state.
// The glyph is the module's visual signature: crisp, legible, animated on change.
import { glyphFor } from '../../utils/bujo';

export default function BulletGlyph({ entry, className = '' }) {
  const isTask     = entry.type === 'task';
  const abandoned  = isTask && entry.state === 'irrelevant';
  return (
    <span
      key={`${entry.type}-${entry.state}`}        // re-key → re-trigger the pop animation
      className={`bujo-glyph bujo-glyph-${entry.type}${isTask ? ` is-${entry.state}` : ''}${abandoned ? ' abandoned' : ''} ${className}`}
      aria-hidden="true"
    >
      {glyphFor(entry)}
    </span>
  );
}
