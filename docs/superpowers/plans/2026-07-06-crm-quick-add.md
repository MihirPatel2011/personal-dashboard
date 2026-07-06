# CRM Task Quick-Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One-line task capture with smart tokens (`@client !priority datewords`) on the CRM Tasks page and the dashboard Today card.

**Architecture:** A pure parser util (`parseCrmTask`) with zero React dependencies, one self-contained `QuickAddTask` component that reads `clients`/`addCrmTask` from `DataContext`, mounted in two places. Existing toast/error patterns; no data-model changes — tasks created have the exact shape the TaskForm modal writes.

**Tech Stack:** React 19, Firebase RTDB via DataContext, lucide-react, react-hot-toast. No test framework — verification is browser round-trip + `npm run build` + lint (per approved spec).

**Spec:** `docs/superpowers/specs/2026-07-06-crm-quick-add-design.md`

---

### Task 1: Parser — `src/utils/parseCrmTask.js`

**Files:**
- Create: `src/utils/parseCrmTask.js`

- [ ] **Step 1: Create the parser**

```js
// src/utils/parseCrmTask.js — smart-token parser for CRM task quick-add.
// parseCrmTask('Chase payslips @jane !high tomorrow', clients) →
//   { title, clientId, priority, priorityExplicit, dueDate, matchedClient }
// Tokens are consumed once (first occurrence wins); anything unrecognised
// stays in the title so nothing is silently lost.
import { tsToDateInput } from './index';

const PRIORITY_TOKENS = { urgent: 'Urgent', high: 'High', medium: 'Medium', med: 'Medium', low: 'Low' };
const WEEKDAYS_FULL = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAYS_3   = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function midnight(d) { d.setHours(0, 0, 0, 0); return d; }

// Standalone date word → Date at local midnight, or null.
function parseDateWord(word) {
  const lw = word.toLowerCase();
  const now = new Date();
  if (lw === 'today') return midnight(new Date(now));
  if (lw === 'tomorrow' || lw === 'tmrw' || lw === 'tom') {
    const d = new Date(now); d.setDate(d.getDate() + 1); return midnight(d);
  }
  const target = WEEKDAYS_FULL.indexOf(lw) !== -1 ? WEEKDAYS_FULL.indexOf(lw) : WEEKDAYS_3.indexOf(lw);
  if (target !== -1) {
    const d = new Date(now);
    d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7)); // today's weekday = today
    return midnight(d);
  }
  const m = lw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (m) {
    const day = +m[1], mon = +m[2] - 1, yr = m[3] ? +m[3] : now.getFullYear();
    const d = midnight(new Date(yr, mon, day));
    if (d.getDate() !== day || d.getMonth() !== mon) return null; // e.g. 32/8
    if (!m[3] && d < midnight(new Date(now))) d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  return null;
}

export function parseCrmTask(input, clients = []) {
  const words = (input || '').trim().split(/\s+/).filter(Boolean);
  const rest = [];
  let clientId = '', matchedClient = null, priority = 'Medium';
  let dueDate = '', clientFound = false, prioFound = false, dateFound = false;

  for (const w of words) {
    if (!clientFound && w.length > 1 && w.startsWith('@')) {
      const tok = w.slice(1).toLowerCase();
      const match = clients
        .filter(c => (c.name || '').toLowerCase().split(/\s+/).some(part => part.startsWith(tok)))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))[0];
      if (match) { clientFound = true; clientId = match.id; matchedClient = match.name; continue; }
      rest.push(w); continue;
    }
    if (!prioFound && w.length > 1 && w.startsWith('!')) {
      const p = PRIORITY_TOKENS[w.slice(1).toLowerCase()];
      if (p) { prioFound = true; priority = p; continue; }
      rest.push(w); continue;
    }
    if (!dateFound) {
      const d = parseDateWord(w);
      if (d) { dateFound = true; dueDate = tsToDateInput(d.getTime()); continue; }
    }
    rest.push(w);
  }

  return { title: rest.join(' '), clientId, priority, priorityExplicit: prioFound, dueDate, matchedClient };
}
```

- [ ] **Step 2: Sanity-check the parser with node**

```bash
cd "/Users/mihirpatel/Desktop/Claude/Personal Dashboard"
node --input-type=module -e "
import { parseCrmTask } from './src/utils/parseCrmTask.js';
const clients = [{ id: 'c1', name: 'Jane Smith' }, { id: 'c2', name: 'Jatin Patel' }];
console.log(parseCrmTask('Chase payslips @jane !high tomorrow', clients));
console.log(parseCrmTask('call about monday settlement @nobody !x 15/8', clients));
console.log(parseCrmTask('@ja follow up', clients));
"
```

Expected: first → title `Chase payslips`, clientId `c1`, priority `High`, dueDate = tomorrow; second → `monday` consumed as date, `@nobody`/`!x` stay in title, `15/8` NOT consumed (date already found); third → clientId `c1` (Jane before Jatin alphabetically). *(Note: `./src/utils/index.js` imports nothing Firebase, so this runs in plain node.)*

- [ ] **Step 3: Commit**

```bash
git add src/utils/parseCrmTask.js && git commit -m "Add smart-token parser for CRM task quick-add"
```

### Task 2: `QuickAddTask` component + CSS

**Files:**
- Create: `src/components/mortgage/QuickAddTask.jsx`
- Modify: `src/index.css` (append)

- [ ] **Step 1: Create the component**

```jsx
// src/components/mortgage/QuickAddTask.jsx — one-line CRM task capture.
// Enter creates the task with the parsed tokens and keeps focus for the next one.
import { useState } from 'react';
import { Plus, CornerDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import { parseCrmTask } from '../../utils/parseCrmTask';
import { PriorityBadge } from '../common/Badge';
import { fmtShortDate, tsToDateInput, isToday } from '../../utils';

export default function QuickAddTask({ defaultDueToday = false, autoFocus = false }) {
  const { clients, addCrmTask } = useData();
  const [text, setText] = useState('');

  const parsed = parseCrmTask(text, clients);
  const effectiveDue = parsed.dueDate || (defaultDueToday ? tsToDateInput(Date.now()) : '');
  const unmatchedAt = !parsed.clientId && /(^|\s)@\S/.test(text);

  async function submit() {
    if (!parsed.title.trim()) return;
    try {
      await addCrmTask({
        title: parsed.title, clientId: parsed.clientId, type: '',
        priority: parsed.priority, status: 'To Do', dueDate: effectiveDue, notes: '',
      });
      toast.success('Task added.');
      setText('');
    } catch { toast.error('Failed to add task.'); }
  }

  return (
    <div className="qat">
      <div className="qat-row">
        <Plus size={15} style={{ color: 'var(--ink-3)', flexShrink: 0 }}/>
        <input
          className="qat-input" value={text} autoFocus={autoFocus}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setText(''); }}
          placeholder="Add task… e.g. Chase payslips @jane !high tomorrow"
        />
        {text.trim() !== '' && <span className="qat-hint"><CornerDownLeft size={11}/> Enter</span>}
      </div>
      {text.trim() !== '' && (
        <div className="qat-chips">
          {parsed.matchedClient && <span className="qat-chip client">{parsed.matchedClient}</span>}
          {unmatchedAt && <span className="qat-chip muted">no client match</span>}
          {parsed.priorityExplicit && <PriorityBadge priority={parsed.priority}/>}
          {effectiveDue && <span className="qat-chip due">{isToday(effectiveDue) ? 'Today' : fmtShortDate(effectiveDue)}</span>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Append CSS to `src/index.css`**

```css
/* ─── CRM quick-add task bar ────────────────────────────────────────────── */
.qat { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.qat-row {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); transition: border-color .15s;
}
.qat-row:focus-within { border-color: var(--accent-border); }
.qat-input { flex: 1; background: none; border: none; outline: none; color: var(--ink); font-size: 13.5px; font-family: inherit; min-width: 0; }
.qat-input::placeholder { color: var(--ink-4); }
.qat-hint { display: flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--ink-4); flex-shrink: 0; }
.qat-chips { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; padding-left: 6px; }
.qat-chip { font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 99px; }
.qat-chip.client { background: var(--mortgage-dim); color: var(--mortgage); }
.qat-chip.due { background: var(--warn-dim); color: var(--warn); }
.qat-chip.muted { background: var(--surface-3); color: var(--ink-3); }
```

- [ ] **Step 3: Build + commit**

```bash
npm run build && git add -A && git commit -m "Add QuickAddTask capture bar component"
```

### Task 3: Mount on Tasks page and dashboard Today card

**Files:**
- Modify: `src/pages/mortgage/CRMTasks.jsx` (imports + top of the list container, ~line 184)
- Modify: `src/pages/Dashboard.jsx` (imports + end of Today section, ~line 138)

- [ ] **Step 1: CRMTasks.jsx** — add import `import QuickAddTask from '../../components/mortgage/QuickAddTask';` and render the bar as the first child of the content container:

```jsx
      <div style={{ padding: '20px 28px' }}>
        <QuickAddTask autoFocus/>
        {filtered.length === 0 ? (
```

- [ ] **Step 2: Dashboard.jsx** — add import `import QuickAddTask from '../components/mortgage/QuickAddTask';` and render it after the Today list/empty-state (inside the Today `dash-section`, after the ternary closes):

```jsx
        <div style={{ marginTop: 12 }}>
          <QuickAddTask defaultDueToday/>
        </div>
```

(`defaultDueToday` so an undated capture lands in the Today list immediately; the implied "Today" chip previews this.)

- [ ] **Step 3: Build, lint, commit**

```bash
npm run build && npm run lint 2>&1 | grep -i "quickadd\|parseCrm" ; git add -A && git commit -m "Mount quick-add task bar on Tasks page and dashboard Today card"
```

Expected: build passes; no new lint findings for the new files.

### Task 4: Browser verification (live data — leave no test residue)

- [ ] **Step 1:** `preview_start` → resize 1440×900 → navigate to `#/mortgage/tasks`.
- [ ] **Step 2:** Type `QA test task @<real client first name> !high tomorrow` — assert chips show the resolved client name, High badge, and tomorrow's date; input keeps focus.
- [ ] **Step 3:** Press Enter → task appears in the list with client/priority/due-date. Delete it via the row's trash button (confirm dialog).
- [ ] **Step 4:** Dashboard: type `QA today test` in the Today card bar — assert implied "Today" chip; Enter → task appears in the Today list above; complete-circle or delete it from `/mortgage/tasks` (delete, to leave no residue).
- [ ] **Step 5:** Console clean (no new errors). Mobile width 375: bar fits, chips wrap.

### Task 5: Deploy

- [ ] **Step 1:** `git push origin main`
- [ ] **Step 2:** `npm run deploy` → expect `Published`.

---

## Self-review notes

- Spec §1 → Task 1 (tie-break sort, word-boundary via whitespace split, D/M roll-over, unknown tokens kept in title). §2 → Task 2 (chips only for parsed values via `priorityExplicit`; implied Today chip via `effectiveDue`). §3 → Task 3. §4 → Tasks 4–5.
- Type consistency: `parseCrmTask(input, clients)` named export used identically in Tasks 1/2; task shape matches `TaskForm`'s `onSave` payload in CRMTasks.jsx.
- Deviation from TDD noted in header (no test framework; node sanity-check + browser round trip instead).
