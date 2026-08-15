import { CURRENT_QUARTER, THIS_MONTH, quarterOf, unitVal, weekStartIso, pct } from './format'

/** Logs on a yearly goal, plus the logs of every monthly goal feeding it. */
export function rolledLogs(goal, goals) {
  const own = goal.logs.map((l) => ({ ...l, goalId: goal.id, src: 'Logged directly' }))
  if (goal.type !== 'annual') return own
  const kids = goals.filter((g) => g.type === 'monthly' && g.parentId === goal.id)
  return kids.reduce(
    (acc, k) => acc.concat(k.logs.map((l) => ({ ...l, goalId: k.id, src: `via ${k.title}` }))),
    own,
  )
}

export function kidsOf(id, goals) {
  return goals.filter((g) => g.type === 'monthly' && g.parentId === id)
}

/** Everything the Goals and Today views need about one yearly goal. */
export function annualView(goal, goals) {
  const logs = rolledLogs(goal, goals)
  const total = logs.reduce((a, l) => a + l.amount, 0)
  const qSums = [0, 0, 0, 0]
  logs.forEach((l) => {
    if (l.date) qSums[quarterOf(l.date)] += l.amount
  })
  const monthSum = logs
    .filter((l) => String(l.date).slice(0, 7) === THIS_MONTH)
    .reduce((a, l) => a + l.amount, 0)
  const weekStart = weekStartIso()
  const weekSum = logs.filter((l) => l.date >= weekStart).reduce((a, l) => a + l.amount, 0)
  const kids = kidsOf(goal.id, goals)

  return {
    goal,
    logs,
    total,
    pct: pct(total, goal.target),
    qSums,
    monthSum,
    weekSum,
    kids,
    entries: logs.length,
    current: unitVal(goal.unit, total),
    target: unitVal(goal.unit, goal.target),
    monthLabelValue: unitVal(goal.unit, monthSum),
    weekLabelValue: unitVal(goal.unit, weekSum),
    remaining: unitVal(goal.unit, Math.max(0, goal.target - total)),
    quarterPct: pct(qSums[CURRENT_QUARTER], goal.qTargets?.[CURRENT_QUARTER]),
    quarterNote:
      unitVal(goal.unit, qSums[CURRENT_QUARTER]) +
      ' / ' +
      unitVal(goal.unit, goal.qTargets?.[CURRENT_QUARTER] || 0),
  }
}

export function monthlyView(goal, goals) {
  const total = goal.logs.reduce((a, l) => a + l.amount, 0)
  const parent = goal.parentId ? goals.find((g) => g.id === goal.parentId) : null
  return {
    goal,
    total,
    parent,
    pct: pct(total, goal.target),
    current: unitVal(goal.unit, total),
    target: unitVal(goal.unit, goal.target),
  }
}
