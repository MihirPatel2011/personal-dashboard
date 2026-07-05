// Inline control for an overdue daily task: pick a date (today or later) and
// migrate it forward. The original is marked 'migrated' (>) and kept in place;
// a fresh open task is created on the chosen date's Daily Log.
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import { buildForwardCopy, todayKey, dailyLabel } from '../../utils/bujo';

export default function MigrateForward({ entry }) {
  const { addBujoEntry, updateBujoEntry } = useData();
  const [date, setDate] = useState(todayKey());
  const [busy, setBusy] = useState(false);

  async function migrate() {
    if (busy) return;
    setBusy(true);
    try {
      await addBujoEntry(buildForwardCopy(entry, date));
      await updateBujoEntry(entry.id, { state: 'migrated' });
      toast.success(`Migrated to ${dailyLabel(date)}`);
    } catch {
      toast.error('Could not migrate.');
    }
    setBusy(false);
  }

  return (
    <div className="bujo-migrate-fwd">
      <span className="bujo-migrate-fwd-label">Migrate to</span>
      <input
        type="date"
        className="bujo-migrate-fwd-date"
        value={date}
        min={todayKey()}
        onChange={e => e.target.value && setDate(e.target.value)}
      />
      <button className="bujo-migrate-fwd-btn" onClick={migrate} disabled={busy} title="Migrate this task forward">
        Migrate <ChevronRight size={13}/>
      </button>
    </div>
  );
}
