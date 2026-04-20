/* ============================================
   Profit by Faith — Trading Room Live System
   ============================================ */

const PBF = {
  CHANNEL_ID:  'UCCRTRjVQmrCqBcrM8VED-wg',
  API_KEY:     'AIzaSyDDqwBt8I8Fl_0Dyah9jKe9t4kawF_9Cf8',
  YT_HANDLE:   '@bullionaireDT',
  CHECK_INTERVAL: 300000, // check every 5 minutes (saves quota)
  liveVideoId: null,
  liveTimer:   null,
  pipActive:   false,
};

/* ── Detect if we're in the trading window (9:30–11:00 AM ET Mon–Fri) ── */
function isTradingHours() {
  const now = new Date();
  const et  = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const h   = et.getHours();
  const m   = et.getMinutes();
  const mins = h * 60 + m;
  return day >= 1 && day <= 5 && mins >= 9 * 60 + 30 && mins <= 11 * 60;
}

/* ── Next session countdown ── */
function getNextSessionTime() {
  const now = new Date();
  const et  = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const h   = et.getHours();
  const m   = et.getMinutes();
  const mins = h * 60 + m;
  const target = 9 * 60 + 45;

  let daysUntil = 0;
  if (day === 0) daysUntil = 1;
  else if (day === 6) daysUntil = 2;
  else if (mins >= target) daysUntil = day === 5 ? 3 : 1;

  const next = new Date(et);
  next.setDate(next.getDate() + daysUntil);
  next.setHours(9, 45, 0, 0);
  return next;
}

/* ── Format countdown ── */
function formatCountdown(ms) {
  if (ms <= 0) return { h: '00', m: '00', s: '00' };
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
  };
}

/* ── Check YouTube for active live stream via server-side proxy ── */
async function checkLiveStatus() {
  // Only check during trading hours to conserve API quota
  if (!isTradingHours()) return;

  try {
    const res  = await fetch('/api/live');
    const data = await res.json();

    if (data.live && data.videoId) {
      PBF.liveVideoId = data.videoId;
      enterLiveMode({ snippet: { title: data.title } });
    } else {
      PBF.liveVideoId = null;
      exitLiveMode();
    }
  } catch (e) {
    console.warn('PBF live check failed:', e);
  }
}

/* ── Enter LIVE MODE ── */
function enterLiveMode(video) {
  document.body.classList.add('live-mode');

  // Update pulse bar
  const bar = document.getElementById('pbf-live-bar');
  if (bar) {
    bar.classList.add('active');
    bar.querySelector('.lbar-text').textContent = '🔴 MR. BULLIONAIRE IS LIVE NOW — JOIN THE TRADING ROOM';
  }

  // Swap hero video for live stream
  const heroVideo = document.querySelector('.hero-video');
  if (heroVideo) heroVideo.style.opacity = '0';

  // Inject live iframe into hero
  let liveHero = document.getElementById('live-hero-frame');
  if (!liveHero) {
    liveHero = document.createElement('iframe');
    liveHero.id = 'live-hero-frame';
    liveHero.className = 'live-hero-frame';
    liveHero.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    liveHero.allowFullscreen = true;
    document.querySelector('.hero').appendChild(liveHero);
  }
  liveHero.src = `https://www.youtube.com/embed/${PBF.liveVideoId}?autoplay=1&mute=1&controls=0&loop=0&modestbranding=1`;
  liveHero.style.display = 'block';

  // Update hero content
  const heroH1 = document.querySelector('.hero h1');
  if (heroH1) heroH1.innerHTML = 'We Are <em>LIVE</em><br>Right Now.';

  const heroSub = document.querySelector('.hero-sub');
  if (heroSub) heroSub.textContent = 'Mr. Bullionaire is in the Trading Room — NQ Futures live right now. No signup needed. Just watch.';

  // Show floating PiP
  spawnPiP();

  // Update YouTube section
  const mainEmbed = document.querySelector('.yt-embed-wrap iframe');
  if (mainEmbed) mainEmbed.src = `https://www.youtube.com/embed/${PBF.liveVideoId}?autoplay=1&modestbranding=1`;

  // Send push notification if supported
  sendPushNotification(video.snippet.title);
}

/* ── Exit LIVE MODE ── */
function exitLiveMode() {
  document.body.classList.remove('live-mode');

  const bar = document.getElementById('pbf-live-bar');
  if (bar) bar.classList.remove('active');

  const liveHero = document.getElementById('live-hero-frame');
  if (liveHero) { liveHero.src = ''; liveHero.style.display = 'none'; }

  const heroVideo = document.querySelector('.hero-video');
  if (heroVideo) heroVideo.style.opacity = '1';

  destroyPiP();
}

/* ── Floating Picture-in-Picture player ── */
function spawnPiP() {
  if (PBF.pipActive || !PBF.liveVideoId) return;
  PBF.pipActive = true;

  const pip = document.createElement('div');
  pip.id = 'pbf-pip';
  pip.innerHTML = `
    <div class="pip-header">
      <span class="pip-live-dot"></span>
      <span>LIVE — Trading Room</span>
      <button class="pip-close" onclick="destroyPiP()">✕</button>
    </div>
    <iframe
      src="https://www.youtube.com/embed/${PBF.liveVideoId}?autoplay=1&mute=0&modestbranding=1"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen>
    </iframe>
    <a class="pip-open-yt" href="https://youtube.com/watch?v=${PBF.liveVideoId}" target="_blank" rel="noopener">
      Open Full Screen ↗
    </a>
  `;
  document.body.appendChild(pip);

  // Show pip when user scrolls past hero
  const hero = document.querySelector('.hero');
  const pipObserver = new IntersectionObserver((entries) => {
    pip.classList.toggle('visible', !entries[0].isIntersecting);
  }, { threshold: 0.1 });
  pipObserver.observe(hero);
}

function destroyPiP() {
  PBF.pipActive = false;
  const pip = document.getElementById('pbf-pip');
  if (pip) pip.remove();
}

/* ── Countdown clock ── */
function startCountdown() {
  const el = document.getElementById('pbf-countdown');
  if (!el) return;

  function tick() {
    const now  = new Date();
    const next = getNextSessionTime();
    const et   = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const diff = next - et;
    const { h, m, s } = formatCountdown(diff);

    const hEl = el.querySelector('.cd-h');
    const mEl = el.querySelector('.cd-m');
    const sEl = el.querySelector('.cd-s');
    if (hEl) hEl.textContent = h;
    if (mEl) mEl.textContent = m;
    if (sEl) sEl.textContent = s;
  }

  tick();
  setInterval(tick, 1000);
}

/* ── Web Push Notifications ── */
async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  await Notification.requestPermission();
}

function sendPushNotification(title) {
  if (Notification.permission !== 'granted') return;
  new Notification('🔴 Mr. Bullionaire is LIVE!', {
    body: title || 'Trading Room is open — NQ Futures live now. Join morning prayer & trade.',
    icon: '/assets/PBF-LOGO-MAIN.jpg',
    badge: '/assets/PBF-LOGO-MAIN.jpg',
  });
}

/* ── Notify Me button ── */
function setupNotifyBtn() {
  const btn = document.getElementById('notify-live-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await requestNotificationPermission();
    if (Notification.permission === 'granted') {
      btn.textContent = '🔔 You\'ll be notified when we go live!';
      btn.disabled = true;
      btn.style.background = 'rgba(45,212,191,0.2)';
      btn.style.color = '#2dd4bf';
      btn.style.borderColor = '#2dd4bf';
    } else {
      btn.textContent = '⚠ Please allow notifications in your browser';
    }
  });
}

/* ── Trade Dashboard ── */
async function loadTradeData() {
  try {
    const res  = await fetch('/api/trades');
    const data = await res.json();

    if (data.error && !data.stats) {
      document.getElementById('trade-tbody').innerHTML =
        `<tr><td colspan="6" class="trade-loading">${data.error}</td></tr>`;
      return;
    }

    if (data.stats) {
      const s = data.stats;
      setText('stat-wins',    s.wins);
      setText('stat-losses',  s.losses);
      setText('stat-winrate', s.winRate + '%');

      const pnlEl = document.getElementById('stat-pnl');
      if (pnlEl) {
        const val = parseFloat(s.totalPnl);
        pnlEl.textContent = (val >= 0 ? '+$' : '-$') + Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 });
        pnlEl.className = 'perf-num ' + (val >= 0 ? 'green' : 'red');
      }
    }

    if (data.trades && data.trades.length > 0) {
      const rows = data.trades.map(t => {
        const date = t.entryTime ? t.entryTime.split(' ')[0] : '—';
        const dir  = t.direction || '—';
        const pnl  = parseFloat(t.profit);
        const pnlStr = (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const pnlClass = pnl >= 0 ? 'trade-win' : 'trade-loss';
        const dirClass = dir.toLowerCase() === 'long' ? 'dir-long' : 'dir-short';
        return `<tr>
          <td>${date}</td>
          <td>${t.instrument || '—'}</td>
          <td class="${dirClass}">${dir}</td>
          <td>${t.entryPrice || '—'}</td>
          <td>${t.exitPrice  || '—'}</td>
          <td class="${pnlClass}">${pnlStr}</td>
        </tr>`;
      }).join('');
      document.getElementById('trade-tbody').innerHTML = rows;
    } else {
      document.getElementById('trade-tbody').innerHTML =
        '<tr><td colspan="6" class="trade-loading">No trades yet — check back after a session.</td></tr>';
    }

    const note = document.getElementById('trade-log-note');
    if (note && data.stats) note.textContent = `${data.stats.totalTrades} total trades · Last 20 shown`;

  } catch (e) {
    console.warn('PBF trade data failed:', e);
    document.getElementById('trade-tbody').innerHTML =
      '<tr><td colspan="6" class="trade-loading">Could not load trade data.</td></tr>';
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  startCountdown();
  setupNotifyBtn();
  checkLiveStatus();
  loadTradeData();
  PBF.liveTimer = setInterval(checkLiveStatus, PBF.CHECK_INTERVAL);
});
