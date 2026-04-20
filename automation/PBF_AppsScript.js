// =====================================================
// Profit by Faith — Google Apps Script Web App
// Deploy as: Execute as Me | Anyone can access
// =====================================================

function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const trades = data.trades;

    if (!trades || trades.length === 0) {
      return respond({ status: 'ok', added: 0 });
    }

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Trades');
    if (!sheet) throw new Error("Sheet named 'Trades' not found");

    // Load existing entry times to prevent duplicates
    const lastRow     = sheet.getLastRow();
    const existingSet = new Set();
    if (lastRow > 1) {
      sheet.getRange(2, 9, lastRow - 1, 1)
           .getValues()
           .flat()
           .forEach(v => existingSet.add(String(v)));
    }

    let added = 0;
    for (const t of trades) {
      if (existingSet.has(String(t.entryTime))) continue;  // skip duplicate

      const fmt = (val) => {
        const abs = Math.abs(val).toFixed(2);
        return val >= 0 ? `$${abs}` : `($${abs})`;
      };

      sheet.appendRow([
        t.tradeNum,
        t.instrument,
        t.account,
        '',              // Strategy (blank — NT doesn't expose this via DB easily)
        t.direction,
        t.qty,
        t.entryPrice,
        t.exitPrice,
        t.entryTime,
        t.exitTime,
        t.entryName || 'Entry',
        t.exitName  || 'Exit',
        fmt(t.profit),
        '',              // Cum. net profit — recalculated below
        t.commission
      ]);

      existingSet.add(String(t.entryTime));
      added++;
    }

    // Recalculate cumulative net profit column (N)
    if (added > 0) recalcCumulative(sheet);

    return respond({ status: 'ok', added });

  } catch (err) {
    return respond({ status: 'error', message: err.message });
  }
}

function recalcCumulative(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const profits = sheet.getRange(2, 13, lastRow - 1, 1).getValues(); // col M = Profit
  let cum = 0;
  const cumValues = profits.map(([p]) => {
    const str = String(p);
    const neg = str.includes('(');
    const val = parseFloat(str.replace(/[$,() ]/g, ''));
    if (!isNaN(val)) cum += neg ? -val : val;
    return [cum >= 0 ? `$${cum.toFixed(2)}` : `($${Math.abs(cum).toFixed(2)})`];
  });
  sheet.getRange(2, 14, lastRow - 1, 1).setValues(cumValues);
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Test manually from Apps Script editor ──
function testDoPost() {
  const mock = {
    postData: {
      contents: JSON.stringify({
        trades: [{
          tradeNum: 1, instrument: 'NQ', account: 'TEST',
          direction: 'Long', qty: 1,
          entryPrice: 21000, exitPrice: 21010,
          entryTime: '4/20/2026 9:45:00 AM', exitTime: '4/20/2026 9:46:00 AM',
          entryName: 'Entry', exitName: 'Exit',
          profit: 194.24, commission: 5.76
        }]
      })
    }
  };
  Logger.log(doPost(mock).getContent());
}
