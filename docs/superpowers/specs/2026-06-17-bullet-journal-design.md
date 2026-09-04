# Bullet Journal (BuJo) Module — Design Spec

**Date:** 2026-06-17
**Status:** Awaiting build approval
**Replaces:** the existing book-style `Journal` section (`src/pages/Journal.jsx`)

## Goal

Replace the skeuomorphic book-spread Journal with a faithful, native implementation
of Ryder Carroll's Bullet Journal method, living inside the Apex dashboard at the
same place the old Journal lived. Same framework, same Firebase project, same design
tokens and navigation patterns. Not a standalone app, not a new tab framework.

## Decisions (confirmed with user)

- **Persistence:** Firebase **Realtime Database** (the project uses RTDB, *not*
  Firestore), project `mortgagecrm-a8ded`, existing auth. New top-level nodes only.
- **Old data:** the old `journalSpreads` node is **deleted** as part of cleanup
  (UI, code, CSS, and the RTDB data).
- **Routing:** keep the `/journal` base path (now with nested sub-routes); sidebar
  item relabelled **"Bullet Journal"**, stays in its current sidebar group.

## What is removed

- `src/pages/Journal.jsx` (book-spread component).
- `/journal` single-route in `App.jsx`; the old sidebar nav button; mobile "More" item.
- The `jnl-*` CSS block in `src/index.css`.
- `journalSpreads` state + `addJournalSpread/updateJournalSpread/deleteJournalSpread`
  from `DataContext`, and a one-time delete of the RTDB `journalSpreads` node.

## What is reused

- Firebase config/auth, DataContext `onValue` subscription + CRUD pattern.
- Design tokens in `index.css` (dark + light): `--bg/--surface*`, `--border*`,
  `--ink*`, `--accent`, module colors, semantic colors, radii, shadows, `--font`,
  `--mono`, easings.
- Shared classes/components: `.btn`, `.card`, `.badge`, `.field`, `.empty-state`,
  `.crm-sub-nav/.crm-sub-btn` (sub-nav), `Modal`, `ConfirmDialog`.
- Layout + `<Outlet/>` sub-nav pattern (as in `FocusLayout.jsx`).
- Utils helpers: `genId`, `toArr`, `todayTs`, `tsToDateInput`, `dateInputToTs`,
  `fmtDate`, `fmtShortDate`.

## Data model (Realtime Database)

Two new flat nodes. The **Index is derived**, never stored.

### `bujoEntries/{pushId}`
```
{
  type:       'task' | 'note' | 'event' | 'idea' | 'mood' | 'inProgress' | 'happened',
  state:      'open' | 'complete' | 'migrated' | 'scheduled' | 'irrelevant',  // tasks
  signifiers: { priority?: true, ... },     // extensible map; ★ priority is essential
  text:       string,
  logType:    'daily' | 'monthly' | 'future' | 'collection',
  logKey:     string,   // daily 'YYYY-MM-DD' | monthly 'YYYY-MM' | future 'YYYY-MM'
                        //  | collection: collectionId
  eventDate:  'YYYY-MM-DD',   // events only; drives monthly calendar placement
  order:      number,
  migration:  [ { action: 'migrate' | 'schedule', fromType, fromKey, ts } ],
  createdAt:  number,
  updatedAt:  number
}
```

### `bujoCollections/{pushId}`
```
{ title: string, order: number, createdAt: number, updatedAt: number }
```

### Index (derived in `utils/bujo.js`)
Scan entries' distinct `logKey`s by `logType` + all collections → ordered, clickable
list: Future Log months, Monthly Logs (most recent first), Collections. Each item
carries a route target so clicking jumps to that log/collection.

## Bullet legend (rendered in `utils/bujo.js` + `BulletGlyph`)

| Symbol | Meaning | Encoding |
|--------|---------|----------|
| • | Task | type task, state open |
| ✕ | Task complete | task, complete |
| > | Task migrated (to next month/log) | task, migrated |
| < | Task scheduled (to Future Log) | task, scheduled |
| (strikethrough, no symbol) | Task abandoned | task, irrelevant |
| — | Note | type note |
| ○ | Event | type event |
| ⚡ | Idea | type idea |
| ↗ | In progress | type inProgress |
| △ | Something happened / log marker | type happened |
| ♡ | Mood | type mood |
| ★ | Priority signifier (left of bullet) | signifiers.priority |

## Interactions (the heart of the method)

- **Click bullet to cycle task state:** open `•` → complete `✕` → migrated `>` →
  scheduled `<` → back to open. Instant, optimistic UI then RTDB write.
  - Cycling to `migrated`/`scheduled` here only sets the state on the current entry;
    the *copy-into-another-log* action happens via the Migration flow (below) so we
    don't silently fork entries on a stray click.
- **End-of-Month Migration flow** (`MigrationModal`): surfaces all `open` tasks in the
  current Monthly Log. Per task, choose: **Complete** / **Migrate forward** (copy into
  next Monthly Log as a fresh open task, stamp `migration` origin, mark original `>`) /
  **Schedule to Future Log** (pick month; copy into future `logKey`, mark original `<`) /
  **Strike out** (mark `irrelevant`).
- **Priority toggle:** click/keyboard toggles `signifiers.priority` (★) per entry.
- **Quick-add:** single input; type text, a hotkey cycles the bullet type, Enter saves.
  Keyboard-first — speed is the point.
- **Inline edit + delete** per entry.

## Components (native, matching existing patterns)

### `src/utils/bujo.js` (single source of truth, no React)
Entry-type table, signifier table, glyph map, state-machine (`cycleTaskState`),
migration helpers (`buildMigratedCopy`, `buildScheduledCopy`), `generateIndex`,
logKey/date helpers, `seedEntries()`.

### `src/pages/bujo/`
- `BujoLayout.jsx` — `page-header` + `.crm-sub-nav` tabs: Index · Future Log ·
  Monthly Log · Daily Log · Collections. `index` route redirects to **Daily** (default).
- `DailyLog.jsx` — date header; rapid-logged entries; prev/next-day, jump-to-today,
  mini month-picker. **Landing view.**
- `MonthlyLog.jsx` — two halves: calendar (every date + day-of-week initial, events
  shown against dates) and task list; button to launch End-of-Month Migration.
- `FutureLog.jsx` — 6–12 months ahead, grouped by month.
- `IndexPage.jsx` — derived navigable table of contents.
- `Collections.jsx` — list of user collections + a collection detail (titled page of
  entries); create/rename/delete; auto-added to Index.

### `src/components/bujo/`
- `BulletGlyph.jsx` — renders the correct symbol for type/state/signifier with a smooth
  transition on state change.
- `EntryRow.jsx` — bullet (click to cycle), ★ toggle, text (inline edit), delete.
- `QuickAdd.jsx` — keyboard-first capture input with bullet-type cycling.
- `MigrationModal.jsx` — guided per-task End-of-Month review (uses `Modal`).

### DataContext additions
`bujoEntries`, `bujoCollections` state + two `onValue` subscriptions (`TOTAL` 13 → 15);
`addBujoEntry/updateBujoEntry/deleteBujoEntry`, `addBujoCollection/updateBujoCollection/
deleteBujoCollection`. Remove the three `journalSpreads` callbacks + subscription.

### Routing / nav
`App.jsx`: replace `<Route path="/journal" .../>` with `<Route path="/journal"
element={<BujoLayout/>}>` + nested `daily|monthly|future|index|collections` (index
redirect → `daily`). `Sidebar.jsx`: relabel to "Bullet Journal", point at
`/journal/daily`. Update mobile More item.

## Styling

New `bujo-*` CSS class block in `index.css`, built entirely from existing tokens.
Calm, paper-like, generous whitespace, a subtle **dot-grid background motif** (CSS
radial-gradient) — modern digital, not fake-notebook. Bullet glyphs are the visual
signature: crisp, legible, animated on cycle. Fully responsive (sub-nav + stacked
layout on narrow widths).

## Seed data

On first load (no `bujoEntries`), seed a few example entries in today's Daily Log
(a task, a priority task, a note, an event, an idea) and one example Collection
("Reading List") with a couple of entries. User can delete freely.

## Testing (to document after build)

- Add an entry via Quick-add; cycle its bullet (• → ✕ → > → <); toggle ★; edit; delete.
- Run End-of-Month Migration from a Monthly Log; verify migrate-forward copies into next
  month and stamps origin; schedule-to-future lands in the chosen month; strike-out marks
  abandoned.
- Confirm Index auto-lists logs + collections and links navigate.
- Refresh / second tab: confirm real-time persistence.

## Out of scope

No changes to unrelated dashboard sections. No Firestore. No new auth.
