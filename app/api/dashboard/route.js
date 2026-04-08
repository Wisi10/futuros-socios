export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase-server';
import { getSheetData } from '../../lib/google-sheets';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function fetchAllRows(table, select = '*', filters = {}) {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1);
    for (const [key, val] of Object.entries(filters)) q = q.eq(key, val);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function parseNum(val) {
  if (!val) return 0;
  const s = String(val).replace(/[$,]/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Find all partner $ columns in headers: "RAMZI $", "WISI $", etc.
function findPartnerColumns(headers) {
  const partners = {};
  headers.forEach((h, idx) => {
    if (h && h.trim().endsWith('$')) {
      const name = h.trim().replace(/\s*\$$/, '').trim();
      if (name) partners[name] = idx;
    }
  });
  return partners;
}

function parseDividendSheet(rows, year) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  const partnerCols = findPartnerColumns(headers);
  const fechaIdx = 0;
  const montoIdx = 1;
  const bsIdx = headers.findIndex(h => h && h.trim() === 'BOLIVARES');
  const divisaIdx = headers.findIndex(h => h && h.trim() === 'DIVISA');
  const comentIdx = headers.findIndex(h => h && h.trim() === 'COMENTARIOS');

  return rows.slice(1)
    .filter(r => r[fechaIdx] && /^\d{2}\/\d{2}\/\d{4}$/.test(r[fechaIdx].trim()))
    .map(r => {
      const partners = {};
      for (const [name, idx] of Object.entries(partnerCols)) {
        partners[name] = parseNum(r[idx]);
      }
      return {
        fecha: r[fechaIdx],
        montoTotal: parseNum(r[montoIdx]),
        partners,
        bolivares: bsIdx >= 0 ? parseNum(r[bsIdx]) : 0,
        divisa: divisaIdx >= 0 ? (r[divisaIdx] || '').trim() : '',
        comentario: comentIdx >= 0 ? (r[comentIdx] || '').trim() : '',
        year,
      };
    });
}

function parseRoiSheet(rows) {
  if (!rows || rows.length < 3) return {};
  // Find header row (row with "SOCIO")
  const hdrIdx = rows.findIndex(r => r[0] && r[0].toUpperCase().includes('SOCIO'));
  if (hdrIdx < 0) return {};
  const result = {};
  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] || !r[0].trim()) continue;
    const name = r[0].trim().toUpperCase();
    result[name] = {
      participacion: parseNum(r[1]),
      montoInvertido: parseNum(r[2]),
      dividendosRecibidos: parseNum(r[3]),
      neto: parseNum(r[4]),
      roiPct: parseNum(r[5]),
      mesesTotalPayback: parseNum(r[6]),
      mesesRestantes: parseNum(r[7]),
    };
  }
  return result;
}

function parseTotalesSheet(rows) {
  if (!rows || rows.length < 3) return {};
  const hdrIdx = rows.findIndex(r => r[0] && r[0].toUpperCase().includes('SOCIO'));
  if (hdrIdx < 0) return {};
  const result = {};
  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] || !r[0].trim()) continue;
    const name = r[0].trim().toUpperCase();
    result[name] = {
      pctActual: parseNum(r[1]),
      total2024: parseNum(r[2]),
      total2025: parseNum(r[3]),
      total2026: parseNum(r[4]),
      granTotal: parseNum(r[5]),
    };
  }
  return result;
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const [
      bookings, courts, historicalSales, payments, exchangeRateRes,
      div2024Res, div2025Res, div2026Res, roiRes, totalesRes,
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

    const rateRow = exchangeRateRes.data?.[0];
    const exchangeRate = rateRow ? { eurRate: rateRow.eur_rate, usdRate: rateRow.usd_rate } : null;

    return NextResponse.json({
      userEmail: user.email,
      bookings,
      courts: courts.data || [],
      historicalSales,
      payments,
      exchangeRate,
      dividends: {
        2024: parseDividendSheet(div2024Res.values || [], 2024),
        2025: parseDividendSheet(div2025Res.values || [], 2025),
        2026: parseDividendSheet(div2026Res.values || [], 2026),
      },
      roi: parseRoiSheet(roiRes.values || []),
      totales: parseTotalesSheet(totalesRes.values || []),
    });
  } catch (err) {
    console.error('[DASHBOARD] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
