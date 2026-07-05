// Collections — custom topic pages (e.g. "Reading List", "Project X") for grouping
// related entries. User-created, titled, auto-added to the Index.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Pencil, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import EntryRow from '../../components/bujo/EntryRow';
import QuickAdd from '../../components/bujo/QuickAdd';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { entriesFor } from '../../utils/bujo';

export default function Collections() {
  const [params, setParams] = useSearchParams();
  const { bujoEntries, bujoCollections, addBujoCollection, updateBujoCollection, deleteBujoCollection } = useData();
  const [newTitle, setNewTitle] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [delTarget, setDelTarget] = useState(null);

  const cols     = [...bujoCollections].sort((a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0));
  const selectedId = params.get('c') || cols[0]?.id || null;
  const selected   = cols.find(c => c.id === selectedId) || null;
  const select = id => setParams({ c: id });

  async function create() {
    const t = newTitle.trim();
    if (!t) return;
    setNewTitle('');
    const id = await addBujoCollection({ title: t });
    select(id);
    toast.success('Collection created');
  }
  async function saveRename(id) {
    const t = renameVal.trim();
    if (t) await updateBujoCollection(id, { title: t });
    setRenaming(null);
  }
  async function doDelete(c) {
    await deleteBujoCollection(c.id, bujoEntries);
    setDelTarget(null);
    setParams({});
    toast.success('Collection deleted');
  }

  return (
    <div className="bujo-collections">
      {/* Rail */}
      <div className="bujo-col-rail">
        <div className="bujo-col-newrow">
          <input
            className="bujo-col-newinput"
            placeholder="New collection…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && create()}
          />
          <button className="bujo-col-newbtn" onClick={create} title="Create collection"><Plus size={15}/></button>
        </div>
        {cols.length === 0 && <div className="bujo-empty-line">No collections yet.</div>}
        {cols.map(c => (
          <button
            key={c.id}
            className={`bujo-col-item${c.id === selectedId ? ' active' : ''}`}
            onClick={() => select(c.id)}
          >
            <span className="bujo-col-dot">◇</span>
            {c.title || 'Untitled'}
          </button>
        ))}
      </div>

      {/* Detail */}
      <div className="bujo-col-detail">
        {!selected ? (
          <div className="bujo-empty-line">Select or create a collection.</div>
        ) : (
          <>
            <div className="bujo-col-detail-head">
              {renaming === selected.id ? (
                <span className="bujo-col-rename">
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveRename(selected.id); if (e.key === 'Escape') setRenaming(null); }}
                  />
                  <button className="icon-btn sm" onClick={() => saveRename(selected.id)}><Check size={14}/></button>
                </span>
              ) : (
                <h2>{selected.title || 'Untitled'}</h2>
              )}
              <div className="bujo-day-tools">
                <button className="icon-btn sm" onClick={() => { setRenaming(selected.id); setRenameVal(selected.title || ''); }} title="Rename"><Pencil size={13}/></button>
                <button className="icon-btn sm danger" onClick={() => setDelTarget(selected)} title="Delete collection"><Trash2 size={13}/></button>
              </div>
            </div>

            <div className="bujo-entries">
              {entriesFor(bujoEntries, 'collection', selected.id).map(e => <EntryRow key={e.id} entry={e}/>)}
            </div>
            <QuickAdd logType="collection" logKey={selected.id} placeholder="Add to this collection…"/>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={() => doDelete(delTarget)}
        title="Delete collection?"
        message="This permanently deletes the collection and all entries on its page."
        confirmLabel="Delete"
      />
    </div>
  );
}
