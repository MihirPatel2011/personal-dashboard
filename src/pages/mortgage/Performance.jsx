import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useData } from '../../context/DataContext';
import { formatCurrency, fmtShortDate, isThisYear, isThisMonth } from '../../utils';
import { ACTIVE_STAGES } from '../../constants';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TEAL  = '#3DBBA0';
const GOLD  = '#C8922A';
const BLUE  = '#7B8FDE';
const AMBER = '#E8924A';

const STAGE_PIE_COLORS = [TEAL, GOLD, BLUE, AMBER, '#A370DB', '#E06B6B', '#5BC4B4', '#C4C45B'];

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)',
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4
    }}>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || 'var(--ink)', lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sub}</div>}
    </div>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--ink-3)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--ink)', fontWeight: 600 }}>
          {p.name}: {format === 'currency' ? formatCurrency(p.value, true) : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── Performance Page ──────────────────────────────────────────────────────────
export default function Performance() {
  const { loans } = useData();

  const stats = useMemo(() => {
    const settled      = loans.filter(l => l.stage === 'Settled');
    const active       = loans.filter(l => ACTIVE_STAGES.includes(l.stage));
    const thisYearSett = settled.filter(l => isThisYear(l.settlementDate));
    const thisMonSett  = settled.filter(l => isThisMonth(l.settlementDate));

    const commYTD  = thisYearSett.reduce((s, l) => s + (Number(l.comms) || 0), 0);
    const commMTD  = thisMonSett.reduce((s, l)  => s + (Number(l.comms) || 0), 0);
    const commPaid = loans.filter(l => l.datePaid).reduce((s, l) => s + (Number(l.comms) || 0), 0);
    const volYTD   = thisYearSett.reduce((s, l) => s + (Number(l.value) || 0), 0);
    const pipeline = active.reduce((s, l) => s + (Number(l.value) || 0), 0);

    return { commYTD, commMTD, commPaid, volYTD, pipeline, settledCount: thisYearSett.length, activeCount: active.length };
  }, [loans]);

  // Monthly settlements bar chart
  const monthlyData = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, i) => ({ month: MONTH_NAMES[i], settlements: 0, volume: 0, commission: 0 }));
    const year = new Date().getFullYear();
    loans.filter(l => l.stage === 'Settled' && l.settlementDate).forEach(l => {
      const d = new Date(l.settlementDate);
      if (d.getFullYear() === year) {
        const m = d.getMonth();
        buckets[m].settlements += 1;
        buckets[m].volume      += Number(l.value) || 0;
        buckets[m].commission  += Number(l.comms) || 0;
      }
    });
    return buckets;
  }, [loans]);

  // Stage distribution pie
  const stageData = useMemo(() => {
    const counts = {};
    loans.forEach(l => { if (l.stage) counts[l.stage] = (counts[l.stage] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [loans]);

  // Lender distribution
  const lenderData = useMemo(() => {
    const counts = {};
    loans.forEach(l => { if (l.lender) counts[l.lender] = (counts[l.lender] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [loans]);

  // Commission trend (trailing 6 months)
  const commTrend = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLoans = loans.filter(l => {
        if (!l.datePaid) return false;
        const pd = new Date(l.datePaid);
        return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
      });
      result.push({
        month: MONTH_NAMES[d.getMonth()],
        commission: monthLoans.reduce((s, l) => s + (Number(l.comms) || 0), 0),
      });
    }
    return result;
  }, [loans]);

  if (loans.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--ink-3)', fontSize: 14 }}>
        No loan data yet — add loans to see performance metrics.
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
        <StatCard label="Commission YTD"    value={formatCurrency(stats.commYTD, true)}   color={TEAL}/>
        <StatCard label="Commission MTD"    value={formatCurrency(stats.commMTD, true)}   color={TEAL}/>
        <StatCard label="Commission Paid"   value={formatCurrency(stats.commPaid, true)}  color={GOLD}/>
        <StatCard label="Volume YTD"        value={formatCurrency(stats.volYTD, true)}    color={BLUE}/>
        <StatCard label="Pipeline Value"    value={formatCurrency(stats.pipeline, true)}  color={AMBER}/>
        <StatCard label="Settled YTD"       value={stats.settledCount} sub="loans this year"  color="var(--ink)"/>
        <StatCard label="Active Loans"      value={stats.activeCount}  sub="in pipeline"       color="var(--ink)"/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Monthly Settlements */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>Monthly Settlements ({new Date().getFullYear()})</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="settlements" name="Settlements" fill={TEAL} radius={[3, 3, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Commission Trend */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>Commission Paid — Last 6 Months</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={commTrend} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}/>
              <Tooltip content={<ChartTooltip format="currency"/>}/>
              <Line dataKey="commission" name="Commission" stroke={GOLD} strokeWidth={2} dot={{ fill: GOLD, r: 3 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Stage Distribution */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>Loan Stage Distribution</div>
          {stageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {stageData.map((_, i) => <Cell key={i} fill={STAGE_PIE_COLORS[i % STAGE_PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip content={<ChartTooltip/>}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No data</div>
          )}
        </div>

        {/* Lender Breakdown */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>Loans by Lender</div>
          {lenderData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={lenderData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} width={80}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="value" name="Loans" fill={BLUE} radius={[0, 3, 3, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No data</div>
          )}
        </div>
      </div>
    </div>
  );
}
