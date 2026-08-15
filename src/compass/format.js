export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Today as an ISO date string in the browser's own timezone. */
export function todayIso(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const TODAY = todayIso()
export const THIS_MONTH = TODAY.slice(0, 7)
export const THIS_YEAR = TODAY.slice(0, 4)

/** Quarter index (0–3) of an ISO date. */
export const quarterOf = (iso) => Math.floor(Number(iso.slice(5, 7) - 1) / 3)
export const CURRENT_QUARTER = quarterOf(TODAY)

/** Months elapsed this calendar year, including the current one. */
export const MONTHS_ELAPSED = Number(TODAY.slice(5, 7))

/** Monday of the current week, ISO. */
export function weekStartIso() {
  const d = new Date(`${TODAY}T00:00:00`)
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return todayIso(d)
}

export function money(n, dp = 0) {
  const v = Math.abs(Number(n) || 0)
  return (
    ((Number(n) || 0) < 0 ? '-$' : '$') +
    v.toLocaleString('en-AU', { minimumFractionDigits: dp, maximumFractionDigits: dp })
  )
}

export function short(n) {
  const num = Number(n) || 0
  const v = Math.abs(num)
  const sgn = num < 0 ? '-$' : '$'
  if (v >= 1e6) return sgn + (v / 1e6).toFixed(2) + 'M'
  if (v >= 1e3) return sgn + Math.round(v / 1e3) + 'k'
  return sgn + Math.round(v)
}

export const unitVal = (unit, n) =>
  unit === 'money' ? short(n) : Math.round(Number(n) || 0).toLocaleString('en-AU')

export function bar(pct, color) {
  return {
    height: '100%',
    borderRadius: 99,
    width: `${Math.max(2, Math.min(100, pct || 0))}%`,
    background: color,
  }
}

export const days = (iso) =>
  Math.round((new Date(`${iso}T00:00:00`) - new Date(`${TODAY}T00:00:00`)) / 86400000)

export function dateLabel(iso) {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function monthLabel(key) {
  if (!key) return '—'
  return `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`
}

export function headerDate() {
  const d = new Date(`${TODAY}T00:00:00`)
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

export function group(iso) {
  const d = days(iso)
  if (d < 0) return 'Overdue'
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d <= 7) return 'Next 7 days'
  return 'Later'
}

export function dueText(iso) {
  const d = days(iso)
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d < 0) return `${Math.abs(d)}d late`
  return dateLabel(iso)
}

export const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)
