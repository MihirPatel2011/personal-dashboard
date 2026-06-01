// src/pages/PersonalNotes.jsx — Notes & Ideas with rich text editing
import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Trash2, NotebookPen, Download, ArrowUpDown, CheckSquare } from 'lucide-react';
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

// ─── Note type config ─────────────────────────────────────────────────────────
const NOTE_TYPES = [
  { value: 'note',  label: 'Note',  color: '#60A5FA' },
  { value: 'idea',  label: 'Idea',  color: '#F59E0B' },
  { value: 'area',  label: 'Area',  color: '#34D399' },
];

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
  const [sortMode,   setSortMode]   = useState('edited'); // 'edited' | 'created'
  const [typeFilter, setTypeFilter] = useState('all');    // 'all' | 'note' | 'idea' | 'area'

  const editorRef  = useRef(null);
  const bodyTimer  = useRef(null);
  const titleTimer = useRef(null);
  const titleRef   = useRef(null);

  // Sorted + filtered note list
  const sorted = [...personalNotes].sort((a, b) => {
    if (sortMode === 'created') return (b.createdAt || 0) - (a.createdAt || 0);
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
  const filtered = sorted.filter(n => {
    const matchSearch = !search ||
      (n.title || '').toLowerCase().includes(search.toLowerCase()) ||
      stripHtml(n.body || '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || n.noteType === typeFilter;
    return matchSearch && matchType;
  });

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

  // ── Note type ─────────────────────────────────────────────────────────────
  async function handleTypeChange(val) {
    if (selId) {
      try { await updatePersonalNote(selId, { noteType: val || null }); }
      catch { /* silent */ }
    }
  }

  // ── Export to PDF ─────────────────────────────────────────────────────────
  function handleExportPDF() {
    if (!currentNote) return;
    const typeObj = NOTE_TYPES.find(t => t.value === currentNote.noteType);
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${currentNote.title || 'Note'}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.7; }
        h1 { font-size: 28px; margin: 0 0 6px; }
        .meta { font-size: 13px; color: #666; margin-bottom: 28px; display: flex; gap: 12px; align-items: center; }
        .tag { background: ${typeObj?.color || '#ddd'}22; border: 1px solid ${typeObj?.color || '#ddd'}; color: ${typeObj?.color || '#888'}; border-radius: 99px; padding: 2px 10px; font-size: 12px; font-weight: 600; }
        h1,h2,h3 { font-family: Georgia, serif; }
        h2 { font-size: 20px; margin: 24px 0 6px; }
        h3 { font-size: 16px; margin: 18px 0 4px; }
        ul,ol { margin: 8px 0 12px 24px; }
        li { margin: 4px 0; }
        blockquote { border-left: 3px solid #ddd; margin: 12px 0; padding: 4px 16px; color: #555; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h1>${currentNote.title || 'Untitled'}</h1>
      <div class="meta">
        ${currentNote.date ? `<span>${fmtNoteDate(currentNote.date)}</span>` : ''}
        ${typeObj ? `<span class="tag">${typeObj.label}</span>` : ''}
      </div>
      ${currentNote.body || '<p><em>No content.</em></p>'}
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
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
          {/* Type filter pills */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
            {['all', 'note', 'idea', 'area'].map(t => {
              const cfg = NOTE_TYPES.find(x => x.value === t);
              const active = typeFilter === t;
              return (
                <button key={t} onClick={() => setTypeFilter(t)}
                  style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, cursor: 'pointer', fontWeight: 600, border: `1px solid ${active && cfg ? cfg.color : active ? 'var(--accent)' : 'var(--border)'}`, background: active && cfg ? cfg.color + '22' : active ? 'var(--accent-dim)' : 'transparent', color: active && cfg ? cfg.color : active ? 'var(--accent)' : 'var(--ink-3)', transition: 'all .15s' }}>
                  {t === 'all' ? 'All' : cfg?.label}
                </button>
              );
            })}
          </div>
          {/* Sort toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <ArrowUpDown size={11} style={{ color: 'var(--ink-4)' }}/>
            <button onClick={() => setSortMode(sortMode === 'edited' ? 'created' : 'edited')}
              style={{ fontSize: 11, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {sortMode === 'edited' ? 'Last edited' : 'Date created'}
            </button>
          </div>
        </div>
        <div className="pnotes-list">
          {filtered.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.7 }}>
              {search ? 'No matching notes.' : 'No notes yet. Tap "New" to get started.'}
            </div>
          )}
          {filtered.map(n => {
            const typeObj = NOTE_TYPES.find(t => t.value === n.noteType);
            return (
              <div key={n.id} className={`pnotes-item${selId === n.id ? ' selected' : ''}`} onClick={() => setSelId(n.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div className="pnotes-item-title" style={{ flex: 1 }}>{n.title || 'Untitled'}</div>
                  {typeObj && (
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: typeObj.color + '22', color: typeObj.color, border: `1px solid ${typeObj.color}44`, fontWeight: 600, flexShrink: 0 }}>
                      {typeObj.label}
                    </span>
                  )}
                </div>
                {stripHtml(n.body) && (
                  <div className="pnotes-item-preview">{stripHtml(n.body).slice(0, 80)}</div>
                )}
                <div className="pnotes-item-meta">
                  {n.date ? fmtNoteDate(n.date) : fmtRelTime(n.updatedAt || n.createdAt)}
                </div>
              </div>
            );
          })}
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
                {/* Note type selector */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {NOTE_TYPES.map(t => {
                    const active = currentNote?.noteType === t.value;
                    return (
                      <button key={t.value} onClick={() => handleTypeChange(active ? null : t.value)}
                        title={`Tag as ${t.label}`}
                        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, cursor: 'pointer', fontWeight: 600, border: `1px solid ${active ? t.color : 'var(--border)'}`, background: active ? t.color + '22' : 'transparent', color: active ? t.color : 'var(--ink-4)', transition: 'all .15s' }}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <span className="pnotes-autosave-label">Auto-saved</span>
                <button className="icon-btn sm" onClick={handleExportPDF} title="Export as PDF">
                  <Download size={13}/>
                </button>
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
              <div className="pnotes-tb-sep"/>
              <div className="pnotes-tb-group">
                <button
                  className="pnotes-tb-btn"
                  title="Insert checklist item"
                  onMouseDown={e => {
                    e.preventDefault();
                    editorRef.current?.focus();
                    document.execCommand('insertHTML', false,
                      '<div class="pnotes-check-item"><input type="checkbox" class="pnotes-check-cb"> <span></span></div>');
                    handleEditorInput();
                  }}
                ><CheckSquare size={12}/></button>
              </div>
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
