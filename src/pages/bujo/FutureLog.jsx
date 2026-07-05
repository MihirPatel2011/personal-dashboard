// Future Log — forward-looking view of the next 12 months, grouped by month.
// Tasks/events scheduled months out land here; at month-start they migrate into
// the Monthly Log via the migration flow.
import { useData } from '../../context/DataContext';
import EntryRow from '../../components/bujo/EntryRow';
import QuickAdd from '../../components/bujo/QuickAdd';
import { entriesFor, futureMonths, monthLabel } from '../../utils/bujo';

export default function FutureLog() {
  const { bujoEntries } = useData();
  const months = futureMonths(12);

  return (
    <div className="bujo-page">
      <div className="bujo-section-head">
        <h2>Future Log</h2>
        <p className="bujo-section-sub">The next 12 months. Schedule anything that isn’t for now.</p>
      </div>

      <div className="bujo-future-grid">
        {months.map(mk => {
          const entries = entriesFor(bujoEntries, 'future', mk);
          return (
            <div key={mk} className="bujo-future-card">
              <div className="bujo-future-month">{monthLabel(mk)}</div>
              <div className="bujo-entries">
                {entries.length === 0
                  ? <div className="bujo-empty-line dim">—</div>
                  : entries.map(e => <EntryRow key={e.id} entry={e}/>)}
              </div>
              <QuickAdd logType="future" logKey={mk} placeholder="Schedule…"/>
            </div>
          );
        })}
      </div>
    </div>
  );
}
