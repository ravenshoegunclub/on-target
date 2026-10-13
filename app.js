/* On Target v2.2.0 — app shell with live club data and club team tools
   Events, results and photos come from the club's public feed (the same one
   the website uses). Each list is saved on the phone, so it opens instantly
   and still works with no signal, then refreshes in the background. */
'use strict';

const APP_VERSION = '2.2.0';
const LIVE_URL = 'https://script.google.com/macros/s/AKfycbynN-K_c3FSzsGzaKeh8cGusDD8UEbvX2QvDmq_TJY1epuzPz5phpa2AAVBx5-SytV7ig/exec';
/* Testing only: a copy of On Target running on a developer's own machine (never the live address) can be pointed at a
   test copy of the club server by opening it once with ?server=<test deployment ID>, and back with ?server=live. */
const TEST_SERVER = (() => {
  if (!/^(localhost|127\.0\.0\.1)$|\.app\.github\.dev$/.test(location.hostname)) return '';
  try {
    const id = new URLSearchParams(location.search).get('server');
    if (id === 'live') localStorage.removeItem('ot:testServer');
    else if (/^[\w-]{40,120}$/.test(id || '')) localStorage.setItem('ot:testServer', id);
    return localStorage.getItem('ot:testServer') || '';
  } catch (e) { return ''; }
})();
const FEED_URL = TEST_SERVER ? `https://script.google.com/macros/s/${TEST_SERVER}/exec` : LIVE_URL;

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
  card: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2M14 10h4M14 14h4"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
  bench: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18M6 9v10M18 9v10M6 14h12M9 9V5h6v4"/></svg>',
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  web: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  people: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 15c1.5.9 2.5 2.5 3 5"/></svg>',
  key: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M12 8v7M9 12l3 3 3-3"/></svg>',
  firstaid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
  call: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
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

/* Event times. New ones are saved as "HH:MM" on the 24-hour clock; the public feed sends "8:30am";
   older ones were typed freely ("8:30 am"). All of them are read the same way here. */
function time24(v) {
  const m = /^(\d{1,2})(?:[:.](\d{2}))?(?:[:.]\d{2})?\s*(am|pm|a\.m\.|p\.m\.|noon|midday)?$/.exec(String(v == null ? '' : v).replace(/[  ]/g, ' ').trim().toLowerCase());
  if (!m) return '';
  let h = Number(m[1]);
  const min = Number(m[2] || 0), ap = (m[3] || '').replace(/\./g, '');
  if (!m[2] && !ap) return ''; // a number on its own isn't a time
  if (ap === 'am' || ap === 'pm') { if (h < 1 || h > 12) return ''; h = h % 12 + (ap === 'pm' ? 12 : 0); }
  else if (ap && h !== 12) return '';
  if (h > 23 || min > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
/* "8:30am". Old free text that isn't a time is shown as it was typed. */
function niceTime(v) {
  const t = time24(v);
  if (!t) return String(v == null ? '' : v).trim();
  const h = Number(t.slice(0, 2));
  return `${h % 12 || 12}:${t.slice(3)}${h < 12 ? 'am' : 'pm'}`;
}
/* "8:30am to 12:00pm", or just the start when there is no end time */
function timeRange(ev) {
  const start = niceTime(ev.start), end = time24(ev.end) ? niceTime(ev.end) : '';
  return start && end ? `${start} to ${end}` : start;
}

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
/* The club website's pages, each named once. Join and Fees are the same page. */
const SITE_URL = 'https://ravenshoegunclub.com.au';
const JOIN_URL = SITE_URL + '/become-a-member', VISIT_URL = SITE_URL + '/visit-the-range', FAQ_URL = SITE_URL + '/faq';
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

/* Add to calendar: makes a small .ics file the phone's calendar can open.
   With a start time it is a timed event (to the end time, or for one hour when there is none); with no time it is all day.
   Times carry no time zone on purpose: the calendar shows them as typed, which is range time. */
function calendarTimes(ev) {
  const day = n => { const d = parseDate(ev.date); d.setDate(d.getDate() + n); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
  const start = time24(ev.start), end = time24(ev.end);
  if (!start) return [`DTSTART;VALUE=DATE:${day(0)}`, `DTEND;VALUE=DATE:${day(1)}`];
  const mins = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const to = end && mins(end) > mins(start) ? mins(end) : mins(start) + 60;
  const stamp = m => `${day(Math.floor(m / 1440))}T${String(Math.floor(m % 1440 / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}00`;
  return [`DTSTART:${stamp(mins(start))}`, `DTEND:${stamp(to)}`];
}
function addToCalendar(ev) {
  const ymd = ev.date.replace(/-/g, '');
  const icsText = s => String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RDSS//On Target//EN', 'BEGIN:VEVENT',
    `UID:${ymd}-${String(ev.title).replace(/\W+/g, '')}@ravenshoegunclub.com.au`,
    ...calendarTimes(ev),
    `SUMMARY:${icsText('RDSS ' + ev.title)}`,
    `DESCRIPTION:${icsText([!time24(ev.start) && ev.start && 'Starts ' + ev.start, ev.discipline, ev.description].filter(Boolean).join('\n'))}`,
    'LOCATION:Ravenshoe & District Sporting Shooters range', 'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'rdss-event.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function shareEvent(ev) {
  const text = `RDSS ${ev.title}: ${shortDate(ev.date)}${timeRange(ev) ? ', ' + timeRange(ev) : ''}`;
  const url = location.href.split('#')[0] + '#/events';
  if (navigator.share) {
    try { await navigator.share({ title: 'On Target', text, url }); } catch (e) { /* cancelled */ }
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text + ' ' + url);
    alert('Event details copied');
  }
}

/* ---------- Views ---------- */
/* Home for a signed-in member (by email, or a club team PIN an admin has linked to a membership): their first name,
   their status and their renewal form. null for visitors and for a PIN that isn't linked: they get the visitor's Home.
   Until the membership has been fetched, a member's Home is drawn from what the phone remembers (ot:member). */
function homeMember() {
  if ((member || session) && !ME && meState !== 'failed' && meState !== 'loading') setTimeout(loadMe, 0);
  if (ME) return ME.linked && ME.first ? { first: ME.first, status: meStatus(ME), renew: ME.renew && ME.renew.open ? ME.renew.url : '' } : null;
  return member && member.first && member.status ? { first: member.first, status: member.status, renew: '' } : null;
}
/* The four buttons on Home. Renew takes the place of Documents once a member needs to renew. */
const RENEW_DUE = ['notRenewed', 'overdue', 'expired'];
const BOOK_OK = ['current', 'notRenewed']; // financial members: the ones who can book a bench
const homeLink = (icon, label, href) => `<a class="menu-row" href="${href}"><span class="tile-ico">${icon}</span>${label}${ICON.chev}</a>`;
function homeTiles(mine) {
  const tile = (icon, label, href) => `<a class="tile" href="${esc(href)}"${href.charAt(0) === '#' ? '' : ' target="_blank" rel="noopener"'}><span class="tile-ico">${icon}</span>${label}</a>`;
  if (!mine) return tile(ICON.join, 'Join', JOIN_URL) + tile(ICON.pin, 'Visit us', VISIT_URL) + tile(ICON.fees, 'Fees', JOIN_URL) + tile(ICON.help, 'FAQs', FAQ_URL);
  return tile(ICON.card, 'My card', '#/me') + tile(ICON.star, 'My results', '#/me/results')
    + (RENEW_DUE.includes(mine.status) ? tile(ICON.refresh, 'Renew', mine.renew || '#/me') : tile(ICON.doc, 'Documents', '#/me/documents'))
    + tile(ICON.help, 'FAQs', FAQ_URL);
}
const VIEWS = {
  home() {
    const rs = rangeStatus();
    const next = events()[0];
    const latest = days()[0];
    const pics = photos().slice(0, 4);
    const mine = homeMember();
    return `
      <section class="hero">
        ${ICON.rings}
        ${rs.text ? `<div class="status-pill"><span class="status-dot${rs.open ? '' : ' closed'}"></span>${esc(rs.text)}</div>` : ''}
        <h1>${mine ? `G'day ${esc(mine.first)}` : 'Welcome to the club'}</h1>
      </section>
      <section class="card next-card" aria-label="Next at the range">
        ${DATA.events ? (next ? `
          <div class="row-between"><span class="eyebrow">Next at the range</span><span class="chip">${whenLabel(daysUntil(next.date))}</span></div>
          <div class="event-row">${dateBlock(next.date)}
            <div><div class="event-title">${esc(next.title)}</div><div class="muted">${joinDot(DAYS[parseDate(next.date).getDay()], next.discipline, timeRange(next))}</div></div>
          </div>
          <div class="btn-row">
            <button type="button" class="btn btn-primary" data-cal="0">${ICON.calendar}Add to calendar</button>
            <button type="button" class="btn btn-outline" data-share="0">${ICON.share}Share</button>
          </div>` : `<span class="eyebrow">Next at the range</span><div class="muted">No events posted yet. Check back soon.</div>`)
        : FAILED.events ? `<span class="eyebrow">Next at the range</span><div class="muted">Can't load events right now.</div>`
        : `<span class="eyebrow">Next at the range</span><span class="skel skel-line"></span><span class="skel skel-line short"></span>`}
      </section>
      <nav class="tiles" aria-label="Quick links">
        ${homeTiles(mine)}
      </nav>
      ${mine && BOOK_OK.includes(mine.status) ? `<section class="section"><div class="card list">${homeLink(ICON.bench, 'Book a bench', '#/me/book')}</div></section>` : ''}
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
                <div class="muted">${joinDot(DAYS[parseDate(ev.date).getDay()], timeRange(ev), ev.discipline)}</div>
                ${ev.description ? `<div class="muted desc">${esc(ev.description)}</div>` : ''}
              </div>
              <button type="button" class="icon-btn soft" data-cal="${i}" aria-label="Add ${esc(ev.title)} to calendar">${ICON.calendar}</button>
            </div>`).join('')}
        </div>` : empty('No upcoming events', 'New events appear here as soon as the club team posts them.'))}
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

  more() { location.replace('#/me'); return ''; },

  me(sub) { return meView(sub); },

  committee(sub, arg) {
    if (!session) return `
      <div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Club team</h1></div>
      <section class="section"><div class="card empty">
        <div class="empty-title">Please sign in</div>
        <p class="muted">This part of On Target is for the club team.</p>
        <button type="button" class="btn btn-primary btn-big" data-signin>Club team sign-in</button>
      </div></section>`;
    if (sub === 'event') return posted ? eventPosted() : eventForm();
    if (sub === 'results') return posted ? resultsPosted() : resultsForm();
    if (sub === 'photos') return posted ? photosAdded() : photosForm();
    if (sub === 'manage') return manageView();
    if (sub === 'emergency') return emergencyView();
    if (sub === 'documents') return docsAdminView();
    if (sub === 'range') return rangeView();
    if (sub === 'walkin') return walkInView();
    if (sub === 'reserve') return reserveView();
    if (sub === 'requests') return benchRequestsView();
    if (sub === 'document') {
      if (!docEdit) { location.replace('#/committee/documents'); return ''; } // e.g. the page was reloaded
      return docForm(docEdit);
    }
    if (sub === 'messages') return messagesView();
    if (sub === 'message') return messageView(arg);
    if (sub === 'reply') return replyView(arg);
    if (sub === 'edit') {
      if (!editing) { location.replace('#/committee/manage'); return ''; } // e.g. the page was reloaded
      return editing.kind === 'event' ? eventForm(editing.item) : editing.kind === 'results' ? resultsForm(editing.item) : photoEditForm(editing.item);
    }
    if (['payments', 'members', 'people', 'person', 'signups'].includes(sub)) {
      if (!session.admin) return `<div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Admin</h1></div>
        <section class="section">${empty('Admins only', 'Only admins can use this part of On Target.')}</section>`;
      if (sub === 'person' && !personEdit) { location.replace('#/committee/people'); return ''; } // e.g. the page was reloaded
      return sub === 'signups' ? signupsView() : sub === 'payments' ? paymentsView() : sub === 'members' ? membersView() : sub === 'people' ? peopleView() : personForm(personEdit);
    }
    location.replace('#/me'); return ''; // the club team's home is now part of Me
  }
};

/* Suggestions for an event's "Type of event" (free text is still allowed). It is saved in the Events tab's Discipline column. */
const EVENT_TYPES = ['Competition', 'Practice', 'Training', 'Safety course', 'Open day', 'Club meeting', 'Working bee', 'Social', 'Other'];
let posted = false; // true while the "Event posted", "Results posted" or "Photos added" message is showing

/* Who can see an event. "Hidden" only exists for older events with Show = No in the Sheet.
   The club team (committee and range officers) is still stored and sent to the server as "Committee". */
const AUDIENCES = [
  ['Everyone', 'Everyone', 'Shown on the website and in On Target.'],
  ['Members', 'Members only', 'Only signed-in members and the club team. Not on the website.'],
  ['Committee', 'Club team only', 'Only the signed-in club team. Not on the website.'],
  ['Hidden', 'Hidden', 'Not shown anywhere. Choose one of the others to show it.']
];
const badge = audience => `<span class="badge badge-${audience.toLowerCase()}">${audience === 'Committee' ? 'Club team' : audience}</span>`;
let postedText = '';

/* `item` is the event being edited (from Manage posts), or nothing for a new one */
function eventForm(item) {
  const ev = item || { audience: 'Everyone' };
  const v = k => esc(ev[k] || '');
  return `
    <div class="page-title">${item ? `<a class="back-link" href="#/committee/manage">${ICON.chev}Manage posts</a><h1>Edit event</h1>`
      : `<a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Post an event</h1>`}</div>
    <section class="section"><form class="card form" id="eventForm" novalidate>
      <label class="field-label" for="evDate">Date</label>
      ${dateField('evDate', item ? ev.date : nextSaturday())}
      <div class="time-pair">
        <div><label class="field-label" for="evStart">Start time</label>
          ${timeField('evStart', ev.start)}</div>
        <div><label class="field-label" for="evEnd">End time <span class="field-hint">optional</span></label>
          ${timeField('evEnd', ev.end)}</div>
      </div>
      <label class="field-label" for="evTitle">Title</label>
      <input class="field" id="evTitle" maxlength="80" autocomplete="off" value="${v('title')}" required>
      <label class="field-label" for="evDisc">Type of event <span class="field-hint">choose one or type your own</span></label>
      <input class="field" id="evDisc" maxlength="40" list="evDiscList" autocomplete="off" value="${v('discipline')}">
      <datalist id="evDiscList">${EVENT_TYPES.map(d => `<option value="${d}"></option>`).join('')}</datalist>
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
        <a class="btn btn-outline btn-big" href="#/me">Back to Me</a>
      </div>
    </div></section>`;
}

/* ---------- Private events (members-only and committee-only), for the signed-in club team ---------- */
let PRIVATE = null;          // from the server; kept in memory only, never saved on the phone
let privateLoading = false;

async function loadPrivate() {
  if (privateLoading || !session) return;
  privateLoading = true;
  try { const list = await committeeApi('privateEvents'); PRIVATE = Array.isArray(list) ? list : []; } catch (e) { /* the public events still show */ }
  privateLoading = false;
  if (PRIVATE && currentPage === 'events') render(true);
}
/* The Events tab: public events, plus upcoming private ones (with a badge) when the club team is signed in */
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
const SHARE_MAX = 10;        // Facebook and Instagram take up to 10 photos in one post
let sharePick = null;        // Manage posts, Photos: the photos ticked for sharing ([] while choosing), or null when not choosing
let ADDED = [];              // the photos just uploaded ({blob, album, caption}), kept in memory until that screen is left
const shareBtn = (what, label) => `<button type="button" class="btn btn-outline share-btn" data-share-post="${what}" aria-label="${esc(label)}">${ICON.share}Share</button>`;
const pickTile = (p, i, on) => `<button type="button" class="thumb pick" data-pick="${i}" aria-pressed="${on}" aria-label="Photo ${i + 1}: ${esc(p.album)}, ${esc(p.date && shortDate(p.date))}">
          <img src="${esc(p.thumb)}" alt="" loading="lazy" decoding="async"><span class="ph-mark ph-done">${ICON.check}</span></button>`;
const pickLabel = () => sharePick.length ? `Share ${sharePick.length} photo${sharePick.length === 1 ? '' : 's'}` : 'Choose photos first';

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

/* Public events (Everyone or Hidden) and private ones (Members or Committee) in one list:
   upcoming first, soonest at the top, then past events, newest first */
const isPast = ev => !!ev.date && ev.date < todayIso();
function manageEvents() {
  const pub = MANAGE.events.map(e => ({ ...e, source: 'public', audience: e.show === false ? 'Hidden' : 'Everyone' }));
  const priv = (MANAGE.privateEvents || []).map(e => ({ ...e, source: 'private' }));
  const all = [...pub, ...priv], soonest = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  return [...all.filter(e => !isPast(e)).sort(soonest), ...all.filter(isPast).sort((a, b) => soonest(b, a))];
}

function manageView() {
  if (!MANAGE && manageState !== 'failed') loadManage();
  const list = () => {
    if (manageTab === 'events') {
      const evs = manageEvents(), firstPast = evs.findIndex(isPast), split = firstPast < 0 ? evs.length : firstPast;
      // Only events everyone can see get a Share button: private and hidden ones must never be posted publicly
      const row = (ev, i) => `
        <div class="manage-item"><button type="button" class="list-row manage-row" data-edit="event:${i}">${ev.date ? dateBlock(ev.date) : ''}
          <span class="list-main"><span class="list-title">${esc(ev.title || 'No title')}</span>
            <span class="muted">${joinDot(ev.date && shortDate(ev.date) + ' ' + parseDate(ev.date).getFullYear(), timeRange(ev), ev.discipline)}</span>
            ${badge(ev.audience)}</span>${ICON.chev}</button>
          ${ev.audience === 'Everyone' && ev.date ? shareBtn('event:' + i, 'Share ' + (ev.title || 'this event')) : ''}</div>`;
      if (!evs.length) return empty('No events yet', 'Events you post appear here.');
      return (split ? `<div class="card list">${evs.slice(0, split).map(row).join('')}</div>` : empty('No upcoming events', 'Events you post appear here.'))
        + (split < evs.length ? `<div class="section-head"><h2>Past events</h2></div>
        <div class="card list">${evs.slice(split).map((ev, i) => row(ev, split + i)).join('')}</div>` : '');
    }
    if (manageTab === 'results') {
      return MANAGE.results.length ? `<p class="muted">Share makes a picture and a caption with every competition from that day. The picture shows the top 3 in each.</p>
        <div class="card list">${MANAGE.results.map((g, i) => `
        <div class="manage-item"><button type="button" class="list-row manage-row" data-edit="results:${i}"><span class="list-ico">${ICON.trophy}</span>
          <span class="list-main"><span class="list-title">${esc(g.competition || 'No name')}</span>
            <span class="muted">${joinDot(g.date && shortDate(g.date) + ' ' + parseDate(g.date).getFullYear(), g.discipline, g.rows.length + (g.rows.length === 1 ? ' shooter' : ' shooters'))}</span></span>${ICON.chev}</button>
          ${g.date ? shareBtn('results:' + i, 'Share the results for ' + longDate(g.date)) : ''}</div>`).join('')}</div>`
        : empty('No results yet', 'Results you post appear here.');
    }
    if (!MANAGE.photos.length) return empty('No photos yet', 'Photos you add appear here.');
    if (sharePick) return `<p class="notice" id="pickNote" role="status">Tap the photos you want to share, up to ${SHARE_MAX}.</p>
      <div class="photo-grid">${MANAGE.photos.map((p, i) => pickTile(p, i, sharePick.includes(i))).join('')}</div>
      <div class="pick-bar">
        <button type="button" class="btn btn-primary btn-big" data-pick-share${sharePick.length ? '' : ' disabled'}>${pickLabel()}</button>
        <button type="button" class="btn btn-outline btn-big" data-pick-cancel>Cancel</button>
      </div>`;
    return `<button type="button" class="btn btn-outline btn-big" data-pick-start>${ICON.share}Share to Facebook or Instagram</button>
      <p class="muted">Or tap a photo to change its album, date or caption, or to delete it.</p>
      <div class="photo-grid">${MANAGE.photos.map((p, i) => `
        <button type="button" class="thumb" data-edit="photo:${i}" aria-label="Edit photo ${i + 1}: ${esc(p.album)}, ${esc(p.date && shortDate(p.date))}">
          <img src="${esc(p.thumb)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`;
  };
  return `
    <div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Manage posts</h1></div>
    <section class="section">
      ${manageNote ? `<p class="notice" role="status">${esc(manageNote)}</p>` : ''}
      <div class="seg" role="group" aria-label="What to manage">${MANAGE_TABS.map(t => `
        <button type="button" data-mtab="${t[0]}" aria-pressed="${t[0] === manageTab}">${t[1]}</button>`).join('')}</div>
      ${MANAGE ? list() : manageState === 'failed' ? `<div class="card empty"><div class="empty-title">Can't load the posts</div>
        <p class="muted">Check your signal and try again.</p>
        <button type="button" class="btn btn-outline" data-manage-reload>${ICON.refresh}Try again</button></div>` : skeletonRows(5)}
      ${MANAGE && !sharePick ? `<button type="button" class="btn btn-outline" data-manage-reload>${ICON.refresh}Reload the list</button>` : ''}
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
  MANAGE = null; PRIVATE = null; sharePick = null; manageState = ''; manageNote = note || '';
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
  const what = editing.kind === 'event' ? ['Delete this event?', `This removes "${it.title}" from On Target${it.source === 'public' ? ' and the website' : ''}.`, 'events',
      () => committeeApi(it.source === 'private' ? 'deletePrivateEvent' : 'deleteEvent', [it.row, it.fp]), 'Event deleted.']
    : editing.kind === 'results' ? ['Delete these results?', `This removes ${rows.length === 1 ? 'the result' : 'all ' + rows.length + ' results'} for "${it.competition}" from the website and On Target.`, 'results',
      () => committeeApi('deleteResults', [rows.map(r => ({ row: r.row, fp: r.fp }))]), 'Results deleted.']
    : ['Delete this photo?', 'This removes the photo from the gallery on the website and in On Target.', 'photos',
      () => committeeApi('deletePhoto', [it.row, it.fp]), 'Photo deleted.'];
  confirmAsk({
    title: what[0], text: what[1] + ' It cannot be undone in On Target.', yes: 'Yes, delete it', busy: 'Deleting…',
    run: what[3],
    done: () => { changed(what[2], what[4]); go('#/committee/manage'); },
    fail: err => CONFLICT.test(err.message) && (changed(what[2], CONFLICT_NOTE), go('#/committee/manage'), true)
  });
}

/* A question before something that is hard to undo. The safe answer has the focus.
   o: {title, text, yes, busy, no, run (async), done, fail (returns true when it has dealt with the error)} */
function confirmAsk(o) {
  document.getElementById('confirmTitle').textContent = o.title;
  document.getElementById('confirmText').textContent = o.text;
  document.getElementById('confirmNo').textContent = o.no || 'No, keep it';
  const yes = document.getElementById('confirmYes'), error = document.getElementById('confirmError');
  error.hidden = true; yes.disabled = false; yes.textContent = o.yes;
  yes.onclick = async () => {
    if (yes.disabled) return;
    yes.disabled = true; yes.textContent = o.busy; error.hidden = true;
    try {
      const out = await o.run();
      sheetOpener = null; closeSheets();
      if (o.done) o.done(out);
    } catch (err) {
      if (err.signedOut) return;
      if (o.fail && o.fail(err)) { sheetOpener = null; return closeSheets(); }
      yes.disabled = false; yes.textContent = o.yes;
      error.textContent = err.message; error.hidden = false;
    }
  };
  openSheet(confirmSheet, document.getElementById('confirmNo'));
}

/* ---------- Admin: payments, members, people and PINs (admins only) ---------- */
/* Everything here is kept in memory only: no member details or PINs go into the phone's storage (apart from the admin's own PIN) */
const blankAdmin = () => ({ summary: null, summaryAt: 0, pending: null, pendingState: '', payNote: '',
  mem: { filter: 'all', query: '', items: null, state: '', season: '', note: '', run: 0 }, sheetUrl: '',
  people: null, memberPick: [], peopleState: '', peopleNote: '', newPin: null, signups: null, signState: '', signNote: '', signCount: 0 });
let ADMIN = blankAdmin();
let sheetUrlLoading = false;
let personEdit = null;       // the person being edited ({} for a new one) while that screen is open

async function loadAdminSummary(force) {
  if (!session || !session.admin || (!force && Date.now() - ADMIN.summaryAt < 60000)) return;
  ADMIN.summaryAt = Date.now();
  loadSignupCount();
  try {
    const d = await committeeApi('membersSummary') || {};
    const sum = { season: d.season || '', notRenewed: Number(d.notRenewed) || 0, overdue: Number(d.overdue) || 0, pending: Number(d.pending) || 0 };
    const same = JSON.stringify(sum) === JSON.stringify(ADMIN.summary);
    ADMIN.summary = sum; ADMIN.mem.season = sum.season || '';
    if (!same && currentPage === 'me') render(true);
  } catch (e) { /* the counts are only a guide */ }
}
const adminBack = `<a class="back-link" href="#/me">${ICON.chev}Me</a>`;
const loadFailed = (what, attr) => `<div class="card empty"><div class="empty-title">Can't load ${what}</div>
  <p class="muted">Check your signal and try again.</p><button type="button" class="btn btn-outline" ${attr}>${ICON.refresh}Try again</button></div>`;
const niceDate = iso => { if (!/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return ''; const d = parseDate(String(iso).slice(0, 10)); return `${d.getDate()} ${mon(d)} ${d.getFullYear()}`; };
/* 30 June that a payment confirmed today runs to (payments from 1 April count towards the next year, as on the server) */
const paidToYear = () => { const d = new Date(); return d.getFullYear() + (d.getMonth() >= 3 ? 1 : 0); };

/* ----- payments to confirm ----- */
async function loadPending() {
  if (ADMIN.pendingState === 'loading') return;
  ADMIN.pendingState = 'loading';
  try { const list = await committeeApi('adminPending'); ADMIN.pending = Array.isArray(list) ? list : []; ADMIN.pendingState = ''; }
  catch (e) { if (e.signedOut) { ADMIN.pendingState = ''; return; } ADMIN.pendingState = 'failed'; }
  if (currentPage === 'committee/payments') render(true);
}
function paymentsView() {
  if (!ADMIN.pending && ADMIN.pendingState !== 'failed') setTimeout(loadPending, 0);
  const cards = () => ADMIN.pending.length ? ADMIN.pending.map((a, i) => `
    <article class="card pay-card">
      <div class="row-between"><h2 class="pay-name">${esc(a.name)}</h2><span class="pay-total">${esc(a.total)}</span></div>
      <div>${esc((a.items || [])[0])}</div>
      <div class="muted">Paying by: ${esc(String(a.method || '').toLowerCase())} · Applied ${esc(niceDate(a.date) || a.date)}</div>
      <div class="pay-ref"><span class="muted">Bank reference</span><b>${esc(a.reference)}</b></div>
      <div class="pay-contact">${esc((a.items || [])[1])}</div>
      ${a.ssaa ? `<div class="muted">SSAA number ${esc(a.ssaa)}</div>` : ''}
      <button type="button" class="btn btn-primary btn-big" data-mark-paid="${i}">Mark paid</button>
    </article>`).join('')
    : empty('No payments waiting', 'New applications appear here when someone joins or renews on the website.');
  return `
    <div class="page-title">${adminBack}<h1>Payments to confirm</h1></div>
    <section class="section">
      ${ADMIN.payNote ? `<p class="notice" role="status">${esc(ADMIN.payNote)}</p>` : ''}
      ${ADMIN.pending ? cards() : ADMIN.pendingState === 'failed' ? loadFailed('the payments', 'data-pay-reload') : skeletonRows(3)}
      ${ADMIN.pending ? `<button type="button" class="btn btn-outline" data-pay-reload>${ICON.refresh}Refresh</button>` : ''}
    </section>`;
}
function askMarkPaid(i) {
  const a = ADMIN.pending[i];
  if (!a) return;
  confirmAsk({
    title: `Mark ${a.name} as paid?`, text: `They'll be current to 30 June ${paidToYear()} and get a welcome email.`, yes: 'Yes, mark paid', busy: 'Marking paid…', no: 'No, not yet',
    run: () => committeeApi('adminMarkPaid', [a.id]),
    done: out => {
      ADMIN.payNote = (out && out.message) || `${a.name} is marked as paid.`;
      ADMIN.pending = ADMIN.pending.filter(x => x !== a);   // the card goes straight away; the list is then checked with the server
      ADMIN.mem.items = null; MEMBERS = null;
      render(true); loadPending(); loadAdminSummary(true);
    }
  });
}

/* ----- members ----- */
const MEM_FILTERS = [['all', 'All'], ['current', 'Current'], ['waiting', 'Waiting for payment'], ['notRenewed', 'Not renewed yet'], ['overdue', 'Not financial – renewal overdue'], ['expired', 'Expired']];
const MEM_BADGE = { current: ['ok', 'Current'], notRenewed: ['amber', 'Not renewed yet'], overdue: ['red', 'Not financial'], expired: ['red-line', 'Expired – not financial'], waiting: ['grey', 'Waiting for payment'], none: ['grey', 'No membership'] };
/* "Not renewed yet" is only offered from 1 May to 30 June, and "Not financial" only in July: the server says which season it is */
const memFilters = () => MEM_FILTERS.filter(f => (f[0] !== 'notRenewed' || ADMIN.mem.season === 'renew') && (f[0] !== 'overdue' || ADMIN.mem.season === 'followup'));

async function loadMembersList() {
  const mem = ADMIN.mem, run = ++mem.run;
  mem.items = null; mem.state = 'loading';
  drawMembers();
  try {
    const d = await committeeApi('membersList', [mem.query, mem.filter]);
    if (run !== mem.run) return;
    mem.items = d.items || []; mem.season = d.season || ''; mem.filter = d.filter || mem.filter; mem.state = '';
  } catch (e) {
    if (e.signedOut || run !== mem.run) return;
    mem.state = 'failed';
  }
  drawMembers();
}
async function loadSheetUrl() {
  if (ADMIN.sheetUrl || sheetUrlLoading) return;
  sheetUrlLoading = true;
  try { ADMIN.sheetUrl = String(await committeeApi('adminSheetLink') || ''); } catch (e) { /* the button just stays unavailable */ }
  sheetUrlLoading = false;
  drawMembers();
}
function membersView() {
  setTimeout(() => { if (!ADMIN.mem.items && ADMIN.mem.state !== 'loading') loadMembersList(); loadSheetUrl(); }, 0);
  return `
    <div class="page-title">${adminBack}<h1>Members</h1></div>
    <section class="section">
      <form class="msg-search" id="memSearch" role="search" novalidate>
        <label class="sr-only" for="memQuery">Search members by name, email or SSAA number</label>
        <input class="field" type="search" id="memQuery" placeholder="Name, email or SSAA number" autocomplete="off" maxlength="60" value="${esc(ADMIN.mem.query)}">
        <button type="submit" class="btn btn-primary">Search</button>
      </form>
      <div id="memList"></div>
    </section>`;
}
/* Draws the chips, list and buttons under the Members search box (the box itself is left alone, so typing is never lost) */
function drawMembers() {
  const box = document.getElementById('memList');
  if (!box) return;
  const mem = ADMIN.mem, exportable = mem.filter === 'notRenewed' || mem.filter === 'overdue';
  const rows = (mem.items || []).map(m => {
    const b = MEM_BADGE[m.status] || MEM_BADGE.none;
    return `<div class="mem-row${m.financial ? '' : ' not-financial'}">
      <div class="list-main"><div class="list-title">${esc(m.name || m.email || 'No name')}</div>
        <div class="muted">${joinDot(m.type, m.expiry ? (m.financial ? 'Expires ' : 'Expired ') + niceDate(m.expiry) : 'No expiry date')}</div></div>
      <div class="mem-badges"><span class="mbadge mbadge-${b[0]}">${b[1]}</span>${m.waiting && m.status !== 'waiting' ? '<span class="mbadge mbadge-grey">Payment waiting</span>' : ''}</div>
    </div>`;
  }).join('');
  box.innerHTML = `
    <div class="chips" role="group" aria-label="Which members">${memFilters().map(f => `
      <button type="button" class="chip-btn" data-mem-chip="${f[0]}" aria-pressed="${f[0] === mem.filter}">${f[1]}</button>`).join('')}</div>
    ${mem.note ? `<p class="notice" role="status">${esc(mem.note)}</p>` : ''}
    ${mem.filter === 'notRenewed' ? `<p class="muted">Membership ends this 30 June and next year is not paid yet. They are still financial until 30 June.</p>` : ''}
    ${mem.filter === 'overdue' ? `<p class="notice notice-red">These people are <b>not financial members</b> from 1 July. This list is only for following up renewals.</p>` : ''}
    ${mem.items === null && mem.state === 'failed' ? loadFailed('the members', 'data-mem-reload')
      : mem.items === null ? skeletonRows(5)
      : !mem.items.length ? empty('Nobody found', mem.query ? `No members match "${mem.query}".` : 'Nobody is in this list.')
      : `<p class="muted" role="status">${mem.items.length} ${mem.items.length === 1 ? 'person' : 'people'}</p><div class="card list">${rows}</div>`}
    ${exportable && mem.items && mem.items.length ? `<button type="button" class="btn btn-primary btn-big" data-mem-export>Export list</button>
      <p class="muted">Downloads a file for GoDaddy email marketing: first name, last name, email, membership type and expiry. People whose payment is waiting are left out.</p>
      <p class="form-error" id="memExportError" role="alert" hidden></p>` : ''}
    ${ADMIN.sheetUrl ? `<a class="btn btn-outline btn-big" href="${esc(ADMIN.sheetUrl)}" target="_blank" rel="noopener">Open members sheet</a>
      <p class="muted">Opens in a new tab, in the club Google account. You need to be signed in to that account.</p>` : ''}`;
}
/* Hands the CSV to the phone or computer as a file */
async function exportMembers(btn) {
  const error = document.getElementById('memExportError');
  if (btn.disabled) return;
  btn.disabled = true; btn.textContent = 'Getting the list ready…'; error.hidden = true;
  try {
    const d = await committeeApi('membersExport', [ADMIN.mem.filter]);
    const file = new File([d.csv], d.filename, { type: 'text/csv' });
    // Phones: offer the file through the share sheet (save to Files, email it...). Otherwise an ordinary download.
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: d.filename }); } catch (e) { /* closed without sharing */ }
    } else {
      const url = URL.createObjectURL(file), a = document.createElement('a');
      a.href = url; a.download = d.filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    ADMIN.mem.note = `Exported ${d.count} ${d.count === 1 ? 'person' : 'people'} to ${d.filename}.${d.leftOut ? ` ${d.leftOut} left out (payment waiting or no email address).` : ''}`;
    drawMembers();
  } catch (err) {
    if (err.signedOut) return;
    btn.disabled = false; btn.textContent = 'Export list';
    error.textContent = err.message; error.hidden = false;
  }
}

/* ----- people and PINs ----- */
async function loadPeople() {
  if (ADMIN.peopleState === 'loading') return;
  ADMIN.peopleState = 'loading';
  try {
    const [list, d] = await Promise.all([committeeApi('adminListPeople'), committeeApi('peopleLinks')]);
    const links = (d && d.links) || {};
    ADMIN.people = (Array.isArray(list) ? list : []).map(p => ({ ...p, member: links[p.id] || null })); // member: {id, name} when their PIN is linked to a membership
    ADMIN.memberPick = (d && Array.isArray(d.members)) ? d.members : [];
    ADMIN.peopleState = '';
  }
  catch (e) { if (e.signedOut) { ADMIN.peopleState = ''; return; } ADMIN.peopleState = 'failed'; }
  if (currentPage === 'committee/people') render(true);
}
function peopleView() {
  if (!ADMIN.people && ADMIN.peopleState !== 'failed') setTimeout(loadPeople, 0);
  const pin = ADMIN.newPin;
  return `
    <div class="page-title">${adminBack}<h1>People and PINs</h1><p class="muted">Who can sign in to the club team part of On Target</p></div>
    <section class="section">
      ${pin ? `<div class="pin-once" role="status" tabindex="-1" id="pinOnce">
        <div>${esc(pin.name)}'s PIN is</div><div class="pin-digits">${esc(pin.pin)}</div>
        <div>Give it to them in person or by phone. It will not be shown again.</div>
        <button type="button" class="btn btn-primary btn-big" data-pin-done>Done, I have passed it on</button></div>` : ''}
      ${ADMIN.peopleNote ? `<p class="notice" role="status">${esc(ADMIN.peopleNote)}</p>` : ''}
      ${ADMIN.people ? `<div class="card list">${ADMIN.people.map((p, i) => `
        <button type="button" class="list-row manage-row" data-person="${i}">
          <span class="list-main"><span class="list-title">${esc(p.name)}${p.me ? ' (you)' : ''}</span><span class="muted">PIN ${esc(p.pinHint)} · ${p.member ? 'Member: ' + esc(p.member.name) : 'Not linked to a membership'}</span></span>
          <span class="mbadge ${p.admin ? 'mbadge-maroon' : 'mbadge-grey'}">${p.admin ? 'Admin' : 'Club team'}</span>${ICON.chev}</button>`).join('')}</div>
        <button type="button" class="btn btn-primary btn-big" data-person="new">${ICON.plus}Add a person</button>`
        : ADMIN.peopleState === 'failed' ? loadFailed('the list', 'data-people-reload') : skeletonRows(3)}
    </section>`;
}
function personForm(p) {
  const isNew = !p.id;
  const choice = (value, title, text, checked) => `<label class="choice"><input type="radio" name="ppPin" value="${value}"${checked ? ' checked' : ''}>
    <span><span class="choice-title">${title}</span><span class="choice-text">${text}</span></span></label>`;
  return `
    <div class="page-title"><a class="back-link" href="#/committee/people">${ICON.chev}People and PINs</a><h1>${isNew ? 'Add a person' : 'Edit ' + esc(p.name) + (p.me ? ' (you)' : '')}</h1></div>
    <section class="section"><form class="card form" id="personForm" novalidate>
      <label class="field-label" for="ppName">Name</label>
      <input class="field" id="ppName" maxlength="40" autocomplete="off" autocapitalize="words" value="${esc(p.name || '')}" required>
      <label class="choice"><input type="checkbox" id="ppAdmin"${p.admin ? ' checked' : ''}>
        <span><span class="choice-title">Admin</span><span class="choice-text">Can also confirm payments, see members, and manage people and PINs.</span></span></label>
      <label class="field-label" for="ppMember">Their membership <span class="field-hint">so their PIN also shows their own membership card</span></label>
      <select class="field" id="ppMember"><option value="">Not linked to a membership</option>${ADMIN.memberPick.map(m =>
        `<option value="${esc(m.id)}"${p.member && p.member.id === m.id ? ' selected' : ''}>${esc(m.name)}${m.ssaa ? ' (SSAA ' + esc(m.ssaa) + ')' : ''}</option>`).join('')}</select>
      ${isNew ? `<p class="muted">A PIN is made for them when you save. You will be shown it once.</p>` : `
      <fieldset class="choices">
        <legend class="field-label">PIN <span class="field-hint">now ${esc(p.pinHint)}</span></legend>
        ${choice('keep', 'Keep the PIN they have', 'Nothing changes.', true)}
        ${choice('generate', 'Make a new PIN', 'On Target chooses one. Their old PIN stops working.', false)}
        ${choice('set', 'Set a PIN', '4 to 8 digits. Their old PIN stops working.', false)}
        <div id="ppPinWrap" hidden><label class="field-label" for="ppNewPin">New PIN</label>
          <input class="field pin-box" id="ppNewPin" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off"></div>
      </fieldset>`}
      <p class="form-error" id="ppError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="ppSubmit">${isNew ? 'Add person' : 'Save changes'}</button>
      ${!isNew && !p.me ? `<button type="button" class="btn btn-danger btn-big" data-person-remove>Remove ${esc(p.name)}</button>` : ''}
    </form></section>`;
}
/* After my own details change: keep this device signed in with the new PIN, name or admin setting */
function keepMeSignedIn(out, admin) {
  session = { pin: out.pin || session.pin, name: out.name || session.name, admin };
  sessionStore.set(session);
}
async function savePerson(form) {
  const p = personEdit, btn = form.querySelector('#ppSubmit'), error = form.querySelector('#ppError'), label = btn.textContent;
  if (btn.disabled) return;
  const fail = (msg, el) => { error.textContent = msg; error.hidden = false; if (el) el.focus(); };
  const person = { id: p.id || null, name: form.querySelector('#ppName').value.trim(), admin: form.querySelector('#ppAdmin').checked };
  const how = (form.querySelector('[name="ppPin"]:checked') || {}).value, wantMember = form.querySelector('#ppMember').value;
  if (!person.name) return fail('Please enter a name.', form.querySelector('#ppName'));
  if (how === 'generate') person.generatePin = true;
  if (how === 'set') {
    person.newPin = form.querySelector('#ppNewPin').value.trim();
    if (!person.newPin) return fail('Please type the new PIN, 4 to 8 digits.', form.querySelector('#ppNewPin'));
  }
  error.hidden = true;
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const out = await committeeApi('adminSavePerson', [person]);
    if (p.me) keepMeSignedIn(out, person.admin); // before anything else talks to the server
    let linkNote = '';
    if (wantMember !== (p.member ? p.member.id : '')) {
      try {
        // A new person's ID isn't sent back, so they are found by their name (names can't be the same)
        const id = p.id || ((await committeeApi('adminListPeople')).find(x => x.name === (out.name || person.name)) || {}).id;
        linkNote = ' ' + ((await committeeApi('personLinkMember', [id, wantMember])).message || '');
        if (p.me && !member) { ME = null; meState = ''; }
      } catch (err) {
        if (err.signedOut) return;
        linkNote = ' But their membership could not be linked: ' + err.message;
      }
    }
    ADMIN.people = null; ADMIN.peopleNote = (out.message || 'Saved.') + linkNote;
    ADMIN.newPin = out.pin ? { name: out.name || person.name, pin: out.pin } : null;
    go(session.admin ? '#/committee/people' : '#/me');
  } catch (err) {
    if (err.signedOut) return;
    btn.disabled = false; btn.textContent = label;
    fail(err.message); // the server's own words
  }
}
function askRemovePerson() {
  const p = personEdit;
  confirmAsk({
    title: `Remove ${p.name}?`, text: `Their PIN stops working straight away and they can no longer sign in to the club team part of On Target.`, yes: 'Yes, remove them', busy: 'Removing…',
    run: () => committeeApi('adminRemovePerson', [p.id]),
    done: out => { ADMIN.people = null; ADMIN.newPin = null; ADMIN.peopleNote = (out && out.message) || `${p.name} removed.`; go('#/committee/people'); }
  });
}

/* ---------- Messages (the club inbox, for every club team member) ---------- */
const MSG_VIEWS = [['inbox', 'Inbox'], ['mine', 'Mine'], ['replied', 'Replied'], ['all', 'All']];
const CLUB_FROM = 'info@ravenshoegunclub.com.au';
/* Everything here is kept in memory only: no email ever goes into the phone's storage */
const MSG = { view: 'inbox', query: '', items: null, more: false, page: 0, state: '', note: '', at: 0, run: 0 };
let msgOpen = null;          // the conversation that is open (from the server)
let msgOpenState = '';       // '', 'loading' or the reason it could not be opened
let msgUnread = null, unreadAt = 0;
let SAVED = null, savedLoading = false; // saved replies [{title, text}]

function unreadBadge() {
  return msgUnread ? `<span class="count-badge" aria-label="${msgUnread} new messages">${msgUnread} new</span>` : '';
}
/* The red dot on the Me button: new messages for the club team */
function drawDot() { document.getElementById('meDot').hidden = !(session && (msgUnread || BENCH.waiting)); }
async function loadUnread(force) {
  if (!session || (!force && Date.now() - unreadAt < 60000)) return;
  unreadAt = Date.now();
  try {
    const n = (await committeeApi('msgCount')).unread || 0;
    if (n === msgUnread) return;
    msgUnread = n;
    drawDot();
    if (currentPage === 'me') render(true);
  } catch (e) { /* the badge is only a hint */ }
}

function msgWhen(iso) {
  const [day, time] = String(iso).split('T');
  if (!day) return '';
  if (day === todayIso() && time) { const [h, m] = time.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`; }
  const d = parseDate(day);
  return `${d.getDate()} ${mon(d)}${d.getFullYear() === new Date().getFullYear() ? '' : ' ' + d.getFullYear()}`;
}
const msgWho = m => m.name || m.email || 'Unknown sender';
const AVATAR_COLOURS = ['#5C0F1F', '#9B1B35', '#1E7A3C', '#1D4C8A', '#6B4600', '#5E4C51'];
function avatar(who) {
  const ch = (String(who).match(/[A-Za-z0-9]/) || ['?'])[0].toUpperCase();
  return `<span class="avatar" style="background:${AVATAR_COLOURS[[...String(who)].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLOURS.length]}" aria-hidden="true">${ch}</span>`;
}
const labelChips = labels => (labels || []).map(l => `<span class="lab lab-${esc(l.toLowerCase())}">${esc(l)}</span>`).join('');
const statusTags = m => (m.repliedBy ? `<span class="lab lab-tag">Replied by ${esc(m.repliedBy)}</span>` : '') + (m.claimedBy && !m.repliedBy ? `<span class="lab lab-tag">Claimed by ${esc(m.claimedBy)}</span>` : '');

async function loadMessages(more) {
  if (!session || (more && MSG.state === 'loading')) return;
  const run = ++MSG.run, page = more ? MSG.page + 1 : 0; // a newer request (another view, a search) replaces one still on its way
  if (!more) MSG.items = null;
  MSG.state = 'loading';
  drawMessages();
  try {
    const d = await committeeApi('msgList', [MSG.view, MSG.query, page]);
    if (run !== MSG.run) return;
    MSG.items = (more ? MSG.items || [] : []).concat(d.items || []);
    MSG.more = !!d.more; MSG.page = page; MSG.state = ''; MSG.at = Date.now();
  } catch (e) {
    if (e.signedOut || run !== MSG.run) return;
    MSG.state = 'failed';
  }
  drawMessages();
}

function messagesView() {
  if (!MSG.items && MSG.state !== 'failed' || Date.now() - MSG.at > 60000 && MSG.state !== 'loading') setTimeout(() => loadMessages(), 0);
  return `
    <div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Messages</h1></div>
    <section class="section">
      <form class="msg-search" id="msgSearch" role="search" novalidate>
        <label class="sr-only" for="msgQuery">Search messages</label>
        <input class="field" type="search" id="msgQuery" placeholder="Search messages" autocomplete="off" maxlength="80" value="${esc(MSG.query)}">
        <button type="submit" class="btn btn-primary">Search</button>
      </form>
      <div class="seg" role="group" aria-label="Which messages">${MSG_VIEWS.map(v => `
        <button type="button" data-mview="${v[0]}" aria-pressed="${v[0] === MSG.view}">${v[1]}</button>`).join('')}</div>
      <div id="msgList"></div>
    </section>`;
}

/* Draws the list part of the Messages screen (the search box above it is left alone, so typing is never lost) */
function drawMessages() {
  const box = document.getElementById('msgList');
  if (!box) return;
  const none = { inbox: ['Inbox is clear', 'New messages to the club appear here.'], mine: ['Nothing claimed', 'Messages you claim appear here until they are replied to.'],
    replied: ['No replies yet', 'Messages that have been replied to appear here.'], all: ['No messages', 'Nothing was found.'] }[MSG.view];
  const rows = (MSG.items || []).map(m => `
    <a class="msg-row${m.unread ? ' unread' : ''}" href="#/committee/message/${esc(m.id)}">${avatar(msgWho(m))}
      <span class="msg-main">
        <span class="msg-top"><span class="msg-name">${esc(msgWho(m))}${m.count > 1 ? ` <span class="msg-count">${m.count}</span>` : ''}</span><span class="msg-date">${esc(msgWhen(m.date))}</span></span>
        <span class="msg-subject">${m.unread ? '<span class="sr-only">Unread. </span>' : ''}${esc(m.subject)}</span>
        <span class="msg-snippet">${esc(m.snippet)}</span>
        ${m.labels.length || m.claimedBy || m.repliedBy ? `<span class="labs">${labelChips(m.labels)}${statusTags(m)}</span>` : ''}
      </span></a>`).join('');
  box.innerHTML = `
    ${MSG.note ? `<p class="notice" role="status">${esc(MSG.note)}</p>` : ''}
    ${MSG.items === null && MSG.state === 'failed' ? `<div class="card empty"><div class="empty-title">Can't load the messages</div>
        <p class="muted">Check your signal and try again.</p><button type="button" class="btn btn-outline" data-msg-refresh>${ICON.refresh}Try again</button></div>`
      : MSG.items === null ? skeletonRows(5)
      : !MSG.items.length ? empty(MSG.query ? 'Nothing found' : none[0], MSG.query ? `No messages match "${MSG.query}".` : none[1])
      : `<div class="card list msg-list">${rows}</div>`}
    ${MSG.items && MSG.state === 'failed' ? `<p class="form-error" role="alert">Couldn't load more. Check your signal and try again.</p>` : ''}
    ${MSG.items && MSG.more ? `<button type="button" class="btn btn-outline btn-big" data-msg-more${MSG.state === 'loading' ? ' disabled' : ''}>${MSG.state === 'loading' ? 'Loading…' : 'Load more'}</button>` : ''}
    ${MSG.items ? `<button type="button" class="btn btn-outline" data-msg-refresh${MSG.state === 'loading' ? ' disabled' : ''}>${ICON.refresh}Refresh</button>` : ''}`;
}

async function loadMessage(id) {
  if (msgOpenState === 'loading') return;
  msgOpenState = 'loading'; msgOpen = null;
  try { msgOpen = await committeeApi('msgRead', [id]); msgOpenState = ''; MSG.at = 0; loadUnread(true); }
  catch (e) { if (e.signedOut) { msgOpenState = ''; return; } msgOpenState = e.message; }
  if (currentPage === 'committee/message' || currentPage === 'committee/reply') render(true);
}

/* One conversation: every message in it, with its labels and who has claimed it */
function messageView(id) {
  const back = `<a class="back-link" href="#/committee/messages">${ICON.chev}Messages</a>`;
  if (!msgOpen || msgOpen.id !== id) {
    if (msgOpenState && msgOpenState !== 'loading') {
      const why = msgOpenState; msgOpenState = '';
      return `<div class="page-title">${back}<h1>Message</h1></div><section class="section"><div class="card empty"><div class="empty-title">Can't open this message</div><p class="muted">${esc(why)}</p></div></section>`;
    }
    if (id) setTimeout(() => loadMessage(id), 0);
    return `<div class="page-title">${back}<h1>Message</h1></div><section class="section">${skeletonRows(3)}</section>`;
  }
  const m = msgOpen, mine = m.claimedBy && m.claimedBy === m.me;
  const status = m.repliedBy ? `Replied by ${m.repliedBy}${m.repliedAt ? ' on ' + msgWhen(m.repliedAt.replace(' ', 'T')) : ''}`
    : m.claimedBy ? `Claimed by ${mine ? 'you' : m.claimedBy}` : 'Not claimed yet';
  return `
    <div class="page-title">${back}<h1 class="msg-title">${esc(m.subject)}</h1></div>
    <section class="section">
      <div class="labs">${labelChips(m.labels)}<span class="lab lab-tag">${esc(status)}</span></div>
      <p class="form-error" id="msgError" role="alert" hidden></p>
      <div class="btn-row msg-actions">
        ${m.claimedBy ? `<button type="button" class="btn btn-outline btn-big" data-msg-act="msgUnclaim">Un-claim</button>` : `<button type="button" class="btn btn-outline btn-big" data-msg-act="msgClaim">Claim</button>`}
        <a class="btn btn-primary btn-big" href="#/committee/reply/${esc(m.id)}">Reply</a>
        ${m.inbox ? `<button type="button" class="btn btn-outline btn-big" data-msg-archive>Archive</button>` : ''}
      </div>
      ${m.messages.map(x => `
        <article class="card msg-card">
          <div class="msg-from">${esc(x.from)}</div><div class="muted">${esc(x.date)}</div>
          <div class="msg-body">${esc(x.body)}</div>
        </article>`).join('')}
    </section>`;
}

/* Claim or un-claim, from the conversation screen */
async function msgAct(btn) {
  const fn = btn.dataset.msgAct, error = document.getElementById('msgError'), label = btn.textContent;
  if (btn.disabled) return;
  btn.disabled = true; btn.textContent = 'Working…'; error.hidden = true;
  try {
    const out = await committeeApi(fn, [msgOpen.id]);
    msgOpen.claimedBy = out.claimedBy || '';
    MSG.at = 0;
    render(true);
    const next = view.querySelector('[data-msg-act]'); if (next) next.focus();
  } catch (err) {
    if (err.signedOut) return;
    btn.disabled = false; btn.textContent = label;
    error.textContent = err.message; error.hidden = false;
  }
}
function askArchive() {
  const id = msgOpen.id;
  confirmAsk({
    title: 'File this message away?', text: 'It leaves the Inbox for everyone in the club team. You can still find it under All.', yes: 'Yes, file it away', busy: 'Filing…',
    run: () => committeeApi('msgArchive', [id]),
    done: () => { MSG.note = 'Filed away. It is still under All.'; MSG.at = 0; msgOpen = null; loadUnread(true); go('#/committee/messages'); }
  });
}

/* ----- reply ----- */
const PLACEHOLDER = /\[[^\[\]\n]{1,60}\]/g;

async function loadSaved() {
  if (SAVED || savedLoading || !session) return;
  savedLoading = true;
  try { const list = await committeeApi('savedReplies'); SAVED = Array.isArray(list) ? list : []; } catch (e) { /* the reply can still be typed */ }
  savedLoading = false;
  const pick = document.getElementById('rpSaved');
  if (pick && SAVED) pick.innerHTML = savedOptions();
}
const savedOptions = () => `<option value="">${SAVED ? (SAVED.length ? 'Choose a saved reply…' : 'No saved replies yet') : 'Loading saved replies…'}</option>` +
  (SAVED || []).map((r, i) => `<option value="${i}">${esc(r.title)}</option>`).join('');

function replyView(id) {
  if (!msgOpen || msgOpen.id !== id) return messageView(id); // loads it first (e.g. after the page was reloaded)
  loadSaved();
  const m = msgOpen;
  return `
    <div class="page-title"><a class="back-link" href="#/committee/message/${esc(m.id)}">${ICON.chev}Message</a><h1>Reply</h1><p class="muted">${esc(m.subject)}</p></div>
    <section class="section"><form class="card form" id="replyForm" novalidate>
      <label class="field-label" for="rpTo">To</label>
      <input class="field" type="email" id="rpTo" inputmode="email" autocomplete="off" autocapitalize="off" maxlength="120" value="${esc(m.replyTo)}">
      <p class="muted">From ${CLUB_FROM}</p>
      <label class="field-label" for="rpSaved">Saved reply <span class="field-hint">fills in the box below</span></label>
      <select class="field" id="rpSaved">${savedOptions()}</select>
      <label class="field-label" for="rpText">Your reply</label>
      <textarea class="field reply-text" id="rpText" maxlength="5000"></textarea>
      <div id="rpGaps" class="gaps" hidden></div>
      <p class="muted">Your name and the club's name are added at the end for you.</p>
      <p class="form-error" id="rpError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="rpSubmit">Send reply</button>
    </form></section>`;
}

/* Lists the [PLACEHOLDERS] still in the reply, highlighted. Tapping one selects it in the box, ready to type over. */
function drawGaps() {
  const text = document.getElementById('rpText'), box = document.getElementById('rpGaps');
  if (!text || !box) return [];
  const gaps = [...new Set(text.value.match(PLACEHOLDER) || [])];
  box.hidden = !gaps.length;
  box.innerHTML = gaps.length ? `<span class="gaps-title">Still to fill in. Tap one to find it:</span>${gaps.map(g => `<button type="button" class="gap" data-gap="${esc(g)}">${esc(g)}</button>`).join('')}` : '';
  return gaps;
}
function useSaved(i) {
  const r = SAVED && SAVED[Number(i)], text = document.getElementById('rpText');
  if (!r) return;
  const first = String(msgOpen.name || '').trim().split(/\s+/)[0];
  const body = first ? r.text.replace(/\[NAME\]/g, first) : r.text;
  text.value = text.value.trim() ? text.value.replace(/\s+$/, '') + '\n\n' + body : body; // added below anything already typed, never over it
  document.getElementById('rpSaved').value = '';
  drawGaps();
  text.focus();
}
const replyDirty = () => { const t = document.getElementById('rpText'); return !!t && !!t.value.trim(); };

function sendReply(form) {
  const btn = form.querySelector('#rpSubmit'), error = form.querySelector('#rpError');
  if (btn.disabled) return;
  const to = form.querySelector('#rpTo').value.trim(), text = form.querySelector('#rpText').value.trim(), id = msgOpen.id;
  const fail = (msg, el) => { error.textContent = msg; error.hidden = false; if (el) el.focus(); };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail('Please check the email address to reply to.', form.querySelector('#rpTo'));
  if (text.length < 2) return fail('Please write a reply first.', form.querySelector('#rpText'));
  const sent = out => {
    form.querySelector('#rpText').value = ''; // sent: nothing left to ask about when leaving
    MSG.note = (out && out.message) || `Reply sent to ${to}.`; MSG.at = 0; msgOpen = null; loadUnread(true);
    go('#/committee/messages');
  };
  const gaps = drawGaps();
  if (gaps.length) {
    return confirmAsk({
      title: 'Some parts are not filled in', text: `This reply still has ${gaps.join(', ')} in it. The person would see ${gaps.length === 1 ? 'that' : 'those'} exactly as written.`,
      yes: 'Send it anyway', busy: 'Sending…', no: 'Go back and fill them in',
      run: () => committeeApi('msgReply', [id, to, text]), done: sent
    });
  }
  error.hidden = true;
  btn.disabled = true; btn.textContent = 'Sending…';
  committeeApi('msgReply', [id, to, text]).then(sent).catch(err => {
    if (err.signedOut) return;
    btn.disabled = false; btn.textContent = 'Send reply';
    fail(err.message);
  });
}

/* ---------- Post results ---------- */
let MEMBERS = null;          // [{id, name, short}] from the server; kept in memory only, never saved on the phone
let membersFailed = false, membersLoading = false;
let sameDay = null;          // {date, discipline} carried over by "Add another competition for the same day"

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const nextSaturday = () => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/* A date box. iPhones show an empty one as a blank box, so it gets its own "Tap to choose a date" hint. */
const timeField = (id, value) => `<div class="date-wrap${time24(value) ? '' : ' no-date'}"><input class="field" type="time" id="${id}" value="${time24(value)}"><span class="date-hint" aria-hidden="true">Tap to set</span></div>`;
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
      : `<a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Post results</h1>`}</div>
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
      <p class="muted">They appear on the website and On Target within about 2 minutes.</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary btn-big" data-same-day>Add another competition for the same day</button>
        <a class="btn btn-outline btn-big" href="#/me">Back to Me</a>
      </div>
    </div></section>`;
}

async function loadMembers() {
  if (membersLoading || !session) return;
  membersLoading = true;
  try { const list = await committeeApi('memberNames'); MEMBERS = Array.isArray(list) ? list : []; membersFailed = false; }
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
    <div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Add photos</h1></div>
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
      <p class="muted">${addedCount === 1 ? 'It appears' : 'They appear'} in On Target and the website gallery within about 2 minutes.</p>
      <div class="btn-row">
        ${ADDED.length ? `<button type="button" class="btn btn-outline btn-big share-added" data-share-added>${ICON.share}Share to Facebook or Instagram</button>` : ''}
        <button type="button" class="btn btn-primary btn-big" data-more-photos>Add more photos</button>
        <a class="btn btn-outline btn-big" href="#/me">Back to Me</a>
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
      p.state = 'done'; p.album = meta.album || 'Around the range'; p.caption = meta.caption;
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
  const done = PICKED.filter(p => p.state === 'done');
  addedCount = done.length;
  ADDED = done.map(p => ({ blob: p.blob, album: p.album, caption: p.caption })); // the same pictures that were sent, so sharing needs no download
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
  const [name, sub, arg] = (location.hash.replace('#/', '') || 'home').split('/');
  const page = (VIEWS[name] ? name : 'home') + (name === 'committee' && ['event', 'results', 'photos', 'manage', 'edit', 'messages', 'message', 'reply', 'payments', 'members', 'people', 'person', 'signups', 'emergency', 'documents', 'document', 'range', 'walkin', 'reserve', 'requests'].includes(sub) ? '/' + sub : '')
    + (name === 'me' && ['results', 'details', 'email', 'documents', 'book', 'bookings', 'request'].includes(sub) ? '/' + sub : '');
  // Fresh club data must not wipe a form someone is filling in
  // (the member sign-in box on Me only counts once something has been typed in it)
  if (quiet && page === currentPage && [...view.querySelectorAll('form')].some(f => f.id !== 'meEmailForm' || f.querySelector('input').value)) return refreshSuggestions();
  if (page !== currentPage) {
    posted = false; sameDay = null; clearPicked(); ADDED = []; sharePick = null;
    if (page !== 'committee/edit') editing = null;
    if (page !== 'committee/manage') manageNote = '';
    if (page !== 'committee/messages') MSG.note = '';
    if (page !== 'committee/payments') ADMIN.payNote = '';
    if (page !== 'committee/members') ADMIN.mem.note = '';
    if (page !== 'committee/person') personEdit = null;
    if (page !== 'committee/signups') { ADMIN.signNote = ''; ADMIN.signups = null; ADMIN.signState = ''; }
    if (page !== 'me/details') meNote = '';
    benchLeave(page);
    if (page !== 'me/email') emailChange = null;
    if (page !== 'committee/emergency') EMERG = blankEmerg();
    if (page !== 'committee/document') { docEdit = null; docFile = null; docBusy = false; }
    if (page !== 'committee/documents') DOCADMIN.note = '';
    if (page !== 'committee/documents' && page !== 'committee/document') { DOCADMIN.list = null; DOCADMIN.state = ''; }
    if (page.indexOf('me') !== 0) relinking = false;
    if (page !== 'me/documents') { DOCS = null; docsState = ''; }
    // A new PIN is shown once: it is forgotten as soon as the People and PINs screen is left
    if (page !== 'committee/people') { ADMIN.newPin = null; ADMIN.peopleNote = ''; }
    // Opening Manage posts afresh: get an up-to-date list (coming back from an edit screen keeps the one just loaded)
    else if (currentPage !== 'committee/edit' && Date.now() - manageAt > 30000) { MANAGE = null; manageState = ''; }
  }
  const openComps = quiet ? [...view.querySelectorAll('details.comp')].map(d => d.open) : null;
  view.innerHTML = VIEWS[page.split('/')[0]](sub, arg);
  if (openComps) view.querySelectorAll('details.comp').forEach((d, i) => { if (i in openComps) d.open = openComps[i]; });
  if (!quiet || page !== currentPage) {
    view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
    window.scrollTo(0, 0);
  }
  currentPage = page; currentHash = location.hash;
  const rs = document.getElementById('resultsForm');
  if (rs) { tidyRows(rs); rs.dataset.initial = resultsSnapshot(rs); }
  drawPicked();
  drawMessages();
  drawMembers();
  const once = document.getElementById('pinOnce');
  if (once && !quiet) once.focus();
  document.querySelectorAll('.tabbar a').forEach(a => {
    if (a.dataset.tab === ({ committee: 'me', more: 'me' }[page.split('/')[0]] || page.split('/')[0])) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

view.addEventListener('click', e => {
  const t = e.target;
  const cal = t.closest('[data-cal]'), shr = t.closest('[data-share]'), ph = t.closest('[data-photo]');
  if (cal) addToCalendar((currentPage === 'events' ? eventsShown() : events())[Number(cal.dataset.cal)]);
  if (shr) shareEvent(events()[Number(shr.dataset.share)]);
  if (ph) openPhoto(Number(ph.dataset.photo));
  if (t.closest('[data-retry]')) { const k = t.closest('[data-retry]').dataset.retry; FAILED[k] = false; render(true); refresh(k, true); }
  if (t.closest('[data-signin]')) openSignIn();
  if (t.closest('[data-signout-all]')) signOutAll();
  if (t.closest('[data-install]')) installApp();
  if (t.closest('[data-docs-reload]')) { DOCS = null; docsState = ''; render(true); }
  if (t.closest('[data-me-reload]')) { ME = null; meState = ''; relinking = false; render(true); }
  if (t.closest('[data-me-relink]')) { relinking = true; render(); }
  if (t.closest('[data-ec-again]')) emailCodeAgain(t.closest('[data-ec-again]'));
  if (t.closest('[data-ec-back]')) { emailChange = null; render(); }
  if (t.closest('[data-em-pick]')) openEmergency(Number(t.closest('[data-em-pick]').dataset.emPick));
  if (t.closest('[data-em-list]')) { EMERG.open = null; EMERG.state = ''; drawEmergency(); }
  if (t.closest('[data-docadmin-reload]')) { DOCADMIN.list = null; DOCADMIN.state = ''; DOCADMIN.note = ''; render(true); }
  if (t.closest('[data-doc]') && (DOCADMIN.list || t.closest('[data-doc]').dataset.doc === 'new')) {
    const i = t.closest('[data-doc]').dataset.doc;
    docEdit = i === 'new' ? {} : DOCADMIN.list[Number(i)];
    if (docEdit) location.hash = '#/committee/document';
  }
  if (t.closest('[data-doc-choose]') && !docBusy) document.getElementById('dcFile').click();
  if (t.closest('[data-doc-replace]') && docEdit) replaceDoc(t.closest('form'));
  if (t.closest('[data-doc-remove]') && docEdit) askRemoveDoc();
  if (t.closest('[data-su-reload]')) { ADMIN.signups = null; ADMIN.signState = ''; ADMIN.signNote = ''; render(true); }
  if (t.closest('[data-su-link]')) askSignup(Number(t.closest('[data-su-link]').dataset.suLink), true);
  if (t.closest('[data-su-decline]')) askSignup(Number(t.closest('[data-su-decline]').dataset.suDecline), false);
  if (t.closest('[data-mem-filter]')) { ADMIN.mem.filter = t.closest('[data-mem-filter]').dataset.memFilter; ADMIN.mem.query = ''; ADMIN.mem.items = null; }
  if (t.closest('[data-pay-reload]')) { ADMIN.pending = null; ADMIN.pendingState = ''; ADMIN.payNote = ''; render(true); }
  if (t.closest('[data-mark-paid]')) askMarkPaid(Number(t.closest('[data-mark-paid]').dataset.markPaid));
  if (t.closest('[data-mem-chip]')) { ADMIN.mem.filter = t.closest('[data-mem-chip]').dataset.memChip; ADMIN.mem.note = ''; loadMembersList(); }
  if (t.closest('[data-mem-reload]')) loadMembersList();
  if (t.closest('[data-mem-export]')) exportMembers(t.closest('[data-mem-export]'));
  if (t.closest('[data-people-reload]')) { ADMIN.people = null; ADMIN.peopleState = ''; render(true); }
  if (t.closest('[data-pin-done]')) { ADMIN.newPin = null; render(true); }
  if (t.closest('[data-person]') && ADMIN.people) {
    const i = t.closest('[data-person]').dataset.person;
    personEdit = i === 'new' ? {} : ADMIN.people[Number(i)];
    if (personEdit) location.hash = '#/committee/person';
  }
  if (t.closest('[data-person-remove]') && personEdit) askRemovePerson();
  if (t.closest('[data-another]')) { posted = false; render(); }
  if (t.closest('[data-same-day]')) { posted = false; render(); }
  if (t.closest('[data-more-photos]')) { posted = false; ADDED = []; render(); }
  if (t.closest('[data-share-added]') && ADDED.length) shareAdded();
  if (t.closest('[data-share-post]') && MANAGE) sharePost(t.closest('[data-share-post]').dataset.sharePost);
  if (t.closest('[data-pick-start]')) { sharePick = []; manageNote = ''; render(true); view.querySelector('#pickNote').scrollIntoView({ block: 'center' }); }
  if (t.closest('[data-pick-cancel]')) { sharePick = null; render(true); }
  if (t.closest('[data-pick]') && sharePick) togglePick(t.closest('[data-pick]'));
  if (t.closest('[data-pick-share]') && sharePick && sharePick.length) sharePicked();
  if (t.closest('[data-mtab]')) { manageTab = t.closest('[data-mtab]').dataset.mtab; manageNote = ''; sharePick = null; render(true); view.querySelector(`[data-mtab="${manageTab}"]`).focus(); }
  if (t.closest('[data-manage-reload]')) { MANAGE = null; sharePick = null; manageState = ''; manageNote = ''; render(true); }
  if (t.closest('[data-edit]') && MANAGE) {
    const [kind, i] = t.closest('[data-edit]').dataset.edit.split(':');
    const item = (kind === 'event' ? manageEvents() : kind === 'results' ? MANAGE.results : MANAGE.photos)[Number(i)];
    if (item) { editing = { kind, item }; location.hash = '#/committee/edit'; }
  }
  if (t.closest('[data-delete]') && editing) askDelete();
  if (t.closest('[data-mview]')) { MSG.view = t.closest('[data-mview]').dataset.mview; MSG.note = ''; view.querySelectorAll('[data-mview]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mview === MSG.view)); loadMessages(); }
  if (t.closest('[data-msg-refresh]')) { MSG.note = ''; loadMessages(); loadUnread(true); }
  if (t.closest('[data-msg-more]')) loadMessages(true);
  if (t.closest('[data-msg-act]') && msgOpen) msgAct(t.closest('[data-msg-act]'));
  if (t.closest('[data-msg-archive]') && msgOpen) askArchive();
  if (t.closest('[data-gap]')) {
    const box = document.getElementById('rpText'), gap = t.closest('[data-gap]').dataset.gap, at = box.value.indexOf(gap);
    if (at >= 0) { box.focus(); box.setSelectionRange(at, at + gap.length); }
  }
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
  if (e.target.id === 'msgSearch') { e.preventDefault(); MSG.query = e.target.querySelector('#msgQuery').value.trim(); MSG.note = ''; loadMessages(); }
  if (e.target.id === 'replyForm') { e.preventDefault(); sendReply(e.target); }
  if (e.target.id === 'memSearch') { e.preventDefault(); ADMIN.mem.query = e.target.querySelector('#memQuery').value.trim(); ADMIN.mem.note = ''; loadMembersList(); }
  if (e.target.id === 'personForm') { e.preventDefault(); savePerson(e.target); }
  if (e.target.id === 'linkForm') { e.preventDefault(); linkMe(e.target); }
  if (e.target.id === 'meEmailForm') { e.preventDefault(); requestCode(e.target); }
  if (e.target.id === 'detailsForm') { e.preventDefault(); saveDetails(e.target); }
  if (e.target.id === 'emailForm') { e.preventDefault(); changeEmail(e.target); }
  if (e.target.id === 'emForm') { e.preventDefault(); findEmergency(e.target); }
  if (e.target.id === 'docForm') { e.preventDefault(); saveDoc(e.target); }
});
view.addEventListener('change', e => {
  if (e.target.id !== 'dcFile') return;
  if (e.target.files.length) chooseDoc(e.target.files[0]);
  e.target.value = ''; // so the same file can be chosen again
});
view.addEventListener('change', e => { if (e.target.id === 'rpSaved' && e.target.value !== '') useSaved(e.target.value); });
view.addEventListener('change', e => {
  if (e.target.name !== 'ppPin') return;
  const wrap = document.getElementById('ppPinWrap');
  wrap.hidden = e.target.value !== 'set';
  if (!wrap.hidden) document.getElementById('ppNewPin').focus();
});
view.addEventListener('input', e => { if (e.target.id === 'rpText') drawGaps(); });
view.addEventListener('change', e => {
  if (e.target.id !== 'phFiles') return;
  if (e.target.files.length) choosePhotos(e.target.files);
  e.target.value = ''; // so the same photo can be chosen again after removing it
});
const dateHint = e => { if (e.target.type === 'date' || e.target.type === 'time') e.target.parentNode.classList.toggle('no-date', !e.target.value); };
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
  reply: ['Leave without sending?', 'Your reply has not been sent. If you leave now, what you have typed will be lost.', 'Stay and keep writing', 'Leave without sending'],
  edit: ['Leave without saving?', 'Your changes to these results have not been saved. If you leave now, they will be lost.', 'Stay and keep editing', 'Leave without saving'],
  photos: ['Photos are still uploading', 'If you leave now, the photos that have not been sent yet will not be added.', 'Stay until they finish', 'Leave and stop uploading']
};
const leaveReason = () => uploading ? 'photos' : replyDirty() ? 'reply' : !resultsDirty() ? '' : document.getElementById('resultsForm').dataset.mode === 'edit' ? 'edit' : 'results';
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
/* Club data looks after itself: it is fetched again once it is 2 minutes old while On Target is on the screen,
   and straight away when On Target comes back to the screen. There is no Refresh button. */
setInterval(() => { if (!document.hidden) refreshAll(); }, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  refreshAll();
  if (session && currentPage === 'events') loadPrivate(); // private events have no saved copy, so fetch them again
});

/* ---------- Club team: sign-in and the server ---------- */
const sessionStore = {
  get() { try { const s = JSON.parse(localStorage.getItem('ot:committee')); return s && s.pin ? s : null; } catch (e) { return null; } },
  set(s) { try { if (s) localStorage.setItem('ot:committee', JSON.stringify(s)); else localStorage.removeItem('ot:committee'); } catch (e) { /* storage blocked */ } }
};
let session = sessionStore.get(); // {pin, name, admin} while signed in on this device

/* Calls one of the club team functions on the club's server. Gives back the data, or throws an Error with a plain-English message. */
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

function signOut() {
  session = null; sessionStore.set(null);
  if (!member) { ME = null; meState = ''; meNote = ''; } // the membership their PIN was showing
  EMERG = blankEmerg(); DOCADMIN = { list: null, state: '', note: '' }; docEdit = null; docFile = null; DOCS = null; docsState = '';
  MEMBERS = null; membersFailed = false; BENCH = blankBench();
  MANAGE = null; PRIVATE = null; editing = null; manageState = ''; manageNote = ''; sharePick = null; ADDED = [];
  Object.assign(MSG, { view: 'inbox', query: '', items: null, more: false, page: 0, state: '', note: '', at: 0, run: MSG.run + 1 });
  msgOpen = null; msgOpenState = ''; msgUnread = null; unreadAt = 0; SAVED = null;
  ADMIN = blankAdmin(); personEdit = null;
  const rp = document.getElementById('replyForm');
  if (rp) rp.remove();
  const rs = document.getElementById('resultsForm');
  if (rs) rs.remove(); // nothing left to ask about
  clearPicked();
  drawDot();
  if (/^#\/(committee|me\/)/.test(location.hash)) location.hash = '#/me'; else render();
}

/* Sheets (simple dialogs) */
const sheet = document.getElementById('sheet'), leaveSheet = document.getElementById('leaveSheet');
const confirmSheet = document.getElementById('confirmSheet'), shareSheet = document.getElementById('shareSheet'), installSheet = document.getElementById('installSheet');
const SHEETS = [sheet, leaveSheet, confirmSheet, shareSheet, installSheet];
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
  endShare();
  SHEETS.forEach(el => { el.hidden = true; });
  if (sheetOpener && document.contains(sheetOpener)) sheetOpener.focus();
  sheetOpener = null;
}
/* The sign-in sheet: the club team's PIN, or (step = 'code') the code a member has just been emailed */
function openSignIn(note, step) {
  leaveSheet.hidden = true; confirmSheet.hidden = true; shareSheet.hidden = true; installSheet.hidden = true; endShare();
  pinBox.value = ''; signInError.hidden = true;
  signInNote.textContent = note || ''; signInNote.hidden = !note;
  openSheet(sheet, signInStep(step === 'code' ? 'code' : 'pin'));
}

document.getElementById('sheetClose').addEventListener('click', closeSheets);
SHEETS.forEach(el => el.addEventListener('click', e => { if (e.target === el) closeSheets(); }));
document.getElementById('leaveStay').addEventListener('click', closeSheets);
document.getElementById('confirmNo').addEventListener('click', closeSheets);
document.getElementById('shareClose').addEventListener('click', closeSheets);
document.getElementById('leaveGo').addEventListener('click', () => {
  const to = leavingTo; leavingTo = null;
  sheetOpener = null; closeSheets();
  const rs = document.getElementById('resultsForm');
  if (rs) rs.remove();
  const rp = document.getElementById('replyForm');
  if (rp) rp.remove();
  clearPicked();
  location.hash = to || '#/me';
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
    if (!member) { ME = null; meState = ''; } // a PIN linked to a membership shows that member's card
    sheetOpener = null; closeSheets();
    if (location.hash === '#/me') render(); else location.hash = '#/me';
  } catch (err) {
    fail(err.message);
  } finally {
    signInBtn.disabled = false; signInBtn.textContent = 'Sign in';
  }
});

/* ---------- Share to Facebook or Instagram ----------
   On Target can't post for you: it gets the photos and a caption ready, and the person posts them.
   Phones hand the photos to the share sheet (the caption is copied, because Facebook and Instagram ignore
   text sent with a photo); laptops save the photos and copy the caption. Photos are kept in memory only. */
const SITE = 'ravenshoegunclub.com.au', TAGS = '#Ravenshoe #SSAA #TargetShooting #FNQ #Tablelands';
const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

function eventCaption(ev) {
  const when = timeRange(ev);
  return ['\u{1F4C5} Coming up at the range', '',
    `\u25AA\uFE0F ${shortDate(ev.date)}${when ? ', ' + when : ''} \u2013 ${ev.title}${ev.discipline ? ' (' + ev.discipline + ')' : ''}`,
    ...(ev.description ? [ev.description] : []),
    '', 'Visitors welcome.', 'Details: ' + SITE, '', TAGS].join('\n');
}
/* Every competition from one day, with all the placings */
function resultsCaption(date) {
  const out = ['\u{1F3AF} Results \u2013 ' + longDate(date), ''];
  MANAGE.results.filter(g => g.date === date).forEach(g => {
    out.push(g.competition + (g.discipline ? ' (' + g.discipline + ')' : ''));
    g.rows.forEach((r, i) => { const p = Number(r.place) || i + 1; out.push(`${MEDALS[p - 1] || p + '.'} ${r.shooter}${r['class'] ? ' (' + r['class'] + ')' : ''} \u2013 ${r.score}`); });
    out.push('');
  });
  return [...out, 'Well done everyone!', 'Full results: ' + SITE + '/results', '', TAGS].join('\n');
}
function photosCaption(list) {
  const albums = [...new Set(list.map(p => p.album || 'Around the range'))], caps = [...new Set(list.map(p => p.caption).filter(Boolean))];
  return ['\u{1F4F8} ' + albums.join(' \u00B7 '), ...(caps.length ? ['', caps.slice(0, 3).join('\n')] : []), '', 'More photos: ' + SITE, '', TAGS].join('\n');
}

const shareText = document.getElementById('shareText'), shareStatus = document.getElementById('shareStatus'), shareError = document.getElementById('shareError');
const sharePics = document.getElementById('sharePics'), shareGo = document.getElementById('shareGo'), shareSave = document.getElementById('shareSave'), shareCopy = document.getElementById('shareCopy');
let SHARE = null, shareRun = 0; // {files: [File], urls: [for the previews], word: 'picture' | 'photo' | 'photos'} while the share sheet is open

function endShare() {
  if (SHARE) SHARE.urls.forEach(u => URL.revokeObjectURL(u));
  SHARE = null; shareRun++;
  sharePics.innerHTML = '';
}

async function copyCaption() {
  try { await navigator.clipboard.writeText(shareText.value); return true; }
  catch (e) {
    shareText.focus(); shareText.select();
    try { return document.execCommand('copy'); } catch (e2) { return false; }
  }
}

/* o: {text, note, and one of: photos: [{row, fp}] to fetch from the club Drive, blobs: [Blob] already here,
   or picture: {make, name} for the club-colours picture of an event or a day's results, which is drawn here} */
async function openShare(o) {
  endShare();
  const run = shareRun, count = o.picture ? 1 : (o.photos || o.blobs || []).length;
  const word = o.picture ? 'picture' : count === 1 ? 'photo' : 'photos';
  SHARE = { files: [], urls: [], word };
  shareText.value = o.text;
  shareError.hidden = true; sharePics.hidden = !count; sharePics.classList.toggle('share-card', !!o.picture);
  shareGo.hidden = true; shareSave.hidden = true;
  shareCopy.className = 'btn btn-big ' + (count ? 'btn-outline' : 'btn-primary');
  shareStatus.textContent = count ? `Getting the ${word} ready…` : '';
  openSheet(shareSheet, shareCopy);
  shareSheet.querySelector('.sheet-panel').scrollTop = 0;
  const addFile = (blob, mime, name) => {
    const ext = /png/.test(mime) ? 'png' : /webp/.test(mime) ? 'webp' : 'jpg';
    const file = new File([blob], name || `rdss-photo-${SHARE.files.length + 1}.${ext}`, { type: mime || 'image/jpeg' });
    const url = URL.createObjectURL(file);
    SHARE.files.push(file); SHARE.urls.push(url);
    sharePics.insertAdjacentHTML('beforeend', `<img src="${url}" alt="${o.picture ? 'The picture' : 'Photo ' + SHARE.files.length} to share">`);
  };
  // Nothing to share but the words: the caption is the whole job
  const captionOnly = why => {
    sharePics.hidden = true; shareCopy.className = 'btn btn-big btn-primary';
    shareStatus.textContent = (why ? why + ' ' : '') + 'Tap Copy caption, then paste it into a new post on Facebook or Instagram.';
  };

  if (!count) return captionOnly();
  if (o.picture) {
    let blob = null;
    try { blob = await o.picture.make(); } catch (e) { /* this device can't draw it: the caption still works */ }
    if (run !== shareRun) return; // the sheet was closed meanwhile
    if (!blob) return captionOnly('The picture could not be made on this device.');
    addFile(blob, 'image/jpeg', o.picture.name);
  } else {
    try {
      (o.blobs || []).forEach(b => addFile(b, b.type));
      for (const [i, ph] of (o.photos || []).entries()) {
        shareStatus.textContent = `Getting photo ${i + 1} of ${count}…`;
        const r = await committeeApi('photoForShare', [ph.row, ph.fp]);
        if (run !== shareRun) return; // the sheet was closed meanwhile
        addFile(await (await fetch(`data:${r.mime || 'image/jpeg'};base64,${r.b64}`)).blob(), r.mime || 'image/jpeg');
      }
    } catch (err) {
      if (err.signedOut || run !== shareRun) return;
      if (CONFLICT.test(err.message)) { sheetOpener = null; closeSheets(); changed('photos', CONFLICT_NOTE); return go('#/committee/manage'); }
      shareStatus.textContent = '';
      shareError.textContent = err.message; shareError.hidden = false;
      return;
    }
  }
  // Phones and tablets hand the photos to the share sheet, and can save them too; laptops save them
  const phone = matchMedia('(pointer: coarse)').matches && !!navigator.canShare && navigator.canShare({ files: SHARE.files });
  shareGo.hidden = !phone; shareSave.hidden = false;
  shareSave.className = 'btn btn-big ' + (phone ? 'btn-outline' : 'btn-primary');
  shareGo.textContent = `Share ${word}`; shareSave.textContent = `Save ${word}`;
  shareStatus.textContent = (o.note ? o.note + ' ' : '') + (phone
    ? `Tap Share ${word} and choose Facebook or Instagram. The caption is copied for you: press and hold in the text box of your post, then tap Paste.`
    : `Tap Save ${word}, then Copy caption. Start a new post on Facebook or Instagram, add the saved ${word} and paste the caption.`);
  (phone ? shareGo : shareSave).focus();
}

shareCopy.addEventListener('click', async () => {
  shareError.hidden = true;
  shareStatus.textContent = await copyCaption() ? 'The caption is copied. Paste it into your post.' : 'The caption could not be copied here. Select the text and copy it yourself.';
});
shareGo.addEventListener('click', () => {
  if (!SHARE || !SHARE.files.length) return;
  shareError.hidden = true;
  copyCaption(); // not waited for: the share sheet must open straight from the tap
  navigator.share({ files: SHARE.files }).catch(err => {
    if (err && err.name === 'AbortError') return; // closed without sharing
    shareError.textContent = `Sharing isn't available here. Tap ${shareSave.textContent} instead, then add ${SHARE && SHARE.files.length === 1 ? 'it' : 'them'} to your post.`; shareError.hidden = false;
  });
});
shareSave.addEventListener('click', () => {
  if (!SHARE || !SHARE.files.length) return;
  shareError.hidden = true;
  SHARE.urls.forEach((url, i) => setTimeout(() => {
    const a = document.createElement('a');
    a.href = url; a.download = SHARE ? SHARE.files[i].name : 'rdss-photo.jpg';
    document.body.appendChild(a); a.click(); a.remove();
  }, i * 400));
  const n = SHARE.files.length;
  shareStatus.textContent = `${n === 1 ? 'The ' + SHARE.word + ' is' : 'The ' + n + ' photos are'} saved where this device keeps downloads. Now tap Copy caption.`
    + (shareGo.hidden ? '' : ` On an iPhone, Share ${SHARE.word} then "Save Image" puts ${n === 1 ? 'it' : 'them'} in Photos.`);
});

/* ---------- The club-colours picture for an event or a day's results ----------
   Drawn on a canvas, 1080 x 1350 (the shape Facebook and Instagram both take). Nothing is fetched to make it,
   so it works without a connection and the canvas can always be saved as a picture. */
const PIC_W = 1080, PIC_H = 1350;
function picFit(x, text, maxW) {
  text = String(text == null ? '' : text);
  if (x.measureText(text).width <= maxW) return text;
  while (text.length > 1 && x.measureText(text + '…').width > maxW) text = text.slice(0, -1);
  return text + '…';
}
function picWrap(x, text, maxW, maxLines) {
  let lines = [], cur = '';
  String(text || '').replace(/\s+/g, ' ').trim().split(' ').forEach(w => {
    const t = cur ? cur + ' ' + w : w;
    if (x.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
  });
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = picFit(x, lines[maxLines - 1] + ' …', maxW); }
  return lines;
}
function picRound(x, l, t, w, h, r) {
  x.beginPath(); x.moveTo(l + r, t);
  x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r);
  x.closePath();
}
/* The club's fonts must be loaded before a canvas can write with them; without them (no connection) it still draws */
function picFonts() {
  if (!document.fonts) return Promise.resolve();
  const all = ['700 26px Montserrat', '800 52px Montserrat', '400 36px Poppins', '500 25px Poppins', '600 30px Poppins'].map(f => document.fonts.load(f));
  return Promise.race([Promise.all(all), new Promise(ok => setTimeout(ok, 3000))]).catch(() => {});
}
/* The top and bottom of every picture: maroon band with the target rings, gold line, footer */
function picFrame(x, kicker, title, footer) {
  const W = PIC_W, H = PIC_H;
  x.fillStyle = '#F6F2EE'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#5C0F1F'; x.fillRect(0, 0, W, 250);
  x.fillStyle = '#E9B44C'; x.fillRect(0, 250, W, 8);
  x.strokeStyle = '#E9B44C';
  x.lineWidth = 22; x.beginPath(); x.arc(130, 125, 68, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 9; x.beginPath(); x.arc(130, 125, 36, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(130, 125, 15, 0, Math.PI * 2); x.fill();
  x.font = '700 26px Montserrat, sans-serif'; x.fillText(kicker, 245, 92);
  x.fillStyle = '#fff'; x.font = '800 52px Montserrat, sans-serif'; x.fillText(picFit(x, title, W - 290), 245, 152);
  x.fillStyle = '#F0D5DA'; x.font = '500 25px Poppins, sans-serif'; x.fillText('Ravenshoe & District Sporting Shooters · SSAA Q48', 245, 198);
  x.fillStyle = '#5C0F1F'; x.fillRect(0, H - 100, W, 100);
  x.fillStyle = '#E9B44C'; x.fillRect(0, H - 10, W, 10);
  x.fillStyle = '#fff'; x.font = '700 30px Montserrat, sans-serif'; x.textAlign = 'center';
  x.fillText(picFit(x, footer, W - 80), W / 2, H - 42); x.textAlign = 'left';
}
/* A white card with a crimson top edge */
function picPanel(x, l, t, w, h) {
  x.save(); x.shadowColor = 'rgba(0,0,0,.08)'; x.shadowBlur = 18; x.shadowOffsetY = 4;
  picRound(x, l, t, w, h, 22); x.fillStyle = '#fff'; x.fill(); x.restore();
  x.save(); picRound(x, l, t, w, h, 22); x.clip(); x.fillStyle = '#9B1B35'; x.fillRect(l, t, w, 10); x.restore();
}
async function picMake(draw) {
  await picFonts();
  const c = document.createElement('canvas'); c.width = PIC_W; c.height = PIC_H;
  draw(c.getContext('2d'));
  return new Promise((ok, bad) => c.toBlob(b => b ? ok(b) : bad(new Error('no picture')), 'image/jpeg', 0.92));
}
/* One event: type, title, when, and as much of the description as fits */
function eventPicture(ev) {
  return picMake(x => {
    const pad = 40, top = 300, h = PIC_H - 130 - top - 10, tw = PIC_W - pad * 2 - 100, when = timeRange(ev);
    picFrame(x, 'COMING UP', longDate(ev.date), 'Visitors welcome · ' + SITE);
    x.font = '800 64px Montserrat, sans-serif'; const title = picWrap(x, ev.title, tw, 3);
    x.font = '400 36px Poppins, sans-serif'; const desc = ev.description ? picWrap(x, ev.description, tw, 7) : [];
    // measured first, so the words sit in the middle of the card
    const block = 40 + title.length * 76 + 40 + 60 + (desc.length ? 40 + desc.length * 52 : 0);
    let y = top + Math.max(70, (h - block) / 2) + 30;
    picPanel(x, pad, top, PIC_W - pad * 2, h);
    x.fillStyle = '#9B1B35'; x.font = '700 28px Montserrat, sans-serif'; x.fillText(picFit(x, String(ev.discipline || 'Club event').toUpperCase(), tw), pad + 50, y); y += 82;
    x.fillStyle = '#5C0F1F'; x.font = '800 64px Montserrat, sans-serif';
    title.forEach(l => { x.fillText(l, pad + 50, y); y += 76; });
    x.fillStyle = '#E9B44C'; x.fillRect(pad + 50, y - 30, 100, 7); y += 34;
    x.fillStyle = '#1E1E1E'; x.font = '600 40px Poppins, sans-serif';
    x.fillText(picFit(x, longDate(ev.date) + (when ? ' · ' + when : ''), tw), pad + 50, y);
    x.fillStyle = '#4A4A4A'; x.font = '400 36px Poppins, sans-serif'; y += 80;
    desc.forEach(l => { x.fillText(l, pad + 50, y); y += 52; });
  });
}
/* One competition day: up to 6 competitions, the top 3 in each (the caption lists everyone) */
function resultsPicture(date) {
  const comps = MANAGE.results.filter(g => g.date === date);
  return picMake(x => {
    const list = comps.slice(0, 6), more = comps.length - list.length;
    picFrame(x, 'COMPETITION RESULTS', longDate(date), (more > 0 ? `+${more} more competition${more === 1 ? '' : 's'} · ` : '') + 'Full results: ' + SITE + '/results');
    const cols = list.length === 1 ? 1 : 2, rows = Math.ceil(list.length / cols), top = 290, bottom = PIC_H - 130, gap = 26, pad = 40;
    const w = (PIC_W - pad * 2 - gap * (cols - 1)) / cols, h = Math.min(400, (bottom - top - gap * (rows - 1)) / rows);
    const medal = ['#E9B44C', '#C9C9C9', '#CD7F32'];
    list.forEach((g, k) => {
      const l = pad + (k % cols) * (w + gap), t = top + Math.floor(k / cols) * (h + gap), step = Math.min(70, (h - 170) / 3);
      picPanel(x, l, t, w, h);
      x.fillStyle = '#5C0F1F'; x.font = '800 34px Montserrat, sans-serif'; x.fillText(picFit(x, g.competition, w - 56), l + 28, t + 66);
      x.fillStyle = '#9B1B35'; x.font = '700 20px Montserrat, sans-serif'; x.fillText(picFit(x, String(g.discipline || 'Competition').toUpperCase(), w - 56), l + 28, t + 98);
      g.rows.slice(0, 3).forEach((r, i) => {
        const p = Number(r.place) || i + 1, y = t + 150 + i * step, score = String(r.score == null ? '' : r.score);
        x.beginPath(); x.arc(l + 50, y - 11, 22, 0, Math.PI * 2); x.fillStyle = medal[p - 1] || '#EEE'; x.fill();
        x.fillStyle = p === 3 ? '#fff' : '#5C0F1F'; x.font = '800 22px Montserrat, sans-serif'; x.textAlign = 'center'; x.fillText(String(p), l + 50, y - 3); x.textAlign = 'left';
        x.font = '600 30px Poppins, sans-serif';
        const sw = x.measureText(score).width;
        x.fillStyle = '#1E1E1E'; x.fillText(picFit(x, r.shooter, w - 140 - sw - 20), l + 88, y);
        x.fillStyle = '#5C0F1F'; x.textAlign = 'right'; x.fillText(score, l + w - 28, y); x.textAlign = 'left';
      });
      if (g.rows.length > 3) { x.fillStyle = '#6B6B6B'; x.font = '500 20px Poppins, sans-serif'; x.fillText(`+ ${g.rows.length - 3} more`, l + 28, t + h - 22); }
    });
  });
}

/* The Share button on an event or a result in Manage posts */
function sharePost(what) {
  const [kind, i] = what.split(':');
  const item = (kind === 'event' ? manageEvents() : MANAGE.results)[Number(i)];
  if (!item) return;
  if (kind === 'event' && item.audience !== 'Everyone') return; // private and hidden events are never shared
  openShare(kind === 'event'
    ? { text: eventCaption(item), picture: { make: () => eventPicture(item), name: `rdss-event-${item.date}.jpg` } }
    : { text: resultsCaption(item.date), picture: { make: () => resultsPicture(item.date), name: `rdss-results-${item.date}.jpg` } });
}
/* Manage posts, Photos: ticking photos to share */
function togglePick(tile) {
  const i = Number(tile.dataset.pick), at = sharePick.indexOf(i), note = document.getElementById('pickNote');
  if (at < 0 && sharePick.length >= SHARE_MAX) { note.textContent = `That is ${SHARE_MAX} photos, the most that fit in one post. Tap a ticked photo to take it off.`; return; }
  if (at < 0) sharePick.push(i); else sharePick.splice(at, 1);
  tile.setAttribute('aria-pressed', at < 0);
  note.textContent = `Tap the photos you want to share, up to ${SHARE_MAX}.`;
  const btn = view.querySelector('[data-pick-share]');
  btn.disabled = !sharePick.length; btn.textContent = pickLabel();
}
function sharePicked() {
  const list = sharePick.map(i => MANAGE.photos[i]).filter(Boolean);
  openShare({ text: photosCaption(list), photos: list.map(p => ({ row: p.row, fp: p.fp })) });
}
/* Straight after Add photos: the pictures are still here, so nothing is downloaded */
function shareAdded() {
  const list = ADDED.slice(0, SHARE_MAX);
  openShare({ text: photosCaption(list), blobs: list.map(p => p.blob),
    note: ADDED.length > SHARE_MAX ? `One post takes ${SHARE_MAX} photos, so the first ${SHARE_MAX} are here.` : '' });
}

/* Post a new event, or save an edited one (which may also change who can see it) */
async function postEvent(form) {
  const btn = form.querySelector('#evSubmit'), error = form.querySelector('#evError');
  if (btn.disabled) return;
  const val = id => form.querySelector('#' + id).value.trim();
  const fail = (msg, id) => { error.textContent = msg; error.hidden = false; if (id) form.querySelector('#' + id).focus(); };
  const ev = { date: val('evDate'), start: val('evStart'), end: val('evEnd'), title: val('evTitle'), discipline: val('evDisc'), description: val('evDesc') };
  const audience = (form.querySelector('[name="evAudience"]:checked') || {}).value || 'Everyone';
  if (!ev.date) return fail('Please choose a date.', 'evDate');
  if (ev.end && !ev.start) return fail('Please choose a start time as well as an end time.', 'evStart');
  if (ev.end && ev.end <= ev.start) return fail('The end time must be after the start time.', 'evEnd');
  if (!ev.title) return fail('Please give the event a title.', 'evTitle');

  if (editing) {
    const it = editing.item, from = { source: it.source, row: it.row, fp: it.fp }, isPrivate = audience === 'Members' || audience === 'Committee';
    const call = it.source === 'public' && !isPrivate ? () => committeeApi('saveEvent', [it.row, it.fp, { ...ev, show: audience !== 'Hidden' }])   // stays in the Events tab
      : it.source === 'private' && isPrivate ? () => committeeApi('updatePrivateEvent', [it.row, it.fp, { ...ev, audience }])                        // stays private
      : () => committeeApi('setEventAudience', [from, audience, ev]);                                                                                   // moves between the two
    return saveEdit(form, 'events', call, 'Event updated.');
  }

  error.hidden = true;
  btn.disabled = true; btn.textContent = 'Posting…';
  try {
    await committeeApi('postEvent', [{ ...ev, audience }]);
    postedText = audience === 'Members' ? "Posted for signed-in members and the club team. It won't appear on the website."
      : audience === 'Committee' ? "Posted for the club team only. It won't appear on the website."
      : 'Posted. It appears on the website and On Target within about 2 minutes.';
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


/* ---------- Member sign-in (email + one-time code) and My membership ----------
   The sign-in token stays on this phone until Sign out. The member's details come from the server each time
   and are kept in memory only; the phone remembers just enough to draw the button and the Home strip. */
const memberStore = {
  get() { try { const s = JSON.parse(localStorage.getItem('ot:member')); return s && s.token ? s : null; } catch (e) { return null; } },
  set(s) { try { if (s) localStorage.setItem('ot:member', JSON.stringify(s)); else localStorage.removeItem('ot:member'); } catch (e) { /* storage blocked */ } }
};
let member = memberStore.get();   // {token, initials, first, status} while a member is signed in on this device
let ME = null, meState = '', meNote = '';
let relinking = false;            // true while someone waiting for the club team is changing the details they sent
const ME_PILL = { current: ['ok', 'Current', ''], notRenewed: ['amber', 'Not renewed yet', ''], waiting: ['amber', 'Waiting for payment', 'Payment being checked'],
  overdue: ['red', 'Not financial – renewal overdue', ''], expired: ['grey', 'Expired', ''], none: ['grey', 'Not current', ''] };
const meStatus = d => d.waiting || d.status === 'waiting' ? 'waiting' : ME_PILL[d.status] ? d.status : 'none';
const mePill = key => `<span class="me-pill me-pill-${ME_PILL[key][0]}">${ME_PILL[key][1]}</span>`;
const initialsOf = name => { const w = String(name || '').trim().split(/\s+/).filter(Boolean); return ((w[0] || '').charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase(); };
const maskEmail = email => { const [a, b] = String(email).split('@'); return a.charAt(0) + '•••@' + (b || ''); };
/* Who is asking for their own membership: a member's sign-in token, or the PIN of a club team member
   (the server shows them the membership an admin has linked their PIN to in People and PINs). */
const meAuth = () => member ? member.token : session ? 'pin:' + session.pin : '';
async function memberApi(fn, args) {
  const viaPin = !member;
  try {
    return await api(fn, undefined, [meAuth()].concat(args || []));
  } catch (e) {
    if (viaPin && e.badPin) {
      signOut();
      openSignIn('You have been signed out because your PIN is no longer recognised. It may have been changed. Please sign in with your new PIN.');
      e.signedOut = true;
    } else if (!viaPin && /signed out/i.test(e.message)) { e.signedOut = true; forgetMember(); }
    throw e;
  }
}
function forgetMember() {
  BENCH = blankBench();
  member = null; memberStore.set(null); ME = null; meState = ''; meNote = ''; relinking = false; DOCS = null; docsState = '';
  if (location.hash.indexOf('#/me/') === 0) location.hash = '#/me'; else render();
}
/* One Sign out for everything: the member sign-in and the club team PIN */
function signOutAll() {
  if (member) {
    api('memberSignOut', undefined, [member.token]).catch(() => { /* the phone forgets the sign-in either way */ });
    member = null; memberStore.set(null); ME = null; meState = ''; meNote = ''; relinking = false; DOCS = null; docsState = '';
  }
  signOut();
  view.focus();
}
async function loadMe() {
  if (!(member || session) || meState === 'loading') return;
  meState = 'loading';
  const auth = meAuth();
  try {
    const me = await memberApi('memberMe');
    if (auth !== meAuth()) { meState = ''; return; } // signed out, or signed in as someone else, meanwhile
    ME = me; meState = '';
    if (member) {
      member = { token: member.token, initials: ME.linked ? initialsOf(ME.name) : '', first: ME.linked ? ME.first : '', status: ME.linked ? meStatus(ME) : '' };
      memberStore.set(member);
    }
  } catch (e) {
    if (e.signedOut) return;
    meState = auth === meAuth() ? 'failed' : '';
  }
  if (currentPage === 'home' || currentPage.indexOf('me') === 0) render(true);
}

const joinLink = `<p class="form-foot"><a href="${JOIN_URL}" target="_blank" rel="noopener">Not a member yet? Join the club</a></p>`;
const isInstalled = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const menuLink = (icon, label, href) => `<a class="menu-row" href="${href}"${href.charAt(0) === '#' ? '' : ' target="_blank" rel="noopener"'}><span class="tile-ico">${icon}</span>${label}${ICON.chev}</a>`;

/* Me: the one place for signing in, My membership, the club team's tools and the club links */
function meView(sub) {
  const signedIn = !!(member || session), linked = !!(signedIn && ME && ME.linked);
  if (sub === 'documents') { if (signedIn) return documentsView(); location.replace('#/me'); return ''; }
  if (sub && !linked) { if (!signedIn || (ME && !ME.linked)) { location.replace('#/me'); return ''; } }
  else if (sub === 'results') return meResults();
  else if (sub === 'details') return meDetails();
  else if (sub === 'email') return meEmail();
  else if (sub === 'book') return bookView();
  else if (sub === 'bookings') return bookingsView();
  else if (sub === 'request') return requestView();
  if (session) { loadUnread(); loadBenchCount(); if (session.admin) loadAdminSummary(); }
  const first = (linked && ME.first) || (member && member.first) || (session && String(session.name || '').trim().split(/\s+/)[0]) || '';
  const canSeeDocs = session || linked || (member && member.status);
  // Signed in with a PIN that no admin has linked to a membership yet
  const linkHint = session && !member && ME && !ME.linked ? `<p class="muted">Link your membership: ${session.admin
    ? 'choose yourself in <a href="#/committee/people">People and PINs</a>.' : 'ask an admin to link you in People and PINs.'}</p>` : '';
  return `
    <div class="page-title"><h1>${signedIn && first ? `G'day ${esc(first)}` : 'Me'}</h1>${linkHint}</div>
    ${memberBlock()}
    ${session ? clubAdminBlock() : ''}
    <section class="section">
      <div class="section-head"><h2 class="caps-head">Club</h2></div>
      <div class="card list">
        ${signedIn ? (canSeeDocs ? menuLink(ICON.doc, 'Club documents', '#/me/documents') : '') : menuLink(ICON.pin, 'Visit the range', VISIT_URL)}
        ${menuLink(ICON.help, 'FAQs', FAQ_URL)}
        ${menuLink(ICON.web, 'Club website', SITE_URL)}
        ${menuLink(ICON.mail, 'Contact the club', 'mailto:info@ravenshoegunclub.com.au')}
        ${isInstalled() ? '' : `<button type="button" class="menu-row install-row" data-install><span class="tile-ico">${ICON.phone}</span>Add On Target to your phone${ICON.chev}</button>`}
      </div>
    </section>
    <section class="section me-foot">
      ${signedIn ? `<p class="muted">${[member && ME ? 'Signed in as ' + esc(ME.email) : '', session ? 'Club team: ' + esc(session.name) + (session.admin ? ' (admin)' : '') : ''].filter(Boolean).join(' · ')}</p>
        <button type="button" class="btn btn-outline btn-big" data-signout-all>Sign out</button>`
      : `<p class="muted">Club team? <button type="button" class="link-btn" data-signin>Sign in with your PIN</button></p>`}
    </section>
    <section class="section me-end">
      <p class="muted">On Target v${APP_VERSION}${TEST_SERVER ? ' · TEST SERVER' : ''}</p>
    </section>`;
}

/* The top of Me: the sign-in box, or the membership card and its quick buttons.
   Someone signed in with a PIN never sees the email sign-in box: their PIN is their membership too. */
function memberBlock() {
  if (!member && !session) return `
    <section class="section"><form class="card form" id="meEmailForm" novalidate>
      <h2 class="form-head">Member sign-in</h2>
      <p class="muted">Enter your email address and we'll email you a one-time 6-digit code. No password to remember.</p>
      <label class="field-label" for="memberEmail">Your email address</label>
      <input class="field" id="memberEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" maxlength="120" aria-describedby="memberEmailError">
      <p class="form-error" id="memberEmailError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="memberEmailBtn">Email me a code</button>
      ${joinLink}
    </form></section>`;
  if (!ME) {
    if (meState !== 'failed' && meState !== 'loading') setTimeout(loadMe, 0);
    return `<section class="section">${meState === 'failed' ? loadFailed('your membership', 'data-me-reload') : skeletonRows(3)}</section>`;
  }
  if (!ME.linked) return !member ? '' : ME.pending && !relinking ? mePending() : linkForm();
  return meCard();
}

function linkForm() {
  return `
    <section class="section"><form class="card form" id="linkForm" novalidate>
      <h2 class="form-head">Let's find your membership</h2>
      <p class="muted">First time here? Tell us who you are and we'll link this email to your membership.</p>
      <label class="field-label" for="lkName">Full name</label>
      <input class="field" id="lkName" maxlength="80" autocomplete="name" autocapitalize="words">
      <label class="field-label" for="lkSsaa">SSAA member number</label>
      <input class="field" id="lkSsaa" maxlength="20" inputmode="numeric" autocomplete="off">
      <label class="choice"><input type="checkbox" id="lkNews" checked>
        <span><span class="choice-title">Send me club news and renewal reminders</span><span class="choice-text">This becomes your one email address for everything from the club.</span></span></label>
      <p class="form-error" id="lkError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="lkSubmit">Link me up</button>
      <p class="muted form-foot">If your details match our records you're in straight away. If not, the club team will check and email you.</p>
      ${joinLink}
    </form></section>`;
}
function mePending() {
  return `
    <section class="section"><div class="card empty">
      <div class="empty-title">Thanks, the club team will check and email you</div>
      <p class="muted">You don't need to do anything else. Once your email is linked, your membership card will be here.</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" data-me-reload>${ICON.refresh}Check again</button>
        <button type="button" class="btn btn-outline" data-me-relink>Change my details</button>
      </div>
    </div></section>`;
}
async function linkMe(form) {
  const btn = form.querySelector('#lkSubmit'), error = form.querySelector('#lkError');
  if (btn.disabled) return;
  const fail = (msg, id) => { error.textContent = msg; error.hidden = false; if (id) form.querySelector(id).focus(); };
  const name = form.querySelector('#lkName').value.trim(), ssaa = form.querySelector('#lkSsaa').value.trim();
  if (name.split(/\s+/).length < 2) return fail('Please type your full name (first name and surname).', '#lkName');
  if (!/\d/.test(ssaa)) return fail('Please type your SSAA member number.', '#lkSsaa');
  error.hidden = true; btn.disabled = true; btn.textContent = 'Checking…';
  try {
    const out = await memberApi('memberLink', [name, ssaa, form.querySelector('#lkNews').checked]);
    relinking = false;
    if (out && out.linked) { ME = null; meState = ''; } else ME.pending = true;
    form.remove(); render();
  } catch (e) {
    if (e.signedOut) return;
    btn.disabled = false; btn.textContent = 'Link me up';
    fail(e.message);
  }
}

const scoreNumber = s => { const m = /-?\d+(\.\d+)?/.exec(String(s)); return m ? Number(m[0]) : null; };
function resultsSummary() {
  const n = ME.results.length, scores = ME.results.map(r => scoreNumber(r.score)).filter(v => v !== null);
  return n ? `${n} competition${n === 1 ? '' : 's'}${scores.length ? ' · best ' + Math.max(...scores) : ''}` : 'None yet';
}
function meCard() {
  const key = meStatus(ME), note = key === 'notRenewed' ? `Renew by ${ME.renewBy}` : ME_PILL[key][2], r = ME.renew || {};
  const renewTile = r.open ? `<a class="tile" href="${esc(r.url)}" target="_blank" rel="noopener"><span class="tile-ico">${ICON.fees}</span>Renew<span class="tile-sub">Renew now</span></a>`
    : `<div class="tile tile-off"><span class="tile-ico">${ICON.fees}</span>Renew<span class="tile-sub">${key === 'waiting' ? 'Payment being checked' : 'Opens ' + esc(r.opens)}</span></div>`;
  return `
    <section class="section">
      <div class="me-card">${ICON.rings}
        <div class="me-card-club">MEMBER · RAVENSHOE &amp; DISTRICT SPORTING SHOOTERS</div>
        <div class="me-card-name">${esc(ME.name)}</div>
        <div class="me-card-facts">
          <div><span>SSAA no.</span><b>${esc(ME.ssaa) || '–'}</b></div>
          <div><span>Valid to</span><b>${esc(ME.validToText) || '–'}</b></div>
        </div>
        <div class="me-card-status">${mePill(key)}${note ? `<span class="me-card-note">${esc(note)}</span>` : ''}</div>
      </div>
      <p class="muted me-hint">Show your SSAA card and licence at the range.</p>
      ${r.open && key !== 'notRenewed' ? `<a class="btn btn-primary btn-big" href="${esc(r.url)}" target="_blank" rel="noopener">Renew my membership</a>` : ''}
    </section>
    <section class="section"><nav class="post-tiles me-tiles" aria-label="My membership">
      <a class="tile" href="#/me/results"><span class="tile-ico">${ICON.trophy}</span>My results<span class="tile-sub">${esc(resultsSummary())}</span></a>
      ${renewTile}
      <a class="tile" href="#/me/details"><span class="tile-ico">${ICON.join}</span>My details<span class="tile-sub">Email, mobile, emergency contact</span></a>
    </nav>
    ${canBook() ? `<div class="card list">
      ${menuLink(ICON.bench, 'Book a bench', '#/me/book')}
      ${menuLink(ICON.calendar, 'My bookings', '#/me/bookings')}
    </div>` : ''}</section>`;
}

/* The club team's tools, on Me for anyone signed in with a PIN */
function clubAdminBlock() {
  const sum = ADMIN.summary, signCount = ADMIN.signCount;
  return `
    <section class="section">
      <div class="section-head"><h2 class="caps-head">Club admin</h2></div>
      <a class="btn btn-emergency btn-big" href="#/committee/emergency">${ICON.firstaid}Emergency contacts</a>
      <div class="card list">
        <a class="menu-row" href="#/committee/messages"><span class="tile-ico">${ICON.mail}</span>Messages${unreadBadge()}${ICON.chev}</a>
      </div>
      <h3 class="sub-head">Post something new</h3>
      <div class="post-tiles">
        <a class="tile" href="#/committee/event"><span class="tile-ico">${ICON.calendar}</span>Event</a>
        <a class="tile" href="#/committee/results"><span class="tile-ico">${ICON.trophy}</span>Results</a>
        <a class="tile" href="#/committee/photos"><span class="tile-ico">${ICON.camera}</span>Photos</a>
      </div>
      <div class="card list sub-gap">
        <a class="menu-row" href="#/committee/manage"><span class="tile-ico">${ICON.doc}</span>Manage posts${ICON.chev}</a>
        <a class="menu-row" href="#/committee/documents"><span class="tile-ico">${ICON.doc}</span>Club documents${ICON.chev}</a>
      </div>
      <h3 class="sub-head">Bench bookings</h3>
      <div class="card list">
        <a class="menu-row" href="#/committee/range"><span class="tile-ico">${ICON.check}</span>Today at the range${ICON.chev}</a>
        <a class="menu-row" href="#/committee/reserve"><span class="tile-ico">${ICON.trophy}</span>Reserve for a competition${ICON.chev}</a>
        <a class="menu-row" href="#/committee/requests"><span class="tile-ico">${ICON.calendar}</span>Booking requests${BENCH.waiting ? `<span class="count-badge" aria-label="${BENCH.waiting} waiting">${BENCH.waiting}</span>` : ''}${ICON.chev}</a>
      </div>
      ${session.admin ? `<h3 class="sub-head">Admin</h3>
        ${sum ? `<div class="admin-counts">
          ${sum.season === 'renew' ? `<a class="admin-count amber" href="#/committee/members" data-mem-filter="notRenewed">Not renewed yet: <b>${sum.notRenewed}</b></a>` : ''}
          ${sum.season === 'followup' ? `<a class="admin-count red" href="#/committee/members" data-mem-filter="overdue">Not financial – overdue: <b>${sum.overdue}</b></a>` : ''}
          <a class="admin-count" href="#/committee/payments">Payments waiting: <b>${sum.pending}</b></a>
        </div>` : ''}
        <div class="card list">
          <a class="menu-row" href="#/committee/payments"><span class="tile-ico">${ICON.fees}</span>Payments to confirm${sum && sum.pending ? `<span class="count-badge" aria-label="${sum.pending} waiting">${sum.pending}</span>` : ''}${ICON.chev}</a>
          <a class="menu-row" href="#/committee/signups"><span class="tile-ico">${ICON.join}</span>App sign-ups to check${signCount ? `<span class="count-badge" aria-label="${signCount} waiting">${signCount}</span>` : ''}${ICON.chev}</a>
          <a class="menu-row" href="#/committee/members"><span class="tile-ico">${ICON.people}</span>Members${ICON.chev}</a>
          <a class="menu-row" href="#/committee/people"><span class="tile-ico">${ICON.key}</span>People and PINs${ICON.chev}</a>
        </div>` : ''}
    </section>`;
}

/* Club documents: the files in the club's "On Target – Club documents" Drive folder, for members and the club team */
let DOCS = null, docsState = '';
async function loadDocs() {
  if (docsState === 'loading') return;
  docsState = 'loading';
  try {
    const list = session ? await committeeApi('clubDocuments') : await api('clubDocuments', undefined, [member.token]);
    DOCS = Array.isArray(list) ? list : []; docsState = '';
  } catch (e) {
    if (e.signedOut) { docsState = ''; return; }
    if (/signed out/i.test(e.message)) return forgetMember();
    docsState = /for members/i.test(e.message) ? 'members' : 'failed';
  }
  if (currentPage === 'me/documents') render(true);
}
function documentsView() {
  if (!DOCS && !docsState) setTimeout(loadDocs, 0);
  return `
    <div class="page-title">${meBack}<h1>Club documents</h1></div>
    <section class="section">${DOCS ? (DOCS.length ? `<div class="card list">${DOCS.map(d => /^https:\/\//.test(d.url) ? `<a class="menu-row" href="${esc(d.url)}" target="_blank" rel="noopener"><span class="tile-ico">${ICON.doc}</span>
          <span class="list-main">${esc(d.name)}<span class="muted doc-type">${esc(d.type || '')}</span></span>${ICON.chev}</a>` : '').join('')}</div>`
        : `<div class="card empty"><p class="muted">Coming soon: club policies and forms will be here.</p></div>`)
      : docsState === 'members' ? empty('For members', 'Club documents appear here once your email is linked to your membership.')
      : docsState === 'failed' ? loadFailed('the club documents', 'data-docs-reload') : skeletonRows(3)}</section>`;
}

/* "Add On Target to your phone": the browser's own install box where there is one, otherwise the steps */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
window.addEventListener('appinstalled', () => { installPrompt = null; closeSheets(); if (currentPage === 'me') render(true); });
function installApp() {
  if (installPrompt) { const p = installPrompt; installPrompt = null; p.prompt(); return; }
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1), android = /Android/.test(ua);
  const steps = ios ? ['Open On Target in Safari.', 'Tap the Share button (the square with an arrow pointing up).', 'Scroll down and tap "Add to Home Screen".', 'Tap Add.']
    : android ? ['Tap the three dots at the top right of Chrome.', 'Tap "Add to Home screen" or "Install app".', 'Tap Install.']
    : ['In Chrome or Edge, click the three dots at the top right.', 'Click "Cast, save and share", then "Install page as app" (in Edge: "Apps", then "Install this site as an app").', 'Click Install.'];
  document.getElementById('installSteps').innerHTML = steps.map(t => `<li>${esc(t)}</li>`).join('');
  openSheet(installSheet, document.getElementById('installClose'));
}
const meBack = `<a class="back-link" href="#/me">${ICON.chev}My membership</a>`;
function meResults() {
  const next = events().find(e => /competition/i.test(e.discipline || ''));
  return `
    <div class="page-title">${meBack}<h1>My results</h1>${ME.results.length ? `<p class="muted">${esc(resultsSummary())}</p>` : ''}</div>
    <section class="section">${ME.results.length ? `<div class="card list">${ME.results.map(r => `
      <div class="list-row">${dateBlock(r.date)}
        <div class="list-main"><div class="list-title">${esc(r.competition)}</div>
          <div class="muted">${[r.place && placeLabel(r.place) + ' place', r.score && 'Score ' + esc(r.score)].filter(Boolean).join(' · ')}</div></div>
      </div>`).join('')}</div>` : `<div class="card empty">
      <div class="empty-title">No competition results yet</div>
      <p class="muted">Fancy having a go? ${next ? `Next competition: ${esc(shortDate(next.date))}${next.start ? ', ' + esc(niceTime(next.start) || next.start) : ''}. ` : ''}All levels welcome.</p>
      <a class="btn btn-outline" href="#/events">${ICON.calendar}See what's on</a>
    </div>`}</section>`;
}
/* My details: members change their own, and it is saved straight away with no club team approval.
   Name and SSAA number are the two things only the club can change. */
function meDetails() {
  const row = (label, value) => `<div class="detail-row"><span class="muted">${label}</span><b>${esc(value)}</b></div>`;
  const em = ME.emergency || {};
  return `
    <div class="page-title">${meBack}<h1>My details</h1></div>
    <section class="section">
      ${meNote ? `<p class="notice" role="status">${esc(meNote)}</p>` : ''}
      <div class="card form">
        ${row('Name', ME.name)}
        ${row('SSAA number', ME.ssaa || 'None on our records')}
        <p class="muted">To change your name or SSAA number, <a href="mailto:info@ravenshoegunclub.com.au?subject=${encodeURIComponent('Change my details')}">ask the club</a>.</p>
        ${row('Email', ME.email || 'None on our records')}
        <a class="btn btn-outline btn-big" href="#/me/email">${ICON.mail}Change my email</a>
      </div>
    </section>
    <section class="section"><form class="card form" id="detailsForm" novalidate>
      <label class="field-label" for="mdMobile">Mobile <span class="field-hint">optional</span></label>
      <input class="field" id="mdMobile" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" value="${esc(ME.mobile || '')}">
      <h2 class="form-head">Emergency contact <span class="field-hint">optional</span></h2>
      <p class="muted">Only the club team can see this, and only to call them if something happens to you at the range.</p>
      <label class="field-label" for="mdEmName">Contact name</label>
      <input class="field" id="mdEmName" maxlength="60" autocomplete="off" autocapitalize="words" value="${esc(em.name || '')}">
      <label class="field-label" for="mdEmRelation">Who are they to you? <span class="field-hint">wife, son, friend…</span></label>
      <input class="field" id="mdEmRelation" maxlength="40" autocomplete="off" value="${esc(em.relation || '')}">
      <label class="field-label" for="mdEmPhone">Their phone</label>
      <input class="field" id="mdEmPhone" type="tel" inputmode="tel" autocomplete="off" maxlength="30" value="${esc(em.phone || '')}">
      <label class="choice"><input type="checkbox" id="mdNews"${ME.news ? ' checked' : ''}>
        <span><span class="choice-title">Send me club news and renewal reminders</span><span class="choice-text">Sent to your email address above.</span></span></label>
      <p class="form-error" id="mdError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="mdSubmit">Save my details</button>
    </form></section>`;
}
async function saveDetails(form) {
  const btn = form.querySelector('#mdSubmit'), error = form.querySelector('#mdError'), val = id => form.querySelector(id).value.trim();
  if (btn.disabled) return;
  const fail = (msg, id) => { error.textContent = msg; error.hidden = false; if (id) form.querySelector(id).focus(); };
  const d = { mobile: val('#mdMobile'), emName: val('#mdEmName'), emRelation: val('#mdEmRelation'), emPhone: val('#mdEmPhone'), news: form.querySelector('#mdNews').checked };
  if ((d.emName || d.emRelation || d.emPhone) && !d.emName) return fail("Please type your emergency contact's name.", '#mdEmName');
  if (d.emName && !d.emPhone) return fail("Please type your emergency contact's phone number.", '#mdEmPhone');
  error.hidden = true; btn.disabled = true; btn.textContent = 'Saving…';
  try {
    ME = await memberApi('memberSaveDetails', [d]);
    meNote = 'Saved. Your details are up to date.';
    form.remove(); render();
    view.focus();
  } catch (e) {
    if (e.signedOut) return;
    btn.disabled = false; btn.textContent = 'Save my details';
    fail(e.message);
  }
}

/* Change my email: a code goes to the NEW address, and nothing changes until it is typed in here */
let emailChange = null;      // {email} once a code has been sent to the new address
function meEmail() {
  return `
    <div class="page-title"><a class="back-link" href="#/me/details">${ICON.chev}My details</a><h1>Change my email</h1></div>
    <section class="section"><form class="card form" id="emailForm" novalidate>
      ${emailChange ? `
      <p class="notice" role="status">We've sent a code to ${esc(emailChange.email)}. It lasts 15 minutes.</p>
      <label class="field-label" for="ecCode">The 6-digit code from that email</label>
      <input class="field pin-box" id="ecCode" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="6">
      <p class="form-error" id="ecError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="ecSubmit">Confirm my new email</button>
      <button type="button" class="btn btn-outline btn-big" data-ec-again>Send a new code</button>
      <button type="button" class="btn btn-outline btn-big" data-ec-back>Use a different address</button>` : `
      <div class="detail-row"><span class="muted">Your email now</span><b>${esc(ME.email || 'None on our records')}</b></div>
      <label class="field-label" for="ecEmail">Your new email address</label>
      <input class="field" id="ecEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" maxlength="120">
      <p class="muted">We'll email a 6-digit code to the new address. Your email only changes once you type that code in here. Until then your old one keeps working.</p>
      <p class="muted">It becomes your one email for everything: signing in to On Target and emails from the club.</p>
      <p class="form-error" id="ecError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="ecSubmit">Email me a code</button>`}
    </form></section>`;
}
async function changeEmail(form) {
  const btn = form.querySelector('#ecSubmit'), error = form.querySelector('#ecError'), label = btn.textContent;
  if (btn.disabled) return;
  const fail = (msg, el) => { error.textContent = msg; error.hidden = false; if (el) el.focus(); };
  const box = form.querySelector(emailChange ? '#ecCode' : '#ecEmail');
  const email = emailChange ? emailChange.email : box.value.trim().toLowerCase(), code = emailChange ? box.value.replace(/\D/g, '') : '';
  if (!emailChange && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please check your new email address.', box);
  if (emailChange && code.length !== 6) return fail('Please type all 6 digits of the code.', box);
  error.hidden = true; btn.disabled = true; btn.textContent = emailChange ? 'Checking…' : 'Sending…';
  try {
    if (!emailChange) {
      await memberApi('memberChangeEmail', [email]);
      emailChange = { email };
      form.remove(); render();
      return document.getElementById('ecCode').focus();
    }
    ME = await memberApi('memberConfirmEmail', [email, code]);
    emailChange = null;
    meNote = `Done. Your email is now ${email}. Use it to sign in to On Target from now on.`;
    form.remove(); go('#/me/details');
  } catch (e) {
    if (e.signedOut) return;
    btn.disabled = false; btn.textContent = label;
    fail(e.message, box);
  }
}
async function emailCodeAgain(btn) {
  if (btn.disabled || !emailChange) return;
  const error = document.getElementById('ecError');
  btn.disabled = true; btn.textContent = 'Sending…'; error.hidden = true;
  try {
    await memberApi('memberChangeEmail', [emailChange.email]);
    error.hidden = true;
    const box = document.getElementById('ecCode');
    if (box) { box.value = ''; box.focus(); }
    btn.textContent = 'A new code is on its way';
    setTimeout(() => { if (document.contains(btn)) { btn.disabled = false; btn.textContent = 'Send a new code'; } }, 5000);
  } catch (e) {
    if (e.signedOut) return;
    btn.disabled = false; btn.textContent = 'Send a new code';
    error.textContent = e.message; error.hidden = false;
  }
}

/* ---------- Emergency contacts (any club team PIN) ----------
   Looked up live, one member at a time: nothing is kept on the phone, and the server records every look-up. */
const blankEmerg = () => ({ query: '', list: null, open: null, state: '', error: '', run: 0 });
let EMERG = blankEmerg();
function emergencyView() {
  return `
    <div class="page-title">${adminBack}<h1>Emergency contacts</h1></div>
    <section class="section">
      <p class="notice notice-red em-000"><b>In a medical emergency, call 000 first.</b> Range address: 311 Cemetery Road, Ravenshoe.</p>
      <form class="card form" id="emForm" novalidate>
        <label class="field-label" for="emQuery">Member's name</label>
        <input class="field" id="emQuery" maxlength="60" autocomplete="off" autocapitalize="words" enterkeyhint="search" value="${esc(EMERG.query)}">
        <p class="form-error" id="emError" role="alert" hidden></p>
        <button type="submit" class="btn btn-primary btn-big" id="emSubmit">Find their emergency contact</button>
      </form>
    </section>
    <section class="section" id="emResult" aria-live="polite">${emergencyResult()}</section>
    <section class="section"><p class="muted">Every look-up is recorded for the club: who looked, when, and which member. Nothing is kept on this phone.</p></section>`;
}
function emergencyResult() {
  const e = EMERG;
  if (e.state === 'loading') return skeletonRows(2);
  if (e.state === 'failed') return `<div class="card empty"><div class="empty-title">Can't look that up</div><p class="muted">${esc(e.error)}</p><p class="muted">Tap the button above to try again.</p></div>`;
  if (e.open) {
    const c = e.open.contact, tel = c ? String(c.phone || '').replace(/[^\d+]/g, '') : '';
    return `<article class="card pay-card em-card">
        <div class="muted">Emergency contact for ${esc(e.open.name)}</div>
        ${c ? `<h2 class="pay-name">${esc(c.name || 'No name given')}</h2>
          ${c.relation ? `<div>${esc(c.relation)}</div>` : ''}
          ${tel ? `<a class="btn btn-call btn-big" href="tel:${esc(tel)}">${ICON.call}Call ${esc(c.phone)}</a>` : '<p><b>No phone number given.</b></p>'}`
        : `<h2 class="pay-name">None given</h2><p>${esc(e.open.name)} has not added an emergency contact in On Target.</p>`}
      </article>
      ${e.list && e.list.length > 1 ? `<button type="button" class="btn btn-outline" data-em-list>${ICON.people}Back to the names</button>` : ''}`;
  }
  if (!e.list) return '';
  return e.list.length ? `<p class="muted">${e.list.length} members match. Tap the right one.</p><div class="card list">${e.list.map((m, i) => `
      <button type="button" class="list-row manage-row" data-em-pick="${i}"><span class="list-main"><span class="list-title">${esc(m.name)}</span></span>${ICON.chev}</button>`).join('')}</div>`
    : empty('No member found', 'Check the spelling, or try just their surname.');
}
function drawEmergency() {
  const box = document.getElementById('emResult');
  if (box) box.innerHTML = emergencyResult();
}
async function findEmergency(form) {
  const box = form.querySelector('#emQuery'), error = form.querySelector('#emError'), q = box.value.trim(), run = ++EMERG.run;
  if (q.replace(/\s/g, '').length < 2) { error.textContent = "Please type the member's name."; error.hidden = false; return box.focus(); }
  error.hidden = true;
  Object.assign(EMERG, { query: q, list: null, open: null, state: 'loading', error: '' });
  drawEmergency();
  try {
    const list = await committeeApi('emergencySearch', [q]);
    if (run !== EMERG.run) return;
    EMERG.list = Array.isArray(list) ? list : []; EMERG.state = '';
    if (EMERG.list.length === 1) return openEmergency(0); // only one member it can be: go straight to their contact
  } catch (e) {
    if (e.signedOut || run !== EMERG.run) return;
    EMERG.state = 'failed'; EMERG.error = e.message;
  }
  drawEmergency();
}
async function openEmergency(i) {
  const m = EMERG.list && EMERG.list[i], run = ++EMERG.run;
  if (!m) return;
  EMERG.state = 'loading'; EMERG.open = null;
  drawEmergency();
  try {
    const d = await committeeApi('emergencyContact', [m.id]);
    if (run !== EMERG.run) return;
    EMERG.open = { name: (d && d.name) || m.name, contact: (d && d.contact) || null }; EMERG.state = '';
  } catch (e) {
    if (e.signedOut || run !== EMERG.run) return;
    EMERG.state = 'failed'; EMERG.error = e.message;
  }
  drawEmergency();
}

/* ---------- Club documents: adding and looking after them (any club team PIN) ----------
   The files live in the club Drive folder "On Target – Club documents". One file is sent per request, as photos are. */
const DOC_TYPES = ['Policy', 'Form', 'Minutes', 'Other'], DOC_MAX_MB = 10;
let DOCADMIN = { list: null, state: '', note: '' };
let docEdit = null;          // the document being edited ({} for a new one) while that screen is open
let docFile = null;          // {blob, name}: the file chosen on that screen, ready to send
let docBusy = false;

async function loadDocAdmin() {
  if (DOCADMIN.state === 'loading') return;
  DOCADMIN.state = 'loading';
  try { const list = await committeeApi('clubDocuments'); DOCADMIN.list = Array.isArray(list) ? list : []; DOCADMIN.state = ''; }
  catch (e) { if (e.signedOut) { DOCADMIN.state = ''; return; } DOCADMIN.state = 'failed'; }
  if (currentPage === 'committee/documents') render(true);
}
function docsAdminView() {
  if (!DOCADMIN.list && DOCADMIN.state !== 'failed') setTimeout(loadDocAdmin, 0);
  return `
    <div class="page-title">${adminBack}<h1>Club documents</h1><p class="muted">Members see these in On Target under Me, Club documents. Only add things every member may see.</p></div>
    <section class="section">
      ${DOCADMIN.note ? `<p class="notice" role="status">${esc(DOCADMIN.note)}</p>` : ''}
      <button type="button" class="btn btn-primary btn-big" data-doc="new">${ICON.plus}Add a document</button>
      ${DOCADMIN.list ? (DOCADMIN.list.length ? `<div class="card list">${DOCADMIN.list.map((d, i) => `
        <button type="button" class="list-row manage-row" data-doc="${i}"><span class="list-ico">${ICON.doc}</span>
          <span class="list-main"><span class="list-title">${esc(d.name)}</span><span class="muted">${esc(d.type || 'Other')}</span></span>${ICON.chev}</button>`).join('')}</div>`
          : empty('No documents yet', 'Until you add one, members see "Coming soon: club policies and forms will be here."'))
        : DOCADMIN.state === 'failed' ? loadFailed('the club documents', 'data-docadmin-reload') : skeletonRows(3)}
    </section>`;
}
function docForm(d) {
  const isNew = !d.id, fileLine = docFile ? `Chosen: ${docFile.name}` : '';
  const bar = `<div class="doc-bar" id="dcBar" hidden><span class="ph-bar" role="progressbar" aria-label="Sending the file"><span></span></span></div>`;
  return `
    <div class="page-title"><a class="back-link" href="#/committee/documents">${ICON.chev}Club documents</a><h1>${isNew ? 'Add a document' : 'Edit document'}</h1></div>
    <section class="section"><form class="card form" id="docForm" novalidate>
      <input type="file" id="dcFile" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" hidden>
      ${isNew ? `<span class="field-label">File <span class="field-hint">a PDF, a Word document or a photo, up to ${DOC_MAX_MB} MB</span></span>
      <button type="button" class="btn btn-outline btn-big" data-doc-choose>${ICON.doc}<span id="dcChooseText">${docFile ? 'Choose a different file' : 'Choose a file'}</span></button>
      <p class="muted" id="dcFileName" role="status">${esc(fileLine)}</p>` : ''}
      <label class="field-label" for="dcTitle">Title <span class="field-hint">what members see</span></label>
      <input class="field" id="dcTitle" maxlength="100" autocomplete="off" value="${esc(d.name || '')}">
      <label class="field-label" for="dcType">Type</label>
      <select class="field" id="dcType">${DOC_TYPES.map(t => `<option${(d.type || 'Policy') === t ? ' selected' : ''}>${t}</option>`).join('')}</select>
      ${isNew ? bar : ''}
      <p class="form-error" id="dcError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="dcSubmit">${isNew ? 'Upload document' : 'Save changes'}</button>
      ${isNew ? '' : `
      ${/^https:\/\//.test(d.url) ? `<a class="btn btn-outline btn-big" href="${esc(d.url)}" target="_blank" rel="noopener">${ICON.doc}Open the document</a>` : ''}
      <h2 class="form-head">A newer version</h2>
      <p class="muted">Choose the newer file (a PDF, a Word document or a photo). It takes this document's place; the title and type stay the same.</p>
      <p class="muted" id="dcFileName" role="status">${esc(fileLine)}</p>
      ${bar}
      <button type="button" class="btn btn-outline btn-big" data-doc-replace id="dcReplace">${docFile ? 'Replace with this file' : 'Replace with a newer version'}</button>
      <button type="button" class="btn btn-danger btn-big" data-doc-remove>Remove this document</button>`}
    </form></section>`;
}
/* Gets the chosen file ready: photos are made smaller, as they are for the gallery; PDFs and Word documents go as they are */
async function chooseDoc(file) {
  const form = document.getElementById('docForm'), error = form.querySelector('#dcError'), line = form.querySelector('#dcFileName');
  const ext = ((/\.([a-z0-9]+)$/i.exec(file.name) || [])[1] || '').toLowerCase();
  const fail = msg => { docFile = null; line.textContent = ''; error.textContent = msg; error.hidden = false; };
  error.hidden = true;
  try {
    if (/^image\//.test(file.type) || /^(jpe?g|png|heic|heif|webp)$/.test(ext)) {
      line.textContent = 'Getting the photo ready…';
      const made = await shrinkPhoto(file);
      docFile = { blob: made.blob, name: file.name.replace(/\.[^.]*$/, '') + '.jpg' };
    } else {
      if (!/^(pdf|docx?)$/.test(ext)) return fail('Please choose a PDF, a Word document or a photo.');
      if (file.size > DOC_MAX_MB * 1024 * 1024) return fail(`That file is too big. Documents can be up to ${DOC_MAX_MB} MB.`);
      docFile = { blob: file, name: file.name };
    }
  } catch (e) { return fail("That photo can't be opened. Please choose a PDF, a Word document or a different photo."); }
  if (!document.contains(form)) return;
  line.textContent = `Chosen: ${docFile.name}`;
  const title = form.querySelector('#dcTitle'), choose = form.querySelector('#dcChooseText'), replace = form.querySelector('#dcReplace');
  if (choose) choose.textContent = 'Choose a different file';
  if (replace) replace.textContent = 'Replace with this file';
  if (!title.value.trim()) title.value = file.name.replace(/\.[^.]*$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 100);
}
/* Sends one file; while it goes the "working" bar shows. If it fails the file is kept, so the same button tries again. */
async function sendDoc(form, btn, busyText, call, retryText) {
  const error = form.querySelector('#dcError'), bar = form.querySelector('#dcBar');
  if (docBusy) return;
  docBusy = true; error.hidden = true; bar.hidden = false;
  btn.disabled = true; btn.textContent = busyText;
  try {
    const out = await call(await blobToDataUrl(docFile.blob));
    docBusy = false;
    doneDoc(out);
  } catch (e) {
    docBusy = false;
    if (e.signedOut || !document.contains(form)) return;
    bar.hidden = true; btn.disabled = false; btn.textContent = retryText;
    error.textContent = e.message; error.hidden = false;
  }
}
function doneDoc(out) {
  DOCADMIN.list = null; DOCADMIN.state = ''; DOCADMIN.note = (out && out.message) || 'Done.'; DOCS = null; docsState = '';
  const form = document.getElementById('docForm');
  if (form) form.remove();
  go('#/committee/documents');
}
async function saveDoc(form) {
  const d = docEdit, btn = form.querySelector('#dcSubmit'), error = form.querySelector('#dcError');
  if (btn.disabled || docBusy) return;
  const fail = (msg, el) => { error.textContent = msg; error.hidden = false; if (el) el.focus(); };
  const meta = { title: form.querySelector('#dcTitle').value.trim(), type: form.querySelector('#dcType').value };
  if (!d.id && !docFile) return fail('Please choose a file first.', form.querySelector('[data-doc-choose]'));
  if (!meta.title) return fail('Please give the document a title.', form.querySelector('#dcTitle'));
  if (!d.id) return sendDoc(form, btn, 'Uploading…', data => committeeApi('docAdd', [{ ...meta, fileName: docFile.name }, data]), 'Try again');
  error.hidden = true; btn.disabled = true; btn.textContent = 'Saving…';
  try { doneDoc(await committeeApi('docSave', [d.id, meta])); }
  catch (e) {
    if (e.signedOut) return;
    btn.disabled = false; btn.textContent = 'Save changes';
    fail(e.message);
  }
}
function replaceDoc(form) {
  if (docBusy) return;
  if (!docFile) return document.getElementById('dcFile').click();
  const name = docFile.name;
  sendDoc(form, form.querySelector('#dcReplace'), 'Uploading…', data => committeeApi('docReplace', [docEdit.id, name, data]), 'Try again');
}
function askRemoveDoc() {
  const d = docEdit;
  confirmAsk({
    title: 'Remove this document?', text: `Members will no longer see "${d.name}" in On Target. The file goes to the bin in the club's Google Drive, where it is kept for 30 days.`,
    yes: 'Yes, remove it', busy: 'Removing…',
    run: () => committeeApi('docRemove', [d.id]), done: doneDoc
  });
}

/* ----- signing in: the email box is on Me; the code is typed in the sign-in sheet ----- */
const memberCodeForm = document.getElementById('memberCodeForm'), pinForm = document.getElementById('signInForm');
const codeBoxes = [...document.querySelectorAll('.code-box')], codeError = document.getElementById('codeError'), codeBtn = document.getElementById('codeBtn');
const codeAgain = document.getElementById('codeAgain'), codeText = document.getElementById('codeText');
let codeEmail = '';

function signInStep(step) {
  memberCodeForm.hidden = step !== 'code'; pinForm.hidden = step !== 'pin';
  sheet.setAttribute('aria-labelledby', step === 'code' ? 'codeTitle' : 'sheetTitle');
  return step === 'code' ? codeBoxes[0] : pinBox;
}
const codeSentText = () => `We've sent a code to ${maskEmail(codeEmail)}. It lasts 15 minutes.`;
function clearCode() { codeBoxes.forEach(b => { b.value = ''; }); }
function fillCode(from, digits) {
  digits.split('').forEach((d, k) => { if (codeBoxes[from + k]) codeBoxes[from + k].value = d; });
  codeBoxes[Math.min(from + digits.length, codeBoxes.length - 1)].focus();
  if (codeBoxes.every(b => b.value)) checkCode();
}
codeBoxes.forEach((box, i) => {
  box.addEventListener('focus', () => box.select());
  box.addEventListener('input', e => {
    codeError.hidden = true;
    const typed = e.inputType === 'insertText' && /^\d$/.test(e.data || '') ? e.data : box.value.replace(/\D/g, '');
    box.value = '';
    if (typed) fillCode(typed.length >= codeBoxes.length ? 0 : i, typed.slice(0, codeBoxes.length)); // a pasted or auto-filled code fills every box
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !box.value && i) { e.preventDefault(); codeBoxes[i - 1].value = ''; codeBoxes[i - 1].focus(); }
    if (e.key === 'ArrowLeft' && i) { e.preventDefault(); codeBoxes[i - 1].focus(); }
    if (e.key === 'ArrowRight' && i < codeBoxes.length - 1) { e.preventDefault(); codeBoxes[i + 1].focus(); }
  });
  box.addEventListener('paste', e => {
    const digits = ((e.clipboardData && e.clipboardData.getData('text')) || '').replace(/\D/g, '');
    e.preventDefault();
    if (digits) { codeError.hidden = true; fillCode(digits.length >= codeBoxes.length ? 0 : i, digits.slice(0, codeBoxes.length)); }
  });
});

async function requestCode(form) {
  const box = form.querySelector('#memberEmail'), error = form.querySelector('#memberEmailError'), btn = form.querySelector('#memberEmailBtn');
  if (btn.disabled) return;
  const email = box.value.trim().toLowerCase();
  const fail = msg => { error.textContent = msg; error.hidden = false; box.focus(); };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please check your email address.');
  error.hidden = true; btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await api('memberRequestCode', undefined, [email]);
    codeEmail = email; clearCode(); codeError.hidden = true;
    codeText.textContent = codeSentText();
    openSignIn('', 'code');
  } catch (err) {
    fail(err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Email me a code';
  }
}
async function checkCode() {
  if (codeBtn.disabled) return;
  const code = codeBoxes.map(b => b.value).join('');
  const fail = msg => { codeError.textContent = msg; codeError.hidden = false; };
  if (code.length < codeBoxes.length) { fail('Please type all 6 digits of the code.'); return (codeBoxes.find(b => !b.value) || codeBoxes[0]).focus(); }
  codeError.hidden = true; codeBtn.disabled = true; codeBtn.textContent = 'Signing in…';
  try {
    const out = await api('memberVerifyCode', undefined, [codeEmail, code]);
    member = { token: out.token, initials: '', first: '', status: '' };
    memberStore.set(member);
    ME = null; meState = ''; meNote = ''; relinking = false;
    sheetOpener = null; closeSheets();
    if (location.hash === '#/me') render(); else location.hash = '#/me';
    view.focus();
  } catch (err) {
    fail(err.message); clearCode(); codeBoxes[0].focus();
  } finally {
    codeBtn.disabled = false; codeBtn.textContent = 'Sign in';
  }
}
memberCodeForm.addEventListener('submit', e => { e.preventDefault(); checkCode(); });
codeAgain.addEventListener('click', async () => {
  if (codeAgain.disabled) return;
  codeAgain.disabled = true; codeAgain.textContent = 'Sending…'; codeError.hidden = true;
  try {
    await api('memberRequestCode', undefined, [codeEmail]);
    clearCode();
    codeText.textContent = 'A new code is on its way. ' + codeSentText();
    codeBoxes[0].focus();
  } catch (err) {
    codeError.textContent = err.message; codeError.hidden = false;
  } finally {
    codeAgain.disabled = false; codeAgain.textContent = 'Send a new code';
  }
});
document.querySelectorAll('[data-sheet-close]').forEach(b => b.addEventListener('click', closeSheets));
if (member || session) loadMe();

/* ----- club team: "App sign-ups to check" (admins only) ----- */
const SIGNUP_TAG = { 'Linked automatically': 'replied', 'Linked by the club team': 'replied', 'Not a member': 'tag' };
async function loadSignups() {
  if (ADMIN.signState === 'loading') return;
  ADMIN.signState = 'loading';
  try {
    const d = await committeeApi('memberLinkRequests') || {};
    ADMIN.signups = { requests: Array.isArray(d.requests) ? d.requests : [], members: Array.isArray(d.members) ? d.members : [] };
    ADMIN.signCount = ADMIN.signups.requests.filter(r => r.waiting).length;
    ADMIN.signState = '';
  } catch (e) { if (e.signedOut) { ADMIN.signState = ''; return; } ADMIN.signState = 'failed'; }
  if (currentPage === 'committee/signups') render(true);
}
async function loadSignupCount() {
  try { const d = await committeeApi('memberLinkCount'); const n = Number(d && d.waiting) || 0; if (n !== ADMIN.signCount) { ADMIN.signCount = n; if (currentPage === 'me') render(true); } }
  catch (e) { /* the count is only a guide */ }
}
function signupsView() {
  if (!ADMIN.signups && ADMIN.signState !== 'failed') setTimeout(loadSignups, 0);
  const body = () => {
    const waiting = ADMIN.signups.requests.filter(r => r.waiting), done = ADMIN.signups.requests.filter(r => !r.waiting);
    const pick = r => `<option value="">Choose a member…</option>` + ADMIN.signups.members.map(m => `<option value="${esc(m.id)}"${r.guess && r.guess.id === m.id ? ' selected' : ''}>${esc(m.name)}${m.ssaa ? ' (SSAA ' + esc(m.ssaa) + ')' : ''}</option>`).join('');
    return (waiting.length ? waiting.map((r, i) => `
      <article class="card pay-card">
        <h2 class="pay-name">${esc(r.name)}</h2>
        <div>SSAA number ${esc(r.ssaa)}</div>
        <div class="pay-contact">${esc(r.email)}</div>
        <div class="muted">Signed up ${esc(niceDate(r.date) || r.date)} · Club news to this email: ${r.news ? 'Yes' : 'No'}</div>
        <div class="pay-ref"><span class="muted">Best guess</span>${r.guess ? `<b>${esc(r.guess.name)}</b><span class="muted">${esc(r.guess.why)}${r.guess.ssaa ? ' · SSAA ' + esc(r.guess.ssaa) : ''}${r.guess.linkedTo ? ' · already linked to another email' : ''}</span>` : '<b>No likely match</b>'}</div>
        <label class="field-label" for="suPick${i}">Link to which member?</label>
        <select class="field" id="suPick${i}">${pick(r)}</select>
        <button type="button" class="btn btn-primary btn-big" data-su-link="${i}">Link to member</button>
        <button type="button" class="btn btn-outline btn-big" data-su-decline="${i}">Not a member</button>
      </article>`).join('') : empty('No sign-ups to check', 'When someone signs in to On Target and can\'t be matched to a member automatically, they appear here.'))
      + (done.length ? `<div class="section-head"><h2>Joined On Target</h2></div><div class="card list">${done.map(r => `
        <div class="list-row"><div class="list-main"><div class="list-title">${esc(r.memberName || r.name)}</div>
          <div class="muted">${esc(r.email)} · ${esc(niceDate(r.date) || r.date)}</div>
          <div class="lab-row"><span class="lab lab-${SIGNUP_TAG[r.status] || 'tag'}">${esc(r.status)}</span>${r.emailChanged ? '<span class="lab lab-membership">Email changed</span>' : ''}</div></div></div>`).join('')}</div>` : '');
  };
  return `
    <div class="page-title">${adminBack}<h1>App sign-ups to check</h1><p class="muted">People who have signed in to On Target as a member.</p></div>
    <section class="section">
      ${ADMIN.signNote ? `<p class="notice" role="status">${esc(ADMIN.signNote)}</p>` : ''}
      ${ADMIN.signups ? body() : ADMIN.signState === 'failed' ? loadFailed('the sign-ups', 'data-su-reload') : skeletonRows(3)}
      ${ADMIN.signups ? `<button type="button" class="btn btn-outline" data-su-reload>${ICON.refresh}Refresh</button>` : ''}
    </section>`;
}
function askSignup(i, link) {
  const r = ADMIN.signups && ADMIN.signups.requests.filter(x => x.waiting)[i];
  if (!r) return;
  const sel = document.getElementById('suPick' + i), who = link && ADMIN.signups.members.find(m => m.id === sel.value);
  if (link && !who) { ADMIN.signNote = 'Please choose a member from the list first.'; render(true); return document.getElementById('suPick' + i).focus(); }
  const done = out => { ADMIN.signNote = (out && out.message) || 'Done.'; ADMIN.signups = null; ADMIN.mem.items = null; render(true); loadSignupCount(); };
  confirmAsk(link ? {
    title: `Link this email to ${who.name}?`, text: `${r.email} will be able to see ${who.name}'s membership card and results, and will get an email to say so.`,
    yes: 'Yes, link them', busy: 'Linking…', no: 'No, go back', run: () => committeeApi('memberLinkApprove', [r.id, who.id]), done
  } : {
    title: `${r.name} is not a member?`, text: `${r.email} will get a polite email with the Become a Member link.`,
    yes: 'Yes, send the email', busy: 'Sending…', no: 'No, go back', run: () => committeeApi('memberLinkDecline', [r.id]), done
  });
}

/* ---------- Bench booking (v2.2.0) ----------
   Members book a bench for a range day and ask for one on an appointment day. The club team reserves benches
   for competitions, ticks people in, adds walk-ins and answers requests. The settings (benches, range days,
   session times) live on the server and arrive with the data: nothing about them is written here.
   Everything is kept in memory only. */
const blankBench = () => ({ info: null, infoState: '', infoError: '', note: '', error: '', busy: false,
  pick: { date: '', range: '', session: '', bench: 0 }, map: null, mapState: '', mapError: '', mapRun: 0,
  day: null, dayState: '', dayRun: 0, dayNote: '', events: null, eventsState: '', allEvents: false, res: null,
  reqs: null, reqState: '', reqNote: '', answers: {}, waiting: 0, countAt: 0 });
let BENCH = blankBench();
const SESSION_KEYS = ['early', 'late', 'whole'];
/* Only financial members can book: the same two statuses the server allows */
const canBook = () => !!(ME && ME.linked && BOOK_OK.includes(meStatus(ME)));
const benchDayLabel = iso => { const d = parseDate(iso); return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${mon(d)}`; };
const sessionTimes = t => t && t[0] ? `${niceTime(t[0])} to ${niceTime(t[1])}` : '';
const rangeOf = (list, key) => (list || []).find(r => r.key === key) || { key, name: key, benches: 0, big: [] };
const sessionsClash = (a, b) => a === b || a === 'whole' || b === 'whole';
const benchList = ns => ns.length > 1 ? ns.slice(0, -1).join(', ') + ' and ' + ns[ns.length - 1] : String(ns[0] || '');
const stepHead = (n, text) => `<h2 class="step-head"><span class="step-n">${n}</span>${text}</h2>`;
const benchFailed = () => /reach the club/i.test(BENCH.infoError) || !BENCH.infoError ? loadFailed('bench booking', 'data-bench-reload')
  : `<div class="card empty"><div class="empty-title">Bench booking isn't open to you yet</div><p class="muted">${esc(BENCH.infoError)}</p></div>`;
const benchLegend = (items, big) => `<ul class="bench-legend">${items.map(([cls, text]) => `<li><span class="bench-key ${cls}"></span>${text}</li>`).join('')}
  ${big ? '<li><span class="bench-key bench-big"></span>Big calibres and muzzle brakes</li>' : ''}</ul>`;

/* Leaving the bench screens: messages are forgotten, and lists are fetched afresh next time */
function benchLeave(page) {
  if (page !== 'me/book' && page !== 'me/bookings' && page !== 'me/request') { BENCH.info = null; BENCH.infoState = ''; BENCH.note = ''; }
  if (page !== 'me/book') { BENCH.pick = { date: '', range: '', session: '', bench: 0 }; BENCH.map = null; BENCH.mapState = ''; BENCH.error = ''; BENCH.mapRun++; }
  if (page !== 'committee/range' && page !== 'committee/walkin' && page !== 'committee/reserve') { BENCH.day = null; BENCH.dayState = ''; BENCH.dayRun++; }
  if (page !== 'committee/range') BENCH.dayNote = '';
  if (page !== 'committee/reserve') { BENCH.res = null; BENCH.events = null; BENCH.eventsState = ''; BENCH.allEvents = false; }
  if (page !== 'committee/requests') { BENCH.reqs = null; BENCH.reqState = ''; BENCH.reqNote = ''; BENCH.answers = {}; }
}

/* ----- Members ----- */
async function loadBenchInfo() {
  if (BENCH.infoState === 'loading') return;
  BENCH.infoState = 'loading';
  const auth = meAuth();
  try {
    const d = await memberApi('benchInfo');
    if (auth !== meAuth()) { BENCH.infoState = ''; return; }
    BENCH.info = d; BENCH.infoState = '';
  } catch (e) { if (e.signedOut) return; BENCH.infoState = 'failed'; BENCH.infoError = e.message; }
  if (['me/book', 'me/bookings', 'me/request'].includes(currentPage)) render(true);
}
async function loadBenchMap() {
  const { date, range } = BENCH.pick, run = ++BENCH.mapRun;
  if (!date || !range) return;
  BENCH.map = null; BENCH.mapState = 'loading';
  try {
    const d = await memberApi('benchMap', [date, range]);
    if (run !== BENCH.mapRun) return;
    BENCH.map = d; BENCH.mapState = '';
  } catch (e) { if (e.signedOut || run !== BENCH.mapRun) return; BENCH.mapState = 'failed'; BENCH.mapError = e.message; }
  if (currentPage === 'me/book') render(true);
}
/* A bench for the chosen session: 'free', 'taken', 'competition' or 'mine'. A whole session needs Early and Late both free. */
function benchState(b, session) {
  const s = session === 'whole' ? [b.early, b.late] : [b[session]];
  return s.includes('mine') ? 'mine' : s.includes('competition') ? 'competition' : s.includes('taken') ? 'taken' : 'free';
}
const BENCH_WORD = { free: 'free', taken: 'taken', competition: 'kept for a competition', mine: 'yours' };

function bookView() {
  if (!BENCH.info && BENCH.infoState !== 'failed') setTimeout(loadBenchInfo, 0);
  const head = `<div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Book a bench</h1></div>`;
  if (!BENCH.info) return head + `<section class="section">${BENCH.infoState === 'failed' ? benchFailed() : skeletonRows(3)}</section>`;
  const info = BENCH.info, p = BENCH.pick, day = info.days.find(d => d.date === p.date), range = rangeOf(info.ranges, p.range), map = BENCH.map;
  if (!info.days.length) return head + `<section class="section">${empty('No range days to book', 'Please check back soon.')}</section>`;
  const freeIn = s => map.benches.filter(b => benchState(b, s) === 'free').length;
  const over = s => !!(map && map.ended && map.ended.early && s === 'early');
  const sessions = () => SESSION_KEYS.map(s => {
    const free = map ? freeIn(s) : null, off = over(s) || free === 0;
    return `<button type="button" class="opt" data-bk-session="${s}" aria-pressed="${p.session === s}"${off ? ' disabled' : ''}>
      <span class="opt-title">${esc(info.sessions[s])}</span>
      <span class="opt-text">${esc(sessionTimes(day.times[s]))}${over(s) ? ' · finished' : free === null ? '' : free ? ` · ${free} bench${free === 1 ? '' : 'es'} free` : ' · full'}</span></button>`;
  }).join('');
  const benches = () => `<div class="bench-map" role="group" aria-label="Benches on the ${esc(range.name)}">${map.benches.map(b => {
    const st = benchState(b, p.session), on = p.bench === b.n;
    return `<button type="button" class="bench bench-${st}${b.big ? ' bench-big' : ''}" data-bk-bench="${b.n}" aria-pressed="${on}"${st === 'free' ? '' : ' disabled'}
      aria-label="Bench ${b.n}, ${BENCH_WORD[st]}${b.big ? ', for big calibres and muzzle brakes' : ''}"><b>${b.n}</b><span>${st === 'taken' ? 'Taken' : st === 'competition' ? 'Comp' : st === 'mine' ? 'Yours' : on ? 'Chosen' : 'Free'}</span></button>`;
  }).join('')}</div>
    ${benchLegend([['bench-free', 'Free'], ['bench-taken', 'Taken'], ['bench-competition', 'Competition']], range.big.length)}
    ${range.big.length ? `<p class="muted bench-note">Benches ${benchList(range.big)}: ${esc(info.bigNote.charAt(0).toLowerCase() + info.bigNote.slice(1))}.</p>` : ''}`;
  const mine = map && map.mine;
  return `${head}
    <section class="section">
      ${stepHead(1, 'Which day?')}
      <div class="chips">${info.days.map(d => `<button type="button" class="chip-btn" data-bk-day="${d.date}" aria-pressed="${p.date === d.date}">${shortDate(d.date)}</button>`).join('')}</div>
      <p class="muted">You can book up to ${info.weeksAhead} weeks ahead.</p>
    </section>
    ${day ? `<section class="section">
      ${stepHead(2, 'Which range?')}
      <div class="seg" role="group" aria-label="Range">${info.ranges.map(r => `<button type="button" data-bk-range="${r.key}" aria-pressed="${p.range === r.key}">${esc(r.name.replace(/ range$/, ''))}</button>`).join('')}</div>
    </section>` : ''}
    ${day && p.range ? `<section class="section">
      ${map ? (mine ? `<p class="notice" role="status">You already have bench ${mine.bench} (${esc(info.sessions[mine.session])}) on the ${esc(range.name)} this day. To choose a different one, cancel it in <a href="#/me/bookings">My bookings</a> first.</p>`
        : `${stepHead(3, 'Which session?')}<div class="opts">${sessions()}</div>`)
      : BENCH.mapState === 'failed' ? `<div class="card empty"><div class="empty-title">Can't load the benches</div><p class="muted">${esc(BENCH.mapError)}</p>
        <button type="button" class="btn btn-outline" data-bk-map>${ICON.refresh}Try again</button></div>` : skeletonRows(2)}
    </section>` : ''}
    ${day && map && !mine && p.session ? `<section class="section">
      ${stepHead(4, 'Choose a bench')}
      ${benches()}
      ${BENCH.error ? `<p class="form-error" role="alert">${esc(BENCH.error)}</p>` : ''}
      <div class="pick-bar"><button type="button" class="btn btn-primary btn-big" data-bk-go${p.bench && !BENCH.busy ? '' : ' disabled'}>${BENCH.busy ? 'Booking…' : p.bench ? `Book bench ${p.bench} · ${esc(info.sessions[p.session])}` : 'Choose a bench'}</button></div>
    </section>` : ''}`;
}
async function bookBench() {
  const p = BENCH.pick;
  if (BENCH.busy || !p.bench) return;
  BENCH.busy = true; BENCH.error = ''; render(true);
  try {
    const out = await memberApi('benchBook', [p.date, p.range, p.session, p.bench]);
    BENCH.busy = false; BENCH.info = null; BENCH.infoState = ''; BENCH.note = (out && out.message) || 'Your bench is booked.';
    go('#/me/bookings');
  } catch (e) {
    BENCH.busy = false;
    if (e.signedOut) return;
    BENCH.error = e.message; BENCH.pick.bench = 0;
    render(true); loadBenchMap(); // someone else may have just taken it: show the benches as they are now
  }
}

const bookingStarted = b => { const now = new Date(), t = time24(b.start) || '00:00'; return b.date < todayIso() || (b.date === todayIso() && now.getHours() * 60 + now.getMinutes() >= Number(t.slice(0, 2)) * 60 + Number(t.slice(3))); };
function bookingsView() {
  if (!BENCH.info && BENCH.infoState !== 'failed') setTimeout(loadBenchInfo, 0);
  const head = `<div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>My bookings</h1></div>`;
  if (!BENCH.info) return head + `<section class="section">${BENCH.infoState === 'failed' ? benchFailed() : skeletonRows(2)}</section>`;
  const info = BENCH.info, what = x => `${esc(info.sessions[x.session])}${x.start ? ' · ' + esc(sessionTimes([x.start, x.end])) : ''}`;
  const pill = { Waiting: 'amber', Declined: 'grey' };
  return `${head}
    <section class="section">
      ${BENCH.note ? `<p class="notice" role="status">${esc(BENCH.note)}</p>` : ''}
      ${info.bookings.length ? info.bookings.map((b, i) => `
        <article class="card book-card">
          <div class="event-row">${dateBlock(b.date)}
            <div><div class="event-title">Bench ${b.bench} · ${esc(rangeOf(info.ranges, b.range).name)}</div>
              <div class="muted">${esc(DAYS_LONG[parseDate(b.date).getDay()])} · ${what(b)}</div>
              ${b.status === 'Arrived' ? '<span class="me-pill me-pill-ok">You are ticked in</span>' : ''}</div></div>
          <div class="btn-row">
            <button type="button" class="btn btn-outline" data-bk-cal="${i}">${ICON.calendar}Add to calendar</button>
            ${bookingStarted(b) ? '' : `<button type="button" class="btn btn-outline" data-bk-cancel="${i}">${ICON.close}Cancel</button>`}
          </div>
        </article>`).join('') : empty('No bookings coming up', 'When you book a bench it appears here.')}
      <a class="btn btn-primary btn-big" href="#/me/book">${ICON.bench}Book a bench</a>
      <p class="muted">Please arrive on time: a bench nobody has been ticked in to is given to someone else ${info.noShowMinutes} minutes after the session starts.</p>
    </section>
    <section class="section">
      <div class="section-head"><h2>Another day?</h2></div>
      <p class="muted">On a Tuesday, Thursday or Friday the range opens by appointment. Ask for a bench and a range officer will answer by email.</p>
      ${info.requests.length ? `<div class="card list">${info.requests.map((r, i) => `
        <div class="list-row"><div class="list-main"><div class="list-title">${esc(benchDayLabel(r.date))} · ${esc(rangeOf(info.ranges, r.range).name)}</div>
          <div class="muted">${esc(info.sessions[r.session])}${r.note ? ' · “' + esc(r.note) + '”' : ''}</div>
          <div class="lab-row"><span class="me-pill me-pill-${pill[r.status] || 'grey'}">${esc(r.status)}</span></div>
          ${r.answer ? `<div class="muted">Range officer: ${esc(r.answer)}</div>` : ''}</div>
          ${r.status === 'Waiting' ? `<button type="button" class="link-btn" data-bk-unask="${i}">Cancel</button>` : ''}</div>`).join('')}</div>` : ''}
      ${info.appointmentDays.length ? `<a class="btn btn-outline btn-big" href="#/me/request">${ICON.calendar}Request a booking</a>` : ''}
    </section>`;
}
function bookingToCalendar(b) {
  const range = rangeOf(BENCH.info.ranges, b.range).name;
  addToCalendar({ date: b.date, start: b.start, end: b.end, title: `Bench ${b.bench}, ${range}`, discipline: `${BENCH.info.sessions[b.session]}: bench ${b.bench} on the ${range}`, description: 'Booked in On Target.' });
}
function askCancelBooking(i) {
  const b = BENCH.info && BENCH.info.bookings[i];
  if (!b) return;
  confirmAsk({ title: 'Cancel this booking?', text: `Bench ${b.bench} on the ${rangeOf(BENCH.info.ranges, b.range).name}, ${benchDayLabel(b.date)}. The bench goes back for someone else to book.`,
    yes: 'Yes, cancel it', busy: 'Cancelling…', no: 'No, keep it', run: () => memberApi('benchCancel', [b.id]),
    done: out => { BENCH.note = (out && out.message) || 'Cancelled.'; BENCH.info = null; BENCH.infoState = ''; render(true); } });
}
function askCancelRequest(i) {
  const r = BENCH.info && BENCH.info.requests[i];
  if (!r) return;
  confirmAsk({ title: 'Cancel this request?', text: `${benchDayLabel(r.date)}, ${rangeOf(BENCH.info.ranges, r.range).name}.`,
    yes: 'Yes, cancel it', busy: 'Cancelling…', no: 'No, keep it', run: () => memberApi('benchRequestCancel', [r.id]),
    done: out => { BENCH.note = (out && out.message) || 'Cancelled.'; BENCH.info = null; BENCH.infoState = ''; render(true); } });
}

const radios = (name, list, picked) => list.map(([value, title, text]) => `<label class="choice"><input type="radio" name="${name}" value="${esc(value)}"${value === picked ? ' checked' : ''}>
  <span><span class="choice-title">${esc(title)}</span>${text ? `<span class="choice-text">${esc(text)}</span>` : ''}</span></label>`).join('');
function requestView() {
  if (!BENCH.info && BENCH.infoState !== 'failed') setTimeout(loadBenchInfo, 0);
  const head = `<div class="page-title"><a class="back-link" href="#/me/bookings">${ICON.chev}My bookings</a><h1>Request a booking</h1>
    <p class="muted">For a Tuesday, Thursday or Friday. A range officer will answer by email.</p></div>`;
  if (!BENCH.info) return head + `<section class="section">${BENCH.infoState === 'failed' ? benchFailed() : skeletonRows(3)}</section>`;
  const info = BENCH.info, days = info.appointmentDays;
  if (!days.length) return head + `<section class="section">${empty('No days to ask for', 'Please check back soon.')}</section>`;
  return `${head}
    <section class="section"><form class="card form" id="benchReqForm" novalidate>
      <label class="field-label" for="rqDay">Which day?</label>
      <select class="field" id="rqDay"><option value="">Choose a day…</option>${days.map(d => `<option value="${d.date}">${esc(benchDayLabel(d.date))}</option>`).join('')}</select>
      <fieldset class="choices"><legend class="field-label">Which range?</legend>${radios('rqRange', info.ranges.map(r => [r.key, r.name]), '')}</fieldset>
      <fieldset class="choices"><legend class="field-label">Which session?</legend>${radios('rqSession', SESSION_KEYS.map(s => [s, info.sessions[s], sessionTimes(days[0].times[s])]), '')}</fieldset>
      <label class="field-label" for="rqNote">Anything the range officer should know? <span class="field-hint">optional</span></label>
      <textarea class="field" id="rqNote" rows="3" maxlength="300"></textarea>
      <p class="form-error" id="rqError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="rqSubmit">Send request</button>
    </form></section>`;
}
async function sendBenchRequest(form) {
  const btn = form.querySelector('#rqSubmit'), error = form.querySelector('#rqError');
  if (btn.disabled) return;
  const pick = n => (form.querySelector(`input[name="${n}"]:checked`) || {}).value || '';
  const d = { date: form.querySelector('#rqDay').value, range: pick('rqRange'), session: pick('rqSession'), note: form.querySelector('#rqNote').value.trim() };
  const fail = msg => { error.textContent = msg; error.hidden = false; };
  if (!d.date) return fail('Please choose a day.');
  if (!d.range) return fail('Please choose Pistol or Rifle.');
  if (!d.session) return fail('Please choose Early, Late or Whole session.');
  error.hidden = true; btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const out = await memberApi('benchRequest', [d]);
    BENCH.info = null; BENCH.infoState = ''; BENCH.note = (out && out.message) || 'Your request has been sent.';
    go('#/me/bookings');
  } catch (e) { if (e.signedOut) return; btn.disabled = false; btn.textContent = 'Send request'; fail(e.message); }
}

/* ----- Club team ----- */
const rangeBack = `<a class="back-link" href="#/committee/range">${ICON.chev}Today at the range</a>`;
async function loadBenchDay(date) {
  const run = ++BENCH.dayRun;
  BENCH.dayState = 'loading';
  try {
    const d = await committeeApi('benchDay', [date || '']);
    if (run !== BENCH.dayRun) return;
    BENCH.day = d; BENCH.dayState = '';
    if (BENCH.res && BENCH.res.event) resetReserve();
  } catch (e) { if (e.signedOut || run !== BENCH.dayRun) return; BENCH.dayState = 'failed'; }
  if (['committee/range', 'committee/reserve'].includes(currentPage)) render(true);
}
async function loadBenchCount(force) {
  if (!session || (!force && Date.now() - BENCH.countAt < 60000)) return;
  BENCH.countAt = Date.now();
  try {
    const n = Number((await committeeApi('benchRequestCount')).waiting) || 0;
    if (n === BENCH.waiting) return;
    BENCH.waiting = n; drawDot();
    if (currentPage === 'me') render(true);
  } catch (e) { /* the count is only a guide */ }
}
/* The bookings holding a bench on the day that is loaded (no-shows have let theirs go) */
const holding = b => b.status === 'Booked' || b.status === 'Arrived';
const freeBenches = (range, session) => Array.from({ length: range.benches }, (_, i) => i + 1)
  .filter(n => !BENCH.day.bookings.some(b => b.range === range.key && b.bench === n && holding(b) && sessionsClash(b.session, session)));
const WALK_TAG = { 'Walk-in (member)': 'Walk-in', 'Walk-in (visitor)': 'Visitor' };

function rangeView() {
  const day = BENCH.day;
  if ((!day || !day.today) && BENCH.dayState !== 'failed' && BENCH.dayState !== 'loading') setTimeout(() => loadBenchDay(''), 0);
  const head = `<div class="page-title">${adminBack}<h1>Today at the range</h1>${day && day.today ? `<p class="muted">${esc(benchDayLabel(day.date))} · as at ${esc(niceTime(day.now))}</p>` : ''}</div>`;
  if (!day || !day.today) return head + `<section class="section">${BENCH.dayState === 'failed' ? loadFailed('today\'s bookings', 'data-range-reload') : skeletonRows(4)}</section>`;
  const person = b => {
    const tag = WALK_TAG[b.kind], gone = b.status === 'No-show', here = b.status === 'Arrived';
    return `<div class="range-row${gone ? ' range-gone' : ''}"><span class="bench-no" aria-hidden="true">${b.bench}</span>
      <div class="list-main"><div class="list-title">${esc(b.name)}</div>
        <div class="muted"><span class="sr-only">Bench ${b.bench}. </span>${esc(day.sessions[b.session])}${tag ? ' · ' + tag : ''}</div>
        ${gone ? '<span class="me-pill me-pill-grey">No-show: bench freed</span>' : here ? '' : `<div class="muted">Bench is freed at ${esc(niceTime(b.freeAt))} if not ticked in</div>`}
        ${tag && here ? `<button type="button" class="link-btn range-off" data-range-off="${esc(b.id)}">Take off the bench</button>` : ''}</div>
      ${here ? `<button type="button" class="btn tick tick-on" data-range-untick="${esc(b.id)}" aria-pressed="true">${ICON.check}Here</button>`
        : `<button type="button" class="btn btn-outline tick" data-range-tick="${esc(b.id)}" aria-pressed="false">Tick in</button>`}</div>`;
  };
  const ranges = day.ranges.map(r => {
    const all = day.bookings.filter(b => b.range === r.key), comps = all.filter(b => b.kind === 'Competition'), people = all.filter(b => b.kind !== 'Competition')
      .sort((a, b) => a.bench - b.bench || SESSION_KEYS.indexOf(a.session) - SESSION_KEYS.indexOf(b.session));
    const groups = {};
    comps.forEach(b => { const k = b.name + '|' + b.session; (groups[k] = groups[k] || { name: b.name, session: b.session, benches: [] }).benches.push(b.bench); });
    const free = ['early', 'late'].map(s => [s, freeBenches(r, s)]);
    return `<div class="section-head"><h2>${esc(r.name)}</h2></div>
      ${Object.values(groups).map(g => `<p class="notice comp-note"><b>Competition: ${esc(g.name)}</b><br>Bench${g.benches.length === 1 ? '' : 'es'} ${benchList(g.benches.sort((a, b) => a - b))} · ${esc(day.sessions[g.session])}</p>`).join('')}
      ${people.length ? `<div class="card list">${people.map(person).join('')}</div>` : comps.length ? '' : '<p class="muted">Nobody is booked on this range today.</p>'}
      <p class="muted">${free.map(([s, ns]) => `Free, ${esc(day.sessions[s]).toLowerCase()}: ${ns.length === r.benches ? 'all ' + r.benches + ' benches' : ns.length ? benchList(ns) : 'none'}`).join('<br>')}</p>`;
  }).join('');
  return `${head}
    <section class="section">
      ${BENCH.dayNote ? `<p class="notice" role="status">${esc(BENCH.dayNote)}</p>` : ''}
      <a class="btn btn-primary btn-big" href="#/committee/walkin">${ICON.plus}Add a walk-in</a>
      ${ranges}
      <button type="button" class="btn btn-outline" data-range-reload>${ICON.refresh}Refresh</button>
    </section>`;
}
async function tickIn(btn, id, arrived) {
  if (btn.disabled) return;
  btn.disabled = true; btn.textContent = arrived ? 'Ticking in…' : 'Unticking…';
  try { BENCH.dayNote = ((await committeeApi('benchArrive', [id, arrived])) || {}).message || ''; }
  catch (e) { if (e.signedOut) return; BENCH.dayNote = e.message; }
  loadBenchDay('');
}
function askTakeOff(id) {
  const b = BENCH.day && BENCH.day.bookings.find(x => x.id === id);
  if (!b) return;
  confirmAsk({ title: `Take ${b.name} off bench ${b.bench}?`, text: 'The bench becomes free for someone else.', yes: 'Yes, free the bench', busy: 'Freeing…', no: 'No, go back',
    run: () => committeeApi('benchRelease', [id]), done: out => { BENCH.dayNote = (out && out.message) || 'Done.'; loadBenchDay(''); } });
}

function walkInView() {
  const day = BENCH.day;
  if (!day || !day.today) { location.replace('#/committee/range'); return ''; } // e.g. the page was reloaded
  const mins = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)), session = mins(day.now) >= mins(day.times.early[1]) ? 'late' : 'early', range = day.ranges[day.ranges.length - 1];
  return `
    <div class="page-title">${rangeBack}<h1>Add a walk-in</h1><p class="muted">Someone who has turned up without a booking. They are ticked in straight away.</p></div>
    <section class="section"><form class="card form" id="walkInForm" novalidate>
      <label class="field-label" for="wkName">Their name</label>
      <input class="field" id="wkName" maxlength="60" autocomplete="off" autocapitalize="words">
      <fieldset class="choices"><legend class="field-label">Member or visitor?</legend>${radios('wkKind', [['member', 'Member'], ['visitor', 'Visitor']], 'member')}</fieldset>
      <fieldset class="choices"><legend class="field-label">Which range?</legend>${radios('wkRange', day.ranges.map(r => [r.key, r.name]), range.key)}</fieldset>
      <fieldset class="choices"><legend class="field-label">Which session?</legend>${radios('wkSession', SESSION_KEYS.map(s => [s, day.sessions[s], sessionTimes(day.times[s])]), session)}</fieldset>
      <label class="field-label" for="wkBench">Which bench? <span class="field-hint">only free benches are listed</span></label>
      <select class="field" id="wkBench">${walkInBenches(range.key, session)}</select>
      <p class="form-error" id="wkError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="wkSubmit">Add to the bench</button>
    </form></section>`;
}
function walkInBenches(rangeKey, session) {
  const range = rangeOf(BENCH.day.ranges, rangeKey), free = freeBenches(range, session);
  return free.length ? '<option value="">Choose a bench…</option>' + free.map(n => `<option value="${n}">Bench ${n}${range.big.includes(n) ? ' (' + esc(BENCH.day.bigLabel.toLowerCase()) + ')' : ''}</option>`).join('')
    : '<option value="">No benches are free for this session</option>';
}
async function addWalkIn(form) {
  const btn = form.querySelector('#wkSubmit'), error = form.querySelector('#wkError');
  if (btn.disabled) return;
  const pick = n => (form.querySelector(`input[name="${n}"]:checked`) || {}).value || '';
  const d = { name: form.querySelector('#wkName').value.trim(), visitor: pick('wkKind') === 'visitor', range: pick('wkRange'), session: pick('wkSession'), bench: Number(form.querySelector('#wkBench').value) };
  const fail = msg => { error.textContent = msg; error.hidden = false; };
  if (!d.name) return fail('Please type their name.');
  if (!d.bench) return fail('Please choose a bench.');
  error.hidden = true; btn.disabled = true; btn.textContent = 'Adding…';
  try {
    const out = await committeeApi('benchWalkIn', [d]);
    BENCH.day = null; BENCH.dayNote = (out && out.message) || 'Added.';
    go('#/committee/range');
  } catch (e) { if (e.signedOut) return; btn.disabled = false; btn.textContent = 'Add to the bench'; fail(e.message); }
}

/* Reserve for a competition: pick the event, then tap the benches it needs */
async function loadBenchEvents() {
  if (BENCH.eventsState === 'loading') return;
  BENCH.eventsState = 'loading';
  try { BENCH.events = await committeeApi('benchEvents') || []; BENCH.eventsState = ''; }
  catch (e) { if (e.signedOut) { BENCH.eventsState = ''; return; } BENCH.eventsState = 'failed'; }
  if (currentPage === 'committee/reserve') render(true);
}
const isCompetition = ev => /competition|\bcomp\b|championship|\bshoot\b/i.test(ev.discipline + ' ' + ev.title);
/* The benches already reserved for this event's range and session become the starting point */
function resetReserve() {
  const res = BENCH.res, day = BENCH.day;
  if (!res || !res.event || !day || day.date !== res.event.date) return;
  res.benches = day.bookings.filter(b => b.kind === 'Competition' && holding(b) && b.range === res.range && b.session === res.session).map(b => b.bench);
  res.saved = res.benches.slice().sort((a, b) => a - b).join(',');
}
function reserveView() {
  const res = BENCH.res || (BENCH.res = { event: null, range: 'rifle', session: 'whole', benches: [], saved: '', busy: false, note: '', error: '' });
  const back = `<div class="page-title">${adminBack}<h1>Reserve for a competition</h1>`;
  if (!res.event) {
    if (!BENCH.events && BENCH.eventsState !== 'failed') setTimeout(loadBenchEvents, 0);
    const all = BENCH.events || [], comps = all.filter(isCompetition), list = BENCH.allEvents || !comps.length ? all : comps;
    return `${back}<p class="muted">Choose the competition, then tap the benches it needs. Members see those benches as “Competition” and can't book them.</p></div>
      <section class="section">
        ${res.note ? `<p class="notice" role="status">${esc(res.note)}</p>` : ''}
        ${!BENCH.events ? (BENCH.eventsState === 'failed' ? loadFailed('the events', 'data-res-events') : skeletonRows(3))
        : list.length ? `<div class="card list">${list.map(ev => `<button type="button" class="list-row manage-row" data-res-event="${all.indexOf(ev)}">${dateBlock(ev.date)}
            <span class="list-main"><span class="list-title">${esc(ev.title)}</span><span class="muted">${joinDot(shortDate(ev.date), ev.discipline, timeRange(ev))}</span></span>${ICON.chev}</button>`).join('')}</div>`
          : empty('No events coming up', 'Post the competition as an event first, then come back here.')}
        ${BENCH.events && comps.length && comps.length < all.length ? `<button type="button" class="btn btn-outline" data-res-all>${BENCH.allEvents ? 'Show competitions only' : 'Show all events'}</button>` : ''}
      </section>`;
  }
  const ev = res.event, day = BENCH.day && BENCH.day.date === ev.date ? BENCH.day : null;
  if (!day && BENCH.dayState !== 'failed' && BENCH.dayState !== 'loading') setTimeout(() => loadBenchDay(ev.date), 0);
  const head = `${back}</div>
    <section class="section"><div class="card res-event"><div class="event-row">${dateBlock(ev.date)}<div><div class="event-title">${esc(ev.title)}</div><div class="muted">${joinDot(benchDayLabel(ev.date), timeRange(ev))}</div></div></div>
      <button type="button" class="link-btn" data-res-change>Choose a different event</button></div></section>`;
  if (!day) return head + `<section class="section">${BENCH.dayState === 'failed' ? loadFailed('the benches', 'data-res-day') : skeletonRows(3)}</section>`;
  const range = rangeOf(day.ranges, res.range), changed = res.benches.slice().sort((a, b) => a - b).join(',') !== res.saved, n = res.benches.length;
  const bench = k => {
    const on = res.benches.includes(k), big = range.big.includes(k);
    const other = day.bookings.find(b => b.range === range.key && b.bench === k && holding(b) && sessionsClash(b.session, res.session) && !(b.kind === 'Competition' && b.session === res.session));
    return other ? `<button type="button" class="bench bench-taken${big ? ' bench-big' : ''}" disabled aria-label="Bench ${k}, booked by ${esc(other.name)}"><b>${k}</b><span>${esc(other.kind === 'Competition' ? 'Comp' : other.name.split(' ')[0])}</span></button>`
      : `<button type="button" class="bench ${on ? 'bench-competition' : 'bench-free'}${big ? ' bench-big' : ''}" data-res-bench="${k}" aria-pressed="${on}" aria-label="Bench ${k}, ${on ? 'reserved for the competition' : 'free'}"><b>${k}</b><span>${on ? 'Reserved' : 'Free'}</span></button>`;
  };
  return `${head}
    <section class="section">
      ${res.note ? `<p class="notice" role="status">${esc(res.note)}</p>` : ''}
      <div class="seg" role="group" aria-label="Range">${day.ranges.map(r => `<button type="button" data-res-range="${r.key}" aria-pressed="${res.range === r.key}">${esc(r.name.replace(/ range$/, ''))}</button>`).join('')}</div>
      <div class="opts opts-3">${SESSION_KEYS.map(s => `<button type="button" class="opt" data-res-session="${s}" aria-pressed="${res.session === s}"><span class="opt-title">${esc(day.sessions[s])}</span><span class="opt-text">${esc(sessionTimes(day.times[s]))}</span></button>`).join('')}</div>
      <p class="muted">Tap the benches the competition needs. Tap one again to release it.</p>
      <div class="bench-map" role="group" aria-label="Benches on the ${esc(range.name)}">${Array.from({ length: range.benches }, (_, i) => bench(i + 1)).join('')}</div>
      ${benchLegend([['bench-free', 'Free'], ['bench-competition', 'Reserved for the competition'], ['bench-taken', 'Already booked']], range.big.length)}
      ${res.error ? `<p class="form-error" role="alert">${esc(res.error)}</p>` : ''}
      <div class="pick-bar"><button type="button" class="btn btn-primary btn-big" data-res-save${changed && !res.busy ? '' : ' disabled'}>${res.busy ? 'Saving…' : !changed ? (n ? `${n} bench${n === 1 ? '' : 'es'} reserved` : 'No benches reserved')
        : n ? `Reserve ${n} bench${n === 1 ? '' : 'es'} · ${esc(day.sessions[res.session])}` : 'Release all the benches'}</button></div>
    </section>`;
}
async function saveReserve() {
  const res = BENCH.res;
  if (!res || res.busy || !res.event) return;
  res.busy = true; res.error = ''; res.note = ''; render(true);
  try {
    const out = await committeeApi('benchReserve', [{ date: res.event.date, range: res.range, session: res.session, benches: res.benches, title: res.event.title }]);
    res.note = (out && out.message) || 'Saved.';
  } catch (e) { if (e.signedOut) return; res.error = e.message; }
  res.busy = false;
  loadBenchDay(res.event.date); // also when it failed: show the benches as they are now
}

/* Booking requests for appointment days */
async function loadBenchRequests() {
  if (BENCH.reqState === 'loading') return;
  BENCH.reqState = 'loading';
  try {
    const d = await committeeApi('benchRequests') || {};
    BENCH.reqs = { requests: Array.isArray(d.requests) ? d.requests : [], ranges: d.ranges || [], sessions: d.sessions || {} };
    const n = BENCH.reqs.requests.filter(r => r.waiting).length;
    if (n !== BENCH.waiting) { BENCH.waiting = n; drawDot(); }
    BENCH.reqState = '';
  } catch (e) { if (e.signedOut) { BENCH.reqState = ''; return; } BENCH.reqState = 'failed'; }
  if (currentPage === 'committee/requests') render(true);
}
function benchRequestsView() {
  if (!BENCH.reqs && BENCH.reqState !== 'failed') setTimeout(loadBenchRequests, 0);
  const body = () => {
    const q = BENCH.reqs, waiting = q.requests.filter(r => r.waiting), done = q.requests.filter(r => !r.waiting);
    const what = r => `${esc(rangeOf(q.ranges, r.range).name)} · ${esc(q.sessions[r.session] || r.session)}${sessionTimes(r.times) ? ' · ' + esc(sessionTimes(r.times)) : ''}`;
    return (waiting.length ? waiting.map(r => {
      const a = BENCH.answers[r.id] || {}, range = rangeOf(q.ranges, r.range);
      return `<article class="card pay-card">
        <h2 class="pay-name">${esc(r.name)}</h2>
        <div><b>${esc(benchDayLabel(r.date))}</b></div>
        <div>${what(r)}</div>
        ${r.note ? `<div class="pay-ref"><span class="muted">Their note</span><span>${esc(r.note)}</span></div>` : ''}
        <label class="field-label" for="rqBench${esc(r.id)}">Which bench?</label>
        <select class="field" id="rqBench${esc(r.id)}" data-req-bench="${esc(r.id)}">${r.free.length ? '<option value="">Choose a bench…</option>' + r.free.map(n => `<option value="${n}"${Number(a.bench) === n ? ' selected' : ''}>Bench ${n}${range.big.includes(n) ? ' (big calibre / muzzle brake)' : ''}</option>`).join('') : '<option value="">No benches are free</option>'}</select>
        <label class="field-label" for="rqAns${esc(r.id)}">A note for them <span class="field-hint">optional, goes in the email</span></label>
        <textarea class="field" id="rqAns${esc(r.id)}" data-req-note="${esc(r.id)}" rows="2" maxlength="300">${esc(a.note || '')}</textarea>
        <button type="button" class="btn btn-primary btn-big" data-req-yes="${esc(r.id)}">Approve</button>
        <button type="button" class="btn btn-outline btn-big" data-req-no="${esc(r.id)}">Decline</button>
      </article>`;
    }).join('') : empty('No requests waiting', 'When a member asks for a bench on a Tuesday, Thursday or Friday, it appears here.'))
      + (done.length ? `<div class="section-head"><h2>Answered</h2></div><div class="card list">${done.map(r => `
        <div class="list-row"><div class="list-main"><div class="list-title">${esc(r.name)} · ${esc(benchDayLabel(r.date))}</div>
          <div class="muted">${what(r)}${r.bench ? ' · bench ' + esc(r.bench) : ''}</div>
          <div class="lab-row"><span class="lab lab-${r.status === 'Approved' ? 'replied' : 'tag'}">${esc(r.status)}</span>${r.by ? `<span class="muted">by ${esc(r.by)}</span>` : ''}</div>
          ${r.answer ? `<div class="muted">“${esc(r.answer)}”</div>` : ''}</div></div>`).join('')}</div>` : '');
  };
  return `
    <div class="page-title">${adminBack}<h1>Booking requests</h1><p class="muted">Members asking for a bench on a Tuesday, Thursday or Friday.</p></div>
    <section class="section">
      ${BENCH.reqNote ? `<p class="notice" role="status">${esc(BENCH.reqNote)}</p>` : ''}
      ${BENCH.reqs ? body() : BENCH.reqState === 'failed' ? loadFailed('the requests', 'data-req-reload') : skeletonRows(3)}
      ${BENCH.reqs ? `<button type="button" class="btn btn-outline" data-req-reload>${ICON.refresh}Refresh</button>` : ''}
    </section>`;
}
function askBenchRequest(id, approve) {
  const r = BENCH.reqs && BENCH.reqs.requests.find(x => x.id === id && x.waiting);
  if (!r) return;
  const a = BENCH.answers[id] || {}, bench = Number(a.bench) || 0, note = String(a.note || '').trim(), day = benchDayLabel(r.date);
  if (approve && !bench) { BENCH.reqNote = 'Please choose a bench first.'; render(true); return document.getElementById('rqBench' + id).focus(); }
  const done = out => { BENCH.reqNote = (out && out.message) || 'Done.'; BENCH.reqs = null; delete BENCH.answers[id]; render(true); };
  confirmAsk(approve ? { title: `Give ${r.name} bench ${bench}?`, text: `${day}. They will get an email to say it is booked${note ? ', with your note' : ''}.`,
    yes: 'Yes, approve', busy: 'Approving…', no: 'No, go back', run: () => committeeApi('benchRequestApprove', [id, bench, note]), done }
    : { title: `Decline ${r.name}'s request?`, text: `${day}. They will get an email to say it can't be done${note ? ', with your note' : ''}.`,
      yes: 'Yes, decline', busy: 'Declining…', no: 'No, go back', run: () => committeeApi('benchRequestDecline', [id, note]), done });
}

view.addEventListener('click', e => {
  let el, v; // the button that was tapped and the value it carries
  const hit = attr => { const x = e.target.closest(`[${attr}]`); if (!x || x.disabled) return null; v = x.getAttribute(attr); return x; };
  // Members
  if (hit('data-bench-reload')) { BENCH.info = null; BENCH.infoState = ''; render(true); }
  if ((el = hit('data-bk-day'))) { Object.assign(BENCH.pick, { date: v, bench: 0 }); BENCH.error = ''; BENCH.map = null; render(true); loadBenchMap(); }
  if ((el = hit('data-bk-range'))) { Object.assign(BENCH.pick, { range: v, bench: 0 }); BENCH.error = ''; render(true); loadBenchMap(); }
  if ((el = hit('data-bk-session'))) { Object.assign(BENCH.pick, { session: v, bench: 0 }); BENCH.error = ''; render(true); const step = view.querySelector('.bench-map'); if (step) step.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  if ((el = hit('data-bk-bench'))) { BENCH.pick.bench = BENCH.pick.bench === Number(v) ? 0 : Number(v); BENCH.error = ''; render(true); }
  if (hit('data-bk-map')) { render(true); loadBenchMap(); }
  if (hit('data-bk-go')) bookBench();
  if ((el = hit('data-bk-cal')) && BENCH.info && BENCH.info.bookings[Number(v)]) bookingToCalendar(BENCH.info.bookings[Number(v)]);
  if ((el = hit('data-bk-cancel'))) askCancelBooking(Number(v));
  if ((el = hit('data-bk-unask'))) askCancelRequest(Number(v));
  // Club team
  if (hit('data-range-reload')) { BENCH.dayNote = ''; BENCH.day = null; BENCH.dayState = ''; render(true); }
  if ((el = hit('data-range-tick'))) tickIn(el, v, true);
  if ((el = hit('data-range-untick'))) tickIn(el, v, false);
  if ((el = hit('data-range-off'))) askTakeOff(v);
  if (hit('data-res-events')) { BENCH.eventsState = ''; render(true); }
  if (hit('data-res-day')) { BENCH.dayState = ''; render(true); }
  if (hit('data-res-all')) { BENCH.allEvents = !BENCH.allEvents; render(true); }
  if ((el = hit('data-res-event')) && BENCH.events && BENCH.res) { Object.assign(BENCH.res, { event: BENCH.events[Number(v)], benches: [], saved: '', note: '', error: '' }); BENCH.day = null; BENCH.dayState = ''; render(); }
  if (hit('data-res-change') && BENCH.res) { Object.assign(BENCH.res, { event: null, error: '' }); render(); }
  if ((el = hit('data-res-range')) && BENCH.res) { Object.assign(BENCH.res, { range: v, error: '', note: '' }); resetReserve(); render(true); }
  if ((el = hit('data-res-session')) && BENCH.res) { Object.assign(BENCH.res, { session: v, error: '', note: '' }); resetReserve(); render(true); }
  if ((el = hit('data-res-bench')) && BENCH.res && !BENCH.res.busy) { const k = Number(v), at = BENCH.res.benches.indexOf(k); if (at < 0) BENCH.res.benches.push(k); else BENCH.res.benches.splice(at, 1); BENCH.res.error = ''; render(true); }
  if (hit('data-res-save')) saveReserve();
  if (hit('data-req-reload')) { BENCH.reqs = null; BENCH.reqState = ''; BENCH.reqNote = ''; render(true); }
  if ((el = hit('data-req-yes'))) askBenchRequest(v, true);
  if ((el = hit('data-req-no'))) askBenchRequest(v, false);
});
view.addEventListener('submit', e => {
  if (e.target.id === 'benchReqForm') { e.preventDefault(); sendBenchRequest(e.target); }
  if (e.target.id === 'walkInForm') { e.preventDefault(); addWalkIn(e.target); }
});
/* What is typed into a request's answer is kept, so fresh club data arriving doesn't wipe it */
const keepAnswer = e => {
  const t = e.target, id = t.dataset && (t.dataset.reqBench || t.dataset.reqNote);
  if (id) (BENCH.answers[id] = BENCH.answers[id] || {})[t.dataset.reqBench ? 'bench' : 'note'] = t.value;
};
view.addEventListener('input', keepAnswer);
view.addEventListener('change', e => {
  keepAnswer(e);
  // Add a walk-in: the list of free benches follows the range and the session
  const form = e.target.closest && e.target.closest('#walkInForm');
  if (form && BENCH.day && (e.target.name === 'wkRange' || e.target.name === 'wkSession')) {
    const pick = n => (form.querySelector(`input[name="${n}"]:checked`) || {}).value || '';
    form.querySelector('#wkBench').innerHTML = walkInBenches(pick('wkRange'), pick('wkSession'));
  }
});
/* Today at the range keeps itself up to date while it is on the screen (no-shows free their benches) */
setInterval(() => { if (!document.hidden && currentPage === 'committee/range' && BENCH.day && BENCH.dayState !== 'loading' && confirmSheet.hidden) loadBenchDay(''); }, 60000);

drawDot();
render();
refreshAll();

/* Check a remembered PIN still works (it may have been changed or removed), and pick up name or admin changes. */
if (session) {
  loadUnread();
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
