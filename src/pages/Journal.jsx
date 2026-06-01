// src/pages/Journal.jsx — Habit Tracker & Journal, physical book aesthetic
import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, Calendar, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import ConfirmDialog from '../components/common/ConfirmDialog';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const LINE_H = 32; // px — every rule, every row, every input is this height
const MAX_HIGHLIGHT_CHARS = 70;

// Header height must be an integer multiple of LINE_H so rules land on rows
const HL_HEADER_H  = LINE_H * 2;  // 64px — month nav + "Daily Highlights" label
const TRK_HEADER_H = LINE_H;      // 32px — column name row

const DATE_FORMATS = [
  { label: '1 June 2026',         fn: d => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` },
  { label: 'Sunday, 1 June 2026', fn: d => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` },
  { label: 'June 1st, 2026',      fn: d => `${MONTHS[d.getMonth()]} ${d.getDate()}${ord(d.getDate())}, ${d.getFullYear()}` },
  { label: '01/06/2026',          fn: d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` },
  { label: "Mon 1 Jun '26",       fn: d => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)} '${String(d.getFullYear()).slice(2)}` },
];

function ord(n) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return s[(v-20)%10] || s[v] || s[0];
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function nowYearMonth()    { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; }

// Ruled background: lines at the bottom of every LINE_H row.
// background-position offsets by headerH so first line lands under row 1.
function ruledStyle(headerH) {
  return {
    backgroundImage: [
      'repeating-linear-gradient(transparent, transparent 31px, rgba(160,130,80,0.22) 31px, rgba(160,130,80,0.22) 32px)',
    ].join(','),
    backgroundSize:     `100% ${LINE_H}px`,
    backgroundPosition: `0 ${headerH}px`,
  };
}

// ─── Daily Highlights (left page) ────────────────────────────────────────────
function DailyHighlightsPage({ spread, onUpdate }) {
  const now   = nowYearMonth();
  const year  = spread.year  ?? now.year;
  const month = spread.month ?? now.month;
  const total = daysInMonth(year, month);
  const highlights = spread.highlights || {};

  const [editing, setEditing] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { if (editing !== null) inputRef.current?.focus(); }, [editing]);

  const saveHighlight = useCallback((day, val) => {
    onUpdate({ highlights: { ...(spread.highlights || {}), [day]: val } });
  }, [spread.highlights, onUpdate]);

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
    <div className="jnl-page jnl-page-left" style={ruledStyle(HL_HEADER_H)}>
      <div className="jnl-margin"/>

      {/* Header — exactly HL_HEADER_H tall */}
      <div className="jnl-hl-header">
        <div className="jnl-month-row">
          <button className="jnl-arrow" onClick={prevMonth}><ChevronLeft size={13}/></button>
          <span className="jnl-month-title">{MONTHS[month]} {year}</span>
          <button className="jnl-arrow" onClick={nextMonth}><ChevronRight size={13}/></button>
        </div>
        <div className="jnl-col-label">Daily Highlights</div>
      </div>

      {/* Rows — each exactly LINE_H tall */}
      {Array.from({ length: total }, (_, i) => i + 1).map(day => {
        const dayLabel = DAYS[new Date(year, month, day).getDay()].slice(0, 2);
        const val      = highlights[day] || '';
        const isEd     = editing === day;
        return (
          <div key={day} className="jnl-hl-row" onClick={() => setEditing(day)}>
            <div className="jnl-hl-date">
              <span className="jnl-hl-dd">{String(day).padStart(2,'0')}</span>
              <span className="jnl-hl-dy">{dayLabel}</span>
            </div>
            {isEd ? (
              <input
                ref={inputRef}
                className="jnl-hl-input"
                value={val}
                maxLength={MAX_HIGHLIGHT_CHARS}
                onChange={e => saveHighlight(day, e.target.value)}
                onBlur={() => setEditing(null)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(null); }}
              />
            ) : (
              <span className="jnl-hl-text">{val}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Habit Tracker (right page) ───────────────────────────────────────────────
function HabitTrackerPage({ spread, onUpdate }) {
  const now   = nowYearMonth();
  const year  = spread.year  ?? now.year;
  const month = spread.month ?? now.month;
  const total = daysInMonth(year, month);
  const headers   = spread.habitHeaders || ['Habit 1'];
  const habitData = spread.habitData   || {};

  const [editHeader, setEditHeader] = useState(null);
  const headerInputRef = useRef(null);

  useEffect(() => { if (editHeader !== null) headerInputRef.current?.focus(); }, [editHeader]);

  function setCell(day, col, val) {
    onUpdate({ habitData: { ...habitData, [day]: { ...(habitData[day] || {}), [col]: val } } });
  }
  function addHabit()        { onUpdate({ habitHeaders: [...headers, `Habit ${headers.length + 1}`] }); }
  function removeHabit(idx)  { onUpdate({ habitHeaders: headers.filter((_, i) => i !== idx) }); }
  function saveHeader(i, v)  { onUpdate({ habitHeaders: headers.map((h, j) => j === i ? (v || h) : h) }); setEditHeader(null); }

  return (
    <div className="jnl-page jnl-page-right" style={ruledStyle(TRK_HEADER_H)}>
      <div className="jnl-margin jnl-margin-right"/>

      {/* Column header row — exactly TRK_HEADER_H = LINE_H tall */}
      <div className="jnl-trk-header">
        <div className="jnl-trk-day-col"/>
        {headers.map((h, i) => (
          <div key={i} className="jnl-trk-col-head">
            {editHeader === i ? (
              <input
                ref={headerInputRef}
                className="jnl-trk-head-input"
                defaultValue={h}
                onBlur={e => saveHeader(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveHeader(i, e.target.value); if (e.key === 'Escape') setEditHeader(null); }}
              />
            ) : (
              <span className="jnl-trk-head-label" onClick={() => setEditHeader(i)} title="Click to rename">{h}</span>
            )}
            {headers.length > 1 && (
              <button className="jnl-trk-del" onClick={() => removeHabit(i)}>×</button>
            )}
          </div>
        ))}
        <button className="jnl-trk-add" onClick={addHabit} title="Add habit column">+</button>
      </div>

      {/* Data rows — each exactly LINE_H tall */}
      {Array.from({ length: total }, (_, i) => i + 1).map(day => {
        const dayLabel = DAYS[new Date(year, month, day).getDay()].slice(0, 2);
        return (
          <div key={day} className="jnl-trk-row">
            <div className="jnl-trk-day-cell">
              <span className="jnl-trk-dd">{String(day).padStart(2,'0')}</span>
              <span className="jnl-trk-dl">{dayLabel}</span>
            </div>
            {headers.map((_, col) => (
              <input
                key={col}
                className="jnl-trk-cell"
                value={(habitData[day] || {})[col] || ''}
                onChange={e => setCell(day, col, e.target.value)}
                placeholder="-"
              />
            ))}
            <div className="jnl-trk-add-spacer"/>
          </div>
        );
      })}
    </div>
  );
}

// ─── Free Journal Page ────────────────────────────────────────────────────────
function FreeJournalPage({ side, spread, onUpdate, dateFormats }) {
  const key   = side === 'left' ? 'leftContent' : 'rightContent';
  const edRef = useRef(null);
  const timer = useRef(null);
  const [showDateMenu, setShowDateMenu] = useState(false);

  useEffect(() => {
    if (edRef.current && edRef.current.innerHTML !== (spread[key] || ''))
      edRef.current.innerHTML = spread[key] || '';
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

  // Free pages: first LINE_H is the toolbar, so offset by one line
  const TOOLBAR_H = LINE_H;

  return (
    <div className={`jnl-page ${side === 'left' ? 'jnl-page-left' : 'jnl-page-right'}`} style={ruledStyle(TOOLBAR_H)}>
      <div className={`jnl-margin${side === 'right' ? ' jnl-margin-right' : ''}`}/>

      {/* Toolbar — exactly LINE_H tall */}
      <div className="jnl-free-toolbar">
        <div className="jnl-date-wrap">
          <button className="jnl-date-btn" onClick={() => setShowDateMenu(v => !v)}>
            <Calendar size={12}/> Date
          </button>
          {showDateMenu && (
            <div className="jnl-date-menu">
              {dateFormats.map((f, i) => (
                <button key={i} className="jnl-date-item" onClick={() => insertDate(f)}>{f.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Writing area — lines from toolbar onward */}
      <div
        ref={edRef}
        className={`jnl-free-body${side === 'right' ? ' right' : ''}`}
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
    <div className={`jnl-book-wrap${turning ? ` jnl-turning-${turnDir}` : ''}`}>
      {/* Navigation */}
      <div className="jnl-nav">
        <button className="jnl-nav-btn" onClick={onPrev} disabled={spreadIndex === 0}>
          <ChevronLeft size={16}/>
        </button>
        <span className="jnl-nav-label">{spreadIndex + 1} / {total}</span>
        <button className="jnl-nav-btn" onClick={onNext} disabled={spreadIndex === total - 1}>
          <ChevronRight size={16}/>
        </button>
      </div>

      {/* The open book */}
      <div className="jnl-book">
        {/* Left page */}
        <div className="jnl-book-side jnl-book-left-side">
          {isHabit
            ? <DailyHighlightsPage spread={spread} onUpdate={onUpdate}/>
            : <FreeJournalPage side="left" spread={spread} onUpdate={onUpdate} dateFormats={DATE_FORMATS}/>
          }
        </div>

        {/* Spine */}
        <div className="jnl-spine">
          <div className="jnl-spine-inner"/>
        </div>

        {/* Right page */}
        <div className="jnl-book-side jnl-book-right-side">
          {isHabit
            ? <HabitTrackerPage spread={spread} onUpdate={onUpdate}/>
            : <FreeJournalPage side="right" spread={spread} onUpdate={onUpdate} dateFormats={DATE_FORMATS}/>
          }
        </div>
      </div>

      {/* Delete */}
      <div className="jnl-spread-actions">
        <button className="jnl-del-btn" onClick={onDelete}>
          <Trash2 size={12}/> Delete spread
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Journal() {
  const { journalSpreads, addJournalSpread, updateJournalSpread, deleteJournalSpread } = useData();

  const spreads = [...journalSpreads].sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));

  const [idx,       setIdx]       = useState(0);
  const [turning,   setTurning]   = useState(false);
  const [turnDir,   setTurnDir]   = useState('next');
  const [delSpread, setDelSpread] = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);

  const now           = nowYearMonth();
  const currentSpread = spreads[idx] || null;

  function navigate(dir) {
    const next = dir === 'next' ? idx + 1 : idx - 1;
    if (next < 0 || next >= spreads.length) return;
    setTurnDir(dir);
    setTurning(true);
    setTimeout(() => { setIdx(next); setTurning(false); }, 580);
  }

  const handleUpdate = useCallback(async patch => {
    if (!currentSpread) return;
    try { await updateJournalSpread(currentSpread.id, patch); }
    catch { toast.error('Failed to save.'); }
  }, [currentSpread, updateJournalSpread]);

  async function addSpread(type) {
    setShowAdd(false);
    try {
      const base  = { type, order: spreads.length, createdAt: Date.now() };
      const extra = type === 'habit'
        ? { year: now.year, month: now.month, highlights: {}, habitHeaders: ['Exercise','Water (L)','Sleep (h)'], habitData: {} }
        : { leftContent: '', rightContent: '' };
      await addJournalSpread({ ...base, ...extra });
      setTimeout(() => setIdx(spreads.length), 120);
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

  if (spreads.length === 0) {
    return (
      <div className="jnl-empty">
        <BookOpen size={48} style={{ color: '#8b7355', marginBottom: 16 }}/>
        <div className="jnl-empty-title">Your journal is empty</div>
        <div className="jnl-empty-sub">Start with a habit tracker spread or a blank ruled journal.</div>
        <div className="jnl-empty-btns">
          <button className="btn accent" onClick={() => addSpread('habit')}><Plus size={13}/> Habit Spread</button>
          <button className="btn ghost"  onClick={() => addSpread('journal')}><Plus size={13}/> Journal Spread</button>
        </div>
      </div>
    );
  }

  return (
    <div className="jnl-root">
      {/* Topbar */}
      <div className="jnl-topbar">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <BookOpen size={16} style={{ color:'var(--accent)' }}/>
          <span style={{ fontWeight:700, fontSize:14, color:'var(--ink)' }}>Journal</span>
        </div>
        <div style={{ position:'relative' }}>
          <button className="btn accent sm" onClick={() => setShowAdd(v => !v)}>
            <Plus size={12}/> Add Spread
          </button>
          {showAdd && (
            <div className="jnl-add-menu">
              <button className="jnl-add-item" onClick={() => addSpread('habit')}>
                <span>Habit Tracker</span>
                <span className="jnl-add-sub">Monthly highlights + habit columns</span>
              </button>
              <button className="jnl-add-item" onClick={() => addSpread('journal')}>
                <span>Blank Journal</span>
                <span className="jnl-add-sub">Two ruled pages for free writing</span>
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
