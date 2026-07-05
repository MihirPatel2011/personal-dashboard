// End-of-Month Migration — the heart of the method. Surfaces every open task for
// the month and lets the user decide each one: complete, migrate forward, schedule
// to the Future Log, or strike out (abandon). Resolved tasks drop out live.
import { useState } from 'react';
import { Check, ChevronRight, ChevronLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import BulletGlyph from './BulletGlyph';
import { useData } from '../../context/DataContext';
import {
  isOpenTask, monthOfDaily, monthLabel, addMonthsKey, futureMonths,
  buildMigratedCopy, buildScheduledCopy,
} from '../../utils/bujo';

export default function MigrationModal({ isOpen, onClose, monthKey }) {
  const { bujoEntries, addBujoEntry, updateBujoEntry } = useData();
  const months = futureMonths(12);
  const [targets, setTargets] = useState({});   // entryId -> future monthKey

  // Open tasks belonging to this month: the Monthly Log itself + that month's dailies.
  const openTasks = bujoEntries.filter(e =>
    isOpenTask(e) && (
      (e.logType === 'monthly' && e.logKey === monthKey) ||
      (e.logType === 'daily'   && monthOfDaily(e.logKey) === monthKey)
    )
  );

  const nextMonth = addMonthsKey(monthKey, 1);

  async function complete(e) {
    await updateBujoEntry(e.id, { state: 'complete' });
  }
  async function migrate(e) {
    await addBujoEntry(buildMigratedCopy(e, nextMonth));
    await updateBujoEntry(e.id, { state: 'migrated' });
    toast.success(`Migrated to ${monthLabel(nextMonth)}`);
  }
  async function schedule(e) {
    const target = targets[e.id] || months[0];
    await addBujoEntry(buildScheduledCopy(e, target));
    await updateBujoEntry(e.id, { state: 'scheduled' });
    toast.success(`Scheduled to ${monthLabel(target)}`);
  }
  async function strike(e) {
    await updateBujoEntry(e.id, { state: 'irrelevant' });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`End-of-Month Migration · ${monthLabel(monthKey)}`} size="lg">
      <div className="modal-body">
        <p className="bujo-migrate-intro">
          Review each open task. Decide what carries forward — everything else is
          either done or no longer worth your attention.
        </p>

        {openTasks.length === 0 ? (
          <div className="bujo-migrate-empty">
            <Check size={28}/>
            <div>All caught up — no open tasks left for {monthLabel(monthKey)}.</div>
          </div>
        ) : (
          <div className="bujo-migrate-list">
            {openTasks.map(e => (
              <div key={e.id} className="bujo-migrate-row">
                <span className="bujo-migrate-bullet"><BulletGlyph entry={e}/></span>
                <span className="bujo-migrate-text">
                  {e.signifiers?.priority && <span className="bujo-migrate-star">★</span>}
                  {e.text}
                </span>
                <div className="bujo-migrate-actions">
                  <button className="bujo-mig-btn complete" onClick={() => complete(e)} title="Complete">
                    <Check size={13}/> Done
                  </button>
                  <button className="bujo-mig-btn migrate" onClick={() => migrate(e)} title={`Migrate to ${monthLabel(nextMonth)}`}>
                    <ChevronRight size={13}/> Next month
                  </button>
                  <span className="bujo-mig-schedule">
                    <select
                      className="bujo-mig-select"
                      value={targets[e.id] || months[0]}
                      onChange={ev => setTargets(t => ({ ...t, [e.id]: ev.target.value }))}
                    >
                      {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                    </select>
                    <button className="bujo-mig-btn schedule" onClick={() => schedule(e)} title="Schedule to Future Log">
                      <ChevronLeft size={13}/> Future
                    </button>
                  </span>
                  <button className="bujo-mig-btn strike" onClick={() => strike(e)} title="Strike out (abandon)">
                    <X size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
