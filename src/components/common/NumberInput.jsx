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
