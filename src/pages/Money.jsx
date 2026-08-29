import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import Modal from '../components/common/Modal';
import { Bar, Empty, XDel } from '../compass/ui';
import { clickable } from '../compass/interaction';
import {
  C, serif, mono, card, input, inputWhite, btnDark, label, labelSm, grid,
  linkAction, segment, segmentWrap, chip,
} from '../compass/tokens';
import {
  money, short, dateLabel, monthLabel, THIS_MONTH, THIS_YEAR, TODAY, MONTHS_ELAPSED,
} from '../compass/format';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const catChipStyle = {
  fontFamily: mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase',
  padding: '4px 8px', borderRadius: 6, background: 'var(--surface-3)', color: C.muted2,
  flex: '0 0 auto', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const ANNUAL_GRID = {
  display: 'grid',
  gridTemplateColumns: 'minmax(160px,1.6fr) repeat(4, minmax(96px,1fr))',
  gap: 12,
  minWidth: 620,
};

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border-2)',
      borderRadius: 'var(--r)', padding: '9px 12px', fontSize: 12.5, boxShadow: 'var(--shadow)',
    }}>
      <div style={{ color: 'var(--ink-3)', marginBottom: 4, fontFamily: mono, fontSize: 10.5 }}>
        {dateLabel(label)}
      </div>
      <div style={{ fontFamily: mono }}>{money(p.net)}</div>
      <div style={{ color: 'var(--ink-3)', fontSize: 11, marginTop: 2 }}>
        {money(p.assets)} assets · {money(p.liabs)} owed
      </div>
    </div>
  );
}

// moneySettings holds maps of { name }; turn them into sorted arrays.
const listOf = (map) => Object.entries(map || {}).map(([id, v]) => ({ id, name: v?.name || '' }));

export default function Money() {
  const {
    assets: rawAssets, liabs: rawLiabs, expenses: rawExpenses, income: rawIncome,
    moneySettings, netWorthLog, addMoneyRow, deleteMoneyRow,
    addMoneySetting, renameMoneySetting, removeMoneySetting,
    recordNetWorth, deleteNetWorth,
  } = useData();

  const [moneyMonth, setMoneyMonth] = useState(THIS_MONTH);
  const [ledger, setLedger] = useState('expenses');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [bucket, setBucket] = useState('');
  const [cat, setCat] = useState('');
  const [date, setDate] = useState(TODAY);
  const [catFilter, setCatFilter] = useState('All');
  const [rangeFrom, setRangeFrom] = useState(`${THIS_YEAR}-01-01`);
  const [rangeTo, setRangeTo] = useState(TODAY);
  const [rangeKind, setRangeKind] = useState('expenses');
  const [catsModal, setCatsModal] = useState(null); // 'expenses' | 'income' | 'buckets'

  const num = (arr) => arr.map(x => ({ ...x, amount: Number(x.amount) || 0 }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const assets = useMemo(() => rawAssets.map(a => ({ ...a, value: Number(a.value) || 0 })), [rawAssets]);
  const liabs = useMemo(() => rawLiabs.map(l => ({ ...l, value: Number(l.value) || 0 })), [rawLiabs]);
  const expenses = useMemo(() => num(rawExpenses), [rawExpenses]);
  const income = useMemo(() => num(rawIncome), [rawIncome]);

  const buckets = listOf(moneySettings.buckets);
  const expCats = listOf(moneySettings.expCats);
  const incCats = listOf(moneySettings.incCats);

  const bucketNames = buckets.length ? buckets.map(b => b.name) : ['General'];
  const catList = (ledger === 'expenses' ? expCats : incCats).map(c => c.name);
  const activeBucket = bucket || bucketNames[0];
  const activeCat = cat || catList[0] || 'Uncategorised';

  const totalAssets = assets.reduce((a, x) => a + x.value, 0);
  const totalLiabs = liabs.reduce((a, x) => a + x.value, 0);

  const inMonth = x => (x.date || '').slice(0, 7) === moneyMonth;
  const monthIncome = income.filter(inMonth);
  const monthExpenses = expenses.filter(inMonth);
  const sumOf = (arr, b) => arr.filter(x => x.bucket === b).reduce((a, x) => a + x.amount, 0);
  const monthNet = monthIncome.reduce((a, x) => a + x.amount, 0) - monthExpenses.reduce((a, x) => a + x.amount, 0);

  const usedBuckets = [...new Set([
    ...bucketNames, ...monthIncome.map(x => x.bucket), ...monthExpenses.map(x => x.bucket),
  ])].filter(Boolean);

  const ledgerAll = ledger === 'expenses' ? monthExpenses : monthIncome;
  const usedCats = [...new Set(ledgerAll.map(x => x.cat || 'Uncategorised'))];
  const ledgerShown = catFilter === 'All' ? ledgerAll : ledgerAll.filter(x => (x.cat || 'Uncategorised') === catFilter);
  const entriesTotal = ledgerShown.reduce((a, x) => a + x.amount, 0);

  const inRange = x => x.date >= rangeFrom && x.date <= rangeTo;
  const rInc = income.filter(inRange);
  const rExp = expenses.filter(inRange);
  const rIncT = rInc.reduce((a, x) => a + x.amount, 0);
  const rExpT = rExp.reduce((a, x) => a + x.amount, 0);
  const rangeArr = rangeKind === 'expenses' ? rExp : rInc;
  const rangeArrT = rangeKind === 'expenses' ? rExpT : rIncT;
  const rangeCats = [...new Set(rangeArr.map(x => x.cat || 'Uncategorised'))]
    .map(name => {
      const rows = rangeArr.filter(x => (x.cat || 'Uncategorised') === name);
      return { name, rows: rows.length, total: rows.reduce((a, x) => a + x.amount, 0) };
    })
    .sort((a, b) => b.total - a.total);

  const ytd = (arr, b) => arr.filter(x => x.bucket === b && x.date >= `${THIS_YEAR}-01-01`)
    .reduce((a, x) => a + x.amount, 0);
  const annualRows = usedBuckets.map(b => {
    const inc = ytd(income, b), exp = ytd(expenses, b);
    return { name: b, inc, exp, net: inc - exp };
  });
  const tInc = annualRows.reduce((a, r) => a + r.inc, 0);
  const tExp = annualRows.reduce((a, r) => a + r.exp, 0);

  const net = totalAssets - totalLiabs;
  useEffect(() => {
    if (!assets.length && !liabs.length) return;      // nothing to record yet
    const todayEntry = netWorthLog[TODAY];
    if (todayEntry && Number(todayEntry.net) === net) return;   // already current
    recordNetWorth(TODAY, { date: TODAY, assets: totalAssets, liabs: totalLiabs, net });
  }, [net, totalAssets, totalLiabs, assets.length, liabs.length, netWorthLog, recordNetWorth]);

  const trend = useMemo(
    () => Object.values(netWorthLog)
      .map(e => ({ ...e, net: Number(e.net) || 0, assets: Number(e.assets) || 0, liabs: Number(e.liabs) || 0 }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [netWorthLog],
  );
  const firstPoint = trend[0];
  const growth = firstPoint ? net - firstPoint.net : 0;

  const addEntry = async () => {
    const dsc = desc.trim();
    const amt = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    if (!dsc || !amt) { toast.error('Add a description and an amount'); return; }
    await addMoneyRow(ledger, {
      date: date || TODAY, bucket: activeBucket, cat: activeCat, desc: dsc, amount: amt,
    });
    setDesc(''); setAmount('');
    toast.success(ledger === 'expenses' ? 'Expense added' : 'Income added');
  };

  const entryRow = (r, kind, meta) => (
    <div key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontFamily: mono, fontSize: 10.5, color: C.muted, flex: '0 0 46px', whiteSpace: 'nowrap' }}>
        {dateLabel(r.date)}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.desc}</span>
        <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta}</span>
      </div>
      {meta === r.bucket && <span style={catChipStyle}>{r.cat || 'Uncategorised'}</span>}
      <span style={{
        fontFamily: mono, fontSize: 12.5, flex: '0 0 84px', textAlign: 'right',
        color: kind === 'income' ? C.green : C.red, whiteSpace: 'nowrap',
      }}>
        {(kind === 'income' ? '+' : '-') + money(r.amount, 2)}
      </span>
      <XDel size={15} onClick={() => deleteMoneyRow(kind, r.id)} />
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Money</div>
          <div className="page-sub">
            A month at a time, categorised, with a date-range view and the annualised picture.
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {/* ── Net worth, assets, liabilities ── */}
          <div style={grid(240, 14)}>
            <div style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 14, padding: 24 }}>
              <div style={{ ...label, color: 'var(--bg)', opacity: 0.6 }}>Net worth</div>
              <div style={{ fontFamily: serif, fontSize: 42, lineHeight: 1.05, marginTop: 8 }}>
                {money(totalAssets - totalLiabs)}
              </div>
              <div style={{ fontSize: 12, marginTop: 8, opacity: 0.6 }}>
                {assets.length + liabs.length
                  ? `${assets.length} assets · ${liabs.length} liabilities`
                  : 'Add your first asset below'}
              </div>
            </div>
            <div style={{ ...card, padding: 24 }}>
              <div style={label}>Assets</div>
              <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1, marginTop: 8 }}>{money(totalAssets)}</div>
              <div style={{ fontSize: 12, color: C.muted2, marginTop: 8 }}>
                {assets.length ? `Across ${assets.length} holdings` : 'Nothing recorded yet'}
              </div>
            </div>
            <div style={{ ...card, padding: 24 }}>
              <div style={label}>Liabilities</div>
              <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1, marginTop: 8 }}>{money(totalLiabs)}</div>
              <div style={{ fontSize: 12, color: C.muted2, marginTop: 8 }}>
                {liabs.length ? `Across ${liabs.length} debts` : 'Nothing recorded yet'}
              </div>
            </div>
          </div>

          {/* ── Net worth over time ── */}
          <section style={{ ...card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 24 }}>Net worth over time</h2>
              <span style={{ fontSize: 12, color: C.muted }}>
                {trend.length > 1
                  ? `${trend.length} readings · ${growth >= 0 ? '+' : ''}${money(growth)} since ${dateLabel(firstPoint.date)}`
                  : 'Updating the balance sheet records a reading — review it each quarter and watch the line grow.'}
              </span>
            </div>

            {trend.length > 1 ? (
              <div style={{ height: 240, marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false}/>
                    <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                           axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={v => short(v)} tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                           axisLine={false} tickLine={false} width={62}/>
                    <Tooltip content={<TrendTooltip/>}/>
                    <Line type="monotone" dataKey="net" name="Net worth" stroke="#B06A38"
                          strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: '#B06A38' }} activeDot={{ r: 5 }}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty>
                One reading so far. Each time you revise the balance sheet the day's figure is
                recorded, so a quarterly review builds the line.
              </Empty>
            )}

            {trend.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                {trend.slice(-8).reverse().map(e => (
                  <span key={e.date} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    fontFamily: mono, fontSize: 10.5, color: C.muted2,
                    padding: '5px 9px', borderRadius: 99, background: 'var(--surface-3)',
                  }}>
                    {dateLabel(e.date)} · {short(e.net)}
                    {e.date !== TODAY && (
                      <XDel size={13} label={`Remove reading for ${e.date}`} onClick={() => deleteNetWorth(e.date)}/>
                    )}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* ── Month view ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 24 }}>
                Month view — {monthLabel(moneyMonth)}
              </h2>
              <input type="month" value={moneyMonth}
                     onChange={e => e.target.value && setMoneyMonth(e.target.value)}
                     style={{ ...inputWhite, padding: '8px 11px' }} />
              <span style={{ marginLeft: 'auto', fontSize: 12.5, color: C.muted }}>
                Net for the month {money(monthNet)}
              </span>
            </div>
            <div style={grid(260, 14)}>
              {usedBuckets.map(b => {
                const inc = sumOf(monthIncome, b), exp = sumOf(monthExpenses, b), net = inc - exp;
                return (
                  <div key={b} style={card}>
                    <div style={{ ...labelSm, letterSpacing: '0.14em' }}>{b}</div>
                    <div style={{ fontFamily: serif, fontSize: 30, lineHeight: 1, margin: '10px 0 14px' }}>{money(net)}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                        <span style={{ color: C.muted2 }}>Income</span>
                        <span style={{ fontFamily: mono, color: C.green }}>{money(inc)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                        <span style={{ color: C.muted2 }}>Expenses</span>
                        <span style={{ fontFamily: mono, color: C.red }}>{money(exp)}</span>
                      </div>
                    </div>
                    <Bar pct={inc ? ((inc - exp) / inc) * 100 : 0} color={net >= 0 ? C.green : C.red} style={{ marginTop: 14 }} />
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                      {inc ? `${Math.round(((inc - exp) / inc) * 100)}% margin this month` : 'Nothing logged this month'}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Ledger + balance sheet ── */}
          <div style={grid(420)}>
            <section style={{ ...card, padding: 24 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={segmentWrap}>
                  <div {...clickable(() => { setLedger('expenses'); setCat(''); setCatFilter('All'); })}
                       style={segment(ledger === 'expenses')}>Expenses</div>
                  <div {...clickable(() => { setLedger('income'); setCat(''); setCatFilter('All'); })}
                       style={segment(ledger === 'income')}>Income</div>
                </div>
                <div {...clickable(() => setCatsModal(ledger))} style={{ ...linkAction, marginLeft: 'auto' }}>
                  {ledger === 'expenses' ? 'Edit expense categories' : 'Edit income categories'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <input value={desc} onChange={e => setDesc(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && addEntry()}
                       placeholder={ledger === 'expenses' ? 'What was the expense for?' : 'Income source'}
                       style={{ ...input, flex: '1 1 170px' }} />
                <input value={amount} onChange={e => setAmount(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && addEntry()}
                       placeholder="Amount" style={{ ...input, flex: '0 1 100px' }} />
                <select value={activeBucket} onChange={e => setBucket(e.target.value)} style={{ ...input, flex: '0 1 170px' }}>
                  {bucketNames.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={activeCat} onChange={e => setCat(e.target.value)} style={{ ...input, flex: '0 1 170px' }}>
                  {(catList.length ? catList : ['Uncategorised']).map(cn => <option key={cn} value={cn}>{cn}</option>)}
                </select>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                       style={{ ...input, flex: '0 1 135px', fontSize: 12 }} />
                <button onClick={addEntry} style={btnDark}>
                  {ledger === 'expenses' ? 'Add expense' : 'Add income'}
                </button>
              </div>

              {usedCats.length > 1 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {['All', ...usedCats].map(cn => (
                    <div key={cn} {...clickable(() => setCatFilter(cn))} style={chip(catFilter === cn)}>
                      {cn === 'All' ? 'All categories' : cn}
                    </div>
                  ))}
                </div>
              )}

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
                paddingBottom: 9, borderBottom: `1px solid ${C.line}`,
              }}>
                <span style={{ ...labelSm, letterSpacing: '0.12em' }}>
                  {ledgerShown.length} {ledgerShown.length === 1 ? 'entry' : 'entries'} · newest first
                  {catFilter === 'All' ? '' : ` · ${catFilter}`}
                </span>
                <span style={{ fontFamily: mono, fontSize: 12.5 }}>{money(entriesTotal, 2)}</span>
              </div>

              {ledgerShown.map(r => entryRow(r, ledger, r.bucket))}
              {!ledgerShown.length && (
                <Empty>
                  Nothing logged in {monthLabel(moneyMonth)} yet — add your first{' '}
                  {ledger === 'expenses' ? 'expense' : 'income'} entry above.
                </Empty>
              )}
            </section>

            <BalanceSheet
              assets={assets} liabs={liabs}
              totalAssets={totalAssets} totalLiabs={totalLiabs}
              addRow={addMoneyRow} removeRow={deleteMoneyRow}
            />
          </div>

          {/* ── Date range ── */}
          <section style={{ ...card, padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 24 }}>Date range</h2>
              <input type="date" value={rangeFrom} onChange={e => e.target.value && setRangeFrom(e.target.value)}
                     style={{ ...inputWhite, padding: '8px 11px' }} />
              <span style={{ fontSize: 12, color: C.muted }}>to</span>
              <input type="date" value={rangeTo} onChange={e => e.target.value && setRangeTo(e.target.value)}
                     style={{ ...inputWhite, padding: '8px 11px' }} />
              <div style={{ ...segmentWrap, marginLeft: 'auto' }}>
                <div {...clickable(() => setRangeKind('expenses'))} style={segment(rangeKind === 'expenses')}>Expenses</div>
                <div {...clickable(() => setRangeKind('income'))} style={segment(rangeKind === 'income')}>Income</div>
              </div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
              gap: 14, paddingBottom: 20, borderBottom: `1px solid ${C.line}`,
            }}>
              {[
                ['Income in range', money(rIncT), C.green],
                ['Expenses in range', money(rExpT), C.red],
                ['Net in range', money(rIncT - rExpT), C.ink],
              ].map(([l, v, color]) => (
                <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={labelSm}>{l}</span>
                  <span style={{ fontFamily: serif, fontSize: 26, lineHeight: 1, color }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ ...grid(300, 26), marginTop: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
                  <span style={{ ...labelSm, letterSpacing: '0.14em' }}>By category</span>
                  <span style={{ fontFamily: mono, fontSize: 12.5 }}>{money(rangeArrT, 2)}</span>
                </div>
                {rangeCats.map(c => (
                  <div key={c.name} style={{ padding: '12px 0', borderTop: `1px solid ${C.line}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                      <span style={{ fontSize: 13 }}>{c.name}</span>
                      <span style={{ fontFamily: mono, fontSize: 12.5 }}>{money(c.total, 2)}</span>
                    </div>
                    <Bar pct={rangeArrT ? (c.total / rangeArrT) * 100 : 0} height={5}
                         color={rangeKind === 'income' ? C.green : C.red} style={{ margin: '8px 0 6px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, color: C.muted }}>
                      <span>{c.rows} {c.rows === 1 ? 'entry' : 'entries'}</span>
                      <span>{rangeArrT ? `${Math.round((c.total / rangeArrT) * 100)}%` : '—'}</span>
                    </div>
                  </div>
                ))}
                {!rangeCats.length && <Empty>Nothing logged in this range yet.</Empty>}
              </div>

              <div>
                <div style={{ ...labelSm, letterSpacing: '0.14em', marginBottom: 12 }}>
                  {rangeArr.length} {rangeKind === 'expenses' ? 'expense' : 'income'} entries ·{' '}
                  {dateLabel(rangeFrom)} to {dateLabel(rangeTo)}
                </div>
                <div style={{ maxHeight: 340, overflow: 'auto' }}>
                  {rangeArr.map(r => entryRow(r, rangeKind, `${r.cat || 'Uncategorised'} · ${r.bucket}`))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Annualised ── */}
          <section style={{ ...card, padding: 26, overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 24 }}>Annualised — businesses</h2>
              <span style={{ fontSize: 12, color: C.muted }}>
                Year to date over {MONTHS_ELAPSED} months, annualised at the current run rate
              </span>
              <div {...clickable(() => setCatsModal('buckets'))} style={{ ...linkAction, marginLeft: 'auto' }}>
                Edit businesses
              </div>
            </div>
            <div style={{ ...ANNUAL_GRID, padding: '14px 0 10px', borderBottom: `1px solid ${C.line}`, ...labelSm }}>
              <div>Business</div>
              <div style={{ textAlign: 'right' }}>Income YTD</div>
              <div style={{ textAlign: 'right' }}>Expenses YTD</div>
              <div style={{ textAlign: 'right' }}>Net YTD</div>
              <div style={{ textAlign: 'right' }}>Annualised net</div>
            </div>
            {annualRows.map(a => (
              <div key={a.name} style={{ ...ANNUAL_GRID, alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5 }}>{a.name}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>
                    {a.inc ? `${Math.round((a.net / a.inc) * 100)}% margin · ${money(a.net / MONTHS_ELAPSED)}/mth` : 'No income yet'}
                  </span>
                </div>
                <div style={{ fontFamily: mono, fontSize: 12.5, textAlign: 'right', color: C.green }}>{money(a.inc)}</div>
                <div style={{ fontFamily: mono, fontSize: 12.5, textAlign: 'right', color: C.red }}>{money(a.exp)}</div>
                <div style={{ fontFamily: mono, fontSize: 12.5, textAlign: 'right' }}>{money(a.net)}</div>
                <div style={{ fontFamily: mono, fontSize: 13, textAlign: 'right' }}>{money((a.net / MONTHS_ELAPSED) * 12)}</div>
              </div>
            ))}
            <div style={{ ...ANNUAL_GRID, alignItems: 'baseline', padding: '16px 0 0', borderTop: `1px solid ${C.ink}` }}>
              <div style={{ fontSize: 13 }}>All businesses</div>
              <div style={{ fontFamily: mono, fontSize: 12.5, textAlign: 'right' }}>{money(tInc)}</div>
              <div style={{ fontFamily: mono, fontSize: 12.5, textAlign: 'right' }}>{money(tExp)}</div>
              <div style={{ fontFamily: mono, fontSize: 12.5, textAlign: 'right' }}>{money(tInc - tExp)}</div>
              <div style={{ fontFamily: serif, fontSize: 22, textAlign: 'right' }}>
                {money(((tInc - tExp) / MONTHS_ELAPSED) * 12)}
              </div>
            </div>
          </section>
        </div>
      </div>

      <CatsModal
        kind={catsModal}
        close={() => setCatsModal(null)}
        lists={{ expenses: expCats, income: incCats, buckets }}
        rows={{ expenses, income }}
        onAdd={addMoneySetting}
        onRename={renameMoneySetting}
        onRemove={removeMoneySetting}
      />
    </>
  );
}

/* ─── Balance sheet ─────────────────────────────────────────────────────── */

function BalanceSheet({ assets, liabs, totalAssets, totalLiabs, addRow, removeRow }) {
  const [kind, setKind] = useState('assets');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [value, setValue] = useState('');

  const add = async () => {
    const n = name.trim();
    const v = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    if (!n || !v) { toast.error('Add a name and a value'); return; }
    await addRow(kind, { name: n, kind: note.trim() || (kind === 'assets' ? 'Asset' : 'Debt'), value: v });
    setName(''); setNote(''); setValue('');
    toast.success(kind === 'assets' ? 'Asset added' : 'Liability added');
  };

  const rows = [
    ...assets.map(a => ({ ...a, _node: 'assets' })),
    ...liabs.map(l => ({ ...l, _node: 'liabs' })),
  ];

  return (
    <section style={{ ...card, padding: 24 }}>
      <h2 style={{ margin: '0 0 16px', fontFamily: serif, fontWeight: 400, fontSize: 22 }}>Balance sheet</h2>

      {rows.map(r => (
        <div key={`${r._node}-${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderTop: `1px solid ${C.line}` }}>
          <span style={{
            width: 7, height: 7, flex: '0 0 7px',
            borderRadius: r._node === 'assets' ? '50%' : 2,
            background: r._node === 'assets' ? C.accent : C.dim,
          }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
            <span style={{ fontSize: 11, color: C.muted }}>{r.kind}</span>
          </div>
          <span style={{ fontFamily: mono, fontSize: 13, whiteSpace: 'nowrap', color: r._node === 'assets' ? C.ink : C.red }}>
            {r._node === 'assets' ? money(r.value) : `-${money(r.value)}`}
          </span>
          <XDel size={15} onClick={() => removeRow(r._node, r.id)} />
        </div>
      ))}

      {!rows.length && <Empty>Nothing on the balance sheet yet — add a property, an offset account, a loan.</Empty>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
        <div style={{ ...segmentWrap, flex: '0 0 auto' }}>
          <div {...clickable(() => setKind('assets'))} style={segment(kind === 'assets')}>Asset</div>
          <div {...clickable(() => setKind('liabs'))} style={segment(kind === 'liabs')}>Liability</div>
        </div>
        <input value={name} onChange={e => setName(e.target.value)}
               placeholder={kind === 'assets' ? 'Home — suburb' : 'Home loan — lender'}
               style={{ ...input, flex: '1 1 160px' }} />
        <input value={note} onChange={e => setNote(e.target.value)}
               placeholder={kind === 'assets' ? 'Property' : 'P&I · 5.9%'}
               style={{ ...input, flex: '0 1 130px' }} />
        <input value={value} onChange={e => setValue(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && add()}
               placeholder="Value" style={{ ...input, flex: '0 1 100px' }} />
        <button onClick={add} style={btnDark}>Add</button>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.ink}`,
      }}>
        <span style={{ fontSize: 13 }}>Net worth</span>
        <span style={{ fontFamily: serif, fontSize: 26 }}>{money(totalAssets - totalLiabs)}</span>
      </div>
    </section>
  );
}

/* ─── Managed lists ─────────────────────────────────────────────────────── */

function CatsModal({ kind, close, lists, rows, onAdd, onRename, onRemove }) {
  const [draft, setDraft] = useState('');
  if (!kind) return null;

  const config = {
    expenses: {
      list: 'expCats', items: lists.expenses, title: 'Expense categories',
      sub: 'Rename, remove, or add categories — they apply to every entry and every total.',
      placeholder: 'Add a category…',
      empty: 'No expense categories yet — try “Software & subscriptions” or “Referral fees”.',
      countFor: it => `${rows.expenses.filter(r => r.cat === it.name).length} entries`,
    },
    income: {
      list: 'incCats', items: lists.income, title: 'Income categories',
      sub: 'Rename, remove, or add categories — they apply to every entry and every total.',
      placeholder: 'Add a category…',
      empty: 'No income categories yet — try “Commissions”, “Store sales”, or “Rent”.',
      countFor: it => `${rows.income.filter(r => r.cat === it.name).length} entries`,
    },
    buckets: {
      list: 'buckets', items: lists.buckets, title: 'Businesses',
      sub: 'Each business gets its own monthly P&L and annualised run rate.',
      placeholder: 'Add a business or income stream…',
      empty: 'No businesses yet — add one so entries can be split by where the money came from.',
      countFor: it => `${rows.income.filter(r => r.bucket === it.name).length + rows.expenses.filter(r => r.bucket === it.name).length} entries`,
    },
  }[kind];

  const submit = async () => {
    if (!draft.trim()) return;
    await onAdd(config.list, draft.trim());
    setDraft('');
  };

  return (
    <Modal isOpen title={config.title} onClose={close}>
      <div className="modal-body">
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{config.sub}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {config.items.map(it => (
            <div key={it.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input defaultValue={it.name}
                     onBlur={e => e.target.value.trim() && e.target.value !== it.name && onRename(config.list, it.id, e.target.value.trim())}
                     onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                     style={{ ...input, flex: 1, padding: '9px 11px', fontSize: 13 }} />
              <span style={{ fontFamily: mono, fontSize: 10.5, color: C.muted, flex: '0 0 66px', textAlign: 'right' }}>
                {config.countFor(it)}
              </span>
              <XDel onClick={() => onRemove(config.list, it.id)} />
            </div>
          ))}
          {!config.items.length && <Empty style={{ padding: 0 }}>{config.empty}</Empty>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
            <input value={draft} onChange={e => setDraft(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && submit()}
                   placeholder={config.placeholder}
                   style={{ ...input, flex: 1, padding: '10px 12px', fontSize: 13 }} />
            <button onClick={submit} style={{ ...btnDark, padding: '10px 18px' }}>Add</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
