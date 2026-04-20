/* ============================================
   Profit by Faith — Trade Journal Calendar
   ============================================ */

let journalData   = {};
let currentYear   = new Date().getFullYear();
let currentMonth  = new Date().getMonth();
let activeDateStr = null;

/* ── Load data from /api/journal ── */
async function loadJournalData() {
  try {
    const res  = await fetch('/api/journal');
    const data = await res.json();
    journalData = data.dates || {};
  } catch (e) {
    console.warn('Journal load failed:', e);
  }
  renderCalendar();
}

/* ── Render calendar for currentYear / currentMonth ── */
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

  // Empty leading cells
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(makeEl('div', 'cal-cell empty'));
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const ds   = isoDate(y, m, d);
    const day  = journalData[ds];
    const cell = makeEl('div', 'cal-cell');

    const dayNum = makeEl('span', 'cal-day-num');
    dayNum.textContent = d;
    cell.appendChild(dayNum);

    if (day) {
      const pnl     = day.pnl;
      const sign    = pnl >= 0 ? '+' : '';
      const pnlEl   = makeEl('span', 'cal-pnl');
      const tradesEl = makeEl('span', 'cal-trades');
      pnlEl.textContent    = `${sign}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      tradesEl.textContent = `${day.count} trade${day.count !== 1 ? 's' : ''}`;
      cell.appendChild(pnlEl);
      cell.appendChild(tradesEl);
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

/* ── Monthly stats ── */
function updateMonthStats(y, m) {
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  const days   = Object.entries(journalData)
    .filter(([d]) => d.startsWith(prefix))
    .map(([, v]) => v);

  const green  = days.filter(d => d.pnl > 0).length;
  const red    = days.filter(d => d.pnl < 0).length;
  const total  = days.reduce((s, d) => s + d.count, 0);
  const pnl    = days.reduce((s, d) => s + d.pnl, 0);
  const rate   = (green + red) > 0 ? ((green / (green + red)) * 100).toFixed(0) : 0;

  const pnlSign = pnl >= 0 ? '+' : '';
  const pnlEl   = document.getElementById('s-pnl');
  pnlEl.textContent  = `${pnlSign}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  pnlEl.className    = 'stat-val ' + (pnl >= 0 ? 'green' : 'red');
  document.getElementById('s-green').textContent  = green;
  document.getElementById('s-red').textContent    = red;
  document.getElementById('s-rate').textContent   = rate + '%';
  document.getElementById('s-trades').textContent = total;
}

/* ── Day detail panel ── */
function openPanel(dateStr, day) {
  activeDateStr = dateStr;

  const d      = new Date(dateStr + 'T12:00:00');
  const label  = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const pnl    = day.pnl;
  const sign   = pnl >= 0 ? '+' : '';

  document.getElementById('dp-date').textContent = label;
  const dpPnl = document.getElementById('dp-pnl');
  dpPnl.textContent = `${sign}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  dpPnl.className   = 'dp-pnl ' + (pnl >= 0 ? 'green' : 'red');

  document.getElementById('dp-count').textContent = `${day.count} trade${day.count !== 1 ? 's' : ''}`;

  // Load saved note
  const note = localStorage.getItem('pbf-note-' + dateStr) || '';
  document.getElementById('dp-note').value = note;
  const saveBtn = document.getElementById('dp-save-note');
  saveBtn.textContent = 'Save Note';
  saveBtn.classList.remove('saved');

  // Render trade rows
  const list = document.getElementById('dp-trade-list');
  list.innerHTML = day.trades.map(t => {
    const p     = t.profit;
    const sign  = p >= 0 ? '+$' : '-$';
    const pCls  = p >= 0 ? 'pnl-pos' : 'pnl-neg';
    const dCls  = (t.direction || '').toLowerCase() === 'long' ? 'dir-long' : 'dir-short';
    const time  = (t.entryTime || '').split(' ').slice(1).join(' ');
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

/* ── Notes (localStorage) ── */
document.getElementById('dp-save-note').addEventListener('click', () => {
  if (!activeDateStr) return;
  const note = document.getElementById('dp-note').value.trim();
  if (note) localStorage.setItem('pbf-note-' + activeDateStr, note);
  else localStorage.removeItem('pbf-note-' + activeDateStr);
  const btn = document.getElementById('dp-save-note');
  btn.textContent = '✓ Saved';
  btn.classList.add('saved');
});

/* ── Navigation ── */
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
