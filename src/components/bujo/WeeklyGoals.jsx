// Weekly goals for a month: each Mon–Sun week of the month gets a small checkable
// goal list. Stored in the bujoWeeklyGoals node, keyed by the week's Monday date.
import { useState } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { monthWeeks, isThisWeek } from '../../utils/bujo';

function WeekCard({ week }) {
  const { bujoWeeklyGoals, addBujoWeeklyGoal, updateBujoWeeklyGoal, deleteBujoWeeklyGoal } = useData();
  const [text, setText] = useState('');

  const goals = bujoWeeklyGoals
    .filter(g => g.weekKey === week.weekKey)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const done = goals.filter(g => g.done).length;

  function add() {
    const t = text.trim();
    if (!t) return;
    setText('');
    addBujoWeeklyGoal({ text: t, weekKey: week.weekKey, order: Date.now() });
  }

  return (
    <div className={`bujo-week-card${isThisWeek(week.weekKey) ? ' current' : ''}`}>
      <div className="bujo-week-head">
        <span className="bujo-week-label">{week.label}</span>
        {goals.length > 0 && <span className="bujo-week-count">{done}/{goals.length}</span>}
        {isThisWeek(week.weekKey) && <span className="bujo-week-now">This week</span>}
      </div>

      <div className="bujo-week-goals">
        {goals.map(g => (
          <div key={g.id} className={`bujo-week-goal${g.done ? ' done' : ''}`}>
            <button
              className={`bujo-week-check${g.done ? ' on' : ''}`}
              onClick={() => updateBujoWeeklyGoal(g.id, { done: !g.done })}
              title={g.done ? 'Mark not done' : 'Mark done'}
            >
              {g.done && <Check size={11}/>}
            </button>
            <span className="bujo-week-text">{g.text}</span>
            <button className="bujo-week-del" onClick={() => deleteBujoWeeklyGoal(g.id)} title="Delete goal">
              <Trash2 size={12}/>
            </button>
          </div>
        ))}
      </div>

      <div className="bujo-week-add">
        <Plus size={13}/>
        <input
          value={text}
          placeholder="Add a goal…"
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
      </div>
    </div>
  );
}

export default function WeeklyGoals({ mk }) {
  const weeks = monthWeeks(mk);
  return (
    <div className="bujo-weekly">
      <div className="bujo-col-label">Weekly Goals</div>
      <div className="bujo-week-grid">
        {weeks.map(w => <WeekCard key={w.weekKey} week={w}/>)}
      </div>
    </div>
  );
}
