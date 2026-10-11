/* On Target v1.5.0 — app shell with live club data and committee tools
   Events, results and photos come from the club's public feed (the same one
   the website uses). Each list is saved on the phone, so it opens instantly
   and still works with no signal, then refreshes in the background. */
'use strict';

const APP_VERSION = '1.5.0';
const FEED_URL = 'https://script.google.com/macros/s/AKfycbynN-K_c3FSzsGzaKeh8cGusDD8UEbvX2QvDmq_TJY1epuzPz5phpa2AAVBx5-SytV7ig/exec';

const FEEDS = {
  events:  'feed=events&n=30',
  results: 'feed=results&all=1&n=12',
  photos:  'feed=photos&n=60'
};
const REFRESH_AFTER_MS = 2 * 60 * 1000; // matches the feed's own 2-minute cache

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
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  web: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  people: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 15c1.5.9 2.5 2.5 3 5"/></svg>',
  key: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  rings: '<svg class="hero-rings" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48"/><circle cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="6" fill="currentColor"/></svg>'
};

/* ---------- Helpers ---------- */
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function parseDate(iso) { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function mon(d) { return MONTHS[d.getMonth()].charAt(0) + MONTHS[d.getMonth()].slice(1).toLowerCase(); }
function shortDate(iso) { const d = parseDate(iso); return `${DAYS[d.getDay()]} ${d.getDate()} ${mon(d)}`; }
function longDate(iso) { const d = parseDate(iso); return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${mon(d)} ${d.getFullYear()}`; }
function daysUntil(iso) { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((parseDate(iso) - t) / 86400000); }
function whenLabel(n) { return n <= 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function joinDot(...parts) { return parts.filter(Boolean).map(esc).join(' · '); }
function placeLabel(p) { const n = Number(p); if (!n) return esc(p); const s = n % 100 > 10 && n % 100 < 14 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'); return n + s; }

function dateBlock(iso) {
  const d = parseDate(iso);
  return `<div class="date-block"><div class="m">${MONTHS[d.getMonth()]}</div><div class="d">${d.getDate()}</div></div>`;
}

/* Range days: Wednesday 8:30–11:30am and Saturday 8:30am–12:00pm */
function rangeStatus() {
  const now = new Date(), day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
  const close = { 3: 11 * 60 + 30, 6: 12 * 60 };
  if (close[day] && mins >= 8 * 60 + 30 && mins < close[day]) return { open: true, text: 'Range open now' };
  if (close[day] && mins < 8 * 60 + 30) return { open: false, text: 'Range opens today 8:30am' };
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (close[d]) return { open: false, text: `Next range day ${i === 1 ? 'tomorrow' : DAYS_LONG[d]} 8:30am` };
  }
  return { open: false, text: '' };
}

/* ---------- Live data ---------- */
const store = {
  get(kind) { try { return JSON.parse(localStorage.getItem('ot:' + kind)); } catch (e) { return null; } },
  set(kind, data) { try { localStorage.setItem('ot:' + kind, JSON.stringify({ t: Date.now(), data })); } catch (e) { /* storage full or blocked */ } }
};

const DATA = {};      // kind -> data
const FAILED = {};    // kind -> true when the last fetch failed and nothing is saved
const loading = {};

Object.keys(FEEDS).forEach(k => { const s = store.get(k); if (s) DATA[k] = s.data; });

async function refresh(kind, force) {
  const saved = store.get(kind);
  if (!force && saved && Date.now() - saved.t < REFRESH_AFTER_MS) return;
  if (loading[kind]) return;
  loading[kind] = true;
  try {
    const res = await fetch(`${FEED_URL}?${FEEDS[kind]}&v=${APP_VERSION}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const changed = JSON.stringify(data) !== JSON.stringify(DATA[kind]);
    DATA[kind] = data; FAILED[kind] = false;
    store.set(kind, data);
    if (changed) render(true);
  } catch (e) {
    console.warn('Could not load ' + kind, e);
    if (!DATA[kind]) { FAILED[kind] = true; render(true); }
  } finally {
    loading[kind] = false;
  }
}
function refreshAll(force) { Object.keys(FEEDS).forEach(k => refresh(k, force)); }

const events = () => (DATA.events && DATA.events.events) || [];
const days = () => (DATA.results && DATA.results.days) || [];
const photos = () => (DATA.photos && DATA.photos.photos) || [];

/* ---------- Shared bits ---------- */
function skeletonRows(n) {
  return `<div class="card list" aria-busy="true">${Array.from({ length: n }, () =>
    '<div class="list-row"><span class="skel skel-circle"></span><div class="list-main"><span class="skel skel-line"></span><span class="skel skel-line short"></span></div></div>').join('')}</div>`;
}
function problem(kind) {
  return `<div class="card empty"><div class="empty-title">Can't reach the club data</div>
    <p class="muted">Check your signal and try again.</p>
    <button type="button" class="btn btn-outline" data-retry="${kind}">${ICON.refresh}Try again</button></div>`;
}
function empty(title, text) {
  return `<div class="card empty"><div class="empty-title">${esc(title)}</div><p class="muted">${esc(text)}</p></div>`;
}
function state(kind, n, build) {
  if (DATA[kind]) return build();
  if (FAILED[kind]) return problem(kind);
  return skeletonRows(n);
}

/* Add to calendar: makes a small .ics file the phone's calendar can open */
function addToCalendar(ev) {
  const ymd = ev.date.replace(/-/g, '');
  const next = parseDate(ev.date); next.setDate(next.getDate() + 1);
  const ymd2 = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`;
  const icsText = s => String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RDSS//On Target//EN', 'BEGIN:VEVENT',
    `UID:${ymd}-${String(ev.title).replace(/\W+/g, '')}@ravenshoegunclub.com.au`,
    `DTSTART;VALUE=DATE:${ymd}`, `DTEND;VALUE=DATE:${ymd2}`,
    `SUMMARY:${icsText('RDSS ' + ev.title)}`,
    `DESCRIPTION:${icsText([ev.start && 'Starts ' + ev.start, ev.discipline, ev.description].filter(Boolean).join('\n'))}`,
    'LOCATION:Ravenshoe & District Sporting Shooters range', 'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'rdss-event.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function shareEvent(ev) {
  const text = `RDSS ${ev.title}: ${shortDate(ev.date)}${ev.start ? ', ' + ev.start : ''}`;
  const url = location.href.split('#')[0] + '#/events';
  if (navigator.share) {
    try { await navigator.share({ title: 'On Target', text, url }); } catch (e) { /* cancelled */ }
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text + ' ' + url);
    alert('Event details copied');
  }
}

/* ---------- Views ---------- */
const VIEWS = {
  home() {
    const rs = rangeStatus();
    const next = events()[0];
    const latest = days()[0];
    const pics = photos().slice(0, 4);
    return `
      <section class="hero">
        ${ICON.rings}
        ${rs.text ? `<div class="status-pill"><span class="status-dot${rs.open ? '' : ' closed'}"></span>${esc(rs.text)}</div>` : ''}
        <h1>Welcome to the club</h1>
      </section>
      <section class="card next-card" aria-label="Next at the range">
        ${DATA.events ? (next ? `
          <div class="row-between"><span class="eyebrow">Next at the range</span><span class="chip">${whenLabel(daysUntil(next.date))}</span></div>
          <div class="event-row">${dateBlock(next.date)}
            <div><div class="event-title">${esc(next.title)}</div><div class="muted">${joinDot(DAYS[parseDate(next.date).getDay()], next.discipline, next.start)}</div></div>
          </div>
          <div class="btn-row">
            <button type="button" class="btn btn-primary" data-cal="0">${ICON.calendar}Add to calendar</button>
            <button type="button" class="btn btn-outline" data-share="0">${ICON.share}Share</button>
          </div>` : `<span class="eyebrow">Next at the range</span><div class="muted">No events posted yet. Check back soon.</div>`)
        : FAILED.events ? `<span class="eyebrow">Next at the range</span><div class="muted">Can't load events right now.</div>`
        : `<span class="eyebrow">Next at the range</span><span class="skel skel-line"></span><span class="skel skel-line short"></span>`}
      </section>
      <nav class="tiles" aria-label="Quick links">
        <a class="tile" href="https://ravenshoegunclub.com.au" target="_blank" rel="noopener"><span class="tile-ico">${ICON.join}</span>Join</a>
        <a class="tile" href="https://ravenshoegunclub.com.au" target="_blank" rel="noopener"><span class="tile-ico">${ICON.pin}</span>Visit us</a>
        <a class="tile" href="https://ravenshoegunclub.com.au" target="_blank" rel="noopener"><span class="tile-ico">${ICON.fees}</span>Fees</a>
        <a class="tile" href="https://ravenshoegunclub.com.au" target="_blank" rel="noopener"><span class="tile-ico">${ICON.help}</span>FAQs</a>
      </nav>
      <section class="section">
        <div class="section-head"><h2>Latest results</h2><a href="#/results">All results</a></div>
        ${state('results', 2, () => latest ? `
          <div class="muted">${longDate(latest.date)}</div>
          <div class="card list">${latest.competitions.slice(0, 4).map(winnerRow).join('')}</div>`
          : empty('No results yet', 'Results appear here after each competition day.'))}
      </section>
      <section class="section">
        <div class="section-head"><h2>Latest photos</h2><a href="#/photos">All photos</a></div>
        ${state('photos', 1, () => pics.length ? `
          <div class="thumb-strip">${pics.map((p, i) => thumb(p, i)).join('')}</div>`
          : empty('No photos yet', 'Photos from the range appear here.'))}
      </section>`;
  },

  events() {
    if (session && !PRIVATE) loadPrivate();
    const list = eventsShown();
    return `
      <div class="page-title"><h1>Events</h1><p class="muted">Competition days, training and club events</p></div>
      <section class="section">
        ${state('events', 4, () => list.length ? `<div class="card list">
          ${list.map((ev, i) => `
            <div class="list-row">${dateBlock(ev.date)}
              <div class="list-main">
                <div class="list-title">${esc(ev.title)}${ev.audience ? ' ' + badge(ev.audience) : ''}</div>
                <div class="muted">${joinDot(DAYS[parseDate(ev.date).getDay()], ev.start, ev.discipline)}</div>
                ${ev.description ? `<div class="muted desc">${esc(ev.description)}</div>` : ''}
              </div>
              <button type="button" class="icon-btn soft" data-cal="${i}" aria-label="Add ${esc(ev.title)} to calendar">${ICON.calendar}</button>
            </div>`).join('')}
        </div>` : empty('No upcoming events', 'New events appear here as soon as the committee posts them.'))}
      </section>`;
  },

  results() {
    return `
      <div class="page-title"><h1>Results</h1><p class="muted">Every competition day, newest first</p></div>
      ${state('results', 4, () => days().length ? days().map((d, di) => `
        <section class="section">
          <h2 class="day-head">${longDate(d.date)}</h2>
          ${d.competitions.map(c => `
            <details class="card comp"${di === 0 ? ' open' : ''}>
              <summary>
                <span class="list-ico">${ICON.trophy}</span>
                <span class="list-main"><span class="list-title">${esc(c.competition)}</span>
                  <span class="muted">${joinDot(c.discipline, c.rows[0] && '1st ' + c.rows[0].shooter)}</span></span>
                ${ICON.chev}
              </summary>
              <table class="result-table">
                <thead><tr><th scope="col">Place</th><th scope="col">Shooter</th><th scope="col">Class</th><th scope="col" class="num">Score</th></tr></thead>
                <tbody>${c.rows.map(r => `<tr><td>${placeLabel(r.place)}</td><td>${esc(r.shooter)}</td><td>${esc(r['class'])}</td><td class="num">${esc(r.score)}</td></tr>`).join('')}</tbody>
              </table>
            </details>`).join('')}
        </section>`).join('') : `<section class="section">${empty('No results yet', 'Results appear here after each competition day.')}</section>`)}`;
  },

  photos() {
    const groups = [];
    photos().forEach((p, i) => {
      const key = p.album + '|' + p.date;
      let g = groups.find(x => x.key === key);
      if (!g) { g = { key, album: p.album, date: p.date, items: [] }; groups.push(g); }
      g.items.push({ p, i });
    });
    return `
      <div class="page-title"><h1>Photos</h1><p class="muted">From the range</p></div>
      ${state('photos', 3, () => groups.length ? groups.map(g => `
        <section class="section">
          <div class="section-head"><h2>${esc(g.album)}</h2><span class="muted">${shortDate(g.date)}</span></div>
          <div class="photo-grid">${g.items.map(x => thumb(x.p, x.i)).join('')}</div>
        </section>`).join('') : `<section class="section">${empty('No photos yet', 'Photos from the range appear here.')}</section>`)}`;
  },

  more() {
    const row = (icon, label, href) => `<a class="menu-row" href="${href}" target="_blank" rel="noopener"><span class="tile-ico">${icon}</span>${label}${ICON.chev}</a>`;
    return `
      <div class="page-title"><h1>More</h1></div>
      <section class="section"><div class="card list">
        ${row(ICON.join, 'Join the club', 'https://ravenshoegunclub.com.au')}
        ${row(ICON.pin, 'Visit the range', 'https://ravenshoegunclub.com.au')}
        ${row(ICON.fees, 'Range days and fees', 'https://ravenshoegunclub.com.au')}
        ${row(ICON.help, 'FAQs', 'https://ravenshoegunclub.com.au')}
        ${row(ICON.doc, 'Club documents', 'https://ravenshoegunclub.com.au')}
        ${row(ICON.mail, 'Contact the club', 'mailto:info@ravenshoegunclub.com.au')}
        ${row(ICON.web, 'Club website', 'https://ravenshoegunclub.com.au')}
      </div></section>
      <section class="section">
        <button type="button" class="btn btn-outline" data-refresh>${ICON.refresh}Refresh club data</button>
      </section>
      <p class="muted" style="text-align:center;margin:20px 16px 0">On Target v${APP_VERSION}</p>`;
  },

  committee(sub) {
    if (!session) return `
      <div class="page-title"><h1>Committee</h1></div>
      <section class="section"><div class="card empty">
        <div class="empty-title">Please sign in</div>
        <p class="muted">This part of the app is for committee members.</p>
        <button type="button" class="btn btn-primary btn-big" data-signin>Committee sign-in</button>
      </div></section>`;
    if (sub === 'event') return posted ? eventPosted() : eventForm();
    if (sub === 'results') return posted ? resultsPosted() : resultsForm();
    if (sub === 'photos') return posted ? photosAdded() : photosForm();
    if (sub === 'manage') return manageView();
    if (sub === 'edit') {
      if (!editing) { location.replace('#/committee/manage'); return ''; } // e.g. the page was reloaded
      return editing.kind === 'event' ? eventForm(editing.item) : editing.kind === 'results' ? resultsForm(editing.item) : photoEditForm(editing.item);
    }
    const soon = (icon, label) => `<button type="button" class="menu-row" data-soon><span class="tile-ico">${icon}</span>${label}${ICON.chev}</button>`;
    return `
      <div class="page-title"><h1>Committee</h1>
        <div class="who"><span class="muted">Signed in as ${esc(session.name)}${session.admin ? ' · Admin' : ''}</span>
          <button type="button" class="btn btn-outline" data-signout>Sign out</button></div>
      </div>
      <section class="section">
        <div class="section-head"><h2>Post to the app and website</h2></div>
        <div class="post-tiles">
          <a class="tile" href="#/committee/event"><span class="tile-ico">${ICON.calendar}</span>Event</a>
          <a class="tile" href="#/committee/results"><span class="tile-ico">${ICON.trophy}</span>Results</a>
          <a class="tile" href="#/committee/photos"><span class="tile-ico">${ICON.camera}</span>Photos</a>
        </div>
      </section>
      <section class="section"><div class="card list">
        ${soon(ICON.mail, 'Messages')}
        <a class="menu-row" href="#/committee/manage"><span class="tile-ico">${ICON.doc}</span>Manage posts${ICON.chev}</a>
      </div></section>
      ${session.admin ? `<section class="section">
        <div class="section-head"><h2>Admin</h2></div>
        <div class="card list">
          ${soon(ICON.fees, 'Payments to confirm')}
          ${soon(ICON.people, 'Members')}
          ${soon(ICON.key, 'People and PINs')}
        </div>
      </section>` : ''}`;
  }
};

const DISCIPLINES = ['Pistol', 'Rifle', 'Clay target', 'Shotgun', 'Training', 'Safety course', 'Working bee', 'Social'];
let posted = false; // true while the "Event posted", "Results posted" or "Photos added" message is showing

/* Who can see an event. "Hidden" only exists for older events with Show = No in the Sheet. */
const AUDIENCES = [
  ['Everyone', 'Everyone', 'Shown on the website and in the app.'],
  ['Members', 'Members only', 'Only signed-in members and committee. Not on the website.'],
  ['Committee', 'Committee only', 'Only signed-in committee. Not on the website.'],
  ['Hidden', 'Hidden', 'Not shown anywhere. Choose one of the others to show it.']
];
const badge = audience => `<span class="badge badge-${audience.toLowerCase()}">${audience}</span>`;
let postedText = '';

/* `item` is the event being edited (from Manage posts), or nothing for a new one */
function eventForm(item) {
  const ev = item || { audience: 'Everyone' };
  const v = k => esc(ev[k] || '');
  return `
    <div class="page-title">${item ? `<a class="back-link" href="#/committee/manage">${ICON.chev}Manage posts</a><h1>Edit event</h1>`
      : `<a class="back-link" href="#/committee">${ICON.chev}Committee</a><h1>Post an event</h1>`}</div>
    <section class="section"><form class="card form" id="eventForm" novalidate>
      <label class="field-label" for="evDate">Date</label>
      ${dateField('evDate', item ? ev.date : nextSaturday())}
      <label class="field-label" for="evStart">Start time <span class="field-hint">for example 8:30am</span></label>
      <input class="field" id="evStart" maxlength="30" autocomplete="off" value="${v('start')}">
      <label class="field-label" for="evTitle">Title</label>
      <input class="field" id="evTitle" maxlength="80" autocomplete="off" value="${v('title')}" required>
      <label class="field-label" for="evDisc">Discipline <span class="field-hint">choose one or type your own</span></label>
      <input class="field" id="evDisc" maxlength="40" list="evDiscList" autocomplete="off" value="${v('discipline')}">
      <datalist id="evDiscList">${DISCIPLINES.map(d => `<option value="${d}"></option>`).join('')}</datalist>
      <label class="field-label" for="evDesc">Description <span class="field-hint">targets, distances, fees, what to bring</span></label>
      <textarea class="field" id="evDesc" maxlength="400">${v('description')}</textarea>
      <fieldset class="choices">
        <legend class="field-label">Who can see this?</legend>
        ${AUDIENCES.filter(a => a[0] !== 'Hidden' || ev.audience === 'Hidden').map(a => `
          <label class="choice"><input type="radio" name="evAudience" value="${a[0]}"${a[0] === ev.audience ? ' checked' : ''}>
            <span><span class="choice-title">${a[1]}</span><span class="choice-text">${a[2]}</span></span></label>`).join('')}
      </fieldset>
      <p class="form-error" id="evError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="evSubmit">${item ? 'Save changes' : 'Post event'}</button>
      ${item ? `<button type="button" class="btn btn-danger btn-big" data-delete>Delete event</button>` : ''}
    </form></section>`;
}

function eventPosted() {
  return `
    <div class="page-title"><h1>Post an event</h1></div>
    <section class="section"><div class="card empty" role="status">
      <span class="done-ico">${ICON.check}</span>
      <div class="empty-title">Event posted</div>
      <p class="muted">${esc(postedText)}</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary btn-big" data-another>Post another event</button>
        <a class="btn btn-outline btn-big" href="#/committee">Back to Committee</a>
      </div>
    </div></section>`;
}

/* ---------- Private events (members-only and committee-only), for signed-in committee ---------- */
let PRIVATE = null;          // from the server; kept in memory only, never saved on the phone
let privateLoading = false;

async function loadPrivate() {
  if (privateLoading || !session) return;
  privateLoading = true;
  try { const list = await committeeApi('privateEvents'); PRIVATE = Array.isArray(list) ? list : []; } catch (e) { /* the public events still show */ }
  privateLoading = false;
  if (PRIVATE && currentPage === 'events') render(true);
}
/* The Events tab: public events, plus upcoming private ones (with a badge) when the committee is signed in */
function eventsShown() {
  const today = todayIso();
  const extra = session && PRIVATE ? PRIVATE.filter(e => e.date >= today) : [];
  return [...events(), ...extra].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}

/* ---------- Manage posts ---------- */
let MANAGE = null;           // {events, results, photos, privateEvents} from the server; memory only
let manageState = '', manageAt = 0, manageTab = 'events', manageNote = '';
let editing = null;          // {kind: 'event' | 'results' | 'photo', item} while an edit screen is open
const MANAGE_TABS = [['events', 'Events'], ['results', 'Results'], ['photos', 'Photos']];

async function loadManage() {
  if (manageState === 'loading' || !session) return;
  manageState = 'loading';
  try {
    const d = await committeeApi('manageItems') || {};
    MANAGE = { events: d.events || [], results: d.results || [], photos: d.photos || [], privateEvents: d.privateEvents || [] };
    manageAt = Date.now(); manageState = '';
  }
  catch (e) { if (e.signedOut) { manageState = ''; return; } manageState = 'failed'; }
  if (currentPage === 'committee/manage') render(true);
}

/* Public events (Everyone or Hidden) and private ones (Members or Committee) in one list, newest first */
function manageEvents() {
  const pub = MANAGE.events.map(e => ({ ...e, source: 'public', audience: e.show === false ? 'Hidden' : 'Everyone' }));
  const priv = (MANAGE.privateEvents || []).map(e => ({ ...e, source: 'private' }));
  return [...pub, ...priv].sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
}

function manageView() {
  if (!MANAGE && manageState !== 'failed') loadManage();
  const list = () => {
    if (manageTab === 'events') {
      const evs = manageEvents();
      return evs.length ? `<div class="card list">${evs.map((ev, i) => `
        <button type="button" class="list-row manage-row" data-edit="event:${i}">${ev.date ? dateBlock(ev.date) : ''}
          <span class="list-main"><span class="list-title">${esc(ev.title || 'No title')}</span>
            <span class="muted">${joinDot(ev.date && shortDate(ev.date) + ' ' + parseDate(ev.date).getFullYear(), ev.start, ev.discipline)}</span>
            ${badge(ev.audience)}</span>${ICON.chev}</button>`).join('')}</div>`
        : empty('No events yet', 'Events you post appear here.');
    }
    if (manageTab === 'results') {
      return MANAGE.results.length ? `<div class="card list">${MANAGE.results.map((g, i) => `
        <button type="button" class="list-row manage-row" data-edit="results:${i}"><span class="list-ico">${ICON.trophy}</span>
          <span class="list-main"><span class="list-title">${esc(g.competition || 'No name')}</span>
            <span class="muted">${joinDot(g.date && shortDate(g.date) + ' ' + parseDate(g.date).getFullYear(), g.discipline, g.rows.length + (g.rows.length === 1 ? ' shooter' : ' shooters'))}</span></span>${ICON.chev}</button>`).join('')}</div>`
        : empty('No results yet', 'Results you post appear here.');
    }
    return MANAGE.photos.length ? `<p class="muted">Tap a photo to change its album, date or caption, or to delete it.</p>
      <div class="photo-grid">${MANAGE.photos.map((p, i) => `
        <button type="button" class="thumb" data-edit="photo:${i}" aria-label="Edit photo ${i + 1}: ${esc(p.album)}, ${esc(p.date && shortDate(p.date))}">
          <img src="${esc(p.thumb)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`
      : empty('No photos yet', 'Photos you add appear here.');
  };
  return `
    <div class="page-title"><a class="back-link" href="#/committee">${ICON.chev}Committee</a><h1>Manage posts</h1></div>
    <section class="section">
      ${manageNote ? `<p class="notice" role="status">${esc(manageNote)}</p>` : ''}
      <div class="seg" role="group" aria-label="What to manage">${MANAGE_TABS.map(t => `
        <button type="button" data-mtab="${t[0]}" aria-pressed="${t[0] === manageTab}">${t[1]}</button>`).join('')}</div>
      ${MANAGE ? list() : manageState === 'failed' ? `<div class="card empty"><div class="empty-title">Can't load the posts</div>
        <p class="muted">Check your signal and try again.</p>
        <button type="button" class="btn btn-outline" data-manage-reload>${ICON.refresh}Try again</button></div>` : skeletonRows(5)}
      ${MANAGE ? `<button type="button" class="btn btn-outline" data-manage-reload>${ICON.refresh}Reload the list</button>` : ''}
    </section>`;
}

function photoEditForm(p) {
  return `
    <div class="page-title"><a class="back-link" href="#/committee/manage">${ICON.chev}Manage posts</a><h1>Edit photo</h1></div>
    <section class="section"><form class="card form" id="photoEditForm" novalidate>
      <img class="edit-photo" src="${esc(p.thumb)}" alt="${esc(p.caption || p.album)}">
      <label class="field-label" for="peAlbum">Album <span class="field-hint">choose one or type a new one</span></label>
      <input class="field" id="peAlbum" maxlength="60" list="phAlbumList" autocomplete="off" value="${esc(p.album)}">
      <datalist id="phAlbumList">${SUGGEST.phAlbumList()}</datalist>
      <label class="field-label" for="peDate">Date</label>
      ${dateField('peDate', p.date)}
      <label class="field-label" for="peCaption">Caption <span class="field-hint">optional</span></label>
      <input class="field" id="peCaption" maxlength="200" autocomplete="off" value="${esc(p.caption)}">
      <p class="form-error" id="peError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="peSubmit">Save changes</button>
      <button type="button" class="btn btn-danger btn-big" data-delete>Delete photo</button>
    </form></section>`;
}

/* After anything is saved or deleted: forget the lists (they are reloaded), refresh the public data, go back to Manage posts */
let skipLeaveCheck = false;
function go(hash) {
  if (location.hash === hash) return render();
  skipLeaveCheck = true;
  location.hash = hash;
}
function changed(kind, note) {
  MANAGE = null; PRIVATE = null; manageState = ''; manageNote = note || '';
  refresh(kind, true);
  setTimeout(() => refresh(kind, true), REFRESH_AFTER_MS + 10000); // the feed keeps its old copy for 2 minutes
}
const CONFLICT = /Someone else has just changed this/i;
const CONFLICT_NOTE = 'Someone else has just changed this, so nothing was saved. The list below is up to date. Please try again.';

/* Runs a save from an edit screen: button shows it is working; a conflict reloads the list; other errors show on the form */
async function saveEdit(form, kind, call, doneNote) {
  const btn = form.querySelector('[type="submit"]'), error = form.querySelector('.form-error'), label = btn.textContent;
  if (btn.disabled) return;
  error.hidden = true;
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await call();
    changed(kind, doneNote);
    go('#/committee/manage');
  } catch (err) {
    if (err.signedOut) return;
    if (CONFLICT.test(err.message)) { changed(kind, CONFLICT_NOTE); return go('#/committee/manage'); }
    btn.disabled = false; btn.textContent = label;
    error.textContent = err.message; error.hidden = false;
  }
}

async function savePhotoEdit(form) {
  const p = editing.item, error = form.querySelector('#peError');
  const meta = { album: form.querySelector('#peAlbum').value.trim(), date: form.querySelector('#peDate').value, caption: form.querySelector('#peCaption').value.trim() };
  if (!meta.date) { error.textContent = 'Please choose the date.'; error.hidden = false; return form.querySelector('#peDate').focus(); }
  saveEdit(form, 'photos', () => committeeApi('updatePhoto', [p.row, p.fp, meta]), 'Photo updated.');
}

/* Delete: always asks first, in plain words */
function askDelete() {
  const it = editing.item, rows = it.rows || [];
  const what = editing.kind === 'event' ? ['Delete this event?', `This removes "${it.title}" from the app${it.source === 'public' ? ' and the website' : ''}.`, 'events',
      () => committeeApi(it.source === 'private' ? 'deletePrivateEvent' : 'deleteEvent', [it.row, it.fp]), 'Event deleted.']
    : editing.kind === 'results' ? ['Delete these results?', `This removes ${rows.length === 1 ? 'the result' : 'all ' + rows.length + ' results'} for "${it.competition}" from the website and the app.`, 'results',
      () => committeeApi('deleteResults', [rows.map(r => ({ row: r.row, fp: r.fp }))]), 'Results deleted.']
    : ['Delete this photo?', 'This removes the photo from the gallery on the website and the app.', 'photos',
      () => committeeApi('deletePhoto', [it.row, it.fp]), 'Photo deleted.'];
  document.getElementById('confirmTitle').textContent = what[0];
  document.getElementById('confirmText').textContent = what[1] + ' It cannot be undone in the app.';
  const yes = document.getElementById('confirmYes'), error = document.getElementById('confirmError');
  error.hidden = true; yes.disabled = false; yes.textContent = 'Yes, delete it';
  yes.onclick = async () => {
    if (yes.disabled) return;
    yes.disabled = true; yes.textContent = 'Deleting…'; error.hidden = true;
    try {
      await what[3]();
      sheetOpener = null; closeSheets();
      changed(what[2], what[4]);
      go('#/committee/manage');
    } catch (err) {
      if (err.signedOut) return;
      if (CONFLICT.test(err.message)) { sheetOpener = null; closeSheets(); changed(what[2], CONFLICT_NOTE); return go('#/committee/manage'); }
      yes.disabled = false; yes.textContent = 'Yes, delete it';
      error.textContent = err.message; error.hidden = false;
    }
  };
  openSheet(confirmSheet, document.getElementById('confirmNo'));
}

/* ---------- Post results ---------- */
let MEMBERS = null;          // [{id, name, short}] from the server; kept in memory only, never saved on the phone
let membersFailed = false, membersLoading = false;
let sameDay = null;          // {date, discipline} carried over by "Add another competition for the same day"

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const nextSaturday = () => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/* A date box. iPhones show an empty one as a blank box, so it gets its own "Tap to choose a date" hint. */
const dateField = (id, value) => `<div class="date-wrap${value ? '' : ' no-date'}"><input class="field" type="date" id="${id}" value="${esc(value || '')}" required><span class="date-hint" aria-hidden="true">Tap to choose a date</span></div>`;
const uniq = list => { const seen = new Set(); return list.map(v => String(v || '').trim()).filter(v => v && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase())); };
const options = list => list.map(v => `<option value="${esc(v)}"></option>`).join('');
const pastComps = () => days().flatMap(d => d.competitions);

/* Member to link a typed name to: the full name must match exactly one member */
function memberFor(name) {
  const key = String(name || '').trim().toLowerCase();
  const hits = key && MEMBERS ? MEMBERS.filter(m => m.name.toLowerCase() === key) : [];
  return hits.length === 1 ? hits[0] : null;
}
function shooterOptions() {
  const members = MEMBERS || [];
  const taken = new Set(members.map(m => m.name.toLowerCase()));
  const past = uniq(pastComps().flatMap(c => c.rows.map(r => r.shooter))).filter(n => !taken.has(n.toLowerCase())).sort((a, b) => a.localeCompare(b));
  return members.map(m => `<option value="${esc(m.name)}" label="Club member"></option>`).join('') + options(past);
}

/* Suggestion lists (by datalist id). Kept up to date when fresh club data arrives while a form is open. */
const SUGGEST = {
  rsDiscList: () => options(uniq(pastComps().map(c => c.discipline))),
  rsCompList: () => options(uniq(pastComps().map(c => c.competition))),
  rsClassList: () => options(uniq(pastComps().flatMap(c => c.rows.map(r => r['class'])))),
  rsShooterList: shooterOptions,
  phAlbumList: () => options(uniq(['Around the range', ...photos().map(p => p.album)]))
};
function refreshSuggestions() {
  Object.keys(SUGGEST).forEach(id => { const list = document.getElementById(id); if (list) list.innerHTML = SUGGEST[id](); });
}

/* `r` is an existing result row when editing; its member link is kept for as long as the name is not changed */
function shooterRow(r) {
  r = r || {};
  return `<div class="rs-row" role="group"${r.memberId ? ` data-member-id="${esc(r.memberId)}" data-linked="${esc(r.shooter)}"` : ''}>
    <label class="field-label rs-shooter"><span class="chip rs-place"></span> Shooter
      <input class="field" data-f="shooter" list="rsShooterList" maxlength="60" autocomplete="off" autocapitalize="words" value="${esc(r.shooter || '')}"></label>
    <button type="button" class="icon-btn soft rs-remove" data-remove>${ICON.close}</button>
    <p class="rs-member" hidden></p>
    <label class="field-label rs-class">Class
      <input class="field" data-f="class" list="rsClassList" maxlength="30" autocomplete="off" value="${esc(r['class'] || '')}"></label>
    <label class="field-label rs-score">Score
      <input class="field" data-f="score" maxlength="20" autocomplete="off" value="${esc(r.score || '')}"></label>
  </div>`;
}

/* `item` is the competition being edited (from Manage posts), or nothing for a new one */
function resultsForm(item) {
  const start = item || sameDay || { date: todayIso(), discipline: '' };
  sameDay = null;
  if (!MEMBERS) loadMembers();
  return `
    <div class="page-title">${item ? `<a class="back-link" href="#/committee/manage">${ICON.chev}Manage posts</a><h1>Edit results</h1>`
      : `<a class="back-link" href="#/committee">${ICON.chev}Committee</a><h1>Post results</h1>`}</div>
    <section class="section"><form class="card form" id="resultsForm" novalidate${item ? ' data-mode="edit"' : ''}>
      <label class="field-label" for="rsDate">Competition day</label>
      ${dateField('rsDate', start.date)}
      <label class="field-label" for="rsDisc">Discipline <span class="field-hint">choose one or type your own</span></label>
      <input class="field" id="rsDisc" maxlength="40" list="rsDiscList" autocomplete="off" value="${esc(start.discipline)}">
      <datalist id="rsDiscList">${SUGGEST.rsDiscList()}</datalist>
      <label class="field-label" for="rsComp">Competition name</label>
      <input class="field" id="rsComp" maxlength="80" list="rsCompList" autocomplete="off" value="${esc(start.competition || '')}" required>
      <datalist id="rsCompList">${SUGGEST.rsCompList()}</datalist>
      <datalist id="rsClassList">${SUGGEST.rsClassList()}</datalist>
      <datalist id="rsShooterList">${SUGGEST.rsShooterList()}</datalist>

      <h2 class="form-head">Shooters</h2>
      <p class="muted" id="rsHint">${membersHint()}</p>
      <div id="rsRows">${item ? item.rows.map(shooterRow).join('') : shooterRow() + shooterRow() + shooterRow()}</div>
      <div class="btn-row rs-tools">
        <button type="button" class="btn btn-outline btn-big" data-add-shooter>Add shooter</button>
        <button type="button" class="btn btn-outline btn-big" data-sort-score>Sort by score</button>
      </div>
      <p class="form-error" id="rsError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="rsSubmit">Post results</button>
      ${item ? `<button type="button" class="btn btn-danger btn-big" data-delete>Delete these results</button>` : ''}
    </form></section>`;
}
function membersHint() {
  if (membersFailed) return "Couldn't load the member names. You can still type each name.";
  return 'Start typing a name and pick the member from the list. For a visitor, just type their name.';
}

function resultsPosted() {
  return `
    <div class="page-title"><h1>Post results</h1></div>
    <section class="section"><div class="card empty" role="status">
      <span class="done-ico">${ICON.check}</span>
      <div class="empty-title">Results posted</div>
      <p class="muted">They appear on the website and app within about 2 minutes.</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary btn-big" data-same-day>Add another competition for the same day</button>
        <a class="btn btn-outline btn-big" href="#/committee">Back to Committee</a>
      </div>
    </div></section>`;
}

async function loadMembers() {
  if (membersLoading || !session) return;
  membersLoading = true;
  try { MEMBERS = await committeeApi('memberNames'); membersFailed = false; }
  catch (e) { membersFailed = !e.signedOut; }
  membersLoading = false;
  const form = document.getElementById('resultsForm');
  if (!form) return;
  refreshSuggestions();
  form.querySelector('#rsHint').textContent = membersHint();
  tidyRows(form);
}

const rowValue = (row, f) => row.querySelector(`[data-f="${f}"]`).value.trim();
const rowEmpty = row => !rowValue(row, 'shooter');

/* Places follow the row order (rows without a shooter are skipped), then the button count and member ticks are brought up to date */
function tidyRows(form) {
  const rows = [...form.querySelectorAll('.rs-row')];
  const lastFilled = rows.reduce((last, row, i) => rowEmpty(row) ? last : i, -1);
  let n = 0;
  rows.forEach((row, i) => {
    const place = rowEmpty(row) && i < lastFilled ? '' : placeLabel(++n); // an empty row between shooters gets no place
    row.querySelector('.rs-place').textContent = place || '–';
    row.setAttribute('aria-label', place ? place + ' place' : 'Empty row');
    const name = rowValue(row, 'shooter'), m = linkFor(row), note = row.querySelector('.rs-member');
    row.querySelector('[data-remove]').setAttribute('aria-label', name ? 'Remove ' + name : 'Remove this empty row');
    note.hidden = !m;
    note.innerHTML = !m ? '' : m.kept ? `${ICON.check}Member` : `${ICON.check}Member · shows as ${esc(m.short)} on the results`;
  });
  const count = rows.filter(row => !rowEmpty(row)).length, verb = form.dataset.mode === 'edit' ? 'Save' : 'Post';
  const btn = form.querySelector('#rsSubmit');
  if (!btn.disabled) btn.textContent = count ? `${verb} ${count} result${count === 1 ? '' : 's'}` : `${verb} results`;
}

/* The member a row is linked to: one picked from the list, or the link an existing result already had (while its name is unchanged) */
function linkFor(row) {
  const name = rowValue(row, 'shooter'), m = memberFor(name);
  if (m) return m;
  return row.dataset.memberId && name === row.dataset.linked ? { id: row.dataset.memberId, short: name, kept: true } : null;
}

/* Everything typed in the results form, to tell whether it has changed since it was opened */
function resultsSnapshot(form) {
  return JSON.stringify([form.querySelector('#rsDate').value, form.querySelector('#rsDisc').value.trim(), form.querySelector('#rsComp').value.trim(),
    [...form.querySelectorAll('.rs-row')].filter(row => [...row.querySelectorAll('input')].some(i => i.value.trim())).map(row => ['shooter', 'class', 'score'].map(f => rowValue(row, f)))]);
}

/* 95, 95.5 or "195.7x" / "195-7x" (score then number of Xs). No number sorts last. */
function scoreValue(text) {
  const t = String(text).replace(/,/g, '').trim();
  const withX = /^(\d+)\s*[.\- ]\s*(\d+)\s*x$/i.exec(t);
  if (withX) return [Number(withX[1]), Number(withX[2])];
  const n = parseFloat(t);
  return isNaN(n) ? null : [n, 0];
}
function sortByScore(form) {
  const box = form.querySelector('#rsRows');
  const rank = row => rowEmpty(row) ? 2 : scoreValue(rowValue(row, 'score')) ? 0 : 1;
  [...box.children].map((row, i) => ({ row, i, r: rank(row), s: scoreValue(rowValue(row, 'score')) || [0, 0] }))
    .sort((a, b) => a.r - b.r || b.s[0] - a.s[0] || b.s[1] - a.s[1] || a.i - b.i)
    .forEach(x => box.appendChild(x.row));
  tidyRows(form);
}

function resultsDirty() {
  const form = document.getElementById('resultsForm');
  return !!form && resultsSnapshot(form) !== form.dataset.initial;
}

async function postResultsForm(form) {
  const btn = form.querySelector('#rsSubmit'), error = form.querySelector('#rsError');
  if (btn.disabled) return;
  const fail = (msg, el) => { error.textContent = msg; error.hidden = false; if (el) el.focus(); };
  tidyRows(form);
  const comp = { date: form.querySelector('#rsDate').value, discipline: form.querySelector('#rsDisc').value.trim(), competition: form.querySelector('#rsComp').value.trim() };
  const filled = [...form.querySelectorAll('.rs-row')].filter(row => !rowEmpty(row));
  if (!comp.date) return fail('Please choose the competition day.', form.querySelector('#rsDate'));
  if (!comp.competition) return fail('Please enter the competition name.', form.querySelector('#rsComp'));
  if (!filled.length) return fail('Please add at least one shooter.', form.querySelector('[data-f="shooter"]'));
  comp.rows = filled.map((row, i) => {
    const m = linkFor(row);
    const r = { place: String(i + 1), shooter: m ? m.short : rowValue(row, 'shooter'), 'class': rowValue(row, 'class'), score: rowValue(row, 'score') };
    if (m) r.memberId = m.id;
    return r;
  });
  if (form.dataset.mode === 'edit') {
    const old = editing.item.rows.map(r => ({ row: r.row, fp: r.fp }));
    return saveEdit(form, 'results', () => committeeApi('saveResults', [old, comp]), 'Results updated.');
  }
  error.hidden = true;
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Posting…';
  try {
    await committeeApi('postResults', [comp]);
    MANAGE = null;
    sameDay = { date: comp.date, discipline: comp.discipline };
    posted = true;
    render();
    view.focus();
    refresh('results', true);
    setTimeout(() => refresh('results', true), REFRESH_AFTER_MS + 10000); // the feed keeps its old copy for 2 minutes
  } catch (err) {
    if (err.signedOut) return;
    btn.disabled = false; btn.textContent = label;
    fail(err.message);
  }
}

/* ---------- Add photos ---------- */
const MAX_PHOTOS = 20, PHOTO_MAX_PX = 1600, PHOTO_QUALITY = 0.85;
let PICKED = [];             // [{id, blob, thumb, state: 'preparing' | 'ready' | 'uploading' | 'done' | 'failed'}]
let pickedId = 0, uploading = false, uploadRun = 0, photosNote = '', addedCount = 0;

function clearPicked() {
  PICKED.forEach(p => { if (p.thumb) URL.revokeObjectURL(p.thumb); });
  PICKED = []; uploading = false; uploadRun++; photosNote = '';
}

function photosForm() {
  return `
    <div class="page-title"><a class="back-link" href="#/committee">${ICON.chev}Committee</a><h1>Add photos</h1></div>
    <section class="section"><form class="card form" id="photosForm" novalidate>
      <label class="field-label" for="phAlbum">Album <span class="field-hint">choose one or type a new one</span></label>
      <input class="field" id="phAlbum" maxlength="60" list="phAlbumList" autocomplete="off" value="Around the range">
      <datalist id="phAlbumList">${SUGGEST.phAlbumList()}</datalist>
      <label class="field-label" for="phDate">Date</label>
      ${dateField('phDate', todayIso())}
      <label class="field-label" for="phCaption">Caption <span class="field-hint">optional, used for every photo here</span></label>
      <input class="field" id="phCaption" maxlength="200" autocomplete="off">
      <input type="file" id="phFiles" accept="image/*" multiple hidden>

      <h2 class="form-head">Photos</h2>
      <p class="muted">Up to ${MAX_PHOTOS} at a time. Big photos are made smaller before they are sent.</p>
      <div id="phGrid" class="ph-grid"></div>
      <p class="muted" id="phStatus" role="status"></p>
      <p class="form-error" id="phError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="phSubmit">Upload photos</button>
    </form></section>`;
}

function photosAdded() {
  return `
    <div class="page-title"><h1>Add photos</h1></div>
    <section class="section"><div class="card empty" role="status">
      <span class="done-ico">${ICON.check}</span>
      <div class="empty-title">${addedCount} photo${addedCount === 1 ? '' : 's'} added</div>
      <p class="muted">${addedCount === 1 ? 'It appears' : 'They appear'} in the app and website gallery within about 2 minutes.</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary btn-big" data-more-photos>Add more photos</button>
        <a class="btn btn-outline btn-big" href="#/committee">Back to Committee</a>
      </div>
    </div></section>`;
}

/* Draws the thumbnails and brings the main button and status line up to date */
function drawPicked() {
  const form = document.getElementById('photosForm');
  if (!form) return;
  const count = st => PICKED.filter(p => p.state === st).length;
  const done = count('done'), failed = count('failed'), preparing = count('preparing'), waiting = count('ready') + failed;
  const total = PICKED.length;
  form.querySelector('#phGrid').innerHTML = PICKED.map((p, i) => {
    const n = i + 1;
    const mark = p.state === 'preparing' ? '<span class="skel ph-cover"></span>'
      : p.state === 'uploading' ? `<span class="ph-shade"><span class="ph-bar" role="progressbar" aria-label="Uploading photo ${n}"><span></span></span></span>`
      : p.state === 'done' ? `<span class="ph-mark ph-done" role="img" aria-label="Photo ${n} uploaded">${ICON.check}</span>`
      : p.state === 'failed' ? `<span class="ph-failed">Not sent</span>` : '';
    const remove = !uploading && p.state !== 'done' && p.state !== 'preparing'
      ? `<button type="button" class="ph-remove" data-ph-remove="${p.id}" aria-label="Remove photo ${n}"><span>${ICON.close}</span></button>` : '';
    return `<div class="ph-tile${p.state === 'failed' ? ' failed' : ''}">${p.thumb ? `<img src="${p.thumb}" alt="Photo ${n}">` : ''}${mark}${remove}</div>`;
  }).join('') + (!uploading && total < MAX_PHOTOS
    ? `<button type="button" class="ph-add${total ? '' : ' first'}" data-ph-choose><span class="tile-ico">${total ? ICON.plus : ICON.camera}</span>${total ? 'Add more' : 'Choose photos'}</button>` : '');

  const btn = form.querySelector('#phSubmit'), status = form.querySelector('#phStatus');
  const s = n => n === 1 ? '' : 's';
  btn.hidden = !total;
  btn.disabled = uploading || preparing > 0 || !waiting;
  btn.textContent = uploading ? `Uploading ${Math.min(done + failed + 1, total)} of ${total}…`
    : preparing ? 'Getting photos ready…'
    : failed ? `Retry failed photo${s(failed)}`
    : `Upload ${waiting} photo${s(waiting)}`;
  status.textContent = [photosNote, done && !uploading && failed ? `${done} photo${s(done)} uploaded.` : ''].filter(Boolean).join(' ');
  ['phAlbum', 'phDate', 'phCaption'].forEach(id => { form.querySelector('#' + id).disabled = uploading; });
}

/* Makes the photo smaller (longest side 1600px) and upright, as a JPEG, plus a small copy for the thumbnail */
async function shrinkPhoto(file) {
  let img, w, h, cleanup = () => {};
  if (window.createImageBitmap) {
    try { img = await createImageBitmap(file, { imageOrientation: 'from-image' }); w = img.width; h = img.height; cleanup = () => img.close(); } catch (e) { img = null; }
  }
  if (!img) {
    const url = URL.createObjectURL(file);
    img = new Image();
    await new Promise((ok, bad) => { img.onload = ok; img.onerror = () => bad(new Error('not a photo')); img.src = url; });
    w = img.naturalWidth; h = img.naturalHeight; cleanup = () => URL.revokeObjectURL(url);
  }
  const copy = (max, quality) => new Promise((ok, bad) => {
    const scale = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); // see-through areas become white, not black
    g.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob(b => b ? ok(b) : bad(new Error('could not shrink')), 'image/jpeg', quality);
  });
  try {
    if (!w || !h) throw new Error('not a photo');
    return { blob: await copy(PHOTO_MAX_PX, PHOTO_QUALITY), thumb: await copy(320, 0.7) };
  } finally { cleanup(); }
}

async function choosePhotos(files) {
  const room = MAX_PHOTOS - PICKED.length, run = uploadRun;
  const chosen = [...files];
  let skipped = 0;
  photosNote = chosen.length > room ? `Only ${MAX_PHOTOS} photos at a time, so ${chosen.length - room} ${chosen.length - room === 1 ? 'was' : 'were'} left out.` : '';
  const added = chosen.slice(0, room).map(file => ({ id: ++pickedId, file, state: 'preparing' }));
  PICKED.push(...added);
  drawPicked();
  for (const p of added) {           // one at a time, so a phone never holds many full-size photos at once
    try {
      const made = await shrinkPhoto(p.file);
      if (run !== uploadRun) return; // the screen was left or cleared meanwhile
      p.blob = made.blob; p.thumb = URL.createObjectURL(made.thumb); p.state = 'ready';
    } catch (e) {
      if (run !== uploadRun) return;
      PICKED = PICKED.filter(x => x !== p); skipped++;
    }
    delete p.file;
    drawPicked();
  }
  if (skipped) { photosNote = [photosNote, `${skipped} file${skipped === 1 ? ' was' : 's were'} not a photo and ${skipped === 1 ? 'was' : 'were'} left out.`].filter(Boolean).join(' '); drawPicked(); }
}

const blobToDataUrl = blob => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => bad(r.error); r.readAsDataURL(blob); });

/* Sends the photos one at a time. Ones already uploaded are never sent again. */
async function uploadPhotos(form) {
  const error = form.querySelector('#phError');
  const fail = (msg, el) => { error.textContent = msg; error.hidden = false; if (el) el.focus(); };
  if (uploading) return;
  const meta = { album: form.querySelector('#phAlbum').value.trim(), date: form.querySelector('#phDate').value, caption: form.querySelector('#phCaption').value.trim() };
  if (!meta.date) return fail('Please choose the date.', form.querySelector('#phDate'));
  const queue = PICKED.filter(p => p.state === 'ready' || p.state === 'failed');
  if (!queue.length) return;
  error.hidden = true; photosNote = '';
  queue.forEach(p => { p.state = 'ready'; });
  uploading = true;
  const run = uploadRun;
  let lastError = '';
  for (const p of queue) {
    p.state = 'uploading'; drawPicked();
    try {
      await committeeApi('addPhoto', [meta, await blobToDataUrl(p.blob)]);
      if (run !== uploadRun) return;
      p.state = 'done';
    } catch (err) {
      if (err.signedOut || run !== uploadRun) return;
      p.state = 'failed'; lastError = err.message;
    }
  }
  uploading = false;
  const done = PICKED.filter(p => p.state === 'done').length, failed = PICKED.filter(p => p.state === 'failed').length;
  if (done) { MANAGE = null; refresh('photos', true); setTimeout(() => refresh('photos', true), REFRESH_AFTER_MS + 10000); } // the feed keeps its old copy for 2 minutes
  if (!failed) return finishPhotos();
  drawPicked();
  fail(`${failed} photo${failed === 1 ? '' : 's'} could not be sent. ${lastError}`);
}

function finishPhotos() {
  addedCount = PICKED.filter(p => p.state === 'done').length;
  clearPicked();
  posted = true;
  render();
  view.focus();
}

function winnerRow(c) {
  const w = c.rows[0] || {};
  return `<a class="list-row link-row" href="#/results"><span class="list-ico">${ICON.trophy}</span>
    <div class="list-main"><div class="list-title">${esc(c.competition)}</div><div class="muted">${joinDot(c.discipline, w.shooter && '1st ' + w.shooter)}</div></div>
    <div class="score">${esc(w.score)}</div></a>`;
}

function thumb(p, i) {
  return `<button type="button" class="thumb" data-photo="${i}" aria-label="${esc(p.caption || p.album)}">
    <img src="${esc(p.thumb)}" alt="" loading="lazy" decoding="async"></button>`;
}

/* ---------- Photo viewer ---------- */
const viewer = document.createElement('div');
viewer.className = 'viewer'; viewer.hidden = true;
viewer.setAttribute('role', 'dialog'); viewer.setAttribute('aria-modal', 'true'); viewer.setAttribute('aria-label', 'Photo');
document.body.appendChild(viewer);
let viewIndex = 0;

function openPhoto(i) {
  const list = photos(); if (!list[i]) return;
  viewIndex = i;
  const p = list[i];
  viewer.innerHTML = `
    <button type="button" class="viewer-close" aria-label="Close photo">${ICON.close}</button>
    <img src="${esc(p.full)}" alt="${esc(p.caption || p.album)}">
    <div class="viewer-cap"><div class="list-title">${esc(p.caption || p.album)}</div><div>${joinDot(p.album, shortDate(p.date))} · ${i + 1} of ${list.length}</div></div>`;
  viewer.hidden = false;
  viewer.querySelector('.viewer-close').focus();
}
function closePhoto() { viewer.hidden = true; viewer.innerHTML = ''; }
viewer.addEventListener('click', e => { if (e.target.closest('.viewer-close') || e.target === viewer) closePhoto(); });
let touchX = null;
viewer.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
viewer.addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX; touchX = null;
  if (Math.abs(dx) > 50) openPhoto(Math.max(0, Math.min(photos().length - 1, viewIndex + (dx < 0 ? 1 : -1))));
});
document.addEventListener('keydown', e => {
  if (viewer.hidden) return;
  if (e.key === 'Escape') closePhoto();
  if (e.key === 'ArrowRight') openPhoto(Math.min(photos().length - 1, viewIndex + 1));
  if (e.key === 'ArrowLeft') openPhoto(Math.max(0, viewIndex - 1));
});

/* ---------- Router ---------- */
const view = document.getElementById('view');
let currentPage = '', currentHash = location.hash;

function render(quiet) {
  const [name, sub] = (location.hash.replace('#/', '') || 'home').split('/');
  const page = (VIEWS[name] ? name : 'home') + (name === 'committee' && ['event', 'results', 'photos', 'manage', 'edit'].includes(sub) ? '/' + sub : '');
  // Fresh club data must not wipe a form someone is filling in
  if (quiet && page === currentPage && view.querySelector('form')) return refreshSuggestions();
  if (page !== currentPage) {
    posted = false; sameDay = null; clearPicked();
    if (page !== 'committee/edit') editing = null;
    if (page !== 'committee/manage') manageNote = '';
    // Opening Manage posts afresh: get an up-to-date list (coming back from an edit screen keeps the one just loaded)
    else if (currentPage !== 'committee/edit' && Date.now() - manageAt > 30000) { MANAGE = null; manageState = ''; }
  }
  const openComps = quiet ? [...view.querySelectorAll('details.comp')].map(d => d.open) : null;
  view.innerHTML = VIEWS[page.split('/')[0]](sub);
  if (openComps) view.querySelectorAll('details.comp').forEach((d, i) => { if (i in openComps) d.open = openComps[i]; });
  if (!quiet || page !== currentPage) {
    view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
    window.scrollTo(0, 0);
  }
  currentPage = page; currentHash = location.hash;
  const rs = document.getElementById('resultsForm');
  if (rs) { tidyRows(rs); rs.dataset.initial = resultsSnapshot(rs); }
  drawPicked();
  document.querySelectorAll('.tabbar a').forEach(a => {
    if (a.dataset.tab === page.split('/')[0]) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

view.addEventListener('click', e => {
  const t = e.target;
  const cal = t.closest('[data-cal]'), shr = t.closest('[data-share]'), ph = t.closest('[data-photo]');
  if (cal) addToCalendar((currentPage === 'events' ? eventsShown() : events())[Number(cal.dataset.cal)]);
  if (shr) shareEvent(events()[Number(shr.dataset.share)]);
  if (ph) openPhoto(Number(ph.dataset.photo));
  if (t.closest('[data-retry]')) { const k = t.closest('[data-retry]').dataset.retry; FAILED[k] = false; render(true); refresh(k, true); }
  if (t.closest('[data-refresh]')) refreshAll(true);
  if (t.closest('[data-signin]')) openSignIn();
  if (t.closest('[data-signout]')) signOut();
  if (t.closest('[data-soon]')) openSheet(soonSheet, document.getElementById('soonClose'));
  if (t.closest('[data-another]')) { posted = false; render(); }
  if (t.closest('[data-same-day]')) { posted = false; render(); }
  if (t.closest('[data-more-photos]')) { posted = false; render(); }
  if (t.closest('[data-mtab]')) { manageTab = t.closest('[data-mtab]').dataset.mtab; manageNote = ''; render(true); view.querySelector(`[data-mtab="${manageTab}"]`).focus(); }
  if (t.closest('[data-manage-reload]')) { MANAGE = null; manageState = ''; manageNote = ''; render(true); }
  if (t.closest('[data-edit]') && MANAGE) {
    const [kind, i] = t.closest('[data-edit]').dataset.edit.split(':');
    const item = (kind === 'event' ? manageEvents() : kind === 'results' ? MANAGE.results : MANAGE.photos)[Number(i)];
    if (item) { editing = { kind, item }; location.hash = '#/committee/edit'; }
  }
  if (t.closest('[data-delete]') && editing) askDelete();
  if (t.closest('[data-ph-choose]')) document.getElementById('phFiles').click();
  if (t.closest('[data-ph-remove]')) {
    const id = Number(t.closest('[data-ph-remove]').dataset.phRemove), p = PICKED.find(x => x.id === id);
    if (p && !uploading) {
      if (p.thumb) URL.revokeObjectURL(p.thumb);
      PICKED = PICKED.filter(x => x !== p);
      document.getElementById('phError').hidden = true;
      // Removing the last photo that failed leaves only uploaded ones: that batch is finished
      if (PICKED.length && PICKED.every(x => x.state === 'done')) finishPhotos();
      else { drawPicked(); const next = view.querySelector('[data-ph-remove], [data-ph-choose]'); if (next) next.focus(); }
    }
  }
  const rs = t.closest('#resultsForm');
  if (rs && t.closest('[data-add-shooter]')) {
    rs.querySelector('#rsRows').insertAdjacentHTML('beforeend', shooterRow());
    tidyRows(rs);
    rs.querySelector('.rs-row:last-child [data-f="shooter"]').focus();
  }
  if (rs && t.closest('[data-sort-score]')) sortByScore(rs);
  if (rs && t.closest('[data-remove]')) {
    const rows = rs.querySelector('#rsRows'), row = t.closest('.rs-row'), next = row.nextElementSibling || row.previousElementSibling;
    row.remove();
    if (!rows.children.length) rows.insertAdjacentHTML('beforeend', shooterRow());
    tidyRows(rs);
    (next || rows.firstElementChild).querySelector('[data-f="shooter"]').focus();
  }
});
view.addEventListener('submit', e => {
  if (e.target.id === 'eventForm') { e.preventDefault(); postEvent(e.target); }
  if (e.target.id === 'resultsForm') { e.preventDefault(); postResultsForm(e.target); }
  if (e.target.id === 'photosForm') { e.preventDefault(); uploadPhotos(e.target); }
  if (e.target.id === 'photoEditForm') { e.preventDefault(); savePhotoEdit(e.target); }
});
view.addEventListener('change', e => {
  if (e.target.id !== 'phFiles') return;
  if (e.target.files.length) choosePhotos(e.target.files);
  e.target.value = ''; // so the same photo can be chosen again after removing it
});
const dateHint = e => { if (e.target.type === 'date') e.target.parentNode.classList.toggle('no-date', !e.target.value); };
view.addEventListener('input', dateHint);
view.addEventListener('change', dateHint);
view.addEventListener('input', e => {
  const form = e.target.form, err = form && form.querySelector('.form-error');
  if (err) err.hidden = true;
  if (form && form.id === 'resultsForm') tidyRows(form);
});

/* Leaving a results form with something typed in it, or while photos are uploading: ask first */
const LEAVE_TEXT = {
  results: ['Leave without posting?', 'These results have not been posted yet. If you leave now, what you have typed will be lost.', 'Stay and keep typing', 'Leave without posting'],
  edit: ['Leave without saving?', 'Your changes to these results have not been saved. If you leave now, they will be lost.', 'Stay and keep editing', 'Leave without saving'],
  photos: ['Photos are still uploading', 'If you leave now, the photos that have not been sent yet will not be added.', 'Stay until they finish', 'Leave and stop uploading']
};
const leaveReason = () => uploading ? 'photos' : !resultsDirty() ? '' : document.getElementById('resultsForm').dataset.mode === 'edit' ? 'edit' : 'results';
let leavingTo = null;
window.addEventListener('hashchange', () => {
  const why = !skipLeaveCheck && location.hash !== currentHash && leaveReason();
  skipLeaveCheck = false;
  if (why) {
    leavingTo = location.hash;
    history.replaceState(null, '', currentHash);
    ['leaveTitle', 'leaveText', 'leaveStay', 'leaveGo'].forEach((id, i) => { document.getElementById(id).textContent = LEAVE_TEXT[why][i]; });
    openSheet(leaveSheet, document.getElementById('leaveStay'));
    return;
  }
  render();
});
window.addEventListener('beforeunload', e => { if (leaveReason()) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  refreshAll();
  if (session && currentPage === 'events') loadPrivate(); // private events have no saved copy, so fetch them again
});

/* ---------- Committee: sign-in and the server ---------- */
const sessionStore = {
  get() { try { const s = JSON.parse(localStorage.getItem('ot:committee')); return s && s.pin ? s : null; } catch (e) { return null; } },
  set(s) { try { if (s) localStorage.setItem('ot:committee', JSON.stringify(s)); else localStorage.removeItem('ot:committee'); } catch (e) { /* storage blocked */ } }
};
let session = sessionStore.get(); // {pin, name, admin} while signed in on this device

/* Calls one of the committee functions on the club's server. Gives back the data, or throws an Error with a plain-English message. */
async function api(fn, pin, args) {
  let reply;
  try {
    const res = await fetch(FEED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // plain text avoids a CORS preflight
      body: JSON.stringify({ action: 'api', fn, pin, args: args || [] })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    reply = await res.json();
  } catch (e) {
    console.warn('Could not reach the server', e);
    throw new Error("Can't reach the club right now. Check your signal and try again.");
  }
  if (reply.ok) return reply.data;
  const err = new Error(reply.error || 'Something went wrong. Please try again.');
  err.badPin = /PIN is not recognised/i.test(err.message);
  throw err;
}

/* For someone already signed in: if the server no longer knows their PIN, sign them out and say why. */
async function committeeApi(fn, args) {
  try {
    return await api(fn, session.pin, args);
  } catch (e) {
    if (e.badPin) {
      signOut();
      openSignIn('You have been signed out because your PIN is no longer recognised. It may have been changed. Please sign in with your new PIN.');
      e.signedOut = true;
    }
    throw e;
  }
}

function showCommitteeTab() {
  document.getElementById('committeeTab').hidden = !session;
  document.querySelector('.tabbar').classList.toggle('six', !!session);
  committeeBtn.setAttribute('aria-label', session ? 'Committee' : 'Committee sign-in');
}

function signOut() {
  session = null; sessionStore.set(null);
  MEMBERS = null; membersFailed = false;
  MANAGE = null; PRIVATE = null; editing = null; manageState = ''; manageNote = '';
  const rs = document.getElementById('resultsForm');
  if (rs) rs.remove(); // nothing left to ask about
  clearPicked();
  showCommitteeTab();
  if (location.hash.indexOf('#/committee') === 0) location.hash = '#/home'; else render(true);
}

/* Sheets (simple dialogs) */
const sheet = document.getElementById('sheet'), soonSheet = document.getElementById('soonSheet'), leaveSheet = document.getElementById('leaveSheet');
const confirmSheet = document.getElementById('confirmSheet');
const SHEETS = [sheet, soonSheet, leaveSheet, confirmSheet];
const committeeBtn = document.getElementById('committeeBtn');
const pinBox = document.getElementById('pinBox'), signInBtn = document.getElementById('signInBtn');
const signInError = document.getElementById('signInError'), signInNote = document.getElementById('signInNote');
let sheetOpener = null;

function openSheet(el, focusOn) {
  sheetOpener = document.activeElement;
  el.hidden = false;
  focusOn.focus();
}
function closeSheets() {
  if (SHEETS.every(el => el.hidden)) return;
  SHEETS.forEach(el => { el.hidden = true; });
  if (sheetOpener && document.contains(sheetOpener)) sheetOpener.focus();
  sheetOpener = null;
}
function openSignIn(note) {
  soonSheet.hidden = true; leaveSheet.hidden = true; confirmSheet.hidden = true;
  pinBox.value = ''; signInError.hidden = true;
  signInNote.textContent = note || ''; signInNote.hidden = !note;
  openSheet(sheet, pinBox);
}

document.getElementById('soonLink').href = FEED_URL;
committeeBtn.addEventListener('click', () => { if (session) location.hash = '#/committee'; else openSignIn(); });
document.getElementById('sheetClose').addEventListener('click', closeSheets);
document.getElementById('soonClose').addEventListener('click', closeSheets);
SHEETS.forEach(el => el.addEventListener('click', e => { if (e.target === el) closeSheets(); }));
document.getElementById('leaveStay').addEventListener('click', closeSheets);
document.getElementById('confirmNo').addEventListener('click', closeSheets);
document.getElementById('leaveGo').addEventListener('click', () => {
  const to = leavingTo; leavingTo = null;
  sheetOpener = null; closeSheets();
  const rs = document.getElementById('resultsForm');
  if (rs) rs.remove();
  clearPicked();
  location.hash = to || '#/committee';
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheets(); });

pinBox.addEventListener('input', () => { signInError.hidden = true; });
document.getElementById('signInForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (signInBtn.disabled) return;
  const pin = pinBox.value.trim();
  const fail = msg => { signInError.textContent = msg; signInError.hidden = false; pinBox.focus(); };
  if (!pin) return fail('Please type your PIN.');
  signInError.hidden = true;
  signInBtn.disabled = true; signInBtn.textContent = 'Signing in…';
  try {
    const me = await api('signIn', pin);
    session = { pin, name: me.name, admin: !!me.admin };
    sessionStore.set(session);
    showCommitteeTab();
    sheetOpener = null; closeSheets();
    if (location.hash === '#/committee') render(); else location.hash = '#/committee';
  } catch (err) {
    fail(err.message);
  } finally {
    signInBtn.disabled = false; signInBtn.textContent = 'Sign in';
  }
});

/* Post a new event, or save an edited one (which may also change who can see it) */
async function postEvent(form) {
  const btn = form.querySelector('#evSubmit'), error = form.querySelector('#evError');
  if (btn.disabled) return;
  const val = id => form.querySelector('#' + id).value.trim();
  const fail = (msg, id) => { error.textContent = msg; error.hidden = false; if (id) form.querySelector('#' + id).focus(); };
  const ev = { date: val('evDate'), start: val('evStart'), title: val('evTitle'), discipline: val('evDisc'), description: val('evDesc') };
  const audience = (form.querySelector('[name="evAudience"]:checked') || {}).value || 'Everyone';
  if (!ev.date) return fail('Please choose a date.', 'evDate');
  if (!ev.title) return fail('Please give the event a title.', 'evTitle');

  if (editing) {
    const it = editing.item, from = { source: it.source, row: it.row, fp: it.fp }, isPrivate = audience === 'Members' || audience === 'Committee';
    const call = it.source === 'public' && !isPrivate ? () => committeeApi('updateEvent', [it.row, it.fp, { ...ev, show: audience !== 'Hidden' }])   // stays in the Events tab
      : it.source === 'private' && isPrivate ? () => committeeApi('updatePrivateEvent', [it.row, it.fp, { ...ev, audience }])                        // stays private
      : () => committeeApi('setEventAudience', [from, audience, ev]);                                                                                   // moves between the two
    return saveEdit(form, 'events', call, 'Event updated.');
  }

  error.hidden = true;
  btn.disabled = true; btn.textContent = 'Posting…';
  try {
    await committeeApi('postEvent', [{ ...ev, audience }]);
    postedText = audience === 'Members' ? 'Only signed-in members and committee can see it. It is not on the website.'
      : audience === 'Committee' ? 'Only signed-in committee can see it. It is not on the website.'
      : 'It appears on the website and app within about 2 minutes.';
    posted = true;
    changed('events');
    render();
    view.focus();
  } catch (err) {
    if (err.signedOut) return;
    btn.disabled = false; btn.textContent = 'Post event';
    fail(err.message);
  }
}

showCommitteeTab();
render();
refreshAll();

/* Check a remembered PIN still works (it may have been changed or removed), and pick up name or admin changes. */
if (session) {
  committeeApi('signIn').then(me => {
    if (!session || (me.name === session.name && !!me.admin === session.admin)) return;
    session = { pin: session.pin, name: me.name, admin: !!me.admin };
    sessionStore.set(session);
    render(true);
  }).catch(() => { /* no signal, or already signed out above */ });
}

/* ---------- Splash ---------- */
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('splash').classList.add('hide'), 500);
});

/* ---------- Offline support ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js?v=' + APP_VERSION));
}
