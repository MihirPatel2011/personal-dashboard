// ─── Natural-language task parsing ──────────────────────────────────────────────
// Extracts priority / due date / area from a free-typed task string and returns
// the cleaned title with those tokens removed. Used by the global quick-capture
// and the inline quick-add on the Tasks page.
//
//   priority:  p1 = Urgent, p2 = High, p3 = Medium, p4 = Low  (case-insensitive)
//   date:      today · tonight · tomorrow · <weekday> · next <weekday>
//   area:      any (non-archived) area name, optionally prefixed with # or @
//
// Priority maps to the FOCUS_PRIORITIES id scale (4 = Urgent … 1 = Low), so
// id = 5 - n  (p1→4, p2→3, p3→2, p4→1).

const WEEKDAYS = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tues: 2, tue: 2,
  wednesday: 3, weds: 3, wed: 3,
  thursday: 4, thurs: 4, thur: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

// Longest-first so "tuesday" wins over "tue" at the same position.
const WD_ALT = 'sunday|monday|tuesday|wednesday|thursday|friday|saturday|tues|thurs|weds|sun|mon|tue|wed|thur|thu|fri|sat';

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function toISO(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function isoFromOffset(days) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + days); return toISO(d); }
function comingWeekday(dow, extraWeeks = 0) {
  const now = new Date(); now.setHours(0,0,0,0);
  let diff = (dow - now.getDay() + 7) % 7;
  if (diff === 0) diff = 7;            // "Wednesday" on a Wednesday → next week
  diff += extraWeeks * 7;
  const d = new Date(now); d.setDate(now.getDate() + diff);
  return toISO(d);
}

export function parseTaskInput(raw, areas = []) {
  let text = ` ${raw} `;
  let priority = 0, dueDate = '', areaId = '', matchedArea = null;

  // Priority — p1..p4 (also "P2", "p 2")
  const pm = text.match(/\bp\s?([1-4])\b/i);
  if (pm) { priority = 5 - Number(pm[1]); text = text.replace(pm[0], ' '); }

  // Area — match the longest area name first, optional #/@ prefix
  const active = [...areas]
    .filter(a => a && a.name && !a.archived)
    .sort((a, b) => b.name.length - a.name.length);
  for (const a of active) {
    const re = new RegExp(`(^|\\s)[#@]?${escapeRegExp(a.name)}(?=\\s|$)`, 'i');
    if (re.test(text)) { areaId = a.id; matchedArea = a; text = text.replace(re, ' '); break; }
  }

  // Date — first match wins
  let m;
  if ((m = text.match(/\b(today|tonight)\b/i))) {
    dueDate = isoFromOffset(0); text = text.replace(m[0], ' ');
  } else if ((m = text.match(/\b(tomorrow|tmrw|tmr)\b/i))) {
    dueDate = isoFromOffset(1); text = text.replace(m[0], ' ');
  } else if ((m = text.match(new RegExp(`\\bnext\\s+(${WD_ALT})\\b`, 'i')))) {
    dueDate = comingWeekday(WEEKDAYS[m[1].toLowerCase()], 1); text = text.replace(m[0], ' ');
  } else if ((m = text.match(new RegExp(`\\b(${WD_ALT})\\b`, 'i')))) {
    dueDate = comingWeekday(WEEKDAYS[m[1].toLowerCase()], 0); text = text.replace(m[0], ' ');
  }

  const title = text.replace(/\s+/g, ' ').trim();
  return { title, priority, dueDate, areaId, matchedArea };
}
