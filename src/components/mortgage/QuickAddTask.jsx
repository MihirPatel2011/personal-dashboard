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
  const unmatchedAt = !parsed.clientId && /(^|\s)@\S/.test(text);
  const dueLabel = parsed.dueDate
    ? (isToday(parsed.dueDate) ? 'Today' : fmtShortDate(parsed.dueDate))
    : (defaultDueToday ? 'Today' : '');

  async function submit() {
    if (!parsed.title.trim()) return;
    try {
      await addCrmTask({
        title: parsed.title, clientId: parsed.clientId, type: '',
        priority: parsed.priority, status: 'To Do',
        dueDate: parsed.dueDate || (defaultDueToday ? tsToDateInput(Date.now()) : ''),
        notes: '',
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
          {dueLabel && <span className="qat-chip due">{dueLabel}</span>}
        </div>
      )}
    </div>
  );
}
