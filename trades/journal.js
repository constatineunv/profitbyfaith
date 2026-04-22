/* ============================================
   Profit by Faith — Trade Journal
   ============================================ */

let journalData   = {};
let currentYear   = new Date().getFullYear();
let currentMonth  = new Date().getMonth();
let activeDateStr = null;
let equityChart   = null;

/* ── Load data ── */
async function loadJournalData() {
  try {
    const res  = await fetch('/api/journal');
    const data = await res.json();
    journalData = data.dates || {};
  } catch (e) {
    console.warn('Journal load failed:', e);
  }
  renderAll();
}

function renderAll() {
  renderKPIs();
  renderCalendar();
  renderYearlyGrid();
  renderEquityCurve();
  renderBreakdown();
}

/* ── All-time KPI stats ── */
function computeAllTimeStats() {
  const days      = Object.values(journalData);
  const greenDays = days.filter(d => d.pnl > 0);
  const redDays   = days.filter(d => d.pnl < 0);
  const totalPnl  = days.reduce((s, d) => s + d.pnl, 0);
  const tradingDays = greenDays.length + redDays.length;
  const winRate   = tradingDays > 0 ? ((greenDays.length / tradingDays) * 100).toFixed(0) : 0;
  const avgWin    = greenDays.length > 0 ? greenDays.reduce((s, d) => s + d.pnl, 0) / greenDays.length : 0;
  const avgLoss   = redDays.length > 0 ? Math.abs(redDays.reduce((s, d) => s + d.pnl, 0) / redDays.length) : 1;
  const ratio     = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '—';
  const totalTrades = days.reduce((s, d) => s + d.count, 0);

  // Long / Short split from individual trades
  let longs = 0, shorts = 0;
  for (const day of days) {
    for (const t of (day.trades || [])) {
      if ((t.direction || '').toLowerCase() === 'long') longs++;
      else shorts++;
    }
  }

  // Best / worst days
  const sorted = [...days].sort((a, b) => b.pnl - a.pnl);
  const bestDay  = sorted[0]  || null;
  const worstDay = sorted[sorted.length - 1] || null;
  const bestDate  = Object.entries(journalData).find(([,v]) => v === bestDay)?.[0]  || '—';
  const worstDate = Object.entries(journalData).find(([,v]) => v === worstDay)?.[0] || '—';

  const avgDaily = tradingDays > 0 ? totalPnl / tradingDays : 0;

  return {
    totalPnl, winRate, avgWin, avgLoss, ratio,
    totalTrades, tradingDays,
    greenDays: greenDays.length, redDays: redDays.length,
    longs, shorts,
    bestDay, bestDate, worstDay, worstDate, avgDaily
  };
}

function renderKPIs() {
  const s = computeAllTimeStats();
  const fmtPnl = (v) => {
    const abs = '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return v >= 0 ? '+' + abs : '-' + abs;
  };

  const pnlEl = document.getElementById('k-pnl');
  pnlEl.textContent = fmtPnl(s.totalPnl);
  pnlEl.className   = 'kpi-val ' + (s.totalPnl >= 0 ? 'green' : 'red');
  document.getElementById('k-pnl-sub').textContent = 'All time';

  document.getElementById('k-winrate').textContent     = s.winRate + '%';
  document.getElementById('k-winrate-sub').textContent = `${s.greenDays} green / ${s.redDays} red`;

  document.getElementById('k-ratio').textContent     = s.ratio + 'x';
  document.getElementById('k-trades').textContent    = s.totalTrades.toLocaleString();
  document.getElementById('k-trades-sub').textContent = s.tradingDays + ' trading days';
}

/* ── Monthly calendar ── */
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

  for (let i = 0; i < firstDay; i++) grid.appendChild(makeEl('div', 'cal-cell empty'));

  for (let d = 1; d <= daysInMonth; d++) {
    const ds   = isoDate(y, m, d);
    const day  = journalData[ds];
    const cell = makeEl('div', 'cal-cell');
    const dayNum = makeEl('span', 'cal-day-num');
    dayNum.textContent = d;
    cell.appendChild(dayNum);

    if (day) {
      const pnl    = day.pnl;
      const sign   = pnl >= 0 ? '+' : '';
      const pnlEl  = makeEl('span', 'cal-pnl');
      const trdEl  = makeEl('span', 'cal-trades');
      pnlEl.textContent = `${sign}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      trdEl.textContent = `${day.count} trade${day.count !== 1 ? 's' : ''}`;
      cell.appendChild(pnlEl);
      cell.appendChild(trdEl);
      cell.classList.add(pnl >= 0 ? 'green' : 'red');
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
  const rate  = (green + red) > 0 ? ((green / (green + red)) * 100).toFixed(0) : 0;

  const sign  = pnl >= 0 ? '+' : '';
  const pnlEl = document.getElementById('ms-pnl');
  pnlEl.textContent = `${sign}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  pnlEl.className   = 'ms-val ' + (pnl >= 0 ? 'green' : 'red');
  document.getElementById('ms-green').textContent = green;
  document.getElementById('ms-red').textContent   = red;
  document.getElementById('ms-rate').textContent  = rate + '%';
}

/* ── Yearly grid ── */
function renderYearlyGrid() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Aggregate by year-month
  const byYM = {};
  for (const [dateStr, day] of Object.entries(journalData)) {
    const [y, mo] = dateStr.split('-');
    const key = `${y}-${mo}`;
    if (!byYM[key]) byYM[key] = { pnl: 0, count: 0, days: 0 };
    byYM[key].pnl   += day.pnl;
    byYM[key].count += day.count;
    byYM[key].days  += 1;
  }

  const years = [...new Set(Object.keys(journalData).map(d => d.split('-')[0]))]
    .sort().reverse();

  const grid = document.getElementById('yearly-grid');
  grid.innerHTML = '';

  // Header row
  const hRow = document.createElement('div');
  hRow.className = 'yr-row';
  const hEmpty = document.createElement('div');
  hEmpty.className = 'yr-cell yr-head-col';
  hEmpty.textContent = 'Year';
  hRow.appendChild(hEmpty);
  months.forEach(mo => {
    const c = document.createElement('div');
    c.className = 'yr-cell yr-head-month';
    c.textContent = mo;
    hRow.appendChild(c);
  });
  grid.appendChild(hRow);

  // Data rows
  for (const yr of years) {
    const row = document.createElement('div');
    row.className = 'yr-row';

    const yrCell = document.createElement('div');
    yrCell.className = 'yr-cell yr-head-col';
    yrCell.textContent = yr;
    row.appendChild(yrCell);

    for (let mo = 1; mo <= 12; mo++) {
      const key  = `${yr}-${String(mo).padStart(2, '0')}`;
      const data = byYM[key];
      const cell = document.createElement('div');

      if (data) {
        cell.className = 'yr-cell ' + (data.pnl >= 0 ? 'yr-green' : 'yr-red');
        const abs  = Math.abs(data.pnl);
        const sign = data.pnl >= 0 ? '+' : '-';
        const disp = abs >= 1000 ? `${sign}$${(abs / 1000).toFixed(0)}K` : `${sign}$${abs.toFixed(0)}`;
        cell.innerHTML = `<span class="yr-pnl">${disp}</span><span class="yr-count">${data.count} trades</span>`;
      } else {
        cell.className = 'yr-cell yr-empty';
        cell.textContent = '—';
      }
      row.appendChild(cell);
    }
    grid.appendChild(row);
  }
}

/* ── Equity curve ── */
function renderEquityCurve() {
  const sorted = Object.entries(journalData).sort(([a], [b]) => a.localeCompare(b));
  if (sorted.length === 0) return;

  let cum = 0;
  const labels = [];
  const values = [];
  for (const [date, day] of sorted) {
    cum += day.pnl;
    labels.push(date);
    values.push(parseFloat(cum.toFixed(2)));
  }

  const finalVal = values[values.length - 1] || 0;
  const totalEl  = document.getElementById('equity-total');
  totalEl.textContent = (finalVal >= 0 ? '+$' : '-$') + Math.abs(finalVal).toLocaleString('en-US', { minimumFractionDigits: 2 });
  totalEl.style.color = finalVal >= 0 ? 'var(--win)' : 'var(--loss)';

  const canvas = document.getElementById('equity-chart');
  const ctx    = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(45,212,191,0.25)');
  gradient.addColorStop(1, 'rgba(45,212,191,0.01)');

  if (equityChart) equityChart.destroy();

  equityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: '#2dd4bf',
        borderWidth: 2,
        backgroundColor: gradient,
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
          titleColor: '#8899bb',
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
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: {
            color: '#8899bb',
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
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: {
            color: '#8899bb',
            font: { family: 'DM Sans', size: 10 },
            callback: (v) => {
              if (Math.abs(v) >= 1000) return (v >= 0 ? '+$' : '-$') + (Math.abs(v) / 1000).toFixed(0) + 'K';
              return (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(0);
            }
          },
          border: { display: false }
        }
      }
    }
  });
}

/* ── Breakdown stats ── */
function renderBreakdown() {
  const s = computeAllTimeStats();

  const total  = s.longs + s.shorts;
  const lPct   = total > 0 ? ((s.longs  / total) * 100) : 50;
  const sPct   = total > 0 ? ((s.shorts / total) * 100) : 50;
  document.getElementById('bd-long-fill').style.width  = lPct + '%';
  document.getElementById('bd-short-fill').style.width = sPct + '%';
  document.getElementById('bd-long-pct').textContent   = lPct.toFixed(0) + '%';
  document.getElementById('bd-short-pct').textContent  = sPct.toFixed(0) + '%';

  const fmtAmt = (v) => (v >= 0 ? '+$' : '-$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const fmtDate = (ds) => {
    if (!ds || ds === '—') return '—';
    const d = new Date(ds + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const bestEl = document.getElementById('bd-best-val');
  bestEl.textContent = s.bestDay ? fmtAmt(s.bestDay.pnl) : '—';
  document.getElementById('bd-best-date').textContent  = fmtDate(s.bestDate);

  const worstEl = document.getElementById('bd-worst-val');
  worstEl.textContent = s.worstDay ? fmtAmt(s.worstDay.pnl) : '—';
  document.getElementById('bd-worst-date').textContent = fmtDate(s.worstDate);

  const avgEl = document.getElementById('bd-avg-val');
  avgEl.textContent = fmtAmt(s.avgDaily);
  avgEl.className   = 'bd-big ' + (s.avgDaily >= 0 ? 'green' : 'red');
}

/* ── Day detail panel ── */
function openPanel(dateStr, day) {
  activeDateStr = dateStr;
  const d     = new Date(dateStr + 'T12:00:00');
  const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const pnl   = day.pnl;
  const sign  = pnl >= 0 ? '+' : '';

  document.getElementById('dp-date').textContent = label;
  const dpPnl = document.getElementById('dp-pnl');
  dpPnl.textContent = `${sign}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  dpPnl.className   = 'dp-pnl ' + (pnl >= 0 ? 'green' : 'red');
  document.getElementById('dp-count').textContent = `${day.count} trade${day.count !== 1 ? 's' : ''}`;

  const note = localStorage.getItem('pbf-note-' + dateStr) || '';
  document.getElementById('dp-note').value = note;
  const saveBtn = document.getElementById('dp-save-note');
  saveBtn.textContent = 'Save Note';
  saveBtn.classList.remove('saved');

  const list = document.getElementById('dp-trade-list');
  list.innerHTML = day.trades.map(t => {
    const p    = t.profit;
    const sign = p >= 0 ? '+$' : '-$';
    const pCls = p >= 0 ? 'pnl-pos' : 'pnl-neg';
    const dCls = (t.direction || '').toLowerCase() === 'long' ? 'dir-long' : 'dir-short';
    const time = (t.entryTime || '').split(' ').slice(1).join(' ');
    return `<div class="dp-trade-row">
      <span>${t.instrument || '—'} <small class="price">${time}</small></span>
      <span class="${dCls}">${t.direction || '—'}</span>
      <span class="price">${t.entryPrice || '—'}</span>
      <span class="price">${t.exitPrice  || '—'}</span>
      <span class="${pCls}">${sign}${Math.abs(p).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
    </div>`;
  }).join('');

  document.getElementById('day-panel').classList.add('active');
  document.getElementById('dp-overlay').classList.add('active');
}

function closePanel() {
  document.getElementById('day-panel').classList.remove('active');
  document.getElementById('dp-overlay').classList.remove('active');
  activeDateStr = null;
}

/* ── View tabs ── */
document.querySelectorAll('.view-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.getElementById('view-monthly').classList.toggle('view-hidden', view !== 'monthly');
    document.getElementById('view-yearly').classList.toggle('view-hidden',  view !== 'yearly');
    document.getElementById('month-stats').style.display = view === 'monthly' ? 'flex' : 'none';
  });
});

/* ── Notes ── */
document.getElementById('dp-save-note').addEventListener('click', () => {
  if (!activeDateStr) return;
  const note = document.getElementById('dp-note').value.trim();
  if (note) localStorage.setItem('pbf-note-' + activeDateStr, note);
  else localStorage.removeItem('pbf-note-' + activeDateStr);
  const btn = document.getElementById('dp-save-note');
  btn.textContent = '✓ Saved';
  btn.classList.add('saved');
});

/* ── Calendar nav ── */
document.getElementById('btn-prev').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
});
document.getElementById('btn-next').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
});
document.getElementById('dp-close').addEventListener('click', closePanel);
document.getElementById('dp-overlay').addEventListener('click', closePanel);

/* ── Helpers ── */
function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function makeEl(tag, cls) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

/* ── Boot ── */
loadJournalData();
