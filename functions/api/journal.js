const PUBLISHED_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQD7ndu2JQsNK_Z8P1P4yFTusQFJMb5-Yw--_KvgcnUOjZdYFNqtEatujzEsGvEtF8ut84DIXmeGYa5/pub?output=csv';

export async function onRequest(context) {
  const csvUrl = context.env.TRADES_CSV_URL || PUBLISHED_CSV;

  try {
    const res = await fetch(csvUrl, { headers: { 'Accept': 'text/csv' } });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const csvText = await res.text();

    const rows = parseCSV(csvText);
    if (rows.length < 2) return json({ dates: {}, error: 'No data' });

    // Group trades by date
    const dates = {};

    rows.slice(1)
      .filter(r => r[0] && /^\d+$/.test(r[0].trim()))
      .forEach(r => {
        const entryTime = r[8] || '';
        const dateStr   = entryTime.split(' ')[0]; // "M/D/YYYY"
        if (!dateStr) return;

        // Normalize to YYYY-MM-DD
        const parts = dateStr.split('/');
        if (parts.length !== 3) return;
        const iso = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;

        const profit = parseMoney(r[12]);
        if (!dates[iso]) dates[iso] = { pnl: 0, count: 0, wins: 0, losses: 0, trades: [] };

        dates[iso].pnl    += profit;
        dates[iso].count  += 1;
        if (profit > 0) dates[iso].wins++;
        if (profit < 0) dates[iso].losses++;
        dates[iso].trades.push({
          num:        r[0],
          instrument: r[1],
          direction:  r[4],
          entryPrice: r[6],
          exitPrice:  r[7],
          entryTime:  r[8],
          exitTime:   r[9],
          profit,
        });
      });

    // Round PnL per day
    Object.values(dates).forEach(d => { d.pnl = parseFloat(d.pnl.toFixed(2)); });

    return json({ dates });
  } catch (e) {
    return json({ dates: {}, error: e.message });
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
