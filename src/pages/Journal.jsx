// src/pages/Journal.jsx — Habit Tracker & Journal with page-curl book layout
import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, Calendar, BookOpen, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import ConfirmDialog from '../components/common/ConfirmDialog';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MAX_HIGHLIGHT_CHARS = 70;

const DATE_FORMATS = [
  { label: '1 June 2026',          fn: (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` },
  { label: 'Sunday, 1 June 2026',  fn: (d) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` },
  { label: 'June 1st, 2026',       fn: (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}${ord(d.getDate())}, ${d.getFullYear()}` },
  { label: '01/06/2026',           fn: (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` },
  { label: 'Mon 1 Jun \'26',       fn: (d) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)} '${String(d.getFullYear()).slice(2)}` },
];

function ord(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return s[(v-20)%10] || s[v] || s[0];
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function nowYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

// ─── Ruled Page Background (CSS via inline style) ─────────────────────────────
const RULED_BG = {
  backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(100,130,200,0.18) 31px, rgba(100,130,200,0.18) 32px)',
  backgroundSize: '100% 32px',
  backgroundPosition: '0 40px',
};

// ─── Left Page: Daily Highlights ─────────────────────────────────────────────
function DailyHighlightsPage({ spread, onUpdate }) {
  const now = nowYearMonth();
  const year  = spread.year  ?? now.year;
  const month = spread.month ?? now.month;
  const total = daysInMonth(year, month);
  const highlights = spread.highlights || {};

  const [editing, setEditing] = useState(null); // day number being edited
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing !== null) inputRef.current?.focus();
  }, [editing]);

  const saveHighlight = useCallback((day, val) => {
    const next = { ...(spread.highlights || {}), [day]: val };
    onUpdate({ highlights: next });
  }, [spread.highlights, onUpdate]);

  const monthLabel = `${MONTHS[month]} ${year}`;

  // Month/year picker
  function prevMonth() {
    let m = month - 1, y = year;
    if (m < 0) { m = 11; y--; }
    onUpdate({ month: m, year: y, highlights: {} });
  }
  function nextMonth() {
    let m = month + 1, y = year;
    if (m > 11) { m = 0; y++; }
    onUpdate({ month: m, year: y, highlights: {} });
  }

  return (
    <div className="journal-page journal-page-left" style={RULED_BG}>
      {/* Red margin line */}
      <div className="journal-margin-line"/>

      {/* Month header */}
      <div className="journal-month-header">
        <button className="jnl-arrow" onClick={prevMonth}><ChevronLeft size={14}/></button>
        <span className="journal-month-title">{monthLabel}</span>
        <button className="jnl-arrow" onClick={nextMonth}><ChevronRight size={14}/></button>
      </div>
      <div className="journal-col-label">Daily Highlights</div>

      {/* Day rows */}
      <div className="journal-highlights">
        {Array.from({ length: total }, (_, i) => i + 1).map(day => {
          const date = new Date(year, month, day);
          const dayLabel = DAYS[date.getDay()].slice(0, 2);
          const val = highlights[day] || '';
          const isEditing = editing === day;

          return (
            <div key={day} className="journal-hl-row">
              {/* Date label — outside the margin line */}
              <div className="journal-hl-date">
                <span className="journal-hl-dd">{String(day).padStart(2, '0')}</span>
                <span className="journal-hl-day">{dayLabel}</span>
              </div>
              {/* Text area */}
              <div className="journal-hl-text-wrap" onClick={() => setEditing(day)}>
                {isEditing ? (
                  <input
                    ref={inputRef}
                    className="journal-hl-input"
                    value={val}
                    maxLength={MAX_HIGHLIGHT_CHARS}
                    onChange={e => saveHighlight(day, e.target.value)}
                    onBlur={() => setEditing(null)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(null); }}
                  />
                ) : (
                  <span className="journal-hl-text">{val || <span className="journal-hl-placeholder"/>}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Right Page: Habit Tracker ────────────────────────────────────────────────
function HabitTrackerPage({ spread, onUpdate }) {
  const now = nowYearMonth();
  const year  = spread.year  ?? now.year;
  const month = spread.month ?? now.month;
  const total = daysInMonth(year, month);
  const headers  = spread.habitHeaders || ['Habit 1'];
  const habitData = spread.habitData   || {};
  const ROW_H = 32; // matches ruled line height

  const [editHeader, setEditHeader] = useState(null);
  const headerInputRef = useRef(null);

  useEffect(() => {
    if (editHeader !== null) headerInputRef.current?.focus();
  }, [editHeader]);

  function setCell(day, col, val) {
    const next = {
      ...habitData,
      [day]: { ...(habitData[day] || {}), [col]: val },
    };
    onUpdate({ habitData: next });
  }

  function addHabit() {
    onUpdate({ habitHeaders: [...headers, `Habit ${headers.length + 1}`] });
  }

  function removeHabit(idx) {
    const next = headers.filter((_, i) => i !== idx);
    onUpdate({ habitHeaders: next });
  }

  function saveHeader(idx, val) {
    const next = headers.map((h, i) => i === idx ? val : h);
    onUpdate({ habitHeaders: next });
    setEditHeader(null);
  }

  return (
    <div className="journal-page journal-page-right" style={RULED_BG}>
      <div className="journal-margin-line journal-margin-line-right"/>

      {/* Header row */}
      <div className="journal-tracker-header-row">
        <div className="journal-tracker-day-col"/>
        {headers.map((h, i) => (
          <div key={i} className="journal-tracker-col-head">
            {editHeader === i ? (
              <input
                ref={headerInputRef}
                className="journal-tracker-head-input"
                defaultValue={h}
                onBlur={e => saveHeader(i, e.target.value || h)}
                onKeyDown={e => { if (e.key === 'Enter') saveHeader(i, e.target.value || h); if (e.key === 'Escape') setEditHeader(null); }}
              />
            ) : (
              <span className="journal-tracker-head-label" onClick={() => setEditHeader(i)} title="Click to rename">{h}</span>
            )}
            {headers.length > 1 && (
              <button className="journal-tracker-del-habit" onClick={() => removeHabit(i)} title="Remove">×</button>
            )}
          </div>
        ))}
        <button className="journal-tracker-add-habit" onClick={addHabit} title="Add habit">+</button>
      </div>

      {/* Data rows */}
      <div className="journal-tracker-rows">
        {Array.from({ length: total }, (_, i) => i + 1).map(day => {
          const date = new Date(year, month, day);
          const dayLabel = DAYS[date.getDay()].slice(0, 2);
          return (
            <div key={day} className="journal-tracker-row" style={{ height: ROW_H }}>
              <div className="journal-tracker-day-cell">
                <span className="journal-tracker-dd">{String(day).padStart(2,'0')}</span>
                <span className="journal-tracker-dl">{dayLabel}</span>
              </div>
              {headers.map((_, col) => (
                <input
                  key={col}
                  className="journal-tracker-cell"
                  style={{ height: ROW_H }}
                  value={(habitData[day] || {})[col] || ''}
                  onChange={e => setCell(day, col, e.target.value)}
                  placeholder="—"
                />
              ))}
              <div style={{ width: 28 }}/>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ─── Free Journal Page (ruled, contenteditable) ───────────────────────────────
function FreeJournalPage({ side, spread, onUpdate, dateFormats }) {
  const key    = side === 'left' ? 'leftContent' : 'rightContent';
  const edRef  = useRef(null);
  const timer  = useRef(null);
  const [showDateMenu, setShowDateMenu] = useState(false);

  useEffect(() => {
    if (edRef.current && edRef.current.innerHTML !== (spread[key] || '')) {
      edRef.current.innerHTML = spread[key] || '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread.id]);

  function schedSave() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (edRef.current) onUpdate({ [key]: edRef.current.innerHTML });
    }, 500);
  }

  function insertDate(fmt) {
    edRef.current?.focus();
    document.execCommand('insertText', false, fmt.fn(new Date()));
    setShowDateMenu(false);
    schedSave();
  }

  const isLeft = side === 'left';

  return (
    <div className={`journal-page ${isLeft ? 'journal-page-left' : 'journal-page-right'}`} style={RULED_BG}>
      <div className={`journal-margin-line${isLeft ? '' : ' journal-margin-line-right'}`}/>

      {/* Toolbar */}
      <div className="journal-free-toolbar">
        <div className="journal-date-btn-wrap">
          <button
            className="journal-date-btn"
            onClick={() => setShowDateMenu(v => !v)}
            title="Insert date"
          >
            <Calendar size={13}/> Date
          </button>
          {showDateMenu && (
            <div className="journal-date-menu">
              {dateFormats.map((f, i) => (
                <button key={i} className="journal-date-menu-item" onClick={() => insertDate(f)}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Writing area */}
      <div
        ref={edRef}
        className="journal-free-body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Begin writing…"
        onInput={schedSave}
        onBlur={schedSave}
      />
    </div>
  );
}

// ─── Book Spread ──────────────────────────────────────────────────────────────
function BookSpread({ spread, spreadIndex, total, onUpdate, onPrev, onNext, onDelete, turning, turnDir }) {
  const isHabit = spread.type === 'habit';

  return (
    <div className={`journal-book-wrap${turning ? ` turning-${turnDir}` : ''}`}>
      {/* Navigation */}
      <div className="journal-book-nav">
        <button className="journal-nav-btn" onClick={onPrev} disabled={spreadIndex === 0}>
          <ChevronLeft size={18}/>
        </button>
        <span className="journal-nav-label">
          {spreadIndex + 1} / {total}
          {isHabit ? ' · Habit Tracker' : ' · Journal'}
        </span>
        <button className="journal-nav-btn" onClick={onNext} disabled={spreadIndex === total - 1}>
          <ChevronRight size={18}/>
        </button>
      </div>

      {/* Book */}
      <div className="journal-book">
        {/* Page curl shadow during turn */}
        {turning && <div className="journal-curl-overlay"/>}

        {/* Left page */}
        <div className="journal-book-left">
          {isHabit
            ? <DailyHighlightsPage spread={spread} onUpdate={onUpdate}/>
            : <FreeJournalPage side="left" spread={spread} onUpdate={onUpdate} dateFormats={DATE_FORMATS}/>
          }
        </div>

        {/* Spine */}
        <div className="journal-spine"/>

        {/* Right page */}
        <div className="journal-book-right">
          {isHabit
            ? <HabitTrackerPage spread={spread} onUpdate={onUpdate}/>
            : <FreeJournalPage side="right" spread={spread} onUpdate={onUpdate} dateFormats={DATE_FORMATS}/>
          }
        </div>
      </div>

      {/* Delete */}
      <div className="journal-spread-actions">
        <button className="journal-del-btn" onClick={onDelete} title="Delete this spread">
          <Trash2 size={13}/> Delete spread
        </button>
      </div>
    </div>
  );
}

// ─── Main Journal Page ────────────────────────────────────────────────────────
export default function Journal() {
  const { journalSpreads, addJournalSpread, updateJournalSpread, deleteJournalSpread } = useData();

  const spreads = [...journalSpreads].sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));

  const [idx,       setIdx]       = useState(0);
  const [turning,   setTurning]   = useState(false);
  const [turnDir,   setTurnDir]   = useState('next'); // 'next' | 'prev'
  const [delSpread, setDelSpread] = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);

  const now = nowYearMonth();
  const currentSpread = spreads[idx] || null;

  function navigate(dir) {
    const next = dir === 'next' ? idx + 1 : idx - 1;
    if (next < 0 || next >= spreads.length) return;
    setTurnDir(dir);
    setTurning(true);
    setTimeout(() => {
      setIdx(next);
      setTurning(false);
    }, 550);
  }

  const handleUpdate = useCallback(async (patch) => {
    if (!currentSpread) return;
    try { await updateJournalSpread(currentSpread.id, patch); }
    catch { toast.error('Failed to save.'); }
  }, [currentSpread, updateJournalSpread]);

  async function addSpread(type) {
    setShowAdd(false);
    try {
      const order = spreads.length;
      const base  = { type, order, createdAt: Date.now() };
      const extra = type === 'habit'
        ? { year: now.year, month: now.month, highlights: {}, habitHeaders: ['Exercise','Water (L)','Sleep (hrs)'], habitData: {}, rowHeight: 30 }
        : { leftContent: '', rightContent: '' };
      await addJournalSpread({ ...base, ...extra });
      setTimeout(() => setIdx(spreads.length), 100); // go to new spread
      toast.success(type === 'habit' ? 'Habit spread added!' : 'Journal spread added!');
    } catch { toast.error('Failed to add.'); }
  }

  async function handleDelete(spread) {
    try {
      await deleteJournalSpread(spread.id);
      setIdx(i => Math.max(0, i - 1));
      toast.success('Spread deleted.');
    } catch { toast.error('Failed.'); }
    setDelSpread(null);
  }

  // Empty state
  if (spreads.length === 0) {
    return (
      <div className="journal-empty-state">
        <BookOpen size={52} style={{ color: 'var(--ink-4)', marginBottom: 18 }}/>
        <div className="journal-empty-title">Your journal is empty</div>
        <div className="journal-empty-sub">Add a habit tracker spread or a blank journal spread to get started.</div>
        <div className="journal-empty-btns">
          <button className="btn accent" onClick={() => addSpread('habit')}>
            <Plus size={14}/> Add Habit Spread
          </button>
          <button className="btn ghost" onClick={() => addSpread('journal')}>
            <Plus size={14}/> Add Journal Spread
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="journal-root">
      {/* Top bar */}
      <div className="journal-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={17} style={{ color: 'var(--accent)' }}/>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Journal</span>
        </div>
        <div style={{ position: 'relative' }}>
          <button className="btn accent sm" onClick={() => setShowAdd(v => !v)}>
            <Plus size={13}/> Add Spread
          </button>
          {showAdd && (
            <div className="journal-add-menu">
              <button className="journal-add-menu-item" onClick={() => addSpread('habit')}>
                📊 Habit Tracker Spread
                <span className="journal-add-menu-sub">Monthly highlights + habit table</span>
              </button>
              <button className="journal-add-menu-item" onClick={() => addSpread('journal')}>
                📝 Blank Journal Spread
                <span className="journal-add-menu-sub">Two ruled pages for free writing</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {currentSpread && (
        <BookSpread
          key={currentSpread.id}
          spread={currentSpread}
          spreadIndex={idx}
          total={spreads.length}
          onUpdate={handleUpdate}
          onPrev={() => navigate('prev')}
          onNext={() => navigate('next')}
          onDelete={() => setDelSpread(currentSpread)}
          turning={turning}
          turnDir={turnDir}
        />
      )}

      <ConfirmDialog
        isOpen={!!delSpread}
        onClose={() => setDelSpread(null)}
        onConfirm={() => handleDelete(delSpread)}
        title="Delete Spread?"
        message="This will permanently delete this spread and all its content."
        confirmLabel="Delete"
      />
    </div>
  );
}
