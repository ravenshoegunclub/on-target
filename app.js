/* On Target v1.0.0 — app shell
   Data below is EXAMPLE data so we can see the layout.
   It gets replaced by live data from the club sheet in the next step. */
'use strict';

const APP_VERSION = '1.0.0';

const EXAMPLE = {
  rangeStatus: 'Range open Saturday 8:30am',
  events: [
    { date: '2026-10-17', title: 'Competition day', detail: 'Pistol and rifle', time: '8:30am' },
    { date: '2026-10-25', title: 'Monthly clay shoot', detail: 'Clay target', time: 'Time to be confirmed' },
    { date: '2026-11-07', title: 'Safety course', detail: 'New members', time: '9:00am' }
  ],
  results: [
    { date: '2026-10-03', event: 'Standard Pistol', winner: 'Gordon', score: '422.2' },
    { date: '2026-10-03', event: 'IRB Rifle', winner: 'Peter', score: '192' },
    { date: '2026-09-19', event: 'Centrefire Pistol', winner: 'Anne', score: '548' }
  ],
  albums: [
    { title: 'Competition day', date: '2026-10-03', count: 24 },
    { title: 'Ulrich Cup Memorial', date: '2026-07-18', count: 41 },
    { title: 'Working bee', date: '2026-06-14', count: 12 }
  ],
  news: [
    { tag: 'From the committee', title: 'New look website, Facebook and Instagram', date: '2026-10-09' }
  ]
};

/* ---------- Icons ---------- */
const ICON = {
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></svg>',
  join: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="8" r="4"/><path d="M3 21c1.3-4 4-6 7-6s5.7 2 7 6"/><path d="M19 8v6M16 11h6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  fees: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 4"/><path d="M12 17h.01"/></svg>',
  news: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>',
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  web: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  rings: '<svg class="hero-rings" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48"/><circle cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="6" fill="currentColor"/></svg>'
};

/* ---------- Helpers ---------- */
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseDate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function shortDate(iso) { const d = parseDate(iso); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].charAt(0)}${MONTHS[d.getMonth()].slice(1).toLowerCase()}`; }
function daysUntil(iso) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((parseDate(iso) - today) / 86400000);
}
function whenLabel(n) { return n <= 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function upcomingEvents() {
  return EXAMPLE.events.filter(e => daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
}

function dateBlock(iso) {
  const d = parseDate(iso);
  return `<div class="date-block"><div class="m">${MONTHS[d.getMonth()]}</div><div class="d">${d.getDate()}</div></div>`;
}

/* Add to calendar: makes a small .ics file the phone's calendar can open */
function addToCalendar(ev) {
  const ymd = ev.date.replace(/-/g, '');
  const next = parseDate(ev.date); next.setDate(next.getDate() + 1);
  const ymd2 = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RDSS//On Target//EN', 'BEGIN:VEVENT',
    `UID:${ymd}-${ev.title.replace(/\W+/g, '')}@ravenshoegunclub.com.au`,
    `DTSTART;VALUE=DATE:${ymd}`, `DTEND;VALUE=DATE:${ymd2}`,
    `SUMMARY:RDSS ${ev.title}`, `DESCRIPTION:${ev.detail} · ${ev.time}`,
    'LOCATION:Ravenshoe & District Sporting Shooters range', 'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'rdss-event.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function shareEvent(ev) {
  const text = `RDSS ${ev.title}: ${shortDate(ev.date)}, ${ev.time}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'On Target', text, url: location.href.split('#')[0] + '#/events' }); } catch (e) { /* cancelled */ }
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    alert('Event details copied');
  }
}

const exampleNote = '<div class="example-note">Example content while the app is being built. Live club data comes next.</div>';

/* ---------- Views ---------- */
const VIEWS = {
  home() {
    const next = upcomingEvents()[0];
    const r = EXAMPLE.results.slice(0, 2);
    const n = EXAMPLE.news[0];
    return `
      <section class="hero">
        ${ICON.rings}
        <div class="status-pill"><span class="status-dot"></span>${esc(EXAMPLE.rangeStatus)}</div>
        <h1>Welcome to the club</h1>
      </section>
      ${next ? `
      <section class="card next-card" aria-label="Next at the range">
        <div class="row-between"><span class="eyebrow">Next at the range</span><span class="chip">${whenLabel(daysUntil(next.date))}</span></div>
        <div class="event-row">${dateBlock(next.date)}
          <div><div class="event-title">${esc(next.title)}</div><div class="muted">${DAYS[parseDate(next.date).getDay()]} · ${esc(next.detail)} · ${esc(next.time)}</div></div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" data-cal="0">${ICON.calendar}Add to calendar</button>
          <button type="button" class="btn btn-outline" data-share="0">${ICON.share}Share</button>
        </div>
      </section>` : ''}
      <nav class="tiles" aria-label="Quick links">
        <a class="tile" href="#/more"><span class="tile-ico">${ICON.join}</span>Join</a>
        <a class="tile" href="#/more"><span class="tile-ico">${ICON.pin}</span>Visit us</a>
        <a class="tile" href="#/more"><span class="tile-ico">${ICON.fees}</span>Fees</a>
        <a class="tile" href="#/more"><span class="tile-ico">${ICON.help}</span>FAQs</a>
      </nav>
      <section class="section">
        <div class="section-head"><h2>Latest results</h2><a href="#/results">All results</a></div>
        <div class="card list">${r.map(resultRow).join('')}</div>
      </section>
      <section class="section">
        <div class="section-head"><h2>Club news</h2><a href="#/more">See all</a></div>
        <div class="card list"><div class="list-row"><span class="list-ico">${ICON.news}</span>
          <div class="list-main"><div class="eyebrow">${esc(n.tag)}</div><div class="list-title">${esc(n.title)}</div><div class="muted">${shortDate(n.date)}</div></div></div></div>
      </section>
      ${exampleNote}`;
  },

  events() {
    const list = upcomingEvents();
    return `
      <div class="page-title"><h1>Events</h1><p class="muted">Competition days, training and club events</p></div>
      <section class="section">
        <div class="card list">
          ${list.map((ev, i) => `
            <div class="list-row">${dateBlock(ev.date)}
              <div class="list-main"><div class="list-title">${esc(ev.title)}</div><div class="muted">${esc(ev.detail)} · ${esc(ev.time)}</div></div>
              <button type="button" class="icon-btn" style="background:var(--tint);color:var(--accent)" data-cal="${i}" aria-label="Add ${esc(ev.title)} to calendar">${ICON.calendar}</button>
            </div>`).join('')}
        </div>
      </section>
      ${exampleNote}`;
  },

  results() {
    return `
      <div class="page-title"><h1>Results</h1><p class="muted">Winners from recent competition days</p></div>
      <section class="section"><div class="card list">${EXAMPLE.results.map(resultRow).join('')}</div></section>
      ${exampleNote}`;
  },

  photos() {
    return `
      <div class="page-title"><h1>Photos</h1><p class="muted">Albums from the range</p></div>
      <section class="section"><div class="photo-grid">
        ${EXAMPLE.albums.map(a => `
          <a class="card album" href="#/photos">
            <div class="album-img">${ICON.camera}</div>
            <div class="album-body"><div class="list-title">${esc(a.title)}</div><div class="muted">${shortDate(a.date)} · ${a.count} photos</div></div>
          </a>`).join('')}
      </div></section>
      ${exampleNote}`;
  },

  more() {
    const row = (icon, label, href) => `<a class="menu-row" href="${href}"><span class="tile-ico">${icon}</span>${label}${ICON.chev}</a>`;
    return `
      <div class="page-title"><h1>More</h1></div>
      <section class="section"><div class="card list">
        ${row(ICON.join, 'Join the club', 'https://ravenshoegunclub.com.au')}
        ${row(ICON.pin, 'Visit the range', 'https://ravenshoegunclub.com.au')}
        ${row(ICON.fees, 'Range days and fees', 'https://ravenshoegunclub.com.au')}
        ${row(ICON.help, 'FAQs', 'https://ravenshoegunclub.com.au')}
        ${row(ICON.news, 'Club news', '#/home')}
        ${row(ICON.doc, 'Club documents', 'https://ravenshoegunclub.com.au')}
        ${row(ICON.mail, 'Contact the club', 'https://ravenshoegunclub.com.au')}
        ${row(ICON.web, 'Club website', 'https://ravenshoegunclub.com.au')}
      </div></section>
      <p class="muted" style="text-align:center;margin:20px 16px 0">On Target v${APP_VERSION}</p>`;
  }
};

function resultRow(r) {
  return `<div class="list-row"><span class="list-ico">${ICON.trophy}</span>
    <div class="list-main"><div class="list-title">${esc(r.event)}</div><div class="muted">${shortDate(r.date)} · 1st ${esc(r.winner)}</div></div>
    <div class="score">${esc(r.score)}</div></div>`;
}

/* ---------- Router ---------- */
const view = document.getElementById('view');

function render() {
  const name = (location.hash.replace('#/', '') || 'home').split('/')[0];
  const page = VIEWS[name] ? name : 'home';
  view.innerHTML = VIEWS[page]();
  view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
  document.querySelectorAll('.tabbar a').forEach(a => {
    if (a.dataset.tab === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

view.addEventListener('click', e => {
  const cal = e.target.closest('[data-cal]');
  const shr = e.target.closest('[data-share]');
  if (cal) addToCalendar(upcomingEvents()[Number(cal.dataset.cal)]);
  if (shr) shareEvent(upcomingEvents()[Number(shr.dataset.share)]);
});

window.addEventListener('hashchange', render);
render();

/* ---------- Committee sheet ---------- */
const sheet = document.getElementById('sheet');
document.getElementById('committeeBtn').addEventListener('click', () => { sheet.hidden = false; document.getElementById('sheetClose').focus(); });
document.getElementById('sheetClose').addEventListener('click', () => { sheet.hidden = true; });
sheet.addEventListener('click', e => { if (e.target === sheet) sheet.hidden = true; });

/* ---------- Splash ---------- */
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('splash').classList.add('hide'), 500);
});

/* ---------- Offline support ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js?v=' + APP_VERSION));
}
