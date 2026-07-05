// src/components/dashboard/CheckinWidget.jsx — AM/PM daily review check-in.
// Tracks whether the morning/evening dashboard review actually happened.
import { Sun, Moon, Flame } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { tsToDateInput } from '../../utils';

function dayKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return tsToDateInput(d.getTime());
}

// Consecutive days with BOTH check-ins; an incomplete today doesn't break it.
function computeStreak(checkins) {
  const today = checkins[dayKey(0)];
  let i = (today?.am && today?.pm) ? 0 : 1;
  let streak = 0;
  for (; ; i++) {
    const c = checkins[dayKey(i)];
    if (c?.am && c?.pm) streak++;
    else break;
  }
  return streak;
}

export default function CheckinWidget() {
  const { checkins, setCheckin } = useData();
  const todayKey = dayKey(0);
  const today    = checkins[todayKey] || {};
  const streak   = computeStreak(checkins);

  const week = Array.from({ length: 7 }, (_, idx) => {
    const off = 6 - idx;
    const c   = checkins[dayKey(off)] || {};
    const n   = (c.am ? 1 : 0) + (c.pm ? 1 : 0);
    return { key: dayKey(off), n, isToday: off === 0 };
  });

  return (
    <div className="checkin-wrap">
      <button className={`checkin-pill${today.am ? ' done' : ''}`} title="Did my morning review"
        onClick={() => setCheckin(todayKey, 'am', !today.am)}>
        <Sun size={13}/> Morning
      </button>
      <button className={`checkin-pill${today.pm ? ' done' : ''}`} title="Did my evening review"
        onClick={() => setCheckin(todayKey, 'pm', !today.pm)}>
        <Moon size={13}/> Evening
      </button>
      <div className="checkin-days" title="Last 7 days (both reviews = full dot)">
        {week.map(d => (
          <span key={d.key} className={`checkin-dot${d.n === 2 ? ' full' : d.n === 1 ? ' half' : ''}${d.isToday ? ' today' : ''}`}/>
        ))}
      </div>
      {streak > 0 && (
        <span className="checkin-streak"><Flame size={12}/> {streak}d</span>
      )}
    </div>
  );
}
