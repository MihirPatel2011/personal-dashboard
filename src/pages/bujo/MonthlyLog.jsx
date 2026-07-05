// Monthly Log — two halves: a calendar (every date + day-of-week initial, with
// events shown against dates) and a task list. Hosts the End-of-Month Migration.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarClock, CalendarCheck } from 'lucide-react';
import { useData } from '../../context/DataContext';
import EntryRow from '../../components/bujo/EntryRow';
import QuickAdd from '../../components/bujo/QuickAdd';
import MigrationModal from '../../components/bujo/MigrationModal';
import MigrateForward from '../../components/bujo/MigrateForward';
import WeeklyGoals from '../../components/bujo/WeeklyGoals';
import {
  entriesFor, monthDays, monthLabel, addMonthsKey, thisMonthKey,
  monthDailyOpenTasks, futureTasks, isOverdueDaily, dayChip, monthChip,
} from '../../utils/bujo';

export default function MonthlyLog() {
  const [params, setParams] = useSearchParams();
  const { bujoEntries } = useData();
  const [migrating, setMigrating] = useState(false);

  const mk = params.get('m') || thisMonthKey();
  const setMk = next => setParams(next === thisMonthKey() ? {} : { m: next });

  const tasks      = entriesFor(bujoEntries, 'monthly', mk);
  const dailyOpen  = monthDailyOpenTasks(bujoEntries, mk);
  const scheduled  = futureTasks(bujoEntries);
  const days       = monthDays(mk);

  // Events for the calendar: any event entry whose eventDate falls in this month.
  const eventsByDate = {};
  for (const e of bujoEntries) {
    if (e.type === 'event' && e.eventDate && e.eventDate.startsWith(mk + '-')) {
      (eventsByDate[e.eventDate] ||= []).push(e);
    }
  }

  return (
    <div className="bujo-page">
      <div className="bujo-day-header">
        <div className="bujo-day-nav">
          <button className="bujo-nav-btn" onClick={() => setMk(addMonthsKey(mk, -1))} title="Previous month"><ChevronLeft size={16}/></button>
          <button className="bujo-nav-btn" onClick={() => setMk(addMonthsKey(mk, 1))}  title="Next month"><ChevronRight size={16}/></button>
        </div>
        <div className="bujo-day-title"><h2>{monthLabel(mk)}</h2></div>
        <div className="bujo-day-tools">
          {mk !== thisMonthKey() && (
            <button className="btn ghost sm" onClick={() => setMk(thisMonthKey())}><CalendarCheck size={13}/> This month</button>
          )}
          <button className="btn accent sm" onClick={() => setMigrating(true)}>
            <CalendarClock size={13}/> End-of-Month Migration
          </button>
        </div>
      </div>

      <div className="bujo-month-grid">
        {/* Calendar half */}
        <div className="bujo-month-col">
          <div className="bujo-col-label">Calendar</div>
          <div className="bujo-cal">
            {days.map(d => (
              <div key={d.dk} className={`bujo-cal-row${d.dow === 0 || d.dow === 6 ? ' weekend' : ''}`}>
                <span className="bujo-cal-date">{String(d.day).padStart(2, '0')}</span>
                <span className="bujo-cal-dow">{d.dowInit}</span>
                <span className="bujo-cal-events">
                  {(eventsByDate[d.dk] || []).map(ev => (
                    <span key={ev.id} className="bujo-cal-event">○ {ev.text}</span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Task list half */}
        <div className="bujo-month-col">
          <div className="bujo-col-label">This month</div>
          <div className="bujo-entries">
            {tasks.length === 0
              ? <div className="bujo-empty-line">No monthly tasks yet.</div>
              : tasks.map(e => <EntryRow key={e.id} entry={e}/>)}
          </div>
          <QuickAdd logType="monthly" logKey={mk} placeholder="Add a task for this month…"/>

          {/* Incomplete tasks pulled from this month's daily logs */}
          <div className="bujo-col-label bujo-col-label-mt">Open from daily logs</div>
          <div className="bujo-entries">
            {dailyOpen.length === 0
              ? <div className="bujo-empty-line">No open daily tasks this month.</div>
              : dailyOpen.map(e => {
                  const overdue = isOverdueDaily(e);
                  return (
                    <div key={e.id} className="bujo-mtask">
                      <EntryRow entry={e} dateLabel={dayChip(e.logKey)} dateOverdue={overdue}/>
                      {overdue && <MigrateForward entry={e}/>}
                    </div>
                  );
                })}
          </div>

          {/* Tasks scheduled ahead in the Future Log */}
          <div className="bujo-col-label bujo-col-label-mt">Scheduled ahead</div>
          <div className="bujo-entries">
            {scheduled.length === 0
              ? <div className="bujo-empty-line">Nothing scheduled in the Future Log.</div>
              : scheduled.map(e => <EntryRow key={e.id} entry={e} dateLabel={monthChip(e.logKey)}/>)}
          </div>
        </div>
      </div>

      <WeeklyGoals mk={mk}/>

      <MigrationModal isOpen={migrating} onClose={() => setMigrating(false)} monthKey={mk}/>
    </div>
  );
}
