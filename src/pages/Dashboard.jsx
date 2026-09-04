// src/pages/Dashboard.jsx — Compass's "Today": the numbers, what to do next,
// where the quarter stands, and the money, all fed from live CRM data.
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import CheckinWidget from '../components/dashboard/CheckinWidget';
import { Bar, Empty, Progress } from '../compass/ui';
import { clickable } from '../compass/interaction';
import { C, serif, mono, card, label, grid, linkAction, sectionTitle } from '../compass/tokens';
import { annualView, monthlyView } from '../compass/goals';
import {
  money, short, dateLabel, monthLabel, headerDate, weekLabel,
  THIS_MONTH, TODAY, THIS_WEEK, CURRENT_QUARTER, MONTH_NAMES,
} from '../compass/format';
import { ACTIVE_STAGES } from '../constants';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    loans, clients, goalsV2, assets, liabs, income, expenses,
    weeklyRoutine, weeklyDone, setRoutineDone, loading,
  } = useData();

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c.name])),
    [clients],
  );
  const loanName = l => l.clientObj || clientMap[l.clientId] || 'Unknown';

  /* ── Goals ─────────────────────────────────────────────────────────────── */
  const goals = useMemo(
    () => goalsV2.map(g => ({
      ...g,
      target: Number(g.target) || 0,
      qTargets: g.qTargets || [0, 0, 0, 0],
      logs: Object.entries(g.logs || {}).map(([id, l]) => ({ id, ...l, amount: Number(l.amount) || 0 })),
    })),
    [goalsV2],
  );
  const annual = useMemo(
    () => goals.filter(g => g.type === 'annual').map(g => annualView(g, goals)),
    [goals],
  );
  const monthly = useMemo(
    () => goals.filter(g => g.type === 'monthly' && g.month === THIS_MONTH).map(g => monthlyView(g, goals)),
    [goals],
  );

  /* ── Pipeline ──────────────────────────────────────────────────────────── */
  const activeLoans = loans.filter(l => ACTIVE_STAGES.includes(l.stage));
  const pipelineVal = activeLoans.reduce((s, l) => s + (Number(l.value) || 0), 0);

  const settlingThisMonth = loans.filter(l => (l.settlementDate || '').slice(0, 7) === THIS_MONTH);
  const settlingVal = settlingThisMonth.reduce((s, l) => s + (Number(l.value) || 0), 0);

  /* ── This week ─────────────────────────────────────────────────────────── */
  const routine = useMemo(
    () => [...weeklyRoutine].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || 0) - (b.createdAt || 0)),
    [weeklyRoutine],
  );
  const doneThisWeek = weeklyDone[THIS_WEEK] || {};
  const routineDone = routine.filter(i => doneThisWeek[i.id]).length;
  const routinePct = routine.length ? Math.round((routineDone / routine.length) * 100) : 0;


  /* ── Money ─────────────────────────────────────────────────────────────── */
  const totalAssets = assets.reduce((a, x) => a + (Number(x.value) || 0), 0);
  const totalLiabs = liabs.reduce((a, x) => a + (Number(x.value) || 0), 0);
  const thisMonth = x => (x.date || '').slice(0, 7) === THIS_MONTH;
  const monthIncome = income.filter(thisMonth).reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const monthExpenses = expenses.filter(thisMonth).reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const bizNetMonth = monthIncome - monthExpenses;

  const lead = annual[0];
  const monthName = MONTH_NAMES[Number(TODAY.slice(5, 7)) - 1];

  const stats = [
    {
      label: 'Pipeline',
      value: short(pipelineVal),
      sub: activeLoans.length ? `${activeLoans.length} files in progress` : 'No active files yet',
      go: () => navigate('/mortgage/pipeline'),
    },
    {
      label: 'Settling this month',
      value: short(settlingVal),
      sub: settlingThisMonth.length
        ? settlingThisMonth.slice(0, 3).map(l => loanName(l).split(' ')[0]).join(', ')
        : 'Nothing booked in yet',
      go: () => navigate('/mortgage/pipeline'),
    },
    {
      label: 'This week',
      value: routine.length ? `${routineDone}/${routine.length}` : '—',
      sub: routine.length
        ? (routineDone === routine.length ? 'All done' : `${routine.length - routineDone} still to do`)
        : 'Set up your weekly routine',
      go: () => navigate('/weekly'),
    },
    {
      label: 'Year to target',
      value: lead ? `${lead.pct}%` : '—',
      sub: lead ? `${lead.current} of ${lead.target}` : 'Set a yearly goal to track this',
      go: () => navigate('/goals'),
    },
  ];

  const toggleRoutine = (item) =>
    setRoutineDone(THIS_WEEK, item.id, !doneThisWeek[item.id])
      .catch(() => toast.error('Failed to update.'));

  if (loading) {
    return (
      <div className="page-body" style={{ fontSize: 12.5, color: C.muted }}>Loading…</div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{
            fontFamily: mono, fontSize: 10.5, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: C.muted, marginBottom: 6,
          }}>
            {headerDate()}
          </div>
          <div className="page-title">Today</div>
        </div>
        <div style={{ fontSize: 12.5, color: C.muted2, textAlign: 'right', maxWidth: 330, lineHeight: 1.5 }}>
          Your next moves, the money, and where this quarter stands.
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <CheckinWidget/>

          {/* ── Four numbers ── */}
          <div style={grid(210, 14)}>
            {stats.map(s => (
              <div key={s.label} {...clickable(s.go, s.label)}
                   style={{ ...card, padding: 18, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
                <div style={label}>{s.label}</div>
                <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: C.muted2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={grid(420)}>
            {/* ── Left column ── */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <section style={{ ...card, padding: '22px 22px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                  <h2 style={sectionTitle}>This week — {weekLabel(THIS_WEEK)}</h2>
                  <span {...clickable(() => navigate('/weekly'))} style={linkAction}>Weekly</span>
                </div>
                <p style={{ margin: '6px 0 12px', fontSize: 11.5, color: C.muted, lineHeight: 1.55 }}>
                  {routine.length
                    ? `${routineDone} of ${routine.length} done — tick them off here or on the Weekly page.`
                    : 'No weekly routine yet — add the handful of things you do every week.'}
                </p>
                {routine.length > 0 && <Bar pct={routinePct} height={6} style={{ marginBottom: 4 }}/>}

                {routine.length ? routine.map(item => {
                  const isDone = !!doneThisWeek[item.id];
                  return (
                    <div key={item.id} style={{
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      padding: '12px 0', borderTop: `1px solid ${C.line}`,
                    }}>
                      <div {...clickable(() => toggleRoutine(item), isDone ? 'Mark as not done' : 'Mark as done')}
                           style={{
                             width: 17, height: 17, flex: '0 0 17px', marginTop: 1, borderRadius: 5,
                             cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                             fontSize: 11, color: 'var(--bg)',
                             border: `1.5px solid ${isDone ? 'var(--accent)' : 'var(--border-strong)'}`,
                             background: isDone ? 'var(--accent)' : 'transparent',
                           }}>
                        {isDone ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{
                          fontSize: 13, lineHeight: 1.4,
                          color: isDone ? C.muted : 'var(--ink)',
                          textDecoration: isDone ? 'line-through' : 'none',
                        }}>
                          {item.title}
                        </div>
                        {item.note && <div style={{ fontSize: 11, color: C.muted }}>{item.note}</div>}
                      </div>
                    </div>
                  );
                }) : (
                  <Empty style={{ paddingBottom: 14 }}>
                    Start with two or three in <b>Weekly</b>.
                  </Empty>
                )}
              </section>

              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                  <h2 style={sectionTitle}>This quarter — Q{CURRENT_QUARTER + 1}</h2>
                  <span {...clickable(() => navigate('/goals'))} style={linkAction}>Goals</span>
                </div>
                {annual.length ? annual.map(g => (
                  <Progress
                    key={g.goal.id}
                    title={g.goal.title}
                    pctLabel={g.goal.qTargets?.[CURRENT_QUARTER] ? `${g.quarterPct}%` : '—'}
                    barPct={g.quarterPct}
                    left={g.quarterNote}
                    right={`${g.monthLabelValue} this month`}
                  />
                )) : (
                  <Empty>No yearly goals yet — set up to three in <b>Goals</b>.</Empty>
                )}
              </div>
            </section>

            {/* ── Right column ── */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 14, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ ...label, color: 'var(--bg)', opacity: 0.6 }}>Net position</span>
                  <span {...clickable(() => navigate('/money'))}
                        style={{ ...linkAction, color: 'var(--accent)' }}>Money</span>
                </div>
                <div style={{ fontFamily: serif, fontSize: 44, lineHeight: 1.05, margin: '10px 0 4px' }}>
                  {money(totalAssets - totalLiabs)}
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.6 }}>
                  {assets.length + liabs.length
                    ? `${assets.length} assets · ${liabs.length} liabilities`
                    : 'Add assets and liabilities in Money to build this out'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18, borderTop: '1px solid rgba(233,227,213,0.14)' }}>
                  {[
                    ['Assets', money(totalAssets)],
                    ['Liabilities', `-${money(totalLiabs)}`],
                    [`Business net · ${monthName}`, money(bizNetMonth)],
                  ].map(([k, v]) => (
                    <div key={k} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                      gap: 12, padding: '11px 0', borderBottom: '1px solid rgba(233,227,213,0.08)',
                    }}>
                      <span style={{ fontSize: 12.5, opacity: 0.75 }}>{k}</span>
                      <span style={{ fontFamily: mono, fontSize: 12.5 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
                  <h2 style={sectionTitle}>This month — {monthLabel(THIS_MONTH).split(' ')[0]}</h2>
                  <span {...clickable(() => navigate('/goals'))} style={linkAction}>Goals</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: C.muted, lineHeight: 1.55 }}>
                  {monthly.length
                    ? 'Monthly goals for this month — linked ones feed straight into the yearly totals.'
                    : 'No monthly goals set for this month yet.'}
                </p>
                {monthly.map(g => (
                  <Progress
                    key={g.goal.id}
                    title={g.goal.title}
                    pctLabel={`${g.pct}%`}
                    barPct={g.pct}
                    color={g.parent ? C.accent : 'var(--ink-4)'}
                    left={`${g.current} of ${g.target}`}
                    right={g.parent ? `Feeds ${g.parent.tag}` : 'Standalone'}
                  />
                ))}
                {!monthly.length && (
                  <Empty>Create one in <b>Goals</b> — it can roll into a yearly goal.</Empty>
                )}
              </div>

              {settlingThisMonth.length > 0 && (
                <div style={card}>
                  <h2 style={{ ...sectionTitle, marginBottom: 4 }}>Settling in {monthName}</h2>
                  {settlingThisMonth
                    .slice()
                    .sort((a, b) => (a.settlementDate || '').localeCompare(b.settlementDate || ''))
                    .map(l => (
                      <div key={l.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 0', borderTop: `1px solid ${C.line}`,
                      }}>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {loanName(l)}
                          </span>
                          <span style={{ fontSize: 11, color: C.muted }}>{l.lender || '—'} · {l.stage}</span>
                        </div>
                        <span style={{ fontFamily: mono, fontSize: 12.5, whiteSpace: 'nowrap' }}>
                          {money(Number(l.value) || 0)}
                        </span>
                        <span style={{ fontFamily: mono, fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>
                          {dateLabel(l.settlementDate)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
