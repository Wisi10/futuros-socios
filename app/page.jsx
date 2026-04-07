"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Building2, User, TrendingUp, LogOut, Loader2,
  DollarSign, Calendar, BarChart3, Target, ArrowUpRight,
  ArrowDownRight, Trophy, Zap, ChevronRight
} from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
);

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

function getYear(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    return parseInt(parts[2]);
  }
  return parseInt(dateStr.substring(0, 4));
}

function getMonth(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('-')) return parseInt(dateStr.substring(5, 7));
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    return parseInt(parts[1]);
  }
  return null;
}

// ─── Login Screen ──────────────────────────────────────────
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-brand-cream-light">
      <div className="w-full max-w-sm fade-in">
        <div className="text-center mb-10">
          <div className="w-16 h-16 gold-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-brand-brown">Futuros Socios</h1>
          <p className="text-brand-cream-dark mt-1 text-sm">Dashboard de Inversi&oacute;n</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-cream bg-white text-brand-brown placeholder-brand-cream-dark text-sm"
            required
          />
          <input
            type="password"
            placeholder="Contrase&ntilde;a"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-cream bg-white text-brand-brown placeholder-brand-cream-dark text-sm"
            required
          />
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl gold-gradient text-white font-semibold text-sm shadow-md hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, trend, color = 'gold' }) {
  const colors = {
    gold: 'from-amber-50 to-orange-50 border-amber-200',
    green: 'from-emerald-50 to-green-50 border-emerald-200',
    blue: 'from-blue-50 to-indigo-50 border-blue-200',
    purple: 'from-purple-50 to-fuchsia-50 border-purple-200',
  };
  return (
    <div className={`rounded-2xl p-4 bg-gradient-to-br ${colors[color]} border transition hover:shadow-md`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-brand-cream-dark uppercase tracking-wide">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-brand-cream-dark" />}
      </div>
      <div className="text-xl font-bold text-brand-brown">{value}</div>
      {(sub || trend != null) && (
        <div className="flex items-center gap-1 mt-1">
          {trend != null && (
            trend >= 0
              ? <ArrowUpRight className="w-3 h-3 text-emerald-600" />
              : <ArrowDownRight className="w-3 h-3 text-red-500" />
          )}
          <span className={`text-xs ${trend != null && trend >= 0 ? 'text-emerald-600' : trend != null ? 'text-red-500' : 'text-brand-cream-dark'}`}>
            {sub}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-brand-brown">{title}</h2>
      {subtitle && <p className="text-xs text-brand-cream-dark mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Chart defaults ──────────────────────────────────────────
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#3D2B1F',
      titleFont: { family: 'Georgia' },
      bodyFont: { family: 'Georgia' },
      cornerRadius: 8,
      padding: 10,
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { family: 'Georgia', size: 11 }, color: '#A89A8A' }
    },
    y: {
      grid: { color: 'rgba(196,184,168,0.2)' },
      ticks: { font: { family: 'Georgia', size: 11 }, color: '#A89A8A' }
    }
  }
};

// ─── Tab 1: El Complejo ──────────────────────────────────────
function TabComplejo({ data }) {
  const { bookings, courts, historicalSales } = data;
  const now = new Date();
  const currentYear = now.getFullYear();

  // Current year bookings
  const yearBookings = useMemo(() =>
    bookings.filter(b => b.date && b.date.startsWith(String(currentYear))),
    [bookings, currentYear]
  );

  // Revenue by month (current year)
  const monthlyRevenue = useMemo(() => {
    const months = Array(12).fill(0);
    yearBookings.forEach(b => {
      const m = getMonth(b.date);
      if (m) months[m - 1] += (b.price_eur || 0);
    });
    return months;
  }, [yearBookings]);

  // F7 vs F5
  const f7Revenue = useMemo(() => yearBookings.filter(b => b.type === 'F7').reduce((s, b) => s + (b.price_eur || 0), 0), [yearBookings]);
  const f5Revenue = useMemo(() => yearBookings.filter(b => b.type === 'F5').reduce((s, b) => s + (b.price_eur || 0), 0), [yearBookings]);
  const totalRevenue = f7Revenue + f5Revenue;

  // Birthdays by month (bookings + historical_sales)
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

  // Activity breakdown
  const activityBreakdown = useMemo(() => {
    const map = {};
    yearBookings.forEach(b => {
      const t = b.activity_type || 'otro';
      map[t] = (map[t] || 0) + (b.price_eur || 0);
    });
    return map;
  }, [yearBookings]);

  const totalBookingsCount = yearBookings.length;
  const totalBirthdays = birthdaysByMonth.reduce((a, b) => a + b, 0);
  const completedMonths = now.getMonth() + 1;
  const avgMonthly = completedMonths > 0 ? totalRevenue / completedMonths : 0;

  // Previous year comparison
  const prevYearBookings = useMemo(() =>
    bookings.filter(b => b.date && b.date.startsWith(String(currentYear - 1))),
    [bookings, currentYear]
  );
  const prevYearRev = prevYearBookings.reduce((s, b) => s + (b.price_eur || 0), 0);
  const prevYearSameMonths = prevYearBookings
    .filter(b => getMonth(b.date) <= completedMonths)
    .reduce((s, b) => s + (b.price_eur || 0), 0);
  const yoyGrowth = prevYearSameMonths > 0 ? ((totalRevenue - prevYearSameMonths) / prevYearSameMonths * 100) : 0;

  const activityLabels = { alquiler: 'Alquiler', cumpleanos: 'Cumpleanos', academia: 'Academia', torneo: 'Torneo', evento: 'Evento' };
  const activityColors = ['#B8963E', '#3D2B1F', '#C4B8A8', '#D4B96A', '#8B7355'];

  return (
    <div className="space-y-6 fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Ingresos YTD" value={fmt(totalRevenue)} sub={`${fmtPct(yoyGrowth)} vs ${currentYear - 1}`} icon={DollarSign} trend={yoyGrowth} color="gold" />
        <StatCard label="Promedio/Mes" value={fmt(avgMonthly)} sub={`${completedMonths} meses`} icon={BarChart3} color="blue" />
        <StatCard label="Reservas YTD" value={totalBookingsCount.toLocaleString()} sub={`F7: ${yearBookings.filter(b=>b.type==='F7').length} | F5: ${yearBookings.filter(b=>b.type==='F5').length}`} icon={Calendar} color="purple" />
        <StatCard label="Cumpleanos" value={totalBirthdays} sub={`~${(totalBirthdays / Math.max(completedMonths,1)).toFixed(1)}/mes`} icon={Trophy} color="green" />
      </div>

      {/* F7 vs F5 */}
      <div className="stat-card rounded-2xl p-4">
        <SectionHeader title="F7 vs F5" subtitle={`Ingresos ${currentYear}`} />
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">F7</span>
              <span>{fmt(f7Revenue)} ({totalRevenue > 0 ? fmtPct(f7Revenue/totalRevenue*100) : '0%'})</span>
            </div>
            <div className="h-3 bg-brand-cream rounded-full overflow-hidden">
              <div className="h-full gold-gradient rounded-full" style={{ width: `${totalRevenue > 0 ? f7Revenue/totalRevenue*100 : 0}%` }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">F5</span>
              <span>{fmt(f5Revenue)} ({totalRevenue > 0 ? fmtPct(f5Revenue/totalRevenue*100) : '0%'})</span>
            </div>
            <div className="h-3 bg-brand-cream rounded-full overflow-hidden">
              <div className="h-full brown-gradient rounded-full" style={{ width: `${totalRevenue > 0 ? f5Revenue/totalRevenue*100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="stat-card rounded-2xl p-4">
        <SectionHeader title="Tendencia Mensual" subtitle={`Ingresos REF por mes — ${currentYear}`} />
        <div className="h-52">
          <Bar
            data={{
              labels: MONTHS_ES,
              datasets: [{
                data: monthlyRevenue,
                backgroundColor: monthlyRevenue.map((_, i) => i < completedMonths ? '#B8963E' : 'rgba(184,150,62,0.2)'),
                borderRadius: 6,
                barThickness: 18,
              }]
            }}
            options={{
              ...chartDefaults,
              scales: {
                ...chartDefaults.scales,
                y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => '$' + (v/1000).toFixed(0) + 'k' } }
              }
            }}
          />
        </div>
      </div>

      {/* Birthdays by Month */}
      <div className="stat-card rounded-2xl p-4">
        <SectionHeader title="Cumpleanos por Mes" subtitle={currentYear.toString()} />
        <div className="h-40">
          <Bar
            data={{
              labels: MONTHS_ES,
              datasets: [{
                data: birthdaysByMonth,
                backgroundColor: '#3D2B1F',
                borderRadius: 6,
                barThickness: 14,
              }]
            }}
            options={{
              ...chartDefaults,
              scales: {
                ...chartDefaults.scales,
                y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, stepSize: 1 } }
              }
            }}
          />
        </div>
      </div>

      {/* Court Occupancy */}
      <div className="stat-card rounded-2xl p-4">
        <SectionHeader title="Ocupacion por Cancha" subtitle={`Horas reservadas — ${currentYear}`} />
        <div className="space-y-2">
          {courtHours.map((c, i) => {
            const max = courtHours[0]?.hours || 1;
            return (
              <div key={i}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="font-medium">{c.name} <span className="text-brand-cream-dark">({c.type})</span></span>
                  <span>{c.hours}h</span>
                </div>
                <div className="h-2 bg-brand-cream rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(c.hours / max) * 100}%`,
                      background: c.type === 'F7' ? '#B8963E' : '#3D2B1F'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="stat-card rounded-2xl p-4">
        <SectionHeader title="Tipo de Actividad" subtitle="Distribucion de ingresos" />
        <div className="flex items-center gap-6">
          <div className="w-32 h-32">
            <Doughnut
              data={{
                labels: Object.keys(activityBreakdown).map(k => activityLabels[k] || k),
                datasets: [{
                  data: Object.values(activityBreakdown),
                  backgroundColor: activityColors.slice(0, Object.keys(activityBreakdown).length),
                  borderWidth: 0,
                }]
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' }}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            {Object.entries(activityBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([key, val], i) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: activityColors[i] }} />
                  <span className="flex-1">{activityLabels[key] || key}</span>
                  <span className="font-medium">{fmt(val)}</span>
                  <span className="text-brand-cream-dark">{fmtPct(val/totalRevenue*100)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Mi Participacion ─────────────────────────────────
function TabParticipacion({ data }) {
  const { dividends, roi, totales } = data;
  const now = new Date();
  const currentYear = now.getFullYear();
  const completedMonths = now.getMonth() + 1;

  // Flatten all dividends for WISI
  const allDivs = [...(dividends[2024] || []), ...(dividends[2025] || []), ...(dividends[2026] || [])];
  const totalDividends = roi?.dividendosRecibidos || allDivs.reduce((s, d) => s + d.wisiAmount, 0);
  const invested = roi?.montoInvertido || WISI_INVESTMENT;
  const roiPct = roi?.roiPct || (invested > 0 ? (totalDividends / invested * 100) : 0);
  const paybackPct = Math.min(100, (totalDividends / invested) * 100);

  // YTD dividends
  const ytdDivs = (dividends[currentYear] || []).reduce((s, d) => s + d.wisiAmount, 0);
  const prevYearDivs = totales?.total2025 || (dividends[currentYear - 1] || []).reduce((s, d) => s + d.wisiAmount, 0);
  const prevYearSameMonths = (dividends[currentYear - 1] || [])
    .filter(d => {
      const m = getMonth(d.fecha);
      return m && m <= completedMonths;
    })
    .reduce((s, d) => s + d.wisiAmount, 0);

  const ytdGrowth = prevYearSameMonths > 0 ? ((ytdDivs - prevYearSameMonths) / prevYearSameMonths * 100) : 0;
  const avgMonthly = completedMonths > 0 ? ytdDivs / completedMonths : 0;
  const remaining = invested - totalDividends;
  const monthsToPayback = avgMonthly > 0 ? Math.ceil(remaining / avgMonthly) : null;

  // Monthly dividends trend (current year)
  const monthlyDivs = useMemo(() => {
    const months = Array(12).fill(0);
    (dividends[currentYear] || []).forEach(d => {
      const m = getMonth(d.fecha);
      if (m) months[m - 1] += d.wisiAmount;
    });
    return months;
  }, [dividends, currentYear]);

  // Cumulative dividends by year for line chart
  const yearlyTotals = [
    totales?.total2024 || (dividends[2024] || []).reduce((s, d) => s + d.wisiAmount, 0),
    totales?.total2025 || (dividends[2025] || []).reduce((s, d) => s + d.wisiAmount, 0),
    totales?.total2026 || (dividends[2026] || []).reduce((s, d) => s + d.wisiAmount, 0),
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Hero */}
      <div className="brown-gradient rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs uppercase tracking-wider opacity-70">WISI — {WISI_PCT}%</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{currentYear}</span>
        </div>
        <div className="text-3xl font-bold mb-1">{fmt(totalDividends, 0)}</div>
        <div className="text-sm opacity-70">Total dividendos recibidos</div>
        <div className="mt-4 flex gap-4">
          <div>
            <div className="text-xs opacity-60">Invertido</div>
            <div className="font-semibold">{fmt(invested)}</div>
          </div>
          <div>
            <div className="text-xs opacity-60">ROI</div>
            <div className="font-semibold text-amber-300">{fmtPct(roiPct)}</div>
          </div>
          <div>
            <div className="text-xs opacity-60">Neto</div>
            <div className={`font-semibold ${remaining > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {remaining > 0 ? `-${fmt(remaining)}` : `+${fmt(Math.abs(remaining))}`}
            </div>
          </div>
        </div>
      </div>

      {/* Payback Progress */}
      <div className="stat-card rounded-2xl p-4">
        <SectionHeader title="Payback" subtitle={`${fmt(totalDividends)} de ${fmt(invested)}`} />
        <div className="relative h-6 bg-brand-cream rounded-full overflow-hidden">
          <div
            className="h-full gold-gradient rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
            style={{ width: `${paybackPct}%` }}
          >
            <span className="text-[10px] text-white font-bold">{fmtPct(paybackPct)}</span>
          </div>
        </div>
        {monthsToPayback != null && remaining > 0 && (
          <p className="text-xs text-brand-cream-dark mt-2">
            ~{monthsToPayback} meses restantes al ritmo actual ({fmt(avgMonthly)}/mes)
          </p>
        )}
      </div>

      {/* YTD KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label={`Dividendos ${currentYear}`} value={fmt(ytdDivs)} sub={`${fmtPct(ytdGrowth)} vs ${currentYear - 1}`} icon={DollarSign} trend={ytdGrowth} color="gold" />
        <StatCard label="Promedio/Mes" value={fmt(avgMonthly)} sub={`${completedMonths} meses`} icon={BarChart3} color="blue" />
      </div>

      {/* Monthly Dividends Chart */}
      <div className="stat-card rounded-2xl p-4">
        <SectionHeader title={`Dividendos Mensuales ${currentYear}`} subtitle="Mi parte (WISI)" />
        <div className="h-48">
          <Bar
            data={{
              labels: MONTHS_ES,
              datasets: [{
                data: monthlyDivs,
                backgroundColor: monthlyDivs.map((_, i) => i < completedMonths ? '#B8963E' : 'rgba(184,150,62,0.2)'),
                borderRadius: 6,
                barThickness: 18,
              }]
            }}
            options={{
              ...chartDefaults,
              scales: {
                ...chartDefaults.scales,
                y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => '$' + v } }
              }
            }}
          />
        </div>
      </div>

      {/* Year over Year */}
      <div className="stat-card rounded-2xl p-4">
        <SectionHeader title="Comparacion Anual" subtitle="Dividendos WISI por ano" />
        <div className="h-48">
          <Bar
            data={{
              labels: ['2024', '2025', '2026'],
              datasets: [{
                data: yearlyTotals,
                backgroundColor: ['#C4B8A8', '#3D2B1F', '#B8963E'],
                borderRadius: 8,
                barThickness: 40,
              }]
            }}
            options={{
              ...chartDefaults,
              scales: {
                ...chartDefaults.scales,
                y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => '$' + (v/1000).toFixed(0) + 'k' } }
              }
            }}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs">
          {['2024', '2025', '2026'].map((y, i) => (
            <div key={y} className="text-center">
              <div className="font-bold">{fmt(yearlyTotals[i])}</div>
              <div className="text-brand-cream-dark">{y}{i === 2 ? ' (YTD)' : ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="stat-card rounded-2xl p-4">
        <SectionHeader title="Ultimos Pagos" subtitle="Dividendos recientes" />
        <div className="space-y-2">
          {[...(dividends[currentYear] || [])].reverse().slice(0, 8).map((d, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-brand-cream/30 last:border-0">
              <div className="text-xs text-brand-cream-dark">{d.fecha}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-cream-dark">{fmt(d.montoTotal)} total</span>
                <ChevronRight className="w-3 h-3 text-brand-cream-dark" />
                <span className="text-sm font-semibold text-brand-brown">{fmt(d.wisiAmount, 2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Proyecciones ─────────────────────────────────────
function TabProyecciones({ data }) {
  const { dividends, roi, totales, bookings, courts } = data;
  const now = new Date();
  const currentYear = now.getFullYear();
  const completedMonths = now.getMonth() + 1;

  const invested = roi?.montoInvertido || WISI_INVESTMENT;
  const totalDivs = roi?.dividendosRecibidos || [
    ...(dividends[2024] || []),
    ...(dividends[2025] || []),
    ...(dividends[2026] || []),
  ].reduce((s, d) => s + d.wisiAmount, 0);

  const ytdDivs = (dividends[currentYear] || []).reduce((s, d) => s + d.wisiAmount, 0);
  const currentMonthly = completedMonths > 0 ? ytdDivs / completedMonths : 0;

  // 3 Scenarios
  const scenarios = [
    { name: 'Conservador', monthly: 1100, color: '#C4B8A8', desc: 'Ritmo minimo sostenible' },
    { name: 'Base', monthly: Math.round(currentMonthly || 1530), color: '#B8963E', desc: 'Ritmo actual proyectado' },
    { name: 'Optimista', monthly: 2200, color: '#3D2B1F', desc: 'Con mejoras operativas' },
  ];

  // Payback curves (months from now until recovery)
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

  // Month labels for chart
  const monthLabels = [];
  for (let m = 0; m <= maxMonths; m += 6) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + m);
    monthLabels.push(m === 0 ? 'Hoy' : `${MONTHS_ES[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`);
  }

  // ROI at 1, 2, 3 years
  const roiProjections = scenarios.map(s => ({
    ...s,
    roi1y: ((totalDivs + s.monthly * 12) / invested * 100),
    roi2y: ((totalDivs + s.monthly * 24) / invested * 100),
    roi3y: ((totalDivs + s.monthly * 36) / invested * 100),
    paybackMonths: Math.max(0, Math.ceil((invested - totalDivs) / s.monthly)),
  }));

  // Underutilized courts
  const yearBookings = bookings.filter(b => b.date && b.date.startsWith(String(currentYear)));
  const courtHoursMap = {};
  (courts || []).forEach(c => { courtHoursMap[c.id] = { name: c.name, type: c.type, hours: 0 }; });
  yearBookings.forEach(b => {
    (b.court_ids || []).forEach(cid => {
      if (courtHoursMap[cid]) courtHoursMap[cid].hours += (b.duration || 0);
    });
  });
  const courtList = Object.values(courtHoursMap).sort((a, b) => a.hours - b.hours);
  const underutilized = courtList.filter(c => c.hours < 60);

  // Birthday opportunity
  const currentBdays = yearBookings.filter(b => b.activity_type === 'cumpleanos').length;
  const bdayMonthlyAvg = completedMonths > 0 ? currentBdays / completedMonths : 0;

  return (
    <div className="space-y-6 fade-in">
      {/* Scenarios Summary */}
      <div className="space-y-3">
        {roiProjections.map((s, i) => (
          <div key={i} className="stat-card rounded-2xl p-4" style={{ borderLeft: `4px solid ${s.color}` }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-bold">{s.name}</div>
                <div className="text-xs text-brand-cream-dark">{s.desc}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold" style={{ color: s.color }}>{fmt(s.monthly)}<span className="text-xs font-normal text-brand-cream-dark">/mes</span></div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="text-center">
                <div className="text-xs text-brand-cream-dark">Payback</div>
                <div className="text-sm font-bold">{s.paybackMonths > 0 ? `${s.paybackMonths}m` : 'Listo'}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-brand-cream-dark">ROI 1a</div>
                <div className="text-sm font-bold">{fmtPct(s.roi1y)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-brand-cream-dark">ROI 2a</div>
                <div className="text-sm font-bold">{fmtPct(s.roi2y)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-brand-cream-dark">ROI 3a</div>
                <div className="text-sm font-bold">{fmtPct(s.roi3y)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payback Curve */}
      <div className="stat-card rounded-2xl p-4">
        <SectionHeader title="Curva de Payback" subtitle={`Proyeccion hasta recuperar ${fmt(invested)}`} />
        <div className="h-56">
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
                // Investment line
                {
                  label: 'Inversion',
                  data: Array(maxMonths + 1).fill(invested),
                  borderColor: '#dc2626',
                  borderDash: [6, 4],
                  borderWidth: 2,
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
              ...chartDefaults,
              plugins: {
                ...chartDefaults.plugins,
                legend: {
                  display: true,
                  position: 'bottom',
                  labels: { font: { family: 'Georgia', size: 10 }, boxWidth: 12, padding: 8 }
                },
              },
              scales: {
                ...chartDefaults.scales,
                y: {
                  ...chartDefaults.scales.y,
                  ticks: { ...chartDefaults.scales.y.ticks, callback: v => '$' + (v/1000).toFixed(0) + 'k' }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Levers */}
      <div className="stat-card rounded-2xl p-4">
        <SectionHeader title="Palancas de Crecimiento" subtitle="Oportunidades concretas" />
        <div className="space-y-3">
          {/* Birthday upside */}
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <Trophy className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold">Mas Cumpleanos</div>
              <div className="text-xs text-brand-cream-dark mt-0.5">
                Promedio actual: {bdayMonthlyAvg.toFixed(1)}/mes. En 2025 fueron ~10/mes.
                Cada cumpleano adicional = ~REF 300-500 extra.
              </div>
            </div>
          </div>

          {/* Underutilized courts */}
          {underutilized.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Activar Canchas Subutilizadas</div>
                <div className="text-xs text-brand-cream-dark mt-0.5">
                  {underutilized.map(c => c.name).join(', ')} con menos de 60h YTD.
                  Potencial: +REF 500-1,000/mes con promociones y academias.
                </div>
              </div>
            </div>
          )}

          {/* Collection */}
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
            <Target className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold">Cobrar Pendientes</div>
              <div className="text-xs text-brand-cream-dark mt-0.5">
                Revisar reservas sin pago completo. Reducir morosidad mejora el flujo directo de dividendos.
              </div>
            </div>
          </div>

          {/* Cantina */}
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl border border-purple-200">
            <ArrowUpRight className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold">Cantina + Eventos</div>
              <div className="text-xs text-brand-cream-dark mt-0.5">
                Ingresos de cantina y eventos especiales suman al fondo distribuible.
                Potencial con nuevos productos y torneos regulares.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────
export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');

  // Check existing session
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

  // Fetch dashboard data
  const fetchData = useCallback(async (token) => {
    setDataLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error cargando datos');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.access_token) {
      fetchData(session.access_token);
    }
  }, [session, fetchData]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setData(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream-light">
        <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={(s) => setSession(s)} />;
  }

  const tabs = [
    { label: 'El Complejo', icon: Building2 },
    { label: 'Mi Parte', icon: User },
    { label: 'Proyecciones', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-brand-cream-light">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-brand-cream-light/80 backdrop-blur-lg border-b border-brand-cream/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-brand-brown leading-tight">Futuros Socios</h1>
              <p className="text-[10px] text-brand-cream-dark">WISI — {WISI_PCT}%</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-brand-cream/50 transition">
            <LogOut className="w-4 h-4 text-brand-cream-dark" />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto px-4 flex">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition ${
                activeTab === i ? 'tab-active' : 'tab-inactive hover:text-brand-brown/60'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-5 pb-20">
        {dataLoading && !data && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand-gold mb-3" />
            <p className="text-sm text-brand-cream-dark">Cargando datos...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => fetchData(session.access_token)}
              className="mt-2 text-xs text-red-600 underline"
            >
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
