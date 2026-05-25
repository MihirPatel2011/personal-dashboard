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
  const [personalTasks,    setPersonalTasks]    = useState([]);
  const [taskCategories,   setTaskCategories]   = useState([]);
  const [mortgageSettings, setMortgageSettings] = useState({});
  const [loading,          setLoading]          = useState(true);

  const toArr = snap => {
    const v = snap.val() || {};
    return Object.entries(v).map(([id, val]) => ({ id, ...val }));
  };

  useEffect(() => {
    if (!user) {
      setClients([]); setLoans([]); setNotes([]); setCrmTasks([]);
      setGoals([]); setGoalLog([]); setPersonalTasks([]); setTaskCategories([]);
      setMortgageSettings({});
      setLoading(false);
      return;
    }
    setLoading(true);
    let count = 0;
    const TOTAL = 9;
    const done = () => { count++; if (count >= TOTAL) setLoading(false); };

    const u1 = onValue(ref(db, 'clients'),          s => { setClients(toArr(s));               done(); });
    const u2 = onValue(ref(db, 'loans'),            s => { setLoans(toArr(s));                 done(); });
    const u3 = onValue(ref(db, 'notes'),            s => { setNotes(toArr(s));                 done(); });
    const u4 = onValue(ref(db, 'tasks'),            s => { setCrmTasks(toArr(s));              done(); });
    const u5 = onValue(ref(db, 'goals'),            s => { setGoals(toArr(s));                 done(); });
    const u6 = onValue(ref(db, 'goalLog'),          s => { setGoalLog(toArr(s));               done(); });
    const u7 = onValue(ref(db, 'personalTasks'),    s => { setPersonalTasks(toArr(s));         done(); });
    const u8 = onValue(ref(db, 'taskCategories'),   s => { setTaskCategories(toArr(s));        done(); });
    const u9 = onValue(ref(db, 'mortgageSettings'), s => { setMortgageSettings(s.val() || {}); done(); });

    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); u9(); };
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
    await remove(ref(db, `clients/${id}`));
  }, [clients]);

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

  // ─── Personal Tasks ───────────────────────────────────────────────────────
  const addPersonalTask    = useCallback(async data => { const r = push(ref(db, 'personalTasks')); await set(r, { ...data, createdAt: Date.now(), updatedAt: Date.now() }); return r.key; }, []);
  const updatePersonalTask = useCallback(async (id, data) => update(ref(db, `personalTasks/${id}`), { ...data, updatedAt: Date.now() }), []);
  const deletePersonalTask = useCallback(async id => remove(ref(db, `personalTasks/${id}`)), []);

  // ─── Task Categories ──────────────────────────────────────────────────────
  const addTaskCategory    = useCallback(async data => { const r = push(ref(db, 'taskCategories')); await set(r, { ...data, createdAt: Date.now() }); return r.key; }, []);
  const updateTaskCategory = useCallback(async (id, data) => update(ref(db, `taskCategories/${id}`), data), []);
  const deleteTaskCategory = useCallback(async id => remove(ref(db, `taskCategories/${id}`)), []);

  return (
    <DataContext.Provider value={{
      clients, loans, notes, crmTasks,
      goals, goalLog, personalTasks, taskCategories,
      mortgageSettings, loading,
      addClient,    updateClient,    deleteClient,
      addLoan,      updateLoan,      deleteLoan,
      addNote,      updateNote,      deleteNote,
      addCrmTask,   updateCrmTask,   deleteCrmTask,
      saveMortgageSettings,
      addGoal,      updateGoal,      deleteGoal,
      addGoalLog,   updateGoalLog,   deleteGoalLog,
      addPersonalTask, updatePersonalTask, deletePersonalTask,
      addTaskCategory, updateTaskCategory, deleteTaskCategory,
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
