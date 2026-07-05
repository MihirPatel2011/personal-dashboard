// Bullet Journal section shell: sub-nav (Index · Future · Monthly · Daily ·
// Collections) over a routed <Outlet/>. Daily Log is the default landing view.
// Also seeds a few example entries on first ever load.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { get, set, ref } from 'firebase/database';
import { Trash2, List, CalendarRange, CalendarDays, NotebookPen, FolderOpen, Timer } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { useData } from '../../context/DataContext';
import { seedData } from '../../utils/bujo';
import LegendButton from '../../components/bujo/LegendButton';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const tabs = [
  { path: '/journal/index',       label: 'Index',      icon: List         },
  { path: '/journal/future',      label: 'Future Log', icon: CalendarRange },
  { path: '/journal/monthly',     label: 'Monthly',    icon: CalendarDays },
  { path: '/journal/daily',       label: 'Daily',      icon: NotebookPen  },
  { path: '/journal/focus',       label: 'Focus',      icon: Timer        },
  { path: '/journal/collections', label: 'Collections',icon: FolderOpen   },
];

export default function BujoLayout() {
  const navigate     = useNavigate();
  const { pathname, search } = useLocation();
  const { bujoEntries, bujoCollections, loading, addBujoEntry, addBujoCollection, deleteBujoEntry, deleteBujoCollection } = useData();
  const seeded = useRef(false);
  const [confirmClear, setConfirmClear] = useState(false);

  async function clearAll() {
    setConfirmClear(false);
    // Lock seeding so a now-empty journal won't repopulate examples.
    await set(ref(db, 'bujoMeta/seeded'), Date.now());
    for (const e of bujoEntries)     await deleteBujoEntry(e.id);
    for (const c of bujoCollections) await deleteBujoCollection(c.id, []);
    toast.success('Journal cleared');
  }

  // First-load seed: runs exactly once ever (guarded by a persisted flag), and
  // only when fully synced + genuinely empty. Deleting the seeds won't bring
  // them back, even after a refresh.
  useEffect(() => {
    if (loading || seeded.current) return;
    if (bujoEntries.length || bujoCollections.length) return;
    seeded.current = true;
    (async () => {
      const flag = await get(ref(db, 'bujoMeta/seeded'));
      if (flag.exists()) return;                       // already seeded once — never again
      await set(ref(db, 'bujoMeta/seeded'), Date.now());
      const { collections, entries } = seedData();
      const idMap = {};
      for (const c of collections) {
        const { __seedKey, ...rest } = c;
        idMap[__seedKey] = await addBujoCollection(rest);
      }
      for (const e of entries) {
        const entry = { ...e };
        if (typeof entry.logKey === 'string' && entry.logKey.startsWith('__seed:')) {
          entry.logKey = idMap[entry.logKey.slice('__seed:'.length)];
        }
        await addBujoEntry(entry);
      }
    })();
  }, [loading, bujoEntries.length, bujoCollections.length, addBujoEntry, addBujoCollection]);

  return (
    <div className="bujo-root" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="page-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
        <div>
          <div className="page-title"><span style={{ color: 'var(--accent)' }}>Bullet Journal</span></div>
        </div>
        <div className="page-actions">
          <LegendButton/>
          {(bujoEntries.length > 0 || bujoCollections.length > 0) && (
            <button className="btn ghost sm" onClick={() => setConfirmClear(true)} title="Delete all journal entries and collections">
              <Trash2 size={13}/> Clear all
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearAll}
        title="Clear the whole journal?"
        message="This permanently deletes every entry and collection in your Bullet Journal. The example seeds won't come back."
        confirmLabel="Clear everything"
      />

      <div className="crm-sub-nav">
        {tabs.map(t => {
          const Icon   = t.icon;
          const active = pathname === t.path || pathname.startsWith(t.path + '/');
          return (
            <button
              key={t.path}
              className="crm-sub-btn"
              onClick={() => navigate(t.path)}
              style={active ? { color: 'var(--accent)', fontWeight: 600 } : undefined}
            >
              <Icon size={14}/> {t.label}
              {active && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: 'var(--accent)', borderRadius: '3px 3px 0 0' }}/>}
            </button>
          );
        })}
      </div>

      <div className="bujo-scroll" key={pathname + search} style={{ flex: 1, overflow: 'auto' }}>
        <Outlet/>
      </div>
    </div>
  );
}
