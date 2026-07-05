// Daily Log — the workhorse. Date header, rapid-logged entries, quick-add.
// Date is driven by ?d=YYYY-MM-DD (defaults to today) for deep-linking.
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { useData } from '../../context/DataContext';
import EntryRow from '../../components/bujo/EntryRow';
import QuickAdd from '../../components/bujo/QuickAdd';
import { entriesFor, dailyLabel, addDaysKey, todayKey, isTodayKey } from '../../utils/bujo';

export default function DailyLog() {
  const [params, setParams] = useSearchParams();
  const { bujoEntries } = useData();
  const dk = params.get('d') || todayKey();

  const entries = entriesFor(bujoEntries, 'daily', dk);
  const setDk = next => setParams(next === todayKey() ? {} : { d: next });

  return (
    <div className="bujo-page">
      <div className="bujo-day-header">
        <div className="bujo-day-nav">
          <button className="bujo-nav-btn" onClick={() => setDk(addDaysKey(dk, -1))} title="Previous day"><ChevronLeft size={16}/></button>
          <button className="bujo-nav-btn" onClick={() => setDk(addDaysKey(dk, 1))}  title="Next day"><ChevronRight size={16}/></button>
        </div>
        <div className="bujo-day-title">
          <h2>{dailyLabel(dk)}</h2>
          {isTodayKey(dk) && <span className="bujo-today-pill">Today</span>}
        </div>
        <div className="bujo-day-tools">
          {!isTodayKey(dk) && (
            <button className="btn ghost sm" onClick={() => setDk(todayKey())}>
              <CalendarCheck size={13}/> Today
            </button>
          )}
          <input
            type="date"
            className="bujo-date-picker"
            value={dk}
            onChange={e => e.target.value && setDk(e.target.value)}
          />
        </div>
      </div>

      <div className="bujo-entries">
        {entries.length === 0
          ? <div className="bujo-empty-line">Nothing logged yet. Add your first entry below.</div>
          : entries.map(e => <EntryRow key={e.id} entry={e}/>)}
      </div>

      <QuickAdd logType="daily" logKey={dk} placeholder="Log a task, note, event…"/>
    </div>
  );
}
