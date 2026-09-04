// Plain divs used as controls still need real button semantics: focusable,
// keyboard-activatable, and announced. Kept out of the component file so Fast
// Refresh keeps working there.
export function clickable(onClick, ariaLabel) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': ariaLabel,
    onClick,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick(e)
      }
    },
  }
}
