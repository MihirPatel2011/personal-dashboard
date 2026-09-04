// src/utils/parseCrmTask.js — smart-token parser for CRM task quick-add.
// parseCrmTask('Chase payslips @jane !high tomorrow', clients) →
//   { title, clientId, priority, priorityExplicit, dueDate, matchedClient }
// Tokens are consumed once (first occurrence wins); anything unrecognised
// stays in the title so nothing is silently lost.
import { tsToDateInput } from './index.js';

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
