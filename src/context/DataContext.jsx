import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();

  const [clients,          setClients]          = useState([]);
  const [loans,            setLoans]            = useState([]);
  const [notes,            setNotes]            = useState([]);
  const [crmTasks,         setCrmTasks]         = useState([]);
  const [goals,            setGoals]            = useState([]);
  const [goalLog,          setGoalLog]          = useState([]);
  const [mortgageSettings, setMortgageSettings] = useState({});
  const [personalNotes,    setPersonalNotes]    = useState([]);
  const [bujoEntries,      setBujoEntries]      = useState([]);
  const [bujoCollections,  setBujoCollections]  = useState([]);
  const [bujoWeeklyGoals,  setBujoWeeklyGoals]  = useState([]);
  const [followups,        setFollowups]        = useState([]);
  const [focusAreas,       setFocusAreas]       = useState([]);
  const [focusProjects,    setFocusProjects]    = useState([]);
  const [focusTasks,       setFocusTasks]       = useState([]);
  const [focusSessions,    setFocusSessions]    = useState([]);
  const [loading,          setLoading]          = useState(true);

  const toArr = snap => {
    const v = snap.val() || {};
    return Object.entries(v).map(([id, val]) => ({ id, ...val }));
  };

  useEffect(() => {
    if (!user) {
      setClients([]); setLoans([]); setNotes([]); setCrmTasks([]);
      setGoals([]); setGoalLog([]); setPersonalNotes([]); setBujoEntries([]); setBujoCollections([]); setBujoWeeklyGoals([]); setFollowups([]);
      setFocusAreas([]); setFocusProjects([]); setFocusTasks([]); setFocusSessions([]);
      setMortgageSettings({});
      setLoading(false);
      return;
    }
    setLoading(true);
    let count = 0;
    const TOTAL = 16;
    const done = () => { count++; if (count >= TOTAL) setLoading(false); };

    // One-time cleanup: the old book-style Journal node is retired by the BuJo module.
    remove(ref(db, 'journalSpreads')).catch(() => {});

    const u1  = onValue(ref(db, 'clients'),          s => { setClients(toArr(s));               done(); });
    const u2  = onValue(ref(db, 'loans'),            s => { setLoans(toArr(s));                 done(); });
    const u3  = onValue(ref(db, 'notes'),            s => { setNotes(toArr(s));                 done(); });
    const u4  = onValue(ref(db, 'tasks'),            s => { setCrmTasks(toArr(s));              done(); });
    const u5  = onValue(ref(db, 'goals'),            s => { setGoals(toArr(s));                 done(); });
    const u6  = onValue(ref(db, 'goalLog'),          s => { setGoalLog(toArr(s));               done(); });
    const u9  = onValue(ref(db, 'mortgageSettings'), s => { setMortgageSettings(s.val() || {}); done(); });
    const u12 = onValue(ref(db, 'personalNotes'),    s => { setPersonalNotes(toArr(s));         done(); });
    const u13 = onValue(ref(db, 'bujoEntries'),      s => { setBujoEntries(toArr(s));           done(); });
    const u18 = onValue(ref(db, 'bujoCollections'),  s => { setBujoCollections(toArr(s));       done(); });
    const u19 = onValue(ref(db, 'bujoWeeklyGoals'),  s => { setBujoWeeklyGoals(toArr(s));       done(); });
    const u20 = onValue(ref(db, 'followups'),        s => { setFollowups(toArr(s));             done(); });
    const u14 = onValue(ref(db, 'focusAreas'),       s => { setFocusAreas(toArr(s));            done(); });
    const u15 = onValue(ref(db, 'focusProjects'),    s => { setFocusProjects(toArr(s));         done(); });
    const u16 = onValue(ref(db, 'focusTasks'),       s => { setFocusTasks(toArr(s));            done(); });
    const u17 = onValue(ref(db, 'focusSessions'),    s => { setFocusSessions(toArr(s));         done(); });

    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u9(); u12(); u13(); u18(); u19(); u20(); u14(); u15(); u16(); u17(); };
  }, [user]);

  // ─── Clients ──────────────────────────────────────────────────────────────
  const addClient    = useCallback(async data => {
    const r = push(ref(db, 'clients'));
    await set(r, { ...data, createdAt: new Date().toISOString() });
    return r.key;
  }, []);
  const updateClient = useCallback(async (id, data) => update(ref(db, `clients/${id}`), data), []);
  const deleteClient = useCallback(async id => {
    const c = clients.find(x => x.id === id);
    if (c?.loanIds) for (const lid of Object.keys(c.loanIds)) await remove(ref(db, `loans/${lid}`));
    if (c?.noteIds) for (const nid of Object.keys(c.noteIds)) await remove(ref(db, `notes/${nid}`));
    if (c?.taskIds) for (const tid of Object.keys(c.taskIds)) await remove(ref(db, `tasks/${tid}`));
    if (c?.followupIds) for (const fid of Object.keys(c.followupIds)) await remove(ref(db, `followups/${fid}`));
    await remove(ref(db, `clients/${id}`));
  }, [clients]);

  // ─── Personal Notes ───────────────────────────────────────────────────────────
  const addPersonalNote    = useCallback(async data => { const r = push(ref(db, 'personalNotes')); await set(r, { ...data, createdAt: Date.now(), updatedAt: Date.now() }); return r.key; }, []);
  const updatePersonalNote = useCallback(async (id, data) => update(ref(db, `personalNotes/${id}`), { ...data, updatedAt: Date.now() }), []);
  const deletePersonalNote = useCallback(async id => remove(ref(db, `personalNotes/${id}`)), []);

  // ─── Loans ────────────────────────────────────────────────────────────────
  const addLoan = useCallback(async data => {
    const r  = push(ref(db, 'loans'));
    const id = r.key;
    let clientId = data.clientId;

    // Auto-create a client record when a name is typed manually
    if (!clientId && data.clientObj?.trim()) {
      const cr = push(ref(db, 'clients'));
      clientId = cr.key;
      await set(cr, { name: data.clientObj.trim(), createdAt: new Date().toISOString() });
    }

    await set(r, { ...data, clientId: clientId || '', createdAt: new Date().toISOString() });
    if (clientId) await set(ref(db, `clients/${clientId}/loanIds/${id}`), true);
    return id;
  }, []);
  const updateLoan = useCallback(async (id, data) => update(ref(db, `loans/${id}`), data), []);
  const deleteLoan = useCallback(async id => {
    const l = loans.find(x => x.id === id);
    if (l?.clientId) await remove(ref(db, `clients/${l.clientId}/loanIds/${id}`));
    await remove(ref(db, `loans/${id}`));
  }, [loans]);

  // ─── Notes ────────────────────────────────────────────────────────────────
  const addNote = useCallback(async data => {
    const r  = push(ref(db, 'notes'));
    const id = r.key;
    await set(r, { ...data, createdAt: new Date().toISOString() });
    if (data.clientId) await set(ref(db, `clients/${data.clientId}/noteIds/${id}`), true);
    return id;
  }, []);
  const updateNote = useCallback(async (id, data) => update(ref(db, `notes/${id}`), data), []);
  const deleteNote = useCallback(async id => {
    const n = notes.find(x => x.id === id);
    if (n?.clientId) await remove(ref(db, `clients/${n.clientId}/noteIds/${id}`));
    await remove(ref(db, `notes/${id}`));
  }, [notes]);

  // ─── CRM Tasks ────────────────────────────────────────────────────────────
  const addCrmTask    = useCallback(async data => {
    const r  = push(ref(db, 'tasks'));
    const id = r.key;
    await set(r, { ...data, createdAt: new Date().toISOString() });
    if (data.clientId) await set(ref(db, `clients/${data.clientId}/taskIds/${id}`), true);
    return id;
  }, []);
  const updateCrmTask = useCallback(async (id, data) => update(ref(db, `tasks/${id}`), data), []);
  const deleteCrmTask = useCallback(async id => {
    const t = crmTasks.find(x => x.id === id);
    if (t?.clientId) await remove(ref(db, `clients/${t.clientId}/taskIds/${id}`));
    await remove(ref(db, `tasks/${id}`));
  }, [crmTasks]);

  // ─── Client Follow-ups ──────────────────────────────────────────────────────
  const addFollowup    = useCallback(async data => {
    const r  = push(ref(db, 'followups'));
    const id = r.key;
    await set(r, { status: 'waiting_me', dueDate: '', ...data, createdAt: Date.now(), updatedAt: Date.now() });
    if (data.clientId) await set(ref(db, `clients/${data.clientId}/followupIds/${id}`), true);
    return id;
  }, []);
  const updateFollowup = useCallback(async (id, data) =>
    update(ref(db, `followups/${id}`), { ...data, updatedAt: Date.now() }), []);
  const deleteFollowup = useCallback(async id => {
    const f = followups.find(x => x.id === id);
    if (f?.clientId) await remove(ref(db, `clients/${f.clientId}/followupIds/${id}`));
    await remove(ref(db, `followups/${id}`));
  }, [followups]);

  // ─── Mortgage Settings ────────────────────────────────────────────────────
  const saveMortgageSettings = useCallback(async (section, arr) => {
    await set(ref(db, `mortgageSettings/${section}`), arr);
  }, []);

  // ─── Goals ───────────────────────────────────────────────────────────────
  const addGoal       = useCallback(async data => { const r = push(ref(db, 'goals')); await set(r, { ...data, createdAt: Date.now() }); return r.key; }, []);
  const updateGoal    = useCallback(async (id, data) => update(ref(db, `goals/${id}`), data), []);
  const deleteGoal    = useCallback(async id => remove(ref(db, `goals/${id}`)), []);
  const addGoalLog    = useCallback(async data => { const r = push(ref(db, 'goalLog')); await set(r, { ...data, ts: data.ts ?? Date.now() }); }, []);
  const updateGoalLog = useCallback(async (id, data) => update(ref(db, `goalLog/${id}`), data), []);
  const deleteGoalLog = useCallback(async id => remove(ref(db, `goalLog/${id}`)), []);

  // ─── Bullet Journal: entries ────────────────────────────────────────────────
  const addBujoEntry    = useCallback(async data => {
    const r = push(ref(db, 'bujoEntries'));
    await set(r, { signifiers: {}, migration: [], ...data, createdAt: Date.now(), updatedAt: Date.now() });
    return r.key;
  }, []);
  const updateBujoEntry = useCallback(async (id, data) =>
    update(ref(db, `bujoEntries/${id}`), { ...data, updatedAt: Date.now() }), []);
  const deleteBujoEntry = useCallback(async id => remove(ref(db, `bujoEntries/${id}`)), []);

  // ─── Bullet Journal: collections ────────────────────────────────────────────
  const addBujoCollection    = useCallback(async data => {
    const r = push(ref(db, 'bujoCollections'));
    await set(r, { order: Date.now(), ...data, createdAt: Date.now(), updatedAt: Date.now() });
    return r.key;
  }, []);
  const updateBujoCollection = useCallback(async (id, data) =>
    update(ref(db, `bujoCollections/${id}`), { ...data, updatedAt: Date.now() }), []);
  const deleteBujoCollection = useCallback(async (id, entries = []) => {
    // Cascade: remove all entries that live on this collection page.
    for (const e of entries.filter(x => x.logType === 'collection' && x.logKey === id)) {
      await remove(ref(db, `bujoEntries/${e.id}`));
    }
    await remove(ref(db, `bujoCollections/${id}`));
  }, []);

  // ─── Bullet Journal: weekly goals ───────────────────────────────────────────
  const addBujoWeeklyGoal    = useCallback(async data => {
    const r = push(ref(db, 'bujoWeeklyGoals'));
    await set(r, { done: false, order: Date.now(), ...data, createdAt: Date.now(), updatedAt: Date.now() });
    return r.key;
  }, []);
  const updateBujoWeeklyGoal = useCallback(async (id, data) =>
    update(ref(db, `bujoWeeklyGoals/${id}`), { ...data, updatedAt: Date.now() }), []);
  const deleteBujoWeeklyGoal = useCallback(async id => remove(ref(db, `bujoWeeklyGoals/${id}`)), []);

  // ─── Focus: Areas ───────────────────────────────────────────────────────────
  const addFocusArea    = useCallback(async data => { const r = push(ref(db, 'focusAreas')); await set(r, { archived: false, order: Date.now(), ...data, createdAt: Date.now() }); return r.key; }, []);
  const updateFocusArea = useCallback(async (id, data) => update(ref(db, `focusAreas/${id}`), data), []);
  const deleteFocusArea = useCallback(async id => {
    // Cascade: remove this area's projects and detach its tasks (keep the tasks).
    for (const p of focusProjects.filter(p => p.areaId === id)) await remove(ref(db, `focusProjects/${p.id}`));
    for (const t of focusTasks.filter(t => t.areaId === id))    await update(ref(db, `focusTasks/${t.id}`), { areaId: '', projectId: '' });
    await remove(ref(db, `focusAreas/${id}`));
  }, [focusProjects, focusTasks]);

  // ─── Focus: Projects ──────────────────────────────────────────────────────────
  const addFocusProject    = useCallback(async data => { const r = push(ref(db, 'focusProjects')); await set(r, { archived: false, ...data, createdAt: Date.now() }); return r.key; }, []);
  const updateFocusProject = useCallback(async (id, data) => update(ref(db, `focusProjects/${id}`), data), []);
  const deleteFocusProject = useCallback(async id => {
    for (const t of focusTasks.filter(t => t.projectId === id)) await update(ref(db, `focusTasks/${t.id}`), { projectId: '' });
    await remove(ref(db, `focusProjects/${id}`));
  }, [focusTasks]);

  // ─── Focus: Tasks ─────────────────────────────────────────────────────────────
  const addFocusTask    = useCallback(async data => { const r = push(ref(db, 'focusTasks')); await set(r, { done: false, priority: 0, order: Date.now(), ...data, createdAt: Date.now() }); return r.key; }, []);
  const updateFocusTask = useCallback(async (id, data) => update(ref(db, `focusTasks/${id}`), data), []);
  const deleteFocusTask = useCallback(async id => remove(ref(db, `focusTasks/${id}`)), []);
  const toggleFocusTask = useCallback(async (id, done) =>
    update(ref(db, `focusTasks/${id}`), { done, completedAt: done ? Date.now() : null }), []);

  // ─── Focus: Sessions (focus-timer logs) ────────────────────────────────────────
  const addFocusSession    = useCallback(async data => { const r = push(ref(db, 'focusSessions')); await set(r, { ...data, createdAt: Date.now() }); return r.key; }, []);
  const updateFocusSession = useCallback(async (id, data) => update(ref(db, `focusSessions/${id}`), data), []);
  const deleteFocusSession = useCallback(async id => remove(ref(db, `focusSessions/${id}`)), []);

  return (
    <DataContext.Provider value={{
      clients, loans, notes, crmTasks, followups,
      goals, goalLog, personalNotes, bujoEntries, bujoCollections, bujoWeeklyGoals,
      focusAreas, focusProjects, focusTasks, focusSessions,
      mortgageSettings, loading,
      addClient,    updateClient,    deleteClient,
      addLoan,      updateLoan,      deleteLoan,
      addNote,      updateNote,      deleteNote,
      addCrmTask,   updateCrmTask,   deleteCrmTask,
      addFollowup,  updateFollowup,  deleteFollowup,
      saveMortgageSettings,
      addGoal,      updateGoal,      deleteGoal,
      addGoalLog,   updateGoalLog,   deleteGoalLog,
      addPersonalNote, updatePersonalNote, deletePersonalNote,
      addBujoEntry,       updateBujoEntry,       deleteBujoEntry,
      addBujoCollection,  updateBujoCollection,  deleteBujoCollection,
      addBujoWeeklyGoal,  updateBujoWeeklyGoal,  deleteBujoWeeklyGoal,
      addFocusArea,    updateFocusArea,    deleteFocusArea,
      addFocusProject, updateFocusProject, deleteFocusProject,
      addFocusTask,    updateFocusTask,    deleteFocusTask, toggleFocusTask,
      addFocusSession, updateFocusSession, deleteFocusSession,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be within DataProvider');
  return ctx;
};
