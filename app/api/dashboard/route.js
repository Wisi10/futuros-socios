export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase-server';
import { getSheetData } from '../../lib/google-sheets';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Fetch all rows (Supabase has 1000 row limit per query)
async function fetchAllRows(table, select = '*', filters = {}) {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1);
    for (const [key, val] of Object.entries(filters)) {
      q = q.eq(key, val);
    }
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function parseDividendSheet(rows, year) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];

  const wisiIdx = headers.findIndex(h => h && h.trim() === 'WISI $');
  const fechaIdx = 0;
  const montoIdx = 1;
  // 2026 has extra columns: BOLIVARES (idx 2), DIVISA (idx 18)
  const bsIdx = headers.findIndex(h => h && h.trim() === 'BOLIVARES');
  const divisaIdx = headers.findIndex(h => h && h.trim() === 'DIVISA');
  const comentIdx = headers.findIndex(h => h && h.trim() === 'COMENTARIOS');

  return rows.slice(1)
    .filter(r => r[fechaIdx] && /^\d{2}\/\d{2}\/\d{4}$/.test(r[fechaIdx].trim()))
    .map(r => ({
      fecha: r[fechaIdx],
      montoTotal: parseNum(r[montoIdx]),
      wisiAmount: wisiIdx >= 0 ? parseNum(r[wisiIdx]) : 0,
      bolivares: bsIdx >= 0 ? parseNum(r[bsIdx]) : 0,
      divisa: divisaIdx >= 0 ? (r[divisaIdx] || '').trim() : '',
      comentario: comentIdx >= 0 ? (r[comentIdx] || '').trim() : '',
      year,
    }));
}

function parseNum(val) {
  if (!val) return 0;
  const s = String(val).replace(/[$,]/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export async function GET(request) {
  try {
    // Verify auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch all data in parallel
    const [
      bookings,
      courts,
      historicalSales,
      payments,
      exchangeRateRes,
      div2024Res,
      div2025Res,
      div2026Res,
      roiRes,
      totalesRes,
    ] = await Promise.all([
      fetchAllRows('bookings', 'id,date,court_ids,type,activity_type,price_eur,start_hour,duration'),
      supabase.from('courts').select('*').order('id'),
      fetchAllRows('historical_sales', 'id,sale_date,court_type,activity_type,total_ref,duration_hours'),
      fetchAllRows('payments', 'id,booking_id,amount_eur,currency,method,created_at'),
      supabase.from('exchange_rates').select('eur_rate,usd_rate,created_at').order('created_at', { ascending: false }).limit(1),
      getSheetData(SHEET_ID, 'Dividendos 2024!A1:P50').catch(() => ({ values: [] })),
      getSheetData(SHEET_ID, 'Dividendos 2025!A1:P50').catch(() => ({ values: [] })),
      getSheetData(SHEET_ID, 'Dividendos 2026!A1:W50').catch(() => ({ values: [] })),
      getSheetData(SHEET_ID, 'ROI!A1:H20').catch(() => ({ values: [] })),
      getSheetData(SHEET_ID, 'Totales Historicos!A1:G20').catch(() => ({ values: [] })),
    ]);

    // Parse dividends
    const dividends2024 = parseDividendSheet(div2024Res.values || [], 2024);
    const dividends2025 = parseDividendSheet(div2025Res.values || [], 2025);
    const dividends2026 = parseDividendSheet(div2026Res.values || [], 2026);

    // Parse ROI sheet
    let roiData = null;
    const roiRows = roiRes.values || [];
    if (roiRows.length > 2) {
      const wisiRow = roiRows.find(r => r[0] && r[0].toUpperCase().includes('WISI'));
      if (wisiRow) {
        roiData = {
          participacion: parseNum(wisiRow[1]),
          montoInvertido: parseNum(wisiRow[2]),
          dividendosRecibidos: parseNum(wisiRow[3]),
          neto: parseNum(wisiRow[4]),
          roiPct: parseNum(wisiRow[5]),
          mesesTotalPayback: parseNum(wisiRow[6]),
          mesesRestantes: parseNum(wisiRow[7]),
        };
      }
    }

    // Parse Totales Historicos
    let totalesData = null;
    const totalesRows = totalesRes.values || [];
    if (totalesRows.length > 2) {
      const wisiRow = totalesRows.find(r => r[0] && r[0].toUpperCase().includes('WISI'));
      if (wisiRow) {
        totalesData = {
          pctActual: parseNum(wisiRow[1]),
          total2024: parseNum(wisiRow[2]),
          total2025: parseNum(wisiRow[3]),
          total2026: parseNum(wisiRow[4]),
          granTotal: parseNum(wisiRow[5]),
        };
      }
    }

    // Exchange rate
    const rateRow = exchangeRateRes.data?.[0];
    const exchangeRate = rateRow ? { eurRate: rateRow.eur_rate, usdRate: rateRow.usd_rate, updatedAt: rateRow.created_at } : null;

    return NextResponse.json({
      bookings,
      courts: courts.data || [],
      historicalSales,
      payments,
      exchangeRate,
      dividends: {
        2024: dividends2024,
        2025: dividends2025,
        2026: dividends2026,
      },
      roi: roiData,
      totales: totalesData,
    });
  } catch (err) {
    console.error('[DASHBOARD] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
