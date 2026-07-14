// src/pages/focuslog/StatsPage.jsx — when am I most focused, on what, for whom.
// All charts follow the timed/untimed rule in utils/focusLog.js.
import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useData } from '../../context/DataContext';
import { FOCUS_CATEGORY_COLORS } from '../../constants';
import { PERIODS, periodRange, filterByPeriod, hourHistogram, peakWindow, categoryBreakdown, volumeTrend, topClients, fmtHour, fmtDurationMin } from '../../utils/focusLog';

const TREND_COLOR = '#3DBBA0'; // matches the Performance page chart teal

function Card({ title, caption, children }) {
  return (
    <div className="flog-stat-card">
      <div className="flog-stat-title">{title}</div>
      {children}
      {caption && <div className="flog-stat-caption">{caption}</div>}
    </div>
  );
}

function TrendTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--ink-3)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--ink)', fontWeight: 600 }}>{payload[0].value} {unit}</div>
    </div>
  );
}

export default function StatsPage() {
  const { focusLogs } = useData();
  const [period, setPeriod] = useState('30d');

  const s = useMemo(() => {
    const range = periodRange(period);
    const logs  = filterByPeriod(focusLogs, range);
    return {
      logs,
      heat:    hourHistogram(logs),
      peak:    peakWindow(logs),
      cats:    categoryBreakdown(logs),
      trend:   volumeTrend(logs, period, range),
      clients: topClients(logs, 5),
    };
  }, [focusLogs, period]);

  const { heat } = s;
  const maxCell  = Math.max(...heat.cells, 0);
  const totalMin = heat.useMinutes ? heat.cells.reduce((a, b) => a + b, 0) : null;
  const untimedCaption = heat.useMinutes && heat.untimedCount > 0
    ? `Excludes ${heat.untimedCount} entr${heat.untimedCount === 1 ? 'y' : 'ies'} without an end time.`
    : (!heat.useMinutes && s.logs.length > 0 ? 'No timed entries in this period — showing entry counts.' : null);

  return (
    <div style={{ padding: '16px 28px 28px' }}>
      <div className="flog-periods">
        {PERIODS.map(p => (
          <button key={p.id} className={`flog-period${period === p.id ? ' active' : ''}`} onClick={() => setPeriod(p.id)}>
            {p.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-3)' }}>
          {s.logs.length} entr{s.logs.length === 1 ? 'y' : 'ies'}{totalMin != null ? ` · ${fmtDurationMin(totalMin)} focused` : ''}
        </span>
      </div>

      {s.logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-3)', fontSize: 13 }}>
          No entries in this period yet.
        </div>
      ) : (
        <>
          {s.peak && (
            <div className="flog-peak">
              ⚡ Most focused: <strong>{fmtHour(s.peak.hour)}–{fmtHour((s.peak.hour + 1) % 24)}</strong>
              {s.peak.category && <>, mostly <strong>{s.peak.category}</strong></>}
            </div>
          )}

          <Card title="Focus by hour" caption={untimedCaption}>
            <div className="flog-heat">
              {heat.cells.map((v, h) => (
                <div key={h} className="flog-heat-cell"
                  title={`${fmtHour(h)}–${fmtHour((h + 1) % 24)}: ${heat.useMinutes ? fmtDurationMin(v) : `${v} ${v === 1 ? 'entry' : 'entries'}`}`}>
                  {v > 0 && maxCell > 0 && <div className="flog-heat-fill" style={{ opacity: 0.15 + 0.85 * (v / maxCell) }}/>}
                </div>
              ))}
            </div>
            <div className="flog-heat-labels"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>
          </Card>

          <div className="flog-stat-grid">
            <Card title="By category" caption={untimedCaption}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie data={s.cats} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={2} strokeWidth={0}>
                      {s.cats.map(c => <Cell key={c.name} fill={FOCUS_CATEGORY_COLORS[c.name] || '#94A3B8'}/>)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {s.cats.map(c => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: FOCUS_CATEGORY_COLORS[c.name] || '#94A3B8', flexShrink: 0 }}/>
                      <span style={{ flex: 1, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                        {heat.useMinutes ? fmtDurationMin(c.value) : c.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card title="Top clients">
              {s.clients.items.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', padding: '12px 0' }}>
                  No entries with a client in this period.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {s.clients.items.map(c => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 110, fontSize: 12.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{c.name}</span>
                      <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 99 }}>
                        <div style={{ width: `${(c.value / (s.clients.items[0].value || 1)) * 100}%`, height: '100%', background: 'var(--mortgage)', borderRadius: 99 }}/>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                        {s.clients.useMinutes ? fmtDurationMin(c.value) : c.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title={`Volume (${s.trend.useMinutes ? 'hours' : 'entries'})`} caption={untimedCaption}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={s.trend.buckets} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                <YAxis tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} width={34}/>
                <Tooltip content={<TrendTooltip unit={s.trend.useMinutes ? 'h' : 'entries'}/>}/>
                <Bar dataKey="value" name="Focus" fill={TREND_COLOR} radius={[3, 3, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
