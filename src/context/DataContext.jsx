import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();

  // Mortgage CRM data (shared with existing CRM app)
  const [clients, setClients] = useState([]);
  const [loans,   setLoans]   = useState([]);
  const [notes,   setNotes]   = useState([]);
  const [crmTasks, setCrmTasks] = useState([]);

  // Goals data (personal)
  const [goals,   setGoals]   = useState([]);
  const [goalLog, setGoalLog] = useState([]);

  // Personal tasks
  const [personalTasks, setPersonalTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  const toArr = snap => {
    const v = snap.val() || {};
    return Object.entries(v).map(([id, val]) => ({ id, ...val }));
  };

  useEffect(() => {
    if (!user) {
      setClients([]); setLoans([]); setNotes([]); setCrmTasks([]);
      setGoals([]); setGoalLog([]); setPersonalTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let count = 0;
    const done = () => { count++; if (count >= 7) setLoading(false); };

    const u1 = onValue(ref(db, 'clients'),      s => { setClients(toArr(s));      done(); });
    const u2 = onValue(ref(db, 'loans'),        s => { setLoans(toArr(s));        done(); });
    const u3 = onValue(ref(db, 'notes'),        s => { setNotes(toArr(s));        done(); });
    const u4 = onValue(ref(db, 'tasks'),        s => { setCrmTasks(toArr(s));     done(); });
    const u5 = onValue(ref(db, 'goals'),        s => { setGoals(toArr(s));        done(); });
    const u6 = onValue(ref(db, 'goalLog'),      s => { setGoalLog(toArr(s));      done(); });
    const u7 = onValue(ref(db, 'personalTasks'),s => { setPersonalTasks(toArr(s));done(); });

    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); };
  }, [user]);

  // ─── Mortgage: Clients ────────────────────────────────────────────────────
  const addClient = useCallback(async data => {
    const r = push(ref(db, 'clients'));
    await set(r, { ...data, createdAt: new Date().toISOString() });
    return r.key;
  }, []);
  const updateClient = useCallback(async (id, data) => update(ref(db, `clients/${id}`), data), []);
  const deleteClient = useCallback(async (id) => {
    const c = clients.find(x => x.id === id);
    if (c) {
      if (c.loanIds) for (const lid of Object.keys(c.loanIds)) await remove(ref(db, `loans/${lid}`));
      if (c.noteIds) for (const nid of Object.keys(c.noteIds)) await remove(ref(db, `notes/${nid}`));
      if (c.taskIds) for (const tid of Object.keys(c.taskIds)) await remove(ref(db, `tasks/${tid}`));
    }
    await remove(ref(db, `clients/${id}`));
  }, [clients]);

  // ─── Mortgage: Loans ─────────────────────────────────────────────────────
  const addLoan = useCallback(async data => {
    const r = push(ref(db, 'loans'));
    const id = r.key;
    await set(r, { ...data, createdAt: new Date().toISOString() });
    if (data.clientId) await set(ref(db, `clients/${data.clientId}/loanIds/${id}`), true);
    return id;
  }, []);
  const updateLoan = useCallback(async (id, data) => update(ref(db, `loans/${id}`), data), []);
  const deleteLoan = useCallback(async id => {
    const l = loans.find(x => x.id === id);
    if (l?.clientId) await remove(ref(db, `clients/${l.clientId}/loanIds/${id}`));
    await remove(ref(db, `loans/${id}`));
  }, [loans]);

  // ─── Mortgage: Notes ─────────────────────────────────────────────────────
  const addNote = useCallback(async data => {
    const r = push(ref(db, 'notes'));
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

  // ─── Mortgage: CRM Tasks ─────────────────────────────────────────────────
  const addCrmTask = useCallback(async data => {
    const r = push(ref(db, 'tasks'));
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

  // ─── Goals ───────────────────────────────────────────────────────────────
  const addGoal = useCallback(async data => {
    const r = push(ref(db, 'goals'));
    await set(r, { ...data, createdAt: Date.now() });
    return r.key;
  }, []);
  const updateGoal = useCallback(async (id, data) => update(ref(db, `goals/${id}`), data), []);
  const deleteGoal = useCallback(async id => remove(ref(db, `goals/${id}`)), []);
  const addGoalLog = useCallback(async data => {
    const r = push(ref(db, 'goalLog'));
    await set(r, { ...data, ts: Date.now() });
  }, []);
  const deleteGoalLog = useCallback(async id => remove(ref(db, `goalLog/${id}`)), []);

  // ─── Personal Tasks ───────────────────────────────────────────────────────
  const addPersonalTask = useCallback(async data => {
    const r = push(ref(db, 'personalTasks'));
    await set(r, { ...data, createdAt: Date.now(), updatedAt: Date.now() });
    return r.key;
  }, []);
  const updatePersonalTask = useCallback(async (id, data) =>
    update(ref(db, `personalTasks/${id}`), { ...data, updatedAt: Date.now() }), []);
  const deletePersonalTask = useCallback(async id => remove(ref(db, `personalTasks/${id}`)), []);

  return (
    <DataContext.Provider value={{
      // Data
      clients, loans, notes, crmTasks,
      goals, goalLog, personalTasks,
      loading,
      // Mortgage
      addClient, updateClient, deleteClient,
      addLoan,   updateLoan,   deleteLoan,
      addNote,   updateNote,   deleteNote,
      addCrmTask, updateCrmTask, deleteCrmTask,
      // Goals
      addGoal, updateGoal, deleteGoal,
      addGoalLog, deleteGoalLog,
      // Personal Tasks
      addPersonalTask, updatePersonalTask, deletePersonalTask,
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
