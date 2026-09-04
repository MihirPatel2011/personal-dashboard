# Dashboard Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Habits / Focus / Bullet Journal modules, rebuild the main dashboard action-first with an AM/PM check-in, add live thousand-separator number inputs to Goals and CRM loan forms, and audit-fix the Mortgage CRM.

**Architecture:** React 19 + Vite SPA, Firebase Realtime Database via a single `DataContext` (one `onValue` listener per RTDB node, CRUD helpers exposed through context). All styling is `src/index.css` classes + inline styles. No test framework exists; per the approved spec, verification is manual via the Vite dev server (preview tools), `npm run lint`, and `npm run build` after every task.

**Tech Stack:** React 19, react-router-dom 7, Firebase RTDB, lucide-react icons, react-hot-toast, vite 8.

**Spec:** `docs/superpowers/specs/2026-07-05-dashboard-overhaul-design.md`

**Conventions to follow:** 2-space indent, single quotes, inline styles with CSS variables (`var(--ink)`, `var(--surface)` …), `try/catch` + `toast.success/error` around Firebase writes, `className="btn ghost sm"`-style utility classes.

---

### Task 1: Remove Habits, Focus, and Bullet Journal modules

**Files:**
- Delete: `src/pages/Habits.jsx`, `src/pages/focus/` (whole dir), `src/pages/bujo/` (whole dir), `src/components/habits/` (whole dir), `src/components/focus/` (whole dir), `src/components/bujo/` (whole dir), `src/utils/habitStats.js`, `src/utils/focusStats.js`, `src/utils/bujo.js`, `src/utils/parseTask.js`
- Modify: `src/App.jsx`, `src/components/layout/Sidebar.jsx`, `src/context/DataContext.jsx`, `src/pages/Dashboard.jsx` (interim trim — fully rebuilt in Task 6)

- [ ] **Step 1: Delete the module files**

```bash
cd "/Users/mihirpatel/Desktop/Claude/Personal Dashboard"
git rm -r src/pages/Habits.jsx src/pages/focus src/pages/bujo \
  src/components/habits src/components/focus src/components/bujo \
  src/utils/habitStats.js src/utils/focusStats.js src/utils/bujo.js src/utils/parseTask.js
```

- [ ] **Step 2: Rewrite `src/App.jsx` imports and routes**

Replace the import block (lines 1–30) with:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import Sidebar, { MobileNav } from './components/layout/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import MortgageLayout from './pages/mortgage/MortgageLayout';
import Pipeline from './pages/mortgage/Pipeline';
import Clients from './pages/mortgage/Clients';
import Followups from './pages/mortgage/Followups';
import Notes from './pages/mortgage/Notes';
import CRMTasks from './pages/mortgage/CRMTasks';
import Performance from './pages/mortgage/Performance';
import Settings from './pages/mortgage/Settings';
import PersonalNotes from './pages/PersonalNotes';
```

Replace the `<Routes>` block inside `AppShell` with:

```jsx
        <Routes>
          <Route path="/"                    element={<Navigate to="/dashboard" replace/>}/>
          <Route path="/dashboard"           element={<Dashboard/>}/>
          <Route path="/goals"               element={<Goals/>}/>
          <Route path="/notes"               element={<PersonalNotes/>}/>
          <Route path="/mortgage"            element={<MortgageLayout/>}>
            <Route index                     element={<Navigate to="/mortgage/pipeline" replace/>}/>
            <Route path="pipeline"           element={<Pipeline/>}/>
            <Route path="clients"            element={<Clients/>}/>
            <Route path="followups"          element={<Followups/>}/>
            <Route path="notes"              element={<Notes/>}/>
            <Route path="tasks"              element={<CRMTasks/>}/>
            <Route path="performance"        element={<Performance/>}/>
            <Route path="settings"           element={<Settings/>}/>
          </Route>
          <Route path="*"                    element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
```

Also remove `<GlobalQuickAdd/>` from `AppShell` (and its import, already gone from the block above).

- [ ] **Step 3: Rewrite `src/components/layout/Sidebar.jsx` navigation**

Update the lucide import to only what's used:

```jsx
import { LayoutDashboard, Target, Kanban, Users, Reply, FileText, BarChart3, Settings2, LogOut, Sun, Moon, NotebookPen, ListTodo, MoreHorizontal } from 'lucide-react';
```

In `MobileNav`, replace `morePaths`, `primaryTabs`, and `moreItems` with:

```jsx
  const morePaths = ['/notes'];
  const moreActive = morePaths.some(p => pathname.startsWith(p));

  const primaryTabs = [
    { path: '/dashboard',         label: 'Home',     icon: LayoutDashboard },
    { path: '/goals',             label: 'Goals',    icon: Target          },
    { path: '/mortgage/pipeline', label: 'Mortgage', icon: Kanban          },
  ];

  const moreItems = [
    { path: '/notes', label: 'Notes & Ideas', icon: NotebookPen },
  ];
```

In the desktop `Sidebar` body (`.sidebar-scroll`), replace everything between the Dashboard button and the `{/* Mortgage */}` comment with:

```jsx
        {/* Goals */}
        <div className="sidebar-section-label">Goals</div>
        <button className={`nav-item${active('/goals') ? ' active' : ''}`} onClick={() => go('/goals')}>
          <span className="nav-icon goals-icon"><Target size={15}/></span>
          Goals Tracker
        </button>

        {/* Capture */}
        <div className="sidebar-section-label">Capture</div>
        <button className={`nav-item${active('/notes') ? ' active' : ''}`} onClick={() => go('/notes')}>
          <span className="nav-icon" style={{ color: 'var(--ink-3)' }}><NotebookPen size={15}/></span>
          Notes &amp; Ideas
        </button>
```

In the Mortgage section, add the missing Tasks link between Follow-ups and Notes, with an overdue badge:

```jsx
        <button className={`nav-item${active('/mortgage/tasks') ? ' active' : ''}`} onClick={() => go('/mortgage/tasks')}>
          <span className="nav-icon" style={{ color: 'var(--ink-3)' }}><ListTodo size={15}/></span>
          Tasks
          {overdueCrm > 0 && <span className="nav-badge">{overdueCrm}</span>}
        </button>
```

(`overdueCrm` is already computed in the component; it was previously unused in the JSX.)

- [ ] **Step 4: Strip `src/context/DataContext.jsx` of focus/bujo state**

Remove these `useState` lines: `bujoEntries`, `bujoCollections`, `bujoWeeklyGoals`, `focusAreas`, `focusProjects`, `focusTasks`, `focusSessions`.

Replace the whole `useEffect` with (note: `journalSpreads` cleanup line removed — no destructive calls; `TOTAL` is now 9):

```jsx
  useEffect(() => {
    if (!user) {
      setClients([]); setLoans([]); setNotes([]); setCrmTasks([]);
      setGoals([]); setGoalLog([]); setPersonalNotes([]); setFollowups([]);
      setMortgageSettings({});
      setLoading(false);
      return;
    }
    setLoading(true);
    let count = 0;
    const TOTAL = 9;
    const done = () => { count++; if (count >= TOTAL) setLoading(false); };

    const u1  = onValue(ref(db, 'clients'),          s => { setClients(toArr(s));               done(); });
    const u2  = onValue(ref(db, 'loans'),            s => { setLoans(toArr(s));                 done(); });
    const u3  = onValue(ref(db, 'notes'),            s => { setNotes(toArr(s));                 done(); });
    const u4  = onValue(ref(db, 'tasks'),            s => { setCrmTasks(toArr(s));              done(); });
    const u5  = onValue(ref(db, 'goals'),            s => { setGoals(toArr(s));                 done(); });
    const u6  = onValue(ref(db, 'goalLog'),          s => { setGoalLog(toArr(s));               done(); });
    const u7  = onValue(ref(db, 'mortgageSettings'), s => { setMortgageSettings(s.val() || {}); done(); });
    const u8  = onValue(ref(db, 'personalNotes'),    s => { setPersonalNotes(toArr(s));         done(); });
    const u9  = onValue(ref(db, 'followups'),        s => { setFollowups(toArr(s));             done(); });

    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); u9(); };
  }, [user]);
```

Delete the CRUD sections `Bullet Journal: entries`, `Bullet Journal: collections`, `Bullet Journal: weekly goals`, `Focus: Areas`, `Focus: Projects`, `Focus: Tasks`, `Focus: Sessions` and remove all of their function names plus `bujoEntries, bujoCollections, bujoWeeklyGoals, focusAreas, focusProjects, focusTasks, focusSessions` from the `<DataContext.Provider value={{ … }}>` object.

- [ ] **Step 5: Interim trim of `src/pages/Dashboard.jsx`** (keeps the build green; full rebuild is Task 6)

Replace line 3 and lines 6–10 (imports) with:

```jsx
import { Target, TrendingUp, AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, fmtShortDate, getGreeting, getDayLabel, pctRound, getGoalActuals, paceStatus, getGoalIdeal, isToday, isPast, isWithinDays } from '../utils';
import { STAGE_COLORS, ACTIVE_STAGES } from '../constants';
import { StageBadge } from '../components/common/Badge';
```

Then delete:
- the destructured `focusTasks, focusSessions, focusAreas` from `useData()`
- the whole `── Focus metrics ──` block (lines 28–39)
- the "Focus Today" `KpiCard` (lines 84–86)
- the `HabitsWidget` block (lines 96–99)
- the entire `{/* Focus column … */}` `<div className="dash-section">…</div>` (lines 148–208)
- change the grid to two columns: `gridTemplateColumns: '1fr 1fr'`

- [ ] **Step 6: Verify no dangling references, then build**

```bash
cd "/Users/mihirpatel/Desktop/Claude/Personal Dashboard"
grep -rn "focusTasks\|focusSessions\|focusAreas\|focusProjects\|bujo\|Habits\|habitStats\|focusStats\|parseTask\|GlobalQuickAdd" src/ --include="*.jsx" --include="*.js" | grep -v node_modules
npm run build
```

Expected: grep returns nothing (or only comments you then delete); build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Remove Habits, Focus, and Bullet Journal modules (UI only; RTDB data kept)"
```

---

### Task 2: DataContext — `checkins` node + `setCheckin`

**Files:**
- Modify: `src/context/DataContext.jsx`

- [ ] **Step 1: Add state, listener, and CRUD**

Add with the other `useState` lines:

```jsx
  const [checkins, setCheckins] = useState({});   // { 'YYYY-MM-DD': { am: ts|null, pm: ts|null } }
```

In the `useEffect`: reset `setCheckins({})` in the `!user` branch, bump `TOTAL` to `10`, and add:

```jsx
    const u10 = onValue(ref(db, 'checkins'),         s => { setCheckins(s.val() || {});         done(); });
```

(and `u10();` in the cleanup return.)

Add a CRUD section after `── Mortgage Settings ──`:

```jsx
  // ─── Daily review check-ins ───────────────────────────────────────────────
  // value=true stamps now; value=false clears (mis-tap undo).
  const setCheckin = useCallback(async (dateKey, part, value) =>
    set(ref(db, `checkins/${dateKey}/${part}`), value ? Date.now() : null), []);
```

Expose `checkins` and `setCheckin` in the provider `value`.

- [ ] **Step 2: Verify + commit**

```bash
npm run build && git add -A && git commit -m "DataContext: add daily check-ins node and setCheckin"
```

---

### Task 3: `NumberInput` — live thousand-separator input

**Files:**
- Create: `src/components/common/NumberInput.jsx`

- [ ] **Step 1: Create the component**

Contract: drop-in replacement for `<input type="number">` for non-negative integers. `value` is the raw digit string (or number) the parent stores (e.g. `'250000'`); `onChange` receives the cleaned digit string. Display shows `250,000`; caret position is preserved across reformatting by counting digits left of the caret.

```jsx
// src/components/common/NumberInput.jsx — text input that live-formats
// non-negative integers with thousand separators ("250000" ⇄ "250,000").
// value: raw digit string|number; onChange(rawDigitString).
import { useRef, useLayoutEffect } from 'react';

function formatDisplay(v) {
  const digits = String(v ?? '').replace(/\D/g, '');
  return digits === '' ? '' : Number(digits).toLocaleString('en-AU');
}

export default function NumberInput({ value, onChange, ...rest }) {
  const ref   = useRef(null);
  const caret = useRef(null);          // digits left of caret after last edit
  const display = formatDisplay(value);

  function handleChange(e) {
    const el = e.target;
    caret.current = el.value.slice(0, el.selectionStart).replace(/\D/g, '').length;
    onChange(el.value.replace(/\D/g, ''));
  }

  useLayoutEffect(() => {
    if (caret.current == null || !ref.current) return;
    const wanted = caret.current;
    caret.current = null;
    const s = ref.current.value;
    let pos = 0, seen = 0;
    while (pos < s.length && seen < wanted) { if (/\d/.test(s[pos])) seen++; pos++; }
    ref.current.setSelectionRange(pos, pos);
  }, [display]);

  return (
    <input ref={ref} type="text" inputMode="numeric" autoComplete="off"
      value={display} onChange={handleChange} {...rest}/>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
npm run build && git add -A && git commit -m "Add NumberInput with live thousand separators"
```

---

### Task 4: Goals — comma inputs and display fixes

**Files:**
- Modify: `src/pages/Goals.jsx`

- [ ] **Step 1: Swap the five numeric inputs to `NumberInput`**

Add import: `import NumberInput from '../components/common/NumberInput';`

1. **GoalModal** annual target (~line 207):
   `<NumberInput value={f.yearTarget} onChange={v=>sf('yearTarget',v)} placeholder="0"/>`
2. **LogModal** amount (~line 237):
   `<NumberInput value={amt} onChange={setAmt} placeholder={isCur?'10,000':'1'} autoFocus/>`
3. **SubGoalLogModal** amount (~line 278):
   `<NumberInput value={amt} onChange={setAmt} placeholder="1" autoFocus/>`
4. **SubGoalEditModal** target (~line 312):
   `<NumberInput value={target} onChange={setTarget} placeholder="e.g. 5 (optional)" onKeyDown={e=>{ if(e.key==='Enter'&&title.trim()) onSave({title:title.trim(),target:Number(target)||0}); }}/>`
5. **GoalPeriodBlock** quick-add target (~line 527):
   `<NumberInput value={newTarget} onChange={setNewTarget} placeholder="Target (opt)" onKeyDown={e=>{if(e.key==='Enter')handleAdd();if(e.key==='Escape')setAdding(false);}} style={{...inputStyle,width:110}} onFocus={focusAccent} onBlur={blurBorder}/>`

All parents already store the value as a string and convert with `Number(...)` on save — `Number('250000')` still works because `onChange` returns the un-commaed digit string. No save-path changes needed.

- [ ] **Step 2: Fix raw-number displays**

`formatNumber` is already imported. Change:

1. **SubGoalRow stepper** (~line 356): `{displayAmt}/{sg.target}` → `{formatNumber(displayAmt)}/{formatNumber(sg.target)}`
2. **SubGoalRow entry rows** (~line 417): `+{e.amt}` → `+{formatNumber(e.amt)}`
3. **LogModal quick-add chips** (~line 250): `+{isCur?formatCurrency(v,true):v}` → `+{isCur?formatCurrency(v,true):formatNumber(v)}`

- [ ] **Step 3: Verify in the browser**

Start the dev server (preview tools), open Goals: type `250000` into “Add Goal → Total target” — field must show `250,000` with the caret stable; save and confirm the yearly card shows `of 250,000`. Check a sub-goal with target 2000 shows `0/2,000`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Goals: thousand-separator inputs and displays"
```

---

### Task 5: CRM loan form — comma inputs

**Files:**
- Modify: `src/pages/mortgage/Pipeline.jsx` (loan value ~line 115, commission ~line 152)

- [ ] **Step 1: Swap inputs**

Add import `import NumberInput from '../../components/common/NumberInput';` and change:

```jsx
<NumberInput value={f.value} onChange={v => sf('value', v)} placeholder="500,000"/>
```
```jsx
<NumberInput value={f.comms} onChange={v => sf('comms', v)} placeholder="2,750"/>
```

Also `grep -n 'type="number"' src/pages/mortgage/*.jsx src/components/mortgage/*.jsx` — if any other currency/count inputs exist (e.g. in Clients.jsx loan editor or Settings), apply the same swap.

- [ ] **Step 2: Verify in browser (add/edit a loan, check saved value renders correctly in the pipeline card), then commit**

```bash
git add -A && git commit -m "CRM: thousand-separator inputs for loan value and commission"
```

---

### Task 6: Rebuild the main Dashboard (action-first) + check-in widget

**Files:**
- Create: `src/components/dashboard/CheckinWidget.jsx`
- Rewrite: `src/pages/Dashboard.jsx`
- Modify: `src/index.css` (append new classes)

- [ ] **Step 1: Create `CheckinWidget`**

```jsx
// src/components/dashboard/CheckinWidget.jsx — AM/PM daily review check-in.
// Tracks whether the morning/evening dashboard review actually happened.
import { Sun, Moon, Flame } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { tsToDateInput } from '../../utils';

function dayKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return tsToDateInput(d.getTime());
}

// Consecutive days with BOTH check-ins; an incomplete today doesn't break it.
function computeStreak(checkins) {
  const today = checkins[dayKey(0)];
  let i = (today?.am && today?.pm) ? 0 : 1;
  let streak = 0;
  for (; ; i++) {
    const c = checkins[dayKey(i)];
    if (c?.am && c?.pm) streak++;
    else break;
  }
  return streak;
}

export default function CheckinWidget() {
  const { checkins, setCheckin } = useData();
  const todayKey = dayKey(0);
  const today    = checkins[todayKey] || {};
  const streak   = computeStreak(checkins);

  const week = Array.from({ length: 7 }, (_, idx) => {
    const off = 6 - idx;
    const c   = checkins[dayKey(off)] || {};
    const n   = (c.am ? 1 : 0) + (c.pm ? 1 : 0);
    return { key: dayKey(off), n, isToday: off === 0 };
  });

  return (
    <div className="checkin-wrap">
      <button className={`checkin-pill${today.am ? ' done' : ''}`} title="Did my morning review"
        onClick={() => setCheckin(todayKey, 'am', !today.am)}>
        <Sun size={13}/> Morning
      </button>
      <button className={`checkin-pill${today.pm ? ' done' : ''}`} title="Did my evening review"
        onClick={() => setCheckin(todayKey, 'pm', !today.pm)}>
        <Moon size={13}/> Evening
      </button>
      <div className="checkin-days" title="Last 7 days (both reviews = full dot)">
        {week.map(d => (
          <span key={d.key} className={`checkin-dot${d.n === 2 ? ' full' : d.n === 1 ? ' half' : ''}${d.isToday ? ' today' : ''}`}/>
        ))}
      </div>
      {streak > 0 && (
        <span className="checkin-streak"><Flame size={12}/> {streak}d</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/pages/Dashboard.jsx`**

```jsx
import { useNavigate } from 'react-router-dom';
import { Target, TrendingUp, AlertCircle, Reply, ArrowRight, Plus, CheckCircle2, Circle, NotebookPen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getGreeting, getDayLabel, pctRound, getGoalActuals, getGoalIdeal, paceStatus, isToday, isPast, fmtShortDate, fmtRelative } from '../utils';
import { actionNeeded } from '../utils/followups';
import { STAGE_COLORS, ACTIVE_STAGES } from '../constants';
import { StageBadge } from '../components/common/Badge';
import CheckinWidget from '../components/dashboard/CheckinWidget';

function KpiCard({ icon: Icon, label, value, sub, color, soft, onClick }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color, '--kpi-soft': soft }} onClick={onClick}>
      <div className="kpi-icon"><Icon size={16}/></div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

const NOTE_TYPE_COLORS = { note: '#60A5FA', idea: '#F59E0B', area: '#34D399' };

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { goals, goalLog, loans, clients, notes, crmTasks, followups, personalNotes, updateCrmTask, loading } = useData();

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  // ── Today action list: due/overdue CRM tasks + follow-ups on me ────────────
  const openCrm  = crmTasks.filter(t => !['Done', 'Cancelled'].includes(t.status));
  const dueTasks = openCrm.filter(t => t.dueDate && (isPast(t.dueDate) || isToday(t.dueDate)));
  const dueFups  = followups.filter(actionNeeded);
  const dueVal   = x => x.due ? new Date(x.due).getTime() : Number.MAX_SAFE_INTEGER;
  const todayItems = [
    ...dueTasks.map(t => ({
      kind: 'task', id: t.id, title: t.title,
      client: clientMap[t.clientId] || '', due: t.dueDate,
      overdue: isPast(t.dueDate) && !isToday(t.dueDate), raw: t,
    })),
    ...dueFups.map(f => ({
      kind: 'followup', id: f.id, title: `Follow up — ${clientMap[f.clientId] || 'client'}`,
      client: clientMap[f.clientId] || '', due: f.dueDate || '',
      overdue: !!f.dueDate && isPast(f.dueDate) && !isToday(f.dueDate), raw: f,
    })),
  ].sort((a, b) => (a.overdue !== b.overdue ? (a.overdue ? -1 : 1) : dueVal(a) - dueVal(b)));

  async function completeTask(t) {
    try { await updateCrmTask(t.id, { status: 'Done' }); toast.success('Task done.'); }
    catch { toast.error('Failed.'); }
  }

  // ── Goals ───────────────────────────────────────────────────────────────────
  const activeGoals  = goals.filter(g => !g.status || g.status === 'active');
  const goalsOnTrack = activeGoals.filter(g => {
    const act = getGoalActuals(g, goalLog);
    return paceStatus(act.year, g.year?.target, getGoalIdeal(g, 'year')).key !== 'behind';
  }).length;

  // ── Mortgage ────────────────────────────────────────────────────────────────
  const activeLoans   = loans.filter(l => ACTIVE_STAGES.includes(l.stage));
  const pipelineValue = activeLoans.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const overdueCrm    = dueTasks.filter(t => isPast(t.dueDate) && !isToday(t.dueDate)).length;
  const recentLoans   = [...loans].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
  const recentPNotes  = [...personalNotes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 4);

  const rawName   = user?.email?.split('@')[0] || 'Mihir';
  const firstName = rawName.split(/[-._]/)[0];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}/>
        <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>Loading your dashboard…</span>
      </div>
    );
  }

  return (
    <div className="page-body fade-in">
      {/* Greeting + check-in */}
      <div className="dash-greeting" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="dash-greeting-text">{getGreeting()}, {firstName.charAt(0).toUpperCase() + firstName.slice(1)} 👋</div>
          <div className="dash-greeting-sub">{getDayLabel()}</div>
        </div>
        <CheckinWidget/>
      </div>

      {/* Today — the one list that matters */}
      <div className="dash-section" style={{ marginBottom: 24 }}>
        <div className="dash-section-header">
          <div className="dash-section-title">
            <span className="section-pip" style={{ background: 'var(--accent)' }}/>
            <span style={{ color: 'var(--accent)' }}>Today</span>
            {todayItems.length > 0 && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>· {todayItems.length} to action</span>}
          </div>
        </div>
        {todayItems.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '18px 0', textAlign: 'center' }}>
            Nothing due — you're clear. ✨
          </div>
        ) : (
          <div className="today-list">
            {todayItems.map(item => (
              <div key={`${item.kind}-${item.id}`} className={`today-row${item.overdue ? ' overdue' : ''}`}
                onClick={() => navigate(item.kind === 'task' ? '/mortgage/tasks' : '/mortgage/followups')}>
                {item.kind === 'task' ? (
                  <button title="Mark done" onClick={e => { e.stopPropagation(); completeTask(item.raw); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ink-3)', flexShrink: 0, display: 'flex' }}>
                    <Circle size={16}/>
                  </button>
                ) : (
                  <Reply size={15} style={{ color: 'var(--info)', flexShrink: 0 }}/>
                )}
                <span className="today-kind" style={item.kind === 'task'
                  ? { background: 'var(--mortgage-dim)', color: 'var(--mortgage)' }
                  : { background: 'var(--info-dim)',     color: 'var(--info)' }}>
                  {item.kind === 'task' ? 'Task' : 'Follow-up'}
                </span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                  {item.kind === 'task' && item.client && <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}> · {item.client}</span>}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: item.overdue ? 700 : 500, color: item.overdue ? 'var(--danger)' : 'var(--warn)', flexShrink: 0 }}>
                  {item.overdue ? `Overdue · ${fmtShortDate(item.due)}` : item.due ? 'Due today' : 'No date'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        <KpiCard icon={Target} label="Goals on Track" value={`${goalsOnTrack}/${activeGoals.length}`}
          color="var(--goals)" soft="var(--goals-dim)" onClick={() => navigate('/goals')}/>
        <KpiCard icon={TrendingUp} label="Pipeline Value" value={formatCurrency(pipelineValue, true)}
          sub={`${activeLoans.length} active loans`}
          color="var(--mortgage)" soft="var(--mortgage-dim)" onClick={() => navigate('/mortgage/pipeline')}/>
        <KpiCard icon={Reply} label="Follow-ups On Me" value={dueFups.length}
          color={dueFups.length > 0 ? 'var(--warn)' : 'var(--ok)'} soft={dueFups.length > 0 ? 'var(--warn-dim)' : 'var(--ok-dim)'}
          onClick={() => navigate('/mortgage/followups')}/>
        <KpiCard icon={AlertCircle} label="Overdue CRM Tasks" value={overdueCrm}
          color={overdueCrm > 0 ? 'var(--danger)' : 'var(--ok)'} soft={overdueCrm > 0 ? 'var(--danger-dim)' : 'var(--ok-dim)'}
          onClick={() => navigate('/mortgage/tasks')}/>
      </div>

      {/* 3-column content */}
      <div className="dash-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

        {/* Goals column */}
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <span className="section-pip" style={{ background: 'var(--goals)' }}/>
              <span style={{ color: 'var(--goals)' }}>Goals</span>
            </div>
            <button className="btn ghost sm" onClick={() => navigate('/goals')} style={{ gap: 4 }}>
              View all <ArrowRight size={12}/>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeGoals.length === 0 && (
              <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No active goals yet.</div>
            )}
            {activeGoals.slice(0, 5).map(g => {
              const act    = getGoalActuals(g, goalLog);
              const pct    = pctRound(act.year, g.year?.target);
              const status = paceStatus(act.year, g.year?.target, getGoalIdeal(g, 'year'));
              const fillColor = status.key === 'behind' ? 'var(--danger)' : status.key === 'ahead' ? 'var(--ok)' : 'var(--goals)';
              return (
                <div key={g.id} className="goal-dash-row" onClick={() => navigate('/goals')}>
                  <div className={`goal-icon ${g.cls || 'gc0'}`}>{g.glyph || '🎯'}</div>
                  <div className="goal-dash-info">
                    <div className="goal-dash-name">{g.label}</div>
                    <div style={{ marginTop: 5 }}>
                      <div className="progress-bar" style={{ height: 4 }}>
                        <div className="progress-fill" style={{ width: pct + '%', background: fillColor }}/>
                      </div>
                    </div>
                  </div>
                  <div className="goal-dash-pct">{pct}%</div>
                </div>
              );
            })}
          </div>
          <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => navigate('/goals')}>
            <Plus size={13}/> Add Goal
          </button>
        </div>

        {/* Pipeline column */}
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <span className="section-pip" style={{ background: 'var(--mortgage)' }}/>
              <span style={{ color: 'var(--mortgage)' }}>Pipeline</span>
            </div>
            <button className="btn ghost sm" onClick={() => navigate('/mortgage/pipeline')} style={{ gap: 4 }}>
              View all <ArrowRight size={12}/>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentLoans.length === 0 && (
              <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No loans in pipeline yet.</div>
            )}
            {recentLoans.map(l => {
              const c = STAGE_COLORS[l.stage] || {};
              return (
                <div key={l.id} className="pipeline-mini-row" onClick={() => navigate('/mortgage/pipeline')}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.text || 'var(--mortgage)', flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.clientObj || clientMap[l.clientId] || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{l.lender} · {l.objective}</div>
                  </div>
                  <StageBadge stage={l.stage}/>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes & Ideas column */}
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <span className="section-pip" style={{ background: '#60A5FA' }}/>
              <span style={{ color: '#60A5FA' }}>Notes &amp; Ideas</span>
            </div>
            <button className="btn ghost sm" onClick={() => navigate('/notes')} style={{ gap: 4 }}>
              View all <ArrowRight size={12}/>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentPNotes.length === 0 && (
              <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                Nothing captured yet.
              </div>
            )}
            {recentPNotes.map(n => (
              <div key={n.id} className="dash-task-row" onClick={() => navigate('/notes')}>
                <NotebookPen size={13} style={{ color: NOTE_TYPE_COLORS[n.noteType] || 'var(--ink-3)', flexShrink: 0 }}/>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.title || 'Untitled'}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--ink-3)', flexShrink: 0 }}>{fmtRelative(n.updatedAt)}</span>
              </div>
            ))}
          </div>
          <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => navigate('/notes')}>
            <Plus size={13}/> New Note
          </button>
        </div>
      </div>
    </div>
  );
}
```

Note: `CheckCircle2` import is unused in the final version above — drop it. Verify `var(--info)`, `var(--info-dim)`, `var(--warn)`, `var(--warn-dim)` exist in `index.css` (they are used by `utils/followups.js` styles already); if `--info-dim`/`--warn-dim` are missing, add them next to the other `-dim` variables using the same alpha pattern.

- [ ] **Step 3: Append dashboard CSS to `src/index.css`**

```css
/* ─── Dashboard: Today list ─────────────────────────────────────────────── */
.today-list { display: flex; flex-direction: column; gap: 6px; }
.today-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--r); cursor: pointer;
  transition: border-color .15s, background .15s;
}
.today-row:hover { border-color: var(--border-strong); }
.today-row.overdue { border-color: var(--danger-dim); }
.today-kind {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; padding: 2px 8px; border-radius: 99px; flex-shrink: 0;
}

/* ─── Dashboard: AM/PM check-in ─────────────────────────────────────────── */
.checkin-wrap { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.checkin-pill {
  display: flex; align-items: center; gap: 6px; padding: 7px 14px;
  border-radius: 99px; border: 1px solid var(--border); background: var(--surface);
  color: var(--ink-3); font-size: 12.5px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: background .15s, border-color .15s, color .15s;
}
.checkin-pill:hover { border-color: var(--border-strong); }
.checkin-pill.done { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
.checkin-days { display: flex; gap: 4px; align-items: center; margin-left: 2px; }
.checkin-dot { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--border-strong); }
.checkin-dot.half { border-color: var(--accent); background: linear-gradient(90deg, var(--accent) 50%, transparent 50%); }
.checkin-dot.full { border-color: var(--accent); background: var(--accent); }
.checkin-dot.today { outline: 2px solid var(--accent-dim); outline-offset: 1px; }
.checkin-streak { display: flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700; color: var(--warn); }
```

Also add a mobile rule beside the existing `.dash-main-grid` media queries so the grid stacks (if one doesn't already exist after the checkpoint's mobile overhaul — check first): `@media (max-width: 900px) { .dash-main-grid { grid-template-columns: 1fr !important; } }`

- [ ] **Step 4: Verify in browser**

Dev server: dashboard shows greeting + check-in pills; tapping Morning fills the pill and writes `checkins/<today>/am` (re-tap clears); Today list shows overdue items first with working one-click complete; KPIs navigate correctly; three columns render; console clean. Resize to ~380px — columns stack, nav tabs are Home/Goals/Mortgage/More.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Dashboard: action-first rebuild with Today list and AM/PM check-in"
```

---

### Task 7: Prune dead constants, utils, and CSS

**Files:**
- Modify: `src/constants/index.js`, `src/utils/index.js`, `src/index.css`

- [ ] **Step 1: Remove dead constants**

Delete from `src/constants/index.js`: `PERSONAL_TASK_PRIORITIES`, `PERSONAL_TASK_CATEGORIES`, `AREA_COLORS`, `AREA_ICONS`, `FOCUS_PRIORITIES`, `PRIORITY_MAP` — after confirming zero remaining usages:

```bash
grep -rn "PERSONAL_TASK\|AREA_COLORS\|AREA_ICONS\|FOCUS_PRIORITIES\|PRIORITY_MAP" src/ | grep -v constants/index.js
```

- [ ] **Step 2: Remove dead utils**

`fmtFocus` in `src/utils/index.js` was only used by focus timers — confirm with `grep -rn "fmtFocus" src/` and delete if unused.

- [ ] **Step 3: Remove dead CSS**

For each selector prefix that belonged to removed modules, grep the class name across `src/**/*.jsx`; delete rule blocks with no hits. Candidate prefixes (verify each): `.habit`, `.hw-` (HabitsWidget), `.focus-`, `.timer`, `.bujo`, `.entry-row`, `.migration`, `.qa-` / `.quick-add` (GlobalQuickAdd), `.stats-`. Be conservative: only delete a block when the grep proves it unused.

- [ ] **Step 4: Verify + commit**

```bash
npm run lint && npm run build
```
Then click through every remaining page in the dev server checking for broken styles.

```bash
git add -A && git commit -m "Prune dead constants, utils, and CSS from removed modules"
```

---

### Task 8: Mortgage CRM audit & fix

**Files:** emergent — any of `src/pages/mortgage/*.jsx`, `src/components/mortgage/LoanCompliance.jsx`, `src/utils/crmCompliance.js`, `src/utils/followups.js`

No new features. With the dev server running, exercise each flow below; for every bug/console error/rough edge found, fix it in the source, re-verify, and note it for the final report.

- [ ] **Step 1: Pipeline** — add loan (typed client name → auto-creates client), edit, change stage, delete; card values show commas; stage colours match `STAGE_COLORS`.
- [ ] **Step 2: Clients** — add/edit/delete client; deleting a client cascades its loans/notes/tasks/followups (check RTDB back-references `loanIds`/`noteIds`/`taskIds`/`followupIds` are cleaned).
- [ ] **Step 3: Follow-ups** — create for a client, cycle `waiting_me → waiting_client → closed`, set due date; `actionNeeded` badge in sidebar matches list count; comment thread (client notes) loads.
- [ ] **Step 4: Tasks** — add/edit/complete/delete; overdue pill count matches dashboard KPI and sidebar badge; note the page's local `TASK_STATUSES`/`TASK_PRIORITIES` differ from `constants/index.js` (`'To Do'` vs `'To do'`, 4 vs 3 priorities) — reconcile by making `constants/index.js` match the page's values and importing them, since stored data uses the page's strings.
- [ ] **Step 5: Notes** — add note with/without client, filter by channel/type, edit, delete.
- [ ] **Step 6: Performance** — charts render with real data; totals reconcile with pipeline (settled value, counts per stage); no NaN with empty months.
- [ ] **Step 7: Settings** — edit lenders/referrers lists, save, confirm they appear in loan form dropdowns.
- [ ] **Step 8: Loan Compliance** — open a loan's compliance checklist, toggle items, confirm persistence after reload.
- [ ] **Step 9: Cross-checks** — sidebar badges vs page counts; every dashboard link lands on the right page; browser console clean on every page.
- [ ] **Step 10: Commit** (one commit per coherent fix, or one combined)

```bash
git add -A && git commit -m "CRM audit fixes: <describe what was found and fixed>"
```

---

### Task 9: Final verification

- [ ] **Step 1: Lint and build**

```bash
npm run lint && npm run build
```
Expected: both pass with zero errors.

- [ ] **Step 2: Full walkthrough** — dev server: Dashboard (check-in, Today list, KPIs, columns), Goals (create goal with `1,500,000` target, log `25,000`, sub-goals), Notes & Ideas, all 7 CRM pages, dark + light theme, mobile width.

- [ ] **Step 3: Screenshot proof** — capture dashboard (desktop + mobile) and Goals input showing separators; share in final report.

- [ ] **Step 4: Commit any leftovers; report** — summarise removals, new features, CRM fixes found, and remaining known issues (if any).

---

## Self-review notes

- Spec §1 → Task 1 + 7; §2 → Task 6; §3 → Tasks 2 + 6; §4 → Tasks 3 + 4 + 5; §5 → Task 6 (dashboard column; page untouched); §6 → Task 1 Step 3 (sidebar Tasks link) + Task 8. Error-handling/testing section → toast pattern preserved, verification steps in every task.
- Type consistency: `setCheckin(dateKey, part, value)` defined in Task 2, used identically in Task 6. `NumberInput({ value, onChange })` contract identical across Tasks 3/4/5.
- No TDD framework: intentional deviation per approved spec (manual verification + lint/build); noted in header.
