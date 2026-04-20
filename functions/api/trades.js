const PUBLISHED_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQD7ndu2JQsNK_Z8P1P4yFTusQFJMb5-Yw--_KvgcnUOjZdYFNqtEatujzEsGvEtF8ut84DIXmeGYa5/pub?output=csv';

export async function onRequest(context) {
  const csvUrl = context.env.TRADES_CSV_URL || PUBLISHED_CSV;

  try {
    const res = await fetch(csvUrl, { headers: { 'Accept': 'text/csv' } });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const csvText = await res.text();

    const rows = parseCSV(csvText);
    if (rows.length < 2) return json({ stats: null, trades: [], error: 'No data in sheet yet' });

    // NinjaTrader columns: 0=Trade#, 4=Direction, 6=EntryPrice, 7=ExitPrice,
    //                      8=EntryTime, 12=Profit, 1=Instrument
    const trades = rows.slice(1)
      .filter(r => r[0] && /^\d+$/.test(r[0].trim()))
      .map(r => ({
        num:        r[0],
        instrument: r[1],
        direction:  r[4],
        entryPrice: r[6],
        exitPrice:  r[7],
        entryTime:  r[8],
        profit:     parseMoney(r[12]),
      }));

    if (trades.length === 0) return json({ stats: null, trades: [], error: 'No trade rows found' });

    const wins     = trades.filter(t => t.profit > 0).length;
    const losses   = trades.filter(t => t.profit < 0).length;
    const totalPnl = trades.reduce((s, t) => s + t.profit, 0);
    const winRate  = ((wins / trades.length) * 100).toFixed(1);

    return json({
      stats: {
        wins,
        losses,
        winRate,
        totalPnl:    totalPnl.toFixed(2),
        totalTrades: trades.length,
      },
      trades: trades.slice(-20).reverse(),
    });
  } catch (e) {
    return json({ stats: null, trades: [], error: e.message });
  }
}

function parseMoney(str) {
  if (!str) return 0;
  const negative = str.includes('(');
  const num = parseFloat(str.replace(/[$,() ]/g, ''));
  return isNaN(num) ? 0 : (negative ? -num : num);
}

function parseCSV(text) {
  return text.trim().split(/\r?\n/).map(line => {
    const row = []; let cell = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { row.push(cell.trim()); cell = ''; }
      else { cell += ch; }
    }
    row.push(cell.trim());
    return row;
  });
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
