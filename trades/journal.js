/* ============================================
   Profit by Faith — Trade Journal v3
   ============================================ */

let journalData  = {};
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let activeDate   = null;
let equityChart  = null;
let yearlyMode   = 'pnl';

/* ── Session notes data (add per day; tutorials auto-match bad patterns) ── */
const SESSION_DATA = {
  '2026-04-27': {
    verse: { text: 'The plans of the diligent lead surely to abundance, but everyone who is hasty comes only to poverty.', ref: 'Proverbs 21:5' },
    firms: ['Apex','TakeProfitTrader','Bulenox'],
    tutorials: [
      { title: '15-Min ORB — Wait for the Close', url: 'https://www.youtube.com/results?search_query=15+minute+ORB+entry+timing+NQ+futures', note: 'Addresses early entries on Apex-053/054 before ORB formed.' },
      { title: 'Volume Profile VAH/VAL Confluence', url: 'https://www.youtube.com/results?search_query=volume+profile+VAH+VAL+NQ+futures+confluence', note: 'The 27,380–27,400 rejection zone — knowing VAH stops bad longs.' },
      { title: 'Revenge Trading & Stop Rules', url: 'https://www.youtube.com/results?search_query=revenge+trading+futures+discipline+stop+rules', note: 'The triple-loss #5→#6→#7 Bulenox sequence.' },
    ]
  }
  /* Add more dates here as you journal each session:
  '2026-04-28': {
    verse: { text: '...', ref: '...' },
    firms: ['Apex','TakeProfitTrader'],
    tutorials: [...]
  }
  */
};

/* ── Build inline equity chart for a day's trades ── */
let _inlineChart = null;
function buildInlineEquityChart(trades) {
  const canvas = document.getElementById('pbf-inline-equity');
  if (!canvas) return;
  if (_inlineChart) { _inlineChart.destroy(); _inlineChart = null; }
  let cum = 0;
  const labels = [], values = [];
  (trades || []).forEach((t, i) => {
    cum += (t.profit || 0);
    labels.push('#' + (i + 1));
    values.push(parseFloat(cum.toFixed(2)));
  });
  const final = values[values.length - 1] || 0;
  const lineColor = final >= 0 ? '#4caf82' : '#e05252';
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 120);
  grad.addColorStop(0, lineColor + '33');
  grad.addColorStop(1, lineColor + '04');
  _inlineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: lineColor,
        backgroundColor: grad,
        borderWidth: 1.5,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: lineColor,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1526',
          titleColor: '#7a8ba8',
          bodyColor: '#fff',
          callbacks: {
            label: (item) => { const v = item.raw; return (v >= 0 ? '+$' : '-$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 }); }
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a8ba8', font: { size: 10 } }, border: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a8ba8', font: { size: 10 }, callback: v => (v >= 0 ? '+$' : '-$') + Math.abs(v) }, border: { display: false } }
      }
    }
  });
}

/* ── SVG Gauge Arc ── */
function gaugeArcPath(pct) {
  const p = Math.min(Math.max(pct, 0), 1);
  if (p < 0.001) return 'M10,65 A50,50 0 0,1 10.01,64.99';
  if (p > 0.999) return 'M10,65 A50,50 0 0,1 109.99,65';
  const angle = Math.PI - p * Math.PI;
  const x     = 60 + 50 * Math.cos(angle);
  const y     = 65 - 50 * Math.sin(angle);
  return `M10,65 A50,50 0 0,1 ${x.toFixed(2)},${y.toFixed(2)}`;
}

/* ── Load data ── */
async function loadJournalData() {
  try {
    const res = await fetch('/api/journal');
    const data = await res.json();
    journalData = data.dates || {};
  } catch (e) {
    console.warn('Journal load failed:', e);
  }
  renderAll();
}

function renderAll() {
  computeAndRenderStatCards();
  renderGlobalCards(null, 'All Time');
  renderYearlyTable();
  renderStatsPanel();
  renderEquityCurve();
  renderCalendar();
}

/* ── Compute stats (scoped to a date prefix, or all if prefix is null) ── */
function computeStats(prefix) {
  const entries = prefix
    ? Object.entries(journalData).filter(([d]) => d.startsWith(prefix))
    : Object.entries(journalData);
  const days = entries.map(([, v]) => v);

  const tradingDays = days.filter(d => d.count > 0);
  const greenDays   = tradingDays.filter(d => d.pnl > 0);
  const redDays     = tradingDays.filter(d => d.pnl < 0);
  const totalPnl    = days.reduce((s, d) => s + d.pnl, 0);

  // Trade-level wins/losses
  let wins = 0, losses = 0;
  let winTotal = 0, lossTotal = 0;
  let longs = 0, shorts = 0;

  for (const day of days) {
    for (const t of (day.trades || [])) {
      const p = t.profit || 0;
      if (p > 0) { wins++;   winTotal  += p; }
      else        { losses++; lossTotal += Math.abs(p); }
      if ((t.direction || '').toLowerCase() === 'long') longs++;
      else shorts++;
    }
  }

  const totalTrades = wins + losses;
  const tradeWinPct = totalTrades > 0 ? wins / totalTrades : 0;
  const dayWinPct   = (greenDays.length + redDays.length) > 0
    ? greenDays.length / (greenDays.length + redDays.length) : 0;

  const avgWin  = wins   > 0 ? winTotal  / wins   : 0;
  const avgLoss = losses > 0 ? lossTotal / losses : 1;
  const ratio   = avgWin / avgLoss;

  const sorted    = [...tradingDays].sort((a, b) => b.pnl - a.pnl);
  const bestDay   = sorted[0]                   || null;
  const worstDay  = sorted[sorted.length - 1]   || null;
  const bestDate  = entries.find(([, v]) => v === bestDay)?.[0]  || null;
  const worstDate = entries.find(([, v]) => v === worstDay)?.[0] || null;
  const avgDaily  = tradingDays.length > 0 ? totalPnl / tradingDays.length : 0;

  return {
    totalPnl, totalTrades, tradingDays: tradingDays.length,
    wins, losses, tradeWinPct, dayWinPct,
    greenDays: greenDays.length, redDays: redDays.length,
    avgWin, avgLoss, ratio,
    longs, shorts,
    bestDay, bestDate, worstDay, worstDate, avgDaily
  };
}

/* ── Shared card renderer (used by both top monthly cards and global overview) ── */
function renderStatCards(ids, arcIds, s, sublabel) {
  const fmt = (v) => {
    const abs = '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return (v >= 0 ? '+' : '-') + abs;
  };

  const pnlEl = document.getElementById(ids.pnl);
  pnlEl.textContent = fmt(s.totalPnl);
  pnlEl.className   = 'sc-value ' + (s.totalPnl >= 0 ? 'green' : 'red');
  document.getElementById(ids.pnlSub).textContent = sublabel;

  const twPct = Math.round(s.tradeWinPct * 100);
  document.getElementById(ids.winrate).textContent    = twPct + '%';
  document.getElementById(ids.winrateSub).textContent = `${s.wins} W \u00a0/\u00a0 ${s.losses} L`;
  document.getElementById(arcIds.trade).setAttribute('d', gaugeArcPath(s.tradeWinPct));

  const dwPct = Math.round(s.dayWinPct * 100);
  document.getElementById(ids.dayrate).textContent    = dwPct + '%';
  document.getElementById(ids.dayrateSub).textContent = `${s.greenDays} green \u00a0/\u00a0 ${s.redDays} red`;
  document.getElementById(arcIds.day).setAttribute('d', gaugeArcPath(s.dayWinPct));

  const ratioEl = document.getElementById(ids.ratio);
  ratioEl.textContent = s.ratio > 0 ? s.ratio.toFixed(2) + 'x' : '—';
  ratioEl.className   = 'sc-value ' + (s.ratio >= 1 ? 'green' : 'red');
  document.getElementById(ids.ratioSub).textContent = `$${Math.round(s.avgWin).toLocaleString()} avg win`;
}

/* ── Top stat cards — always the currently viewed month ── */
function computeAndRenderStatCards() {
  const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const s      = computeStats(prefix);
  const label  = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  renderStatCards(
    { pnl: 'sc-pnl', pnlSub: 'sc-pnl-sub', winrate: 'sc-winrate', winrateSub: 'sc-winrate-sub',
      dayrate: 'sc-dayrate', dayrateSub: 'sc-dayrate-sub', ratio: 'sc-ratio', ratioSub: 'sc-ratio-sub' },
    { trade: 'g-trade-arc', day: 'g-day-arc' },
    s, label
  );
}

/* ── Global overview cards — all-time by default, filterable by year/month ── */
function renderGlobalCards(prefix, label) {
  const s = computeStats(prefix);
  renderStatCards(
    { pnl: 'gs-pnl', pnlSub: 'gs-pnl-sub', winrate: 'gs-winrate', winrateSub: 'gs-winrate-sub',
      dayrate: 'gs-dayrate', dayrateSub: 'gs-dayrate-sub', ratio: 'gs-ratio', ratioSub: 'gs-ratio-sub' },
    { trade: 'g-trade-arc2', day: 'g-day-arc2' },
    s, label
  );
  document.getElementById('gs-period').textContent = label;
  const resetBtn = document.getElementById('gs-reset');
  if (prefix) resetBtn.classList.add('visible');
  else        resetBtn.classList.remove('visible');
}

/* ── Yearly Table ── */
function renderYearlyTable() {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Aggregate by YYYY-MM
  const byYM = {};
  for (const [ds, day] of Object.entries(journalData)) {
    const [y, mo] = ds.split('-');
    const k = `${y}-${mo}`;
    if (!byYM[k]) byYM[k] = { pnl: 0, count: 0 };
    byYM[k].pnl   += day.pnl;
    byYM[k].count += day.count;
  }

  const years = [...new Set(Object.keys(journalData).map(d => d.split('-')[0]))]
    .sort().reverse();

  const tbody = document.getElementById('yearly-body');
  tbody.innerHTML = '';

  // Header row
  const htr = document.createElement('tr');
  const hth = document.createElement('th');
  hth.className = 'yr-year-col';
  hth.textContent = '';
  htr.appendChild(hth);
  MONTHS.forEach(mo => {
    const th = document.createElement('th');
    th.textContent = mo;
    htr.appendChild(th);
  });
  tbody.appendChild(htr);

  for (const yr of years) {
    const tr = document.createElement('tr');
    const yrTd = document.createElement('td');
    yrTd.className = 'yr-year-label';
    yrTd.textContent = yr;
    yrTd.title = `Filter to ${yr}`;
    yrTd.addEventListener('click', () => renderGlobalCards(yr, yr));
    tr.appendChild(yrTd);

    for (let mo = 1; mo <= 12; mo++) {
      const k    = `${yr}-${String(mo).padStart(2, '0')}`;
      const data = byYM[k];
      const td   = document.createElement('td');
      td.className = 'yr-month-cell';

      if (data) {
        td.classList.add(data.pnl >= 0 ? 'yr-green' : 'yr-red');
        const abs  = Math.abs(data.pnl);
        const sign = data.pnl >= 0 ? '+' : '-';
        const disp = yearlyMode === 'trades'
          ? data.count
          : (abs >= 1000 ? `${sign}$${(abs / 1000).toFixed(1)}K` : `${sign}$${abs.toFixed(0)}`);
        td.innerHTML = yearlyMode === 'trades'
          ? `<span class="yr-pnl">${disp}</span><span class="yr-count">trades</span>`
          : `<span class="yr-pnl">${disp}</span><span class="yr-count">${data.count} trades</span>`;
        const moLabel = new Date(parseInt(yr), mo - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        td.addEventListener('click', () => renderGlobalCards(k, moLabel));
      } else {
        td.classList.add('yr-empty');
        td.textContent = '—';
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

/* ── Stats Panel ── */
function renderStatsPanel() {
  const s = computeStats(null);
  const fmtAmt = (v) => {
    const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 });
    return (v >= 0 ? '+$' : '-$') + abs;
  };
  const fmtDate = (ds) => {
    if (!ds) return '—';
    const d = new Date(ds + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const total = s.longs + s.shorts;
  const lPct  = total > 0 ? (s.longs  / total * 100) : 50;
  const sPct  = total > 0 ? (s.shorts / total * 100) : 50;
  document.getElementById('sp-bar-long').style.width  = lPct + '%';
  document.getElementById('sp-bar-short').style.width = sPct + '%';
  document.getElementById('sp-long-pct').textContent  = lPct.toFixed(0) + '%';
  document.getElementById('sp-short-pct').textContent = sPct.toFixed(0) + '%';

  const bestEl = document.getElementById('sp-best');
  bestEl.textContent = s.bestDay ? fmtAmt(s.bestDay.pnl) + ' · ' + fmtDate(s.bestDate) : '—';

  const worstEl = document.getElementById('sp-worst');
  worstEl.textContent = s.worstDay ? fmtAmt(s.worstDay.pnl) + ' · ' + fmtDate(s.worstDate) : '—';

  const avgEl = document.getElementById('sp-avg');
  avgEl.textContent = fmtAmt(s.avgDaily);
  avgEl.className   = 'sp-val ' + (s.avgDaily >= 0 ? 'green' : 'red');

  document.getElementById('sp-total-trades').textContent = s.totalTrades.toLocaleString();
  document.getElementById('sp-avg-trades').textContent   =
    s.tradingDays > 0 ? (s.totalTrades / s.tradingDays).toFixed(1) : '—';
}

/* ── Equity Curve ── */
function renderEquityCurve() {
  const sorted = Object.entries(journalData).sort(([a], [b]) => a.localeCompare(b));
  if (!sorted.length) return;

  let cum = 0;
  const labels = [], values = [];
  for (const [date, day] of sorted) {
    cum += day.pnl;
    labels.push(date);
    values.push(parseFloat(cum.toFixed(2)));
  }

  const final  = values[values.length - 1] || 0;
  const totEl  = document.getElementById('perf-total');
  totEl.textContent = (final >= 0 ? '+$' : '-$') + Math.abs(final).toLocaleString('en-US', { minimumFractionDigits: 2 });
  totEl.style.color = final >= 0 ? 'var(--win)' : 'var(--loss)';

  const canvas = document.getElementById('equity-chart');
  const ctx    = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 260);
  grad.addColorStop(0, 'rgba(45,212,191,0.22)');
  grad.addColorStop(1, 'rgba(45,212,191,0.01)');

  if (equityChart) equityChart.destroy();

  equityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: '#2dd4bf',
        borderWidth: 2,
        backgroundColor: grad,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#2dd4bf',
        pointHoverBorderColor: '#070a0f',
        pointHoverBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1526',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#7a8ba8',
          bodyColor: '#ffffff',
          titleFont: { family: 'DM Sans', size: 11 },
          bodyFont: { family: 'Bebas Neue', size: 18 },
          padding: 12,
          callbacks: {
            title: (items) => {
              const d = new Date(items[0].label + 'T12:00:00');
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            },
            label: (item) => {
              const v = item.raw;
              return (v >= 0 ? '+$' : '-$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 });
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#7a8ba8',
            font: { family: 'DM Sans', size: 10 },
            maxTicksLimit: 8,
            maxRotation: 0,
            callback: (_, i) => {
              const d = new Date(labels[i] + 'T12:00:00');
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          },
          border: { display: false }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#7a8ba8',
            font: { family: 'DM Sans', size: 10 },
            callback: (v) => {
              const abs = Math.abs(v);
              const sign = v >= 0 ? '+$' : '-$';
              return abs >= 1000 ? sign + (abs / 1000).toFixed(0) + 'K' : sign + abs.toFixed(0);
            }
          },
          border: { display: false }
        }
      }
    }
  });
}

/* ── Monthly Calendar ── */
function renderCalendar() {
  const y = currentYear, m = currentMonth;
  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today       = new Date();
  const todayStr    = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  document.getElementById('cal-month').textContent =
    new Date(y, m).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-cell empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds   = isoDate(y, m, d);
    const day  = journalData[ds];
    const cell = document.createElement('div');
    cell.className = 'cal-cell';

    const num = document.createElement('span');
    num.className   = 'cal-day-num';
    num.textContent = d;
    cell.appendChild(num);

    if (day) {
      const sign  = day.pnl >= 0 ? '+' : '';
      const pnlEl = document.createElement('span');
      pnlEl.className   = 'cal-pnl';
      pnlEl.textContent = `${sign}$${Math.abs(day.pnl).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      const trdEl = document.createElement('span');
      trdEl.className   = 'cal-trades';
      trdEl.textContent = `${day.count} trade${day.count !== 1 ? 's' : ''}`;
      cell.appendChild(pnlEl);
      cell.appendChild(trdEl);
      cell.classList.add(day.pnl >= 0 ? 'green' : 'red');
      cell.addEventListener('click', () => openPanel(ds, day));
    } else {
      cell.classList.add('no-trade');
    }

    if (ds === todayStr) cell.classList.add('today');
    grid.appendChild(cell);
  }

  updateMonthStats(y, m);
}

function updateMonthStats(y, m) {
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  const days   = Object.entries(journalData)
    .filter(([d]) => d.startsWith(prefix))
    .map(([, v]) => v);

  const green = days.filter(d => d.pnl > 0).length;
  const red   = days.filter(d => d.pnl < 0).length;
  const pnl   = days.reduce((s, d) => s + d.pnl, 0);
  const rate  = (green + red) > 0 ? Math.round(green / (green + red) * 100) : 0;

  const sign  = pnl >= 0 ? '+' : '';
  const pnlEl = document.getElementById('ms-pnl');
  pnlEl.textContent = `${sign}$${Math.abs(pnl).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  pnlEl.className   = 'ms-val ' + (pnl >= 0 ? 'green' : 'red');
  document.getElementById('ms-green').textContent = green;
  document.getElementById('ms-red').textContent   = red;
  document.getElementById('ms-rate').textContent  = rate + '%';
}

/* ── Day Detail Panel ── */
function openPanel(dateStr, day) {
  activeDate = dateStr;

  // Close any currently open inline detail first
  const existing = document.getElementById('pbf-day-detail');
  if (existing) existing.remove();

  // Un-highlight all calendar cells, highlight the clicked one
  document.querySelectorAll('.cal-cell.pbf-selected').forEach(c => c.classList.remove('pbf-selected'));
  document.querySelectorAll('.cal-cell').forEach(c => {
    const num = c.querySelector('.cal-day-num');
    if (num) {
      const d = new Date(dateStr + 'T12:00:00');
      if (parseInt(num.textContent) === d.getDate()) c.classList.add('pbf-selected');
    }
  });

  const d     = new Date(dateStr + 'T12:00:00');
  const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const pnl   = day.pnl;
  const sign  = pnl >= 0 ? '+' : '';
  const pnlFmt = `${sign}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const pnlCls = pnl >= 0 ? 'green' : 'red';

  const trades  = day.trades || [];
  const wins    = trades.filter(t => (t.profit || 0) > 0).length;
  const losses  = trades.filter(t => (t.profit || 0) < 0).length;
  const note    = localStorage.getItem('pbf-note-' + dateStr) || '';
  const extra   = SESSION_DATA[dateStr] || {};
  const verse   = extra.verse;
  const firms   = extra.firms || [];
  const tuts    = extra.tutorials || [];

  // Trade rows
  const tradeRows = trades.map(t => {
    const p    = t.profit || 0;
    const pCls = p >= 0 ? 'pnl-pos' : 'pnl-neg';
    const dCls = (t.direction || '').toLowerCase() === 'long' ? 'dir-long' : 'dir-short';
    const time = (t.entryTime || '').split(' ').slice(1).join(' ');
    return `<div class="dp-trade-row">
      <span>${t.instrument || '—'} <small class="price">${time}</small></span>
      <span class="${dCls}">${t.direction || '—'}</span>
      <span class="price">${t.entryPrice || '—'}</span>
      <span class="price">${t.exitPrice  || '—'}</span>
      <span class="${pCls}">${p >= 0 ? '+$' : '-$'}${Math.abs(p).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
    </div>`;
  }).join('');

  // Firm badges
  const firmBadges = firms.map(f => {
    const cls = f.toLowerCase().includes('apex') ? 'apex' : f.toLowerCase().includes('take') ? 'tpt' : 'bulenox';
    return `<span class="pbf-firm-badge ${cls}">${f}</span>`;
  }).join('');

  // Tutorial rows
  const tutRows = tuts.map(t => `
    <div class="pbf-tut-row">
      <div>
        <a href="${t.url}" target="_blank" class="pbf-tut-title">${t.title} ↗</a>
        <div class="pbf-tut-note">${t.note}</div>
      </div>
    </div>`).join('');

  // Faith verse
  const verseHtml = verse ? `
    <div class="pbf-verse-block">
      <div class="pbf-verse-text">"${verse.text}"</div>
      <div class="pbf-verse-ref">— ${verse.ref}</div>
    </div>` : '';

  const html = `
  <div id="pbf-day-detail" class="pbf-day-detail">
    <div class="pbf-dd-header">
      <div>
        <div class="pbf-dd-eyebrow">Session Detail</div>
        <div class="pbf-dd-title">${label}</div>
        ${firmBadges ? `<div class="pbf-dd-firms">${firmBadges}</div>` : ''}
      </div>
      <div class="pbf-dd-header-right">
        <span class="pbf-dd-pnl ${pnlCls}">${pnlFmt}</span>
        <button class="pbf-dd-close" onclick="closePanel()">&#x2715;</button>
      </div>
    </div>
    <div class="pbf-dd-body">

      <div class="pbf-dd-stats">
        <div class="pbf-mini-stat"><div class="pbf-mini-label">trades</div><div class="pbf-mini-val">${trades.length}</div></div>
        <div class="pbf-mini-stat"><div class="pbf-mini-label">wins</div><div class="pbf-mini-val green">${wins}</div></div>
        <div class="pbf-mini-stat"><div class="pbf-mini-label">losses</div><div class="pbf-mini-val red">${losses}</div></div>
        <div class="pbf-mini-stat"><div class="pbf-mini-label">win rate</div><div class="pbf-mini-val">${trades.length > 0 ? Math.round(wins/trades.length*100) : 0}%</div></div>
      </div>

      <div class="pbf-dd-section">
        <div class="pbf-dd-section-label">Equity curve</div>
        <div style="position:relative;width:100%;height:110px;"><canvas id="pbf-inline-equity"></canvas></div>
      </div>

      <div class="pbf-dd-section">
        <div class="pbf-dd-section-label">Trades — ${day.count} total</div>
        ${tradeRows || '<div style="color:var(--muted);font-size:0.85rem;padding:0.5rem 0">No trade detail available</div>'}
      </div>

      ${tuts.length ? `<div class="pbf-dd-section">
        <div class="pbf-dd-section-label">Recommended tutorials</div>
        ${tutRows}
      </div>` : ''}

      <div class="pbf-dd-section">
        <div class="pbf-dd-section-label">Session notes</div>
        <textarea class="pbf-dd-notes" id="pbf-dd-note-ta" placeholder="Add session notes...">${note}</textarea>
        <button class="pbf-dd-save" id="pbf-dd-save-btn" onclick="saveDayNote('${dateStr}')">Save Note</button>
      </div>

      ${verseHtml}

    </div>
  </div>`;

  // Insert after the calendar section
  const calSection = document.getElementById('cal-grid').closest('section') || document.getElementById('cal-grid').parentElement;
  calSection.insertAdjacentHTML('afterend', html);

  // Build chart after DOM insertion
  requestAnimationFrame(() => buildInlineEquityChart(trades));

  // Smooth scroll to detail
  setTimeout(() => {
    document.getElementById('pbf-day-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 80);
}

function closePanel() {
  const el = document.getElementById('pbf-day-detail');
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    setTimeout(() => el.remove(), 200);
  }
  document.querySelectorAll('.cal-cell.pbf-selected').forEach(c => c.classList.remove('pbf-selected'));
  if (_inlineChart) { _inlineChart.destroy(); _inlineChart = null; }
  activeDate = null;
}

/* ── Save note helper (replaces inline onclick in old panel) ── */
function saveDayNote(dateStr) {
  const ta  = document.getElementById('pbf-dd-note-ta');
  const btn = document.getElementById('pbf-dd-save-btn');
  if (!ta || !btn) return;
  const note = ta.value.trim();
  if (note) localStorage.setItem('pbf-note-' + dateStr, note);
  else      localStorage.removeItem('pbf-note-' + dateStr);
  btn.textContent = '✓ Saved';
  btn.classList.add('saved');
  setTimeout(() => { btn.textContent = 'Save Note'; btn.classList.remove('saved'); }, 2000);
}

/* ── Event Listeners ── */
document.querySelectorAll('.ytab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ytab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    yearlyMode = btn.dataset.mode;
    renderYearlyTable();
  });
});

document.getElementById('btn-prev').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
  computeAndRenderStatCards();
});
document.getElementById('btn-next').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
  computeAndRenderStatCards();
});

document.getElementById('gs-reset').addEventListener('click', () => {
  renderGlobalCards(null, 'All Time');
});

document.getElementById('dp-save-note').addEventListener('click', () => {
  if (!activeDate) return;
  const note = document.getElementById('dp-note').value.trim();
  if (note) localStorage.setItem('pbf-note-' + activeDate, note);
  else      localStorage.removeItem('pbf-note-' + activeDate);
  const btn = document.getElementById('dp-save-note');
  btn.textContent = '\u2713 Saved';
  btn.classList.add('saved');
});

document.getElementById('dp-close').addEventListener('click', closePanel);
document.getElementById('dp-overlay').addEventListener('click', closePanel);

/* ── Helpers ── */
function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/* ── Boot ── */
loadJournalData();
