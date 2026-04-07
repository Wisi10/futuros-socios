"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Loader2, LogOut } from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
);

// ─── Theme ──────────────────────────────────────────────────
const T = {
  bg:"#F5F0E8", bg2:"#EDE8DF", card:"#FFF", gold:"#B8963E", gd:"#8B6914",
  brn:"#3D2B1F", ch:"#2C2C2C", mu:"#8C7E6F", dv:"#D4C9B8",
  gr:"#2E7D32", rd:"#B71C1C",
  mo:"'Courier New',monospace", se:"'Georgia','Times New Roman',serif",
  sa:"system-ui,-apple-system,sans-serif"
};

// ─── Constants ──────────────────────────────────────────────
const WISI_INVESTMENT = 89888;
const WISI_PCT = 12.5;
const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ─── Helpers ────────────────────────────────────────────────
function fmt(n, decimals = 0) {
  if (n == null || isNaN(n)) return '$0';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '0%';
  return Number(n).toFixed(1) + '%';
}

function getMonth(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('-')) return parseInt(dateStr.substring(5, 7));
  if (dateStr.includes('/')) return parseInt(dateStr.split('/')[1]);
  return null;
}

function getDay(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('-')) return parseInt(dateStr.substring(8, 10));
  return null;
}

function cmpText(val, pct) {
  if (pct == null || isNaN(pct)) return '';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

// ─── Shared Styles ──────────────────────────────────────────
const S = {
  card: { background: T.card, border: `1px solid ${T.dv}`, borderRadius: 8, padding: 24 },
  divider: { borderTop: `1px solid ${T.dv}`, margin: '32px 0' },
  label: { color: T.mu, fontSize: 9, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6, fontFamily: T.sa },
  bigNum: { color: T.gold, fontSize: 24, fontWeight: 400, fontFamily: T.se, letterSpacing: -1, lineHeight: 1 },
  sub: { color: T.mu, fontSize: 11, marginTop: 6, fontFamily: T.sa },
  mono: { fontFamily: T.mo, fontWeight: 700, fontSize: 12 },
  rowLabel: { color: T.ch, fontSize: 12, fontFamily: T.sa },
  row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.bg2}` },
};

// ─── Custom Tooltip ─────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.dv}`, borderRadius: 8, padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,.08)' }}>
      <div style={{ color: T.gd, fontWeight: 700, fontSize: 12, fontFamily: T.sa }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: T.ch, fontSize: 12, fontFamily: T.sa }}>
          {p.name}: <b style={{ fontFamily: T.mo }}>${p.value?.toLocaleString()}</b>
        </div>
      ))}
    </div>
  );
};

// ─── Chart Options ──────────────────────────────────────────
const baseChartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'system-ui', size: 10 }, color: T.mu } },
    y: {
      grid: { color: 'rgba(184,150,62,0.1)' },
      ticks: { font: { family: 'system-ui', size: 10 }, color: T.mu, callback: v => `$${(v / 1000).toFixed(0)}K` },
    },
  },
};

// ─── KPI Card ───────────────────────────────────────────────
function KPI({ label, value, comparison, color }) {
  const valColor = color || T.gold;
  const cmpColor = comparison && comparison.startsWith('+') ? T.gr : comparison && comparison.startsWith('-') ? T.rd : T.mu;
  return (
    <div style={{ textAlign: 'center', flex: 1, minWidth: 130, padding: '12px 0' }}>
      <div style={S.label}>{label}</div>
      <div style={{ ...S.bigNum, color: valColor }}>{value}</div>
      {comparison && <div style={{ ...S.sub, color: cmpColor }}>{comparison}</div>}
    </div>
  );
}

// ─── Custom Legend ───────────────────────────────────────────
function ChartLegend({ items }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 3, borderRadius: 2, background: item.color, ...(item.dashed ? { backgroundImage: `repeating-linear-gradient(90deg, ${item.color} 0, ${item.color} 4px, transparent 4px, transparent 8px)`, background: 'transparent' } : {}) }} />
          <span style={{ fontSize: 10, color: T.mu, fontFamily: T.sa }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Login Screen ───────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Credenciales incorrectas');
      setLoading(false);
      return;
    }
    onLogin(data.session);
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 8,
    border: `1px solid ${T.dv}`, background: T.card, color: T.ch,
    fontSize: 13, fontFamily: T.sa, boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: T.bg }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 48, height: 48, background: T.gold, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ color: '#FFF', fontSize: 20, fontWeight: 700, fontFamily: T.se }}>F</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.ch, fontFamily: T.se, margin: 0 }}>Futuros Socios</h1>
          <p style={{ color: T.mu, fontSize: 11, marginTop: 4, fontFamily: T.sa }}>Dashboard de Inversion</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
          <input type="password" placeholder="Contrasena" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required />
          {error && <p style={{ color: T.rd, fontSize: 12, textAlign: 'center', margin: 0, fontFamily: T.sa }}>{error}</p>}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 12, borderRadius: 8, border: 'none', background: T.gold, color: '#FFF',
            fontSize: 12, fontWeight: 600, fontFamily: T.sa, cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase',
            opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Tab 1: El Complejo ─────────────────────────────────────
function TabComplejo({ data }) {
  const { bookings, courts, historicalSales } = data;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Current year bookings (exclude blocked)
  const yearBookings = useMemo(() =>
    bookings.filter(b => b.date && b.date.startsWith(String(currentYear)) && b.activity_type !== 'blocked'),
    [bookings, currentYear]
  );

  // Previous year bookings (exclude blocked)
  const prevYearBookings = useMemo(() =>
    bookings.filter(b => b.date && b.date.startsWith(String(currentYear - 1)) && b.activity_type !== 'blocked'),
    [bookings, currentYear]
  );

  // Revenue by month
  const monthlyRevenue = useMemo(() => {
    const months = Array(12).fill(0);
    yearBookings.forEach(b => {
      const m = getMonth(b.date);
      if (m) months[m - 1] += (b.price_eur || 0);
    });
    return months;
  }, [yearBookings]);

  const prevMonthlyRevenue = useMemo(() => {
    const months = Array(12).fill(0);
    prevYearBookings.forEach(b => {
      const m = getMonth(b.date);
      if (m) months[m - 1] += (b.price_eur || 0);
    });
    return months;
  }, [prevYearBookings]);

  // This month vs last month vs same month last year
  const thisMonthRev = monthlyRevenue[currentMonth - 1] || 0;
  const lastMonthRev = currentMonth > 1 ? (monthlyRevenue[currentMonth - 2] || 0) : 0;
  const sameMonthLastYear = prevMonthlyRevenue[currentMonth - 1] || 0;
  const momGrowth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev * 100) : 0;
  const yoyMonthGrowth = sameMonthLastYear > 0 ? ((thisMonthRev - sameMonthLastYear) / sameMonthLastYear * 100) : 0;

  // F7 vs F5
  const f7Revenue = useMemo(() => yearBookings.filter(b => b.type === 'F7').reduce((s, b) => s + (b.price_eur || 0), 0), [yearBookings]);
  const f5Revenue = useMemo(() => yearBookings.filter(b => b.type === 'F5').reduce((s, b) => s + (b.price_eur || 0), 0), [yearBookings]);
  const totalRevenue = f7Revenue + f5Revenue;

  // YTD comparison
  const prevYearSameMonths = prevYearBookings
    .filter(b => getMonth(b.date) <= currentMonth)
    .reduce((s, b) => s + (b.price_eur || 0), 0);
  const yoyGrowth = prevYearSameMonths > 0 ? ((totalRevenue - prevYearSameMonths) / prevYearSameMonths * 100) : 0;

  // Reservations this week vs last week
  const todayDate = now.toISOString().slice(0, 10);
  const dayOfWeek = now.getDay() || 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek + 1);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

  const thisWeekBookings = yearBookings.filter(b => b.date >= weekStart.toISOString().slice(0, 10) && b.date <= todayDate).length;
  const lastWeekBookings = yearBookings.filter(b => b.date >= lastWeekStart.toISOString().slice(0, 10) && b.date <= lastWeekEnd.toISOString().slice(0, 10)).length;
  const weekGrowth = lastWeekBookings > 0 ? ((thisWeekBookings - lastWeekBookings) / lastWeekBookings * 100) : 0;

  // Birthdays (bookings + historical_sales)
  const birthdaysByMonth = useMemo(() => {
    const months = Array(12).fill(0);
    yearBookings.filter(b => b.activity_type === 'cumpleanos').forEach(b => {
      const m = getMonth(b.date);
      if (m) months[m - 1]++;
    });
    (historicalSales || [])
      .filter(s => s.sale_date && s.sale_date.startsWith(String(currentYear)) && s.activity_type === 'cumpleanos')
      .forEach(s => {
        const m = getMonth(s.sale_date);
        if (m) months[m - 1]++;
      });
    return months;
  }, [yearBookings, historicalSales, currentYear]);

  const totalBirthdays = birthdaysByMonth.reduce((a, b) => a + b, 0);
  const avgBdayMonth = currentMonth > 0 ? totalBirthdays / currentMonth : 0;
  const bday2025Avg = 10; // ~118 in 2025 / 12

  // Occupancy by court
  const courtHours = useMemo(() => {
    const map = {};
    (courts || []).forEach(c => { map[c.id] = { name: c.name, type: c.type, hours: 0 }; });
    yearBookings.forEach(b => {
      (b.court_ids || []).forEach(cid => {
        if (map[cid]) map[cid].hours += (b.duration || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [yearBookings, courts]);

  // Previous month occupancy for comparison
  const prevMonthHours = useMemo(() => {
    const pm = currentMonth > 1 ? currentMonth - 1 : 12;
    return yearBookings
      .filter(b => getMonth(b.date) === pm)
      .reduce((s, b) => s + ((b.court_ids || []).length * (b.duration || 0)), 0);
  }, [yearBookings, currentMonth]);

  const thisMonthHours = useMemo(() => {
    return yearBookings
      .filter(b => getMonth(b.date) === currentMonth)
      .reduce((s, b) => s + ((b.court_ids || []).length * (b.duration || 0)), 0);
  }, [yearBookings, currentMonth]);

  const occGrowth = prevMonthHours > 0 ? ((thisMonthHours - prevMonthHours) / prevMonthHours * 100) : 0;

  // Activity breakdown (filtered, no blocked)
  const activityBreakdown = useMemo(() => {
    const map = {};
    yearBookings.forEach(b => {
      const t = b.activity_type || 'otro';
      map[t] = (map[t] || 0) + (b.price_eur || 0);
    });
    return map;
  }, [yearBookings]);

  const activityTotal = Object.values(activityBreakdown).reduce((s, v) => s + v, 0);
  const activityLabels = { alquiler: 'Alquiler', cumpleanos: 'Cumpleanos', academia: 'Academia', torneo: 'Torneo', evento: 'Evento', otro: 'Otro' };
  const activityColors = ['#B8963E', '#3D2B1F', '#D4C9B8', '#8B6914', '#8C7E6F', '#A89A8A'];

  const totalBookingsCount = yearBookings.length;

  return (
    <div className="fade-in">
      {/* KPIs Row */}
      <div style={{ ...S.card, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0 }}>
        <KPI
          label={`INGRESOS ${MONTHS_ES[currentMonth - 1].toUpperCase()}`}
          value={fmt(thisMonthRev)}
          comparison={`${cmpText(thisMonthRev, momGrowth)} vs mes ant. | ${cmpText(thisMonthRev, yoyMonthGrowth)} vs ${MONTHS_ES[currentMonth - 1]} ${currentYear - 1}`}
        />
        <div style={{ width: 1, background: T.dv, alignSelf: 'stretch', margin: '8px 0' }} />
        <KPI
          label="INGRESOS YTD"
          value={fmt(totalRevenue)}
          comparison={`${cmpText(totalRevenue, yoyGrowth)} vs ${currentYear - 1}`}
        />
      </div>

      <div style={{ ...S.card, marginTop: 12, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0 }}>
        <KPI
          label="RESERVAS SEMANA"
          value={thisWeekBookings.toString()}
          comparison={`${cmpText(thisWeekBookings, weekGrowth)} vs semana ant.`}
          color={T.ch}
        />
        <div style={{ width: 1, background: T.dv, alignSelf: 'stretch', margin: '8px 0' }} />
        <KPI
          label="CUMPLEANOS YTD"
          value={totalBirthdays.toString()}
          comparison={`${avgBdayMonth.toFixed(1)}/mes (2025: ${bday2025Avg}/mes)`}
          color={T.ch}
        />
        <div style={{ width: 1, background: T.dv, alignSelf: 'stretch', margin: '8px 0' }} />
        <KPI
          label={`OCUPACION ${MONTHS_ES[currentMonth - 1].toUpperCase()}`}
          value={`${thisMonthHours}h`}
          comparison={`${cmpText(thisMonthHours, occGrowth)} vs mes ant.`}
          color={T.ch}
        />
      </div>

      {/* F7 vs F5 */}
      <div style={S.divider} />
      <div style={S.card}>
        <div style={S.label}>F7 VS F5</div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontFamily: T.sa, fontWeight: 600, color: T.ch }}>F7</span>
            <span style={{ fontSize: 12, fontFamily: T.mo, color: T.ch }}>{fmt(f7Revenue)} ({totalRevenue > 0 ? fmtPct(f7Revenue / totalRevenue * 100) : '0%'})</span>
          </div>
          <div style={{ background: T.bg2, borderRadius: 20, height: 5 }}>
            <div style={{ width: `${totalRevenue > 0 ? f7Revenue / totalRevenue * 100 : 0}%`, height: '100%', background: T.gold, borderRadius: 20 }} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontFamily: T.sa, fontWeight: 600, color: T.ch }}>F5</span>
            <span style={{ fontSize: 12, fontFamily: T.mo, color: T.ch }}>{fmt(f5Revenue)} ({totalRevenue > 0 ? fmtPct(f5Revenue / totalRevenue * 100) : '0%'})</span>
          </div>
          <div style={{ background: T.bg2, borderRadius: 20, height: 5 }}>
            <div style={{ width: `${totalRevenue > 0 ? f5Revenue / totalRevenue * 100 : 0}%`, height: '100%', background: T.dv, borderRadius: 20 }} />
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div style={S.divider} />
      <div style={S.card}>
        <div style={S.label}>TENDENCIA MENSUAL — {currentYear}</div>
        <div style={{ height: 200, marginTop: 16 }}>
          <Bar
            data={{
              labels: MONTHS_ES,
              datasets: [{
                data: monthlyRevenue,
                backgroundColor: monthlyRevenue.map((_, i) => i < currentMonth ? T.gold : 'rgba(184,150,62,0.15)'),
                borderRadius: 4,
                barThickness: 16,
              }]
            }}
            options={{
              ...baseChartOpts,
              plugins: { ...baseChartOpts.plugins, tooltip: { enabled: true, callbacks: { label: c => `$${c.raw?.toLocaleString()}` } } },
            }}
          />
        </div>
      </div>

      {/* Birthdays by Month */}
      <div style={S.divider} />
      <div style={S.card}>
        <div style={S.label}>CUMPLEANOS POR MES — {currentYear}</div>
        <div style={{ height: 160, marginTop: 16 }}>
          <Bar
            data={{
              labels: MONTHS_ES,
              datasets: [{
                data: birthdaysByMonth,
                backgroundColor: T.brn,
                borderRadius: 4,
                barThickness: 12,
              }]
            }}
            options={{
              ...baseChartOpts,
              scales: {
                ...baseChartOpts.scales,
                y: { ...baseChartOpts.scales.y, ticks: { ...baseChartOpts.scales.y.ticks, stepSize: 1, callback: v => v } },
              },
              plugins: { ...baseChartOpts.plugins, tooltip: { enabled: true, callbacks: { label: c => `${c.raw} cumpleanos` } } },
            }}
          />
        </div>
      </div>

      {/* Court Occupancy */}
      <div style={S.divider} />
      <div style={S.card}>
        <div style={S.label}>OCUPACION POR CANCHA — {currentYear}</div>
        <div style={{ marginTop: 16 }}>
          {courtHours.map((c, i) => {
            const max = courtHours[0]?.hours || 1;
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontFamily: T.sa, color: T.ch }}>{c.name} <span style={{ color: T.mu }}>({c.type})</span></span>
                  <span style={S.mono}>{c.hours}h</span>
                </div>
                <div style={{ background: T.bg2, borderRadius: 20, height: 5 }}>
                  <div style={{ width: `${(c.hours / max) * 100}%`, height: '100%', borderRadius: 20, background: c.type === 'F7' ? T.gold : T.dv }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Breakdown */}
      <div style={S.divider} />
      <div style={S.card}>
        <div style={S.label}>TIPO DE ACTIVIDAD</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 16 }}>
          <div style={{ width: 120, height: 120 }}>
            <Doughnut
              data={{
                labels: Object.keys(activityBreakdown).map(k => activityLabels[k] || k),
                datasets: [{
                  data: Object.values(activityBreakdown),
                  backgroundColor: activityColors.slice(0, Object.keys(activityBreakdown).length),
                  borderWidth: 0,
                }]
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, cutout: '65%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            {Object.entries(activityBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([key, val], i) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: activityColors[i], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, color: T.ch, fontFamily: T.sa }}>{activityLabels[key] || key}</span>
                  <span style={S.mono}>{fmt(val)}</span>
                  <span style={{ fontSize: 10, color: T.mu, fontFamily: T.sa, minWidth: 36, textAlign: 'right' }}>{activityTotal > 0 ? fmtPct(val / activityTotal * 100) : '0%'}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Mi Participacion ────────────────────────────────
function TabParticipacion({ data }) {
  const { dividends, roi, totales } = data;
  const now = new Date();
  const currentYear = now.getFullYear();
  const completedMonths = now.getMonth() + 1;

  const allDivs = [...(dividends[2024] || []), ...(dividends[2025] || []), ...(dividends[2026] || [])];
  const totalDividends = roi?.dividendosRecibidos || allDivs.reduce((s, d) => s + d.wisiAmount, 0);
  const invested = roi?.montoInvertido || WISI_INVESTMENT;
  const roiPct = roi?.roiPct || (invested > 0 ? (totalDividends / invested * 100) : 0);
  const paybackPct = Math.min(100, (totalDividends / invested) * 100);

  const ytdDivs = (dividends[currentYear] || []).reduce((s, d) => s + d.wisiAmount, 0);
  const prevYearSameMonths = (dividends[currentYear - 1] || [])
    .filter(d => { const m = getMonth(d.fecha); return m && m <= completedMonths; })
    .reduce((s, d) => s + d.wisiAmount, 0);

  const ytdGrowth = prevYearSameMonths > 0 ? ((ytdDivs - prevYearSameMonths) / prevYearSameMonths * 100) : 0;
  const avgMonthly = completedMonths > 0 ? ytdDivs / completedMonths : 0;
  const remaining = invested - totalDividends;
  const monthsToPayback = avgMonthly > 0 ? Math.ceil(remaining / avgMonthly) : null;

  // Monthly dividends (current year)
  const monthlyDivs = useMemo(() => {
    const months = Array(12).fill(0);
    (dividends[currentYear] || []).forEach(d => {
      const m = getMonth(d.fecha);
      if (m) months[m - 1] += d.wisiAmount;
    });
    return months;
  }, [dividends, currentYear]);

  // Yearly totals
  const yearlyTotals = [
    totales?.total2024 || (dividends[2024] || []).reduce((s, d) => s + d.wisiAmount, 0),
    totales?.total2025 || (dividends[2025] || []).reduce((s, d) => s + d.wisiAmount, 0),
    totales?.total2026 || (dividends[2026] || []).reduce((s, d) => s + d.wisiAmount, 0),
  ];

  return (
    <div className="fade-in">
      {/* Hero */}
      <div style={{ background: T.brn, borderRadius: 8, padding: 24, color: '#FFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 3, opacity: 0.6, fontFamily: T.sa }}>WISI — {WISI_PCT}%</span>
          <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 10, fontFamily: T.sa }}>{currentYear}</span>
        </div>
        <div style={{ fontSize: 32, fontWeight: 400, fontFamily: T.se, letterSpacing: -1, lineHeight: 1, marginBottom: 4 }}>{fmt(totalDividends)}</div>
        <div style={{ fontSize: 11, opacity: 0.6, fontFamily: T.sa }}>Total dividendos recibidos</div>
        <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
          <div>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 2, fontFamily: T.sa }}>Invertido</div>
            <div style={{ fontFamily: T.mo, fontWeight: 700, fontSize: 14, marginTop: 2 }}>{fmt(invested)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 2, fontFamily: T.sa }}>ROI</div>
            <div style={{ fontFamily: T.se, fontWeight: 400, fontSize: 14, marginTop: 2, color: '#D4B96A' }}>{fmtPct(roiPct)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 2, fontFamily: T.sa }}>Neto</div>
            <div style={{ fontFamily: T.mo, fontWeight: 700, fontSize: 14, marginTop: 2, color: remaining > 0 ? '#D4B96A' : '#81C784' }}>
              {remaining > 0 ? `-${fmt(remaining)}` : `+${fmt(Math.abs(remaining))}`}
            </div>
          </div>
        </div>
      </div>

      {/* Payback */}
      <div style={S.divider} />
      <div style={S.card}>
        <div style={S.label}>PAYBACK</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: T.mu, fontFamily: T.sa }}>{fmt(totalDividends)} de {fmt(invested)}</span>
          <span style={{ fontSize: 11, fontFamily: T.mo, fontWeight: 700, color: T.gold }}>{fmtPct(paybackPct)}</span>
        </div>
        <div style={{ background: T.bg2, borderRadius: 20, height: 5 }}>
          <div style={{ width: `${paybackPct}%`, height: '100%', background: T.gold, borderRadius: 20, transition: 'width 1s ease' }} />
        </div>
        {monthsToPayback != null && remaining > 0 && (
          <div style={{ ...S.sub, marginTop: 8 }}>~{monthsToPayback} meses restantes al ritmo actual ({fmt(avgMonthly)}/mes)</div>
        )}
      </div>

      {/* YTD KPIs */}
      <div style={{ ...S.card, marginTop: 12, display: 'flex', justifyContent: 'center' }}>
        <KPI
          label={`DIVIDENDOS ${currentYear}`}
          value={fmt(ytdDivs)}
          comparison={`${cmpText(ytdDivs, ytdGrowth)} vs ${currentYear - 1}`}
        />
        <div style={{ width: 1, background: T.dv, alignSelf: 'stretch', margin: '8px 0' }} />
        <KPI label="PROMEDIO/MES" value={fmt(avgMonthly)} comparison={`${completedMonths} meses`} />
      </div>

      {/* Monthly Dividends Chart */}
      <div style={S.divider} />
      <div style={S.card}>
        <div style={S.label}>DIVIDENDOS MENSUALES {currentYear} — WISI</div>
        <div style={{ height: 180, marginTop: 16 }}>
          <Bar
            data={{
              labels: MONTHS_ES,
              datasets: [{
                data: monthlyDivs,
                backgroundColor: monthlyDivs.map((_, i) => i < completedMonths ? T.gold : 'rgba(184,150,62,0.15)'),
                borderRadius: 4,
                barThickness: 16,
              }]
            }}
            options={{
              ...baseChartOpts,
              scales: {
                ...baseChartOpts.scales,
                y: { ...baseChartOpts.scales.y, ticks: { ...baseChartOpts.scales.y.ticks, callback: v => `$${v.toLocaleString()}` } },
              },
              plugins: { ...baseChartOpts.plugins, tooltip: { enabled: true, callbacks: { label: c => `$${c.raw?.toLocaleString()}` } } },
            }}
          />
        </div>
      </div>

      {/* Year over Year */}
      <div style={S.divider} />
      <div style={S.card}>
        <div style={S.label}>COMPARACION ANUAL — WISI</div>
        <div style={{ height: 180, marginTop: 16 }}>
          <Bar
            data={{
              labels: ['2024', '2025', '2026'],
              datasets: [{
                data: yearlyTotals,
                backgroundColor: [T.dv, T.gold, T.gd],
                borderRadius: 6,
                barThickness: 36,
              }]
            }}
            options={{
              ...baseChartOpts,
              plugins: { ...baseChartOpts.plugins, tooltip: { enabled: true, callbacks: { label: c => `$${c.raw?.toLocaleString()}` } } },
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          {['2024', '2025', '2026'].map((y, i) => (
            <div key={y} style={{ textAlign: 'center' }}>
              <div style={S.mono}>{fmt(yearlyTotals[i])}</div>
              <div style={{ fontSize: 10, color: T.mu, marginTop: 2, fontFamily: T.sa }}>{y}{i === 2 ? ' (YTD)' : ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Payments */}
      <div style={S.divider} />
      <div style={S.card}>
        <div style={S.label}>ULTIMOS PAGOS</div>
        <div style={{ marginTop: 12 }}>
          {[...(dividends[currentYear] || [])].reverse().slice(0, 8).map((d, i) => (
            <div key={i} style={S.row}>
              <span style={{ ...S.rowLabel, color: T.mu }}>{d.fecha}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: T.mu, fontFamily: T.sa }}>{fmt(d.montoTotal)} total</span>
                <span style={{ fontSize: 10, color: T.mu }}>→</span>
                <span style={S.mono}>{fmt(d.wisiAmount, 2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Proyecciones ────────────────────────────────────
function TabProyecciones({ data }) {
  const { dividends, roi, totales, bookings, courts, historicalSales } = data;
  const now = new Date();
  const currentYear = now.getFullYear();
  const completedMonths = now.getMonth() + 1;

  const invested = roi?.montoInvertido || WISI_INVESTMENT;
  const totalDivs = roi?.dividendosRecibidos || [
    ...(dividends[2024] || []), ...(dividends[2025] || []), ...(dividends[2026] || []),
  ].reduce((s, d) => s + d.wisiAmount, 0);

  const ytdDivs = (dividends[currentYear] || []).reduce((s, d) => s + d.wisiAmount, 0);
  const currentMonthly = completedMonths > 0 ? ytdDivs / completedMonths : 0;

  // 3 Scenarios
  const scenarios = [
    { name: 'Conservador', monthly: 1100, color: T.dv, desc: 'Ritmo minimo sostenible' },
    { name: 'Base', monthly: Math.round(currentMonthly || 1530), color: T.gold, desc: 'Ritmo actual proyectado' },
    { name: 'Optimista', monthly: 2200, color: T.gd, desc: 'Con mejoras operativas' },
  ];

  // Payback curves
  const maxMonths = 60;
  const paybackCurves = scenarios.map(s => {
    const curve = [];
    let cumulative = totalDivs;
    for (let m = 0; m <= maxMonths; m++) {
      curve.push(cumulative);
      cumulative += s.monthly;
    }
    return curve;
  });

  // ROI projections
  const roiProjections = scenarios.map(s => ({
    ...s,
    roi1y: ((totalDivs + s.monthly * 12) / invested * 100),
    roi2y: ((totalDivs + s.monthly * 24) / invested * 100),
    roi3y: ((totalDivs + s.monthly * 36) / invested * 100),
    paybackMonths: Math.max(0, Math.ceil((invested - totalDivs) / s.monthly)),
  }));

  // Underutilized courts
  const yearBookings = bookings.filter(b => b.date && b.date.startsWith(String(currentYear)) && b.activity_type !== 'blocked');
  const courtHoursMap = {};
  (courts || []).forEach(c => { courtHoursMap[c.id] = { name: c.name, type: c.type, hours: 0 }; });
  yearBookings.forEach(b => {
    (b.court_ids || []).forEach(cid => {
      if (courtHoursMap[cid]) courtHoursMap[cid].hours += (b.duration || 0);
    });
  });
  const courtList = Object.values(courtHoursMap).sort((a, b) => a.hours - b.hours);
  const underutilized = courtList.filter(c => c.hours < 60);

  // Birthdays
  const currentBdays = yearBookings.filter(b => b.activity_type === 'cumpleanos').length
    + (historicalSales || []).filter(s => s.sale_date && s.sale_date.startsWith(String(currentYear)) && s.activity_type === 'cumpleanos').length;
  const bdayMonthlyAvg = completedMonths > 0 ? currentBdays / completedMonths : 0;

  return (
    <div className="fade-in">
      {/* Scenarios */}
      {roiProjections.map((s, i) => (
        <div key={i} style={{ ...S.card, borderLeft: `4px solid ${s.color}`, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ch, fontFamily: T.sa }}>{s.name}</div>
              <div style={{ fontSize: 11, color: T.mu, fontFamily: T.sa, marginTop: 2 }}>{s.desc}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 20, fontWeight: 400, fontFamily: T.se, color: s.color, letterSpacing: -1 }}>{fmt(s.monthly)}</span>
              <span style={{ fontSize: 10, color: T.mu, fontFamily: T.sa }}>/mes</span>
            </div>
          </div>
          <div style={{ display: 'flex', marginTop: 16, borderTop: `1px solid ${T.bg2}`, paddingTop: 12 }}>
            {[
              { label: 'PAYBACK', value: s.paybackMonths > 0 ? `${s.paybackMonths}m` : 'Listo' },
              { label: 'ROI 1A', value: fmtPct(s.roi1y) },
              { label: 'ROI 2A', value: fmtPct(s.roi2y) },
              { label: 'ROI 3A', value: fmtPct(s.roi3y) },
            ].map((item, j) => (
              <div key={j} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 2, color: T.mu, fontFamily: T.sa }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ch, fontFamily: T.se, marginTop: 4 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Payback Curve */}
      <div style={S.divider} />
      <div style={S.card}>
        <div style={S.label}>CURVA DE PAYBACK — hasta recuperar {fmt(invested)}</div>
        <div style={{ height: 220, marginTop: 16 }}>
          <Line
            data={{
              labels: Array.from({ length: maxMonths + 1 }, (_, i) => {
                if (i % 6 === 0) {
                  const d = new Date(now);
                  d.setMonth(d.getMonth() + i);
                  return i === 0 ? 'Hoy' : `${MONTHS_ES[d.getMonth()]} '${d.getFullYear().toString().slice(2)}`;
                }
                return '';
              }),
              datasets: [
                {
                  label: 'Inversion',
                  data: Array(maxMonths + 1).fill(invested),
                  borderColor: '#B71C1C55',
                  borderDash: [4, 4],
                  borderWidth: 1.5,
                  pointRadius: 0,
                  fill: false,
                },
                ...scenarios.map((s, i) => ({
                  label: s.name,
                  data: paybackCurves[i],
                  borderColor: s.color,
                  borderWidth: 2,
                  pointRadius: 0,
                  fill: false,
                  tension: 0.3,
                })),
              ]
            }}
            options={{
              ...baseChartOpts,
              plugins: {
                ...baseChartOpts.plugins,
                legend: { display: false },
                tooltip: { enabled: true, callbacks: { label: c => `${c.dataset.label}: $${c.raw?.toLocaleString()}` } },
              },
              scales: {
                ...baseChartOpts.scales,
                y: {
                  ...baseChartOpts.scales.y,
                  min: 30000,
                  max: 100000,
                },
              },
            }}
          />
        </div>
        <ChartLegend items={[
          { label: 'Inversion', color: T.rd, dashed: true },
          { label: 'Conservador', color: T.dv },
          { label: 'Base', color: T.gold },
          { label: 'Optimista', color: T.gd },
        ]} />
      </div>

      {/* Levers */}
      <div style={S.divider} />
      <div style={S.card}>
        <div style={S.label}>PALANCAS DE CRECIMIENTO</div>
        <div style={{ marginTop: 16 }}>
          {/* Birthday */}
          <div style={S.row}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ch, fontFamily: T.sa }}>Mas Cumpleanos</div>
              <div style={{ fontSize: 11, color: T.mu, fontFamily: T.sa, marginTop: 2 }}>
                Actual: {bdayMonthlyAvg.toFixed(1)}/mes. 2025: ~10/mes. Cada uno = ~REF 300-500.
              </div>
            </div>
          </div>

          {/* Underutilized courts */}
          {underutilized.length > 0 && (
            <div style={S.row}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.ch, fontFamily: T.sa }}>Activar Canchas Subutilizadas</div>
                <div style={{ fontSize: 11, color: T.mu, fontFamily: T.sa, marginTop: 2 }}>
                  {underutilized.map(c => c.name).join(', ')} con &lt;60h YTD. Potencial: +REF 500-1,000/mes.
                </div>
              </div>
            </div>
          )}

          {/* Collection */}
          <div style={S.row}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ch, fontFamily: T.sa }}>Cobrar Pendientes</div>
              <div style={{ fontSize: 11, color: T.mu, fontFamily: T.sa, marginTop: 2 }}>
                Reducir morosidad mejora el flujo directo de dividendos.
              </div>
            </div>
          </div>

          {/* Cantina */}
          <div style={{ ...S.row, borderBottom: 'none' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ch, fontFamily: T.sa }}>Cantina + Eventos</div>
              <div style={{ fontSize: 11, color: T.mu, fontFamily: T.sa, marginTop: 2 }}>
                Ingresos de cantina y torneos suman al fondo distribuible.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────
export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchData = useCallback(async (token) => {
    setDataLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Error cargando datos');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.access_token) fetchData(session.access_token);
  }, [session, fetchData]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setData(null);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
        <Loader2 size={20} className="animate-spin" style={{ color: T.gold }} />
      </div>
    );
  }

  if (!session) return <LoginScreen onLogin={(s) => setSession(s)} />;

  const tabs = ['EL COMPLEJO', 'MI PARTE', 'PROYECCIONES'];

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: T.bg, borderBottom: `1px solid ${T.dv}` }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: T.gold, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#FFF', fontSize: 14, fontWeight: 700, fontFamily: T.se }}>F</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ch, fontFamily: T.sa, lineHeight: 1.2 }}>Futuros Socios</div>
              <div style={{ fontSize: 9, color: T.mu, letterSpacing: 2, textTransform: 'uppercase', fontFamily: T.sa }}>WISI — {WISI_PCT}%</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
            <LogOut size={16} color={T.mu} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', padding: '0 16px' }}>
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              style={{
                background: 'none', border: 'none',
                color: activeTab === i ? T.gold : T.mu,
                padding: '10px 14px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                borderBottom: activeTab === i ? `2px solid ${T.gold}` : '2px solid transparent',
                letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: T.sa,
                whiteSpace: 'nowrap', flex: 1, textAlign: 'center',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 80px' }}>
        {dataLoading && !data && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: T.gold, marginBottom: 12 }} />
            <span style={{ fontSize: 12, color: T.mu, fontFamily: T.sa }}>Cargando datos...</span>
          </div>
        )}

        {error && (
          <div style={{ ...S.card, borderColor: T.rd, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: T.rd, margin: 0, fontFamily: T.sa }}>{error}</p>
            <button onClick={() => fetchData(session.access_token)} style={{ fontSize: 11, color: T.rd, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', marginTop: 8, fontFamily: T.sa }}>
              Reintentar
            </button>
          </div>
        )}

        {data && !dataLoading && (
          <>
            {activeTab === 0 && <TabComplejo data={data} />}
            {activeTab === 1 && <TabParticipacion data={data} />}
            {activeTab === 2 && <TabProyecciones data={data} />}
          </>
        )}
      </main>
    </div>
  );
}
