// src/pages/PersonalNotes.jsx — Notes & Ideas with rich text editing
import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Trash2, NotebookPen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import ConfirmDialog from '../components/common/ConfirmDialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fmtNoteDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtRelTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000)     return 'Just now';
  if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

// ─── Toolbar button data ──────────────────────────────────────────────────────
const TB_GROUPS = [
  [
    { label: 'B',  cmd: 'bold',      title: 'Bold (⌘B)',      btnStyle: { fontWeight: 800 } },
    { label: 'I',  cmd: 'italic',    title: 'Italic (⌘I)',    btnStyle: { fontStyle: 'italic' } },
    { label: 'U',  cmd: 'underline', title: 'Underline (⌘U)', btnStyle: { textDecoration: 'underline' } },
  ],
  [
    { label: 'H1', cmd: 'formatBlock', val: 'h1', title: 'Heading 1' },
    { label: 'H2', cmd: 'formatBlock', val: 'h2', title: 'Heading 2' },
    { label: 'H3', cmd: 'formatBlock', val: 'h3', title: 'Heading 3' },
  ],
  [
    { label: '• List', cmd: 'insertUnorderedList', title: 'Bullet list' },
    { label: '1. List', cmd: 'insertOrderedList',  title: 'Numbered list' },
  ],
  [
    { label: '⇥ Indent',  cmd: 'indent',  title: 'Indent'  },
    { label: '⇤ Outdent', cmd: 'outdent', title: 'Outdent' },
  ],
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PersonalNotes() {
  const { personalNotes, addPersonalNote, updatePersonalNote, deletePersonalNote } = useData();

  const [selId,      setSelId]      = useState(null);
  const [search,     setSearch]     = useState('');
  const [delNote,    setDelNote]    = useState(null);
  const [localTitle, setLocalTitle] = useState('');
  const [localDate,  setLocalDate]  = useState(todayIso());

  const editorRef  = useRef(null);
  const bodyTimer  = useRef(null);
  const titleTimer = useRef(null);
  const titleRef   = useRef(null);

  // Sorted + filtered note list
  const sorted = [...personalNotes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const filtered = sorted.filter(n =>
    !search ||
    (n.title || '').toLowerCase().includes(search.toLowerCase()) ||
    stripHtml(n.body || '').toLowerCase().includes(search.toLowerCase())
  );

  const currentNote = selId ? personalNotes.find(n => n.id === selId) || null : null;

  // Load note content when selection changes
  useEffect(() => {
    if (currentNote) {
      setLocalTitle(currentNote.title || '');
      setLocalDate(currentNote.date || todayIso());
      if (editorRef.current) {
        editorRef.current.innerHTML = currentNote.body || '';
      }
    } else {
      setLocalTitle('');
      setLocalDate(todayIso());
      if (editorRef.current) editorRef.current.innerHTML = '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId]);

  // ── Debounced saves ───────────────────────────────────────────────────────
  const schedBodySave = useCallback((id, html) => {
    clearTimeout(bodyTimer.current);
    bodyTimer.current = setTimeout(async () => {
      try { await updatePersonalNote(id, { body: html }); }
      catch { toast.error('Auto-save failed.'); }
    }, 600);
  }, [updatePersonalNote]);

  const schedTitleSave = useCallback((id, title) => {
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      try { await updatePersonalNote(id, { title }); }
      catch { /* silent */ }
    }, 400);
  }, [updatePersonalNote]);

  // ── Create new note ───────────────────────────────────────────────────────
  async function handleNew() {
    try {
      const id = await addPersonalNote({ title: '', body: '', date: todayIso() });
      setSelId(id);
      setTimeout(() => titleRef.current?.focus(), 60);
    } catch { toast.error('Failed to create note.'); }
  }

  // ── Field handlers ────────────────────────────────────────────────────────
  function handleTitleChange(val) {
    setLocalTitle(val);
    if (selId) schedTitleSave(selId, val);
  }

  async function handleDateChange(val) {
    setLocalDate(val);
    if (selId) {
      try { await updatePersonalNote(selId, { date: val }); }
      catch { /* silent */ }
    }
  }

  function handleEditorInput() {
    if (!selId || !editorRef.current) return;
    schedBodySave(selId, editorRef.current.innerHTML);
  }

  // ── Formatting ────────────────────────────────────────────────────────────
  function execCmd(cmd, val = null) {
    editorRef.current?.focus();
    // eslint-disable-next-line no-unused-expressions
    document.execCommand(cmd, false, val);
  }

  function handleToolbarBtn(e, cmd, val) {
    e.preventDefault(); // keep editor focus + selection
    execCmd(cmd, val || null);
    // After formatBlock, move cursor to a paragraph on the next Enter
    handleEditorInput();
  }

  // ── Keyboard shortcuts in the body ───────────────────────────────────────
  function handleKeyDown(e) {
    // Tab / Shift+Tab → indent / outdent
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand(e.shiftKey ? 'outdent' : 'indent', false, null);
      return;
    }

    // "- " (dash + space) → start a bullet list
    if (e.key === ' ') {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      const node  = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        // Get the text of the current line up to the cursor
        const textBefore = node.textContent?.slice(0, range.startOffset) ?? '';
        const lineText   = textBefore.split('\n').pop() ?? '';
        if (lineText === '-') {
          e.preventDefault();
          // Delete the dash, then convert block to an unordered list
          const delRange = range.cloneRange();
          delRange.setStart(node, range.startOffset - 1);
          delRange.setEnd(node, range.startOffset);
          delRange.deleteContents();
          document.execCommand('insertUnorderedList', false, null);
          handleEditorInput();
          return;
        }
      }
    }

    // Enter inside a heading → next line becomes a paragraph
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const node = sel.getRangeAt(0).startContainer;
      const el   = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      if (el?.closest('h1, h2, h3')) {
        // Let the browser insert the new line first, then switch it to <p>
        setTimeout(() => {
          document.execCommand('formatBlock', false, 'p');
          handleEditorInput();
        }, 0);
      }
    }
  }

  // ── Title field: Tab → jump to editor ────────────────────────────────────
  function handleTitleKeyDown(e) {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      editorRef.current?.focus();
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(note) {
    try {
      await deletePersonalNote(note.id);
      if (selId === note.id) setSelId(null);
      toast.success('Note deleted.');
    } catch { toast.error('Failed to delete.'); }
    setDelNote(null);
  }

  return (
    <div className="pnotes-layout fade-in">

      {/* ─── Sidebar list ─── */}
      <div className={`pnotes-sidebar${selId ? ' hide-mobile' : ''}`}>
        <div className="pnotes-sidebar-head">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="pnotes-sidebar-title">Notes &amp; Ideas</span>
            <button className="btn accent sm" onClick={handleNew}><Plus size={13}/> New</button>
          </div>
          <div style={{ position: 'relative', marginTop: 10 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', pointerEvents: 'none' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" className="pnotes-search"/>
          </div>
        </div>
        <div className="pnotes-list">
          {filtered.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.7 }}>
              {search ? 'No matching notes.' : 'No notes yet. Tap "New" to get started.'}
            </div>
          )}
          {filtered.map(n => (
            <div key={n.id} className={`pnotes-item${selId === n.id ? ' selected' : ''}`} onClick={() => setSelId(n.id)}>
              <div className="pnotes-item-title">{n.title || 'Untitled'}</div>
              {stripHtml(n.body) && (
                <div className="pnotes-item-preview">{stripHtml(n.body).slice(0, 80)}</div>
              )}
              <div className="pnotes-item-meta">
                {n.date ? fmtNoteDate(n.date) : fmtRelTime(n.updatedAt || n.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Editor pane ─── */}
      <div className={`pnotes-editor${!selId ? ' empty' : ''}`}>
        {!selId ? (
          <div className="pnotes-empty">
            <NotebookPen size={42} style={{ color: 'var(--ink-4)', marginBottom: 16 }}/>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>No note selected</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 24, lineHeight: 1.7 }}>
              Pick a note from the list or create a new one.
            </div>
            <button className="btn accent" onClick={handleNew}><Plus size={14}/> New Note</button>
          </div>
        ) : (
          <>
            {/* ── Note header: title + date + actions ── */}
            <div className="pnotes-note-head">
              <input
                ref={titleRef}
                className="pnotes-title-input"
                value={localTitle}
                onChange={e => handleTitleChange(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                placeholder="Title"
              />
              <div className="pnotes-note-meta-row">
                <input
                  type="date"
                  className="pnotes-date-input"
                  value={localDate}
                  onChange={e => handleDateChange(e.target.value)}
                  title="Note date"
                />
                <span className="pnotes-autosave-label">Auto-saved</span>
                <button className="icon-btn sm danger" onClick={() => setDelNote(currentNote)} title="Delete note">
                  <Trash2 size={13}/>
                </button>
                <button className="pnotes-back btn ghost sm" onClick={() => setSelId(null)}>← Back</button>
              </div>
            </div>

            {/* ── Formatting toolbar ── */}
            <div className="pnotes-toolbar">
              {TB_GROUPS.map((group, gi) => (
                <div key={gi} className="pnotes-tb-group">
                  {group.map(({ label, cmd, val, title, btnStyle }) => (
                    <button
                      key={label}
                      className="pnotes-tb-btn"
                      title={title}
                      style={btnStyle}
                      onMouseDown={e => handleToolbarBtn(e, cmd, val)}
                    >{label}</button>
                  ))}
                  {gi < TB_GROUPS.length - 1 && <div className="pnotes-tb-sep"/>}
                </div>
              ))}
            </div>

            {/* ── Rich text body (contentEditable) ── */}
            <div
              ref={editorRef}
              className="pnotes-body"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start writing…"
              onInput={handleEditorInput}
              onKeyDown={handleKeyDown}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!delNote}
        onClose={() => setDelNote(null)}
        onConfirm={() => handleDelete(delNote)}
        title="Delete Note?"
        message={`Delete "${delNote?.title || 'Untitled'}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
