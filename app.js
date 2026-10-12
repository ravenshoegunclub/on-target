/* On Target v1.8.1 — app shell with live club data and club team tools
   Events, results and photos come from the club's public feed (the same one
   the website uses). Each list is saved on the phone, so it opens instantly
   and still works with no signal, then refreshes in the background. */
'use strict';

const APP_VERSION = '1.8.1';
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

  committee(sub, arg) {
    if (!session) return `
      <div class="page-title"><h1>Club team</h1></div>
      <section class="section"><div class="card empty">
        <div class="empty-title">Please sign in</div>
        <p class="muted">This part of On Target is for the club team.</p>
        <button type="button" class="btn btn-primary btn-big" data-signin>Club team sign-in</button>
      </div></section>`;
    if (sub === 'event') return posted ? eventPosted() : eventForm();
    if (sub === 'results') return posted ? resultsPosted() : resultsForm();
    if (sub === 'photos') return posted ? photosAdded() : photosForm();
    if (sub === 'manage') return manageView();
    if (sub === 'messages') return messagesView();
    if (sub === 'message') return messageView(arg);
    if (sub === 'reply') return replyView(arg);
    if (sub === 'edit') {
      if (!editing) { location.replace('#/committee/manage'); return ''; } // e.g. the page was reloaded
      return editing.kind === 'event' ? eventForm(editing.item) : editing.kind === 'results' ? resultsForm(editing.item) : photoEditForm(editing.item);
    }
    if (['payments', 'members', 'people', 'person'].includes(sub)) {
      if (!session.admin) return `<div class="page-title"><a class="back-link" href="#/committee">${ICON.chev}Club team</a><h1>Admin</h1></div>
        <section class="section">${empty('Admins only', 'Only admins can use this part of On Target.')}</section>`;
      if (sub === 'person' && !personEdit) { location.replace('#/committee/people'); return ''; } // e.g. the page was reloaded
      return sub === 'payments' ? paymentsView() : sub === 'members' ? membersView() : sub === 'people' ? peopleView() : personForm(personEdit);
    }
    loadUnread();
    if (session.admin) loadAdminSummary();
    const sum = ADMIN.summary;
    return `
      <div class="page-title"><h1>Club team</h1>
        <div class="who"><span class="muted">Signed in as ${esc(session.name)}${session.admin ? ' · Admin' : ' · Club team'}</span>
          <button type="button" class="btn btn-outline" data-signout>Sign out</button></div>
      </div>
      <section class="section">
        <div class="section-head"><h2>Post something new</h2></div>
        <div class="post-tiles">
          <a class="tile" href="#/committee/event"><span class="tile-ico">${ICON.calendar}</span>Event</a>
          <a class="tile" href="#/committee/results"><span class="tile-ico">${ICON.trophy}</span>Results</a>
          <a class="tile" href="#/committee/photos"><span class="tile-ico">${ICON.camera}</span>Photos</a>
        </div>
      </section>
      <section class="section"><div class="card list">
        <a class="menu-row" href="#/committee/messages"><span class="tile-ico">${ICON.mail}</span>Messages${unreadBadge()}${ICON.chev}</a>
        <a class="menu-row" href="#/committee/manage"><span class="tile-ico">${ICON.doc}</span>Manage posts${ICON.chev}</a>
      </div></section>
      ${session.admin ? `<section class="section">
        <div class="section-head"><h2>Admin</h2></div>
        ${sum ? `<div class="admin-counts">
          ${sum.season === 'renew' ? `<a class="admin-count amber" href="#/committee/members" data-mem-filter="notRenewed">Not renewed yet: <b>${sum.notRenewed}</b></a>` : ''}
          ${sum.season === 'followup' ? `<a class="admin-count red" href="#/committee/members" data-mem-filter="overdue">Not financial – overdue: <b>${sum.overdue}</b></a>` : ''}
          <a class="admin-count" href="#/committee/payments">Payments waiting: <b>${sum.pending}</b></a>
        </div>` : ''}
        <div class="card list">
          <a class="menu-row" href="#/committee/payments"><span class="tile-ico">${ICON.fees}</span>Payments to confirm${sum && sum.pending ? `<span class="count-badge" aria-label="${sum.pending} waiting">${sum.pending}</span>` : ''}${ICON.chev}</a>
          <a class="menu-row" href="#/committee/members"><span class="tile-ico">${ICON.people}</span>Members${ICON.chev}</a>
          <a class="menu-row" href="#/committee/people"><span class="tile-ico">${ICON.key}</span>People and PINs${ICON.chev}</a>
        </div>
      </section>` : ''}`;
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
      : `<a class="back-link" href="#/committee">${ICON.chev}Club team</a><h1>Post an event</h1>`}</div>
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
        <a class="btn btn-outline btn-big" href="#/committee">Back to Club team</a>
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
      // Only events everyone can see get a Share button: private and hidden ones must never be posted publicly
      return evs.length ? `<div class="card list">${evs.map((ev, i) => `
        <div class="manage-item"><button type="button" class="list-row manage-row" data-edit="event:${i}">${ev.date ? dateBlock(ev.date) : ''}
          <span class="list-main"><span class="list-title">${esc(ev.title || 'No title')}</span>
            <span class="muted">${joinDot(ev.date && shortDate(ev.date) + ' ' + parseDate(ev.date).getFullYear(), timeRange(ev), ev.discipline)}</span>
            ${badge(ev.audience)}</span>${ICON.chev}</button>
          ${ev.audience === 'Everyone' && ev.date ? shareBtn('event:' + i, 'Share ' + (ev.title || 'this event')) : ''}</div>`).join('')}</div>`
        : empty('No events yet', 'Events you post appear here.');
    }
    if (manageTab === 'results') {
      return MANAGE.results.length ? `<p class="muted">Share copies a caption with every competition from that day.</p>
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
    <div class="page-title"><a class="back-link" href="#/committee">${ICON.chev}Club team</a><h1>Manage posts</h1></div>
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
  people: null, peopleState: '', peopleNote: '', newPin: null });
let ADMIN = blankAdmin();
let sheetUrlLoading = false;
let personEdit = null;       // the person being edited ({} for a new one) while that screen is open

async function loadAdminSummary(force) {
  if (!session || !session.admin || (!force && Date.now() - ADMIN.summaryAt < 60000)) return;
  ADMIN.summaryAt = Date.now();
  try {
    const d = await committeeApi('membersSummary') || {};
    const sum = { season: d.season || '', notRenewed: Number(d.notRenewed) || 0, overdue: Number(d.overdue) || 0, pending: Number(d.pending) || 0 };
    const same = JSON.stringify(sum) === JSON.stringify(ADMIN.summary);
    ADMIN.summary = sum; ADMIN.mem.season = sum.season || '';
    if (!same && currentPage === 'committee') render(true);
  } catch (e) { /* the counts are only a guide */ }
}
const adminBack = `<a class="back-link" href="#/committee">${ICON.chev}Club team</a>`;
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
  try { const list = await committeeApi('adminListPeople'); ADMIN.people = Array.isArray(list) ? list : []; ADMIN.peopleState = ''; }
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
          <span class="list-main"><span class="list-title">${esc(p.name)}${p.me ? ' (you)' : ''}</span><span class="muted">PIN ${esc(p.pinHint)}</span></span>
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
  showCommitteeTab();
}
async function savePerson(form) {
  const p = personEdit, btn = form.querySelector('#ppSubmit'), error = form.querySelector('#ppError'), label = btn.textContent;
  if (btn.disabled) return;
  const fail = (msg, el) => { error.textContent = msg; error.hidden = false; if (el) el.focus(); };
  const person = { id: p.id || null, name: form.querySelector('#ppName').value.trim(), admin: form.querySelector('#ppAdmin').checked };
  const how = (form.querySelector('[name="ppPin"]:checked') || {}).value;
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
    ADMIN.people = null; ADMIN.peopleNote = out.message || 'Saved.';
    ADMIN.newPin = out.pin ? { name: out.name || person.name, pin: out.pin } : null;
    go(session.admin ? '#/committee/people' : '#/committee');
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
  return msgUnread ? `<span class="count-badge" aria-label="${msgUnread} unread">${msgUnread}</span>` : '';
}
async function loadUnread(force) {
  if (!session || (!force && Date.now() - unreadAt < 60000)) return;
  unreadAt = Date.now();
  try {
    const n = (await committeeApi('msgCount')).unread || 0;
    if (n === msgUnread) return;
    msgUnread = n;
    if (currentPage === 'committee') render(true);
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
    <div class="page-title"><a class="back-link" href="#/committee">${ICON.chev}Club team</a><h1>Messages</h1></div>
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
      : `<a class="back-link" href="#/committee">${ICON.chev}Club team</a><h1>Post results</h1>`}</div>
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
        <a class="btn btn-outline btn-big" href="#/committee">Back to Club team</a>
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
    <div class="page-title"><a class="back-link" href="#/committee">${ICON.chev}Club team</a><h1>Add photos</h1></div>
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
        <a class="btn btn-outline btn-big" href="#/committee">Back to Club team</a>
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
  const page = (VIEWS[name] ? name : 'home') + (name === 'committee' && ['event', 'results', 'photos', 'manage', 'edit', 'messages', 'message', 'reply', 'payments', 'members', 'people', 'person'].includes(sub) ? '/' + sub : '');
  // Fresh club data must not wipe a form someone is filling in
  if (quiet && page === currentPage && view.querySelector('form')) return refreshSuggestions();
  if (page !== currentPage) {
    posted = false; sameDay = null; clearPicked(); ADDED = []; sharePick = null;
    if (page !== 'committee/edit') editing = null;
    if (page !== 'committee/manage') manageNote = '';
    if (page !== 'committee/messages') MSG.note = '';
    if (page !== 'committee/payments') ADMIN.payNote = '';
    if (page !== 'committee/members') ADMIN.mem.note = '';
    if (page !== 'committee/person') personEdit = null;
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

function showCommitteeTab() {
  document.getElementById('committeeTab').hidden = !session;
  document.querySelector('.tabbar').classList.toggle('six', !!session);
  committeeBtn.setAttribute('aria-label', session ? 'Club team' : 'Club team sign-in');
}

function signOut() {
  session = null; sessionStore.set(null);
  MEMBERS = null; membersFailed = false;
  MANAGE = null; PRIVATE = null; editing = null; manageState = ''; manageNote = ''; sharePick = null; ADDED = [];
  Object.assign(MSG, { view: 'inbox', query: '', items: null, more: false, page: 0, state: '', note: '', at: 0, run: MSG.run + 1 });
  msgOpen = null; msgOpenState = ''; msgUnread = null; unreadAt = 0; SAVED = null;
  ADMIN = blankAdmin(); personEdit = null;
  const rp = document.getElementById('replyForm');
  if (rp) rp.remove();
  const rs = document.getElementById('resultsForm');
  if (rs) rs.remove(); // nothing left to ask about
  clearPicked();
  showCommitteeTab();
  if (location.hash.indexOf('#/committee') === 0) location.hash = '#/home'; else render(true);
}

/* Sheets (simple dialogs) */
const sheet = document.getElementById('sheet'), leaveSheet = document.getElementById('leaveSheet');
const confirmSheet = document.getElementById('confirmSheet'), shareSheet = document.getElementById('shareSheet');
const SHEETS = [sheet, leaveSheet, confirmSheet, shareSheet];
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
  endShare();
  SHEETS.forEach(el => { el.hidden = true; });
  if (sheetOpener && document.contains(sheetOpener)) sheetOpener.focus();
  sheetOpener = null;
}
function openSignIn(note) {
  leaveSheet.hidden = true; confirmSheet.hidden = true; shareSheet.hidden = true; endShare();
  pinBox.value = ''; signInError.hidden = true;
  signInNote.textContent = note || ''; signInNote.hidden = !note;
  openSheet(sheet, pinBox);
}

committeeBtn.addEventListener('click', () => { if (session) location.hash = '#/committee'; else openSignIn(); });
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
let SHARE = null, shareRun = 0; // {files: [File], urls: [for the previews]} while the share sheet is open

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

/* o: {text, photos: [{row, fp}] to fetch from the club Drive, or blobs: [Blob] already here, note} */
async function openShare(o) {
  endShare();
  const run = shareRun, count = (o.photos || o.blobs || []).length, word = count === 1 ? 'photo' : 'photos';
  SHARE = { files: [], urls: [] };
  shareText.value = o.text;
  shareError.hidden = true; sharePics.hidden = !count;
  shareGo.hidden = true; shareSave.hidden = true;
  shareCopy.className = 'btn btn-big ' + (count ? 'btn-outline' : 'btn-primary');
  shareStatus.textContent = count ? `Getting the ${word} ready…` : '';
  openSheet(shareSheet, shareCopy);
  shareSheet.querySelector('.sheet-panel').scrollTop = 0;
  const addFile = (blob, mime) => {
    const ext = /png/.test(mime) ? 'png' : /webp/.test(mime) ? 'webp' : 'jpg';
    const file = new File([blob], `rdss-photo-${SHARE.files.length + 1}.${ext}`, { type: mime || 'image/jpeg' });
    const url = URL.createObjectURL(file);
    SHARE.files.push(file); SHARE.urls.push(url);
    sharePics.insertAdjacentHTML('beforeend', `<img src="${url}" alt="Photo ${SHARE.files.length} to share">`);
  };

  if (!count) { // events and results: the caption is the whole job
    shareStatus.textContent = await copyCaption() ? 'The caption is copied. Paste it into a new post on Facebook or Instagram.' : 'Tap Copy caption, then paste it into a new post on Facebook or Instagram.';
    return;
  }
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
  // Phones and tablets hand the photos to the share sheet; laptops save them
  const phone = matchMedia('(pointer: coarse)').matches && !!navigator.canShare && navigator.canShare({ files: SHARE.files });
  shareGo.hidden = !phone; shareSave.hidden = phone;
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
    shareSave.hidden = false;
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
  shareStatus.textContent = `${n === 1 ? 'The photo is' : 'The ' + n + ' photos are'} saved where this device keeps downloads. Now tap Copy caption.`;
});

/* The Share button on an event or a result in Manage posts */
function sharePost(what) {
  const [kind, i] = what.split(':');
  const item = (kind === 'event' ? manageEvents() : MANAGE.results)[Number(i)];
  if (!item) return;
  if (kind === 'event' && item.audience !== 'Everyone') return; // private and hidden events are never shared
  openShare({ text: kind === 'event' ? eventCaption(item) : resultsCaption(item.date) });
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
