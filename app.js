/* On Target v2.7.0 — app shell with live club data and club team tools
   Events, results and photos come from the club's public feed (the same one
   the website uses). Each list is saved on the phone, so it opens instantly
   and still works with no signal, then refreshes in the background. */
'use strict';

const APP_VERSION = '2.9.0';
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
  results: 'feed=results&all=1&n=300',
  photos:  'feed=photos&n=60',
  range:   'feed=range'
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
  calc: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/></svg>',
  ext: '<svg class="chev ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16L17 7M9 7h8v8"/></svg>',
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
  alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5"/><path d="M12 18h.01"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v16h16"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
  signout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4"/><path d="M6 12h10"/></svg>',
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
  const iso = i => isoOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
  if (close[day] && !closedOn(iso(0)) && mins >= 8 * 60 + 30 && mins < close[day]) return { open: true, text: 'Range open now' };
  if (close[day] && !closedOn(iso(0)) && mins < 8 * 60 + 30) return { open: false, text: 'Range opens today 8:30am' };
  for (let i = 1; i <= 21; i++) { // closed days are skipped (v2.7.0)
    const d = (day + i) % 7;
    if (close[d] && !closedOn(iso(i))) return { open: false, text: `Next range day ${i === 1 ? 'tomorrow' : i < 7 ? DAYS_LONG[d] : shortDate(iso(i))} 8:30am` };
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

/* ----- Results: By date | By type | All (v2.5.0) -----
 * The choice of view (and the type last picked) is remembered on the phone; the day being looked at is not. */
const RES_MODES = [['date', 'By date'], ['type', 'By type'], ['all', 'All']];
const RES = (() => {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('ot:resultsView')); } catch (e) { /* storage blocked */ }
  saved = saved || {};
  return { mode: RES_MODES.some(m => m[0] === saved.mode) ? saved.mode : 'date', type: saved.type || '', day: '', picking: false };
})();
/* Re-draws Results for a new view or day: the cards start as that view opens them, not as the last one left them */
function resRender() { view.querySelectorAll('details.comp').forEach(d => d.remove()); render(true); }
function saveResView() { try { localStorage.setItem('ot:resultsView', JSON.stringify({ mode: RES.mode, type: RES.type })); } catch (e) { /* storage blocked */ } }
const compWord = n => n + (n === 1 ? ' competition' : ' competitions');
/* A competition's types: its discipline (Pistol, Rifle or Clay) and, when it is one, Black powder as well.
   An older row whose discipline was typed as "Black Powder" counts as black powder. Anything else shows under Other. */
const DISCIPLINES = ['Pistol', 'Rifle', 'Clay'];
const mainDiscipline = c => DISCIPLINES.find(d => d.toLowerCase() === String(c.discipline || '').trim().toLowerCase()) || '';
const isBlackPowder = c => !!c.blackPowder || /^black\s*powder$/i.test(String(c.discipline || '').trim());
const compTypes = c => { const t = [mainDiscipline(c), isBlackPowder(c) && 'Black powder'].filter(Boolean); return t.length ? t : ['Other']; };
const compKind = c => joinDot(c.discipline, isBlackPowder(c) && mainDiscipline(c) && 'Black powder'); // "Rifle · Black powder"
const RES_TYPE_ORDER = ['Pistol', 'Rifle', 'Clay', 'Black powder'];
function resultTypes() {
  const n = {};
  days().forEach(d => d.competitions.forEach(c => compTypes(c).forEach(t => { n[t] = (n[t] || 0) + 1; })));
  const rank = t => { const i = RES_TYPE_ORDER.indexOf(t); return i < 0 ? 99 : i; };
  return Object.keys(n).sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1)).map(t => ({ type: t, count: n[t] }));
}
function compCard(c, open) {
  return `
    <details class="card comp"${open ? ' open' : ''}>
      <summary>
        <span class="list-ico">${ICON.trophy}</span>
        <span class="list-main"><span class="list-title">${esc(c.competition)}</span>
          <span class="muted">${joinDot(compKind(c), c.rows[0] && '1st ' + c.rows[0].shooter)}</span></span>
        ${ICON.chev}
      </summary>
      <table class="result-table">
        <thead><tr><th scope="col">Place</th><th scope="col">Shooter</th><th scope="col">Class</th><th scope="col" class="num">Score</th></tr></thead>
        <tbody>${c.rows.map(r => `<tr><td>${placeLabel(r.place)}</td><td>${esc(r.shooter)}</td><td>${esc(r['class'])}</td><td class="num">${esc(r.score)}</td></tr>`).join('')}</tbody>
      </table>
    </details>`;
}
/* All: every competition day, newest first, the latest day opened (as the Results screen always was). */
function resultsAll() {
  return days().map((d, di) => `
    <section class="section">
      <h2 class="day-head">${longDate(d.date)}</h2>
      ${d.competitions.map(c => compCard(c, di === 0)).join('')}
    </section>`).join('');
}
/* By date: one competition day at a time. ‹ is the day before, › the day after; the date box opens the list of days. */
function resultsByDate() {
  const list = days();
  let i = list.findIndex(d => d.date === RES.day);
  if (i < 0) { i = 0; RES.day = list[0].date; }
  const d = list[i], older = list[i + 1], newer = list[i - 1];
  const arrow = (to, dir, label) => `<button type="button" class="icon-btn rv-arrow" data-rv-dir="${label.charAt(0)}" data-rv-day="${to ? to.date : ''}"${to ? '' : ' disabled'} aria-label="${to ? label + ': ' + longDate(to.date) : 'No ' + label.toLowerCase()}">${dir}</button>`;
  const bar = `<div class="rv-datebar">
      ${arrow(older, '&lsaquo;', 'Previous competition day')}
      <button type="button" class="rv-datebox" data-rv-pick aria-expanded="${RES.picking}">
        <span><span class="rv-date">${longDate(d.date)}</span><span class="muted">${compWord(d.competitions.length)}</span></span>${ICON.chev}
      </button>
      ${arrow(newer, '&rsaquo;', 'Next competition day')}
    </div>`;
  if (RES.picking) {
    const years = [];
    list.forEach(x => { const y = x.date.slice(0, 4); let g = years.find(v => v.y === y); if (!g) { g = { y, days: [] }; years.push(g); } g.days.push(x); });
    return `<section class="section">${bar}</section>
      <section class="section rv-picker" aria-label="Choose a competition day">${years.map(g => `
        <h2 class="day-head">${g.y}</h2>
        <div class="card list">${g.days.map(x => `
          <button type="button" class="list-row link-row rv-pick-row" data-rv-day="${x.date}" aria-current="${x.date === d.date}">
            <span class="list-main"><span class="list-title">${longDate(x.date)}</span><span class="muted">${compWord(x.competitions.length)}</span></span>
            ${x.date === d.date ? '<span class="chip">Showing</span>' : ICON.chev}
          </button>`).join('')}</div>`).join('')}
      </section>`;
  }
  return `<section class="section">${bar}</section>
    <section class="section">${d.competitions.map(c => compCard(c, true)).join('')}</section>`;
}
/* By type: chips for each type, then that type's competitions, newest first, under date headings. */
function resultsByType() {
  const types = resultTypes();
  if (!types.some(t => t.type === RES.type)) RES.type = types[0].type;
  const shown = days().map(d => ({ date: d.date, comps: d.competitions.filter(c => compTypes(c).includes(RES.type)) })).filter(d => d.comps.length);
  const n = shown.reduce((a, d) => a + d.comps.length, 0);
  return `<section class="section"><div class="chips" role="group" aria-label="Type of competition">${types.map(t => `
      <button type="button" class="chip-btn" data-rv-type="${esc(t.type)}" aria-pressed="${t.type === RES.type}">${esc(t.type)}</button>`).join('')}</div>
      <p class="muted rv-count">${n} ${esc(RES.type.toLowerCase())} ${n === 1 ? 'competition' : 'competitions'}</p></section>
    ${shown.map(d => `
      <section class="section">
        <h2 class="day-head">${longDate(d.date)}</h2>
        ${d.comps.map(c => compCard(c, false)).join('')}
      </section>`).join('')}`;
}
const photos = () => (DATA.photos && DATA.photos.photos) || [];

/* ----- Range status (v2.7.0): closures come with the public feed (?feed=range), so everyone sees them, signed in or not ----- */
const FIRE_URL = 'https://www.fire.qld.gov.au/prepare/bushfire/fire-danger-ratings'; // Queensland Fire Department, Monitor Fire Danger Ratings
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isoAdd = (iso, n) => { const d = parseDate(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const closures = () => ((DATA.range && DATA.range.closed) || []).filter(c => c.until >= isoOf(new Date()));
const closedOn = iso => closures().find(c => c.from <= iso && iso <= c.until) || null;
const closureDays = c => c.from === c.until ? shortDate(c.from) : `${shortDate(c.from)} – ${shortDate(c.until)}`;
/* The red banner: "Range closed today · Fire danger", the note, and for fire danger the official ratings link */
function rangeBanner(c) {
  const today = isoOf(new Date());
  const when = c.from <= today ? (c.until > today ? `until ${shortDate(c.until)}` : 'today') : closureDays(c);
  return `<div class="range-banner" role="status">${ICON.alert}<div class="range-banner-text"><b>Range closed ${esc(when)} · ${esc(c.reason)}</b>
    ${c.note ? `<span>${esc(c.note)}</span>` : ''}${c.fire ? `<a href="${FIRE_URL}" target="_blank" rel="noopener">Check fire danger ratings<span class="sr-only"> (opens the Queensland Fire Department website)</span> ↗</a>` : ''}</div></div>`;
}
/* Home and the Club tab: a banner for each closure that has started or starts within 7 days; nothing on normal days */
function rangeBanners() {
  const soon = isoAdd(isoOf(new Date()), 7), list = closures().filter(c => c.from <= soon);
  return list.length ? `<section class="section range-banners">${list.map(rangeBanner).join('')}</section>` : '';
}

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
/* ---------- Signpost screens (v2.6.0): Home, Me and Club admin ----------
   Round shortcuts for the most-used tasks, then plain lists of rows under small capital headings. */
const extHref = href => href.charAt(0) !== '#';
const spShortcut = (icon, label, href) => `<a class="sc" href="${esc(href)}"${extHref(href) ? ' target="_blank" rel="noopener"' : ''}><span class="sc-ico">${icon}</span><span class="sc-label">${label}</span></a>`;
/* A row: icon, label, optional grey second line, › (or ↗ for the club website). `end` is anything to show before the arrow. */
const spRow = (icon, label, href, sub, end) => `<a class="menu-row" href="${esc(href)}"${extHref(href) ? ' target="_blank" rel="noopener"' : ''}><span class="tile-ico">${icon}</span>
  <span class="row-text">${esc(label)}${sub ? `<span class="muted">${sub}</span>` : ''}</span>${end || ''}${href === SITE_URL ? '<span class="sr-only"> (opens the website)</span>' + ICON.ext : ICON.chev}</a>`;
const spGroup = (title, rows) => rows ? `<section class="section sp-group"><h2 class="sp-head">${title}</h2><div class="sp-list">${rows}</div></section>` : '';

/* Members due to renew see Renew among the Home shortcuts; financial members can book a bench */
const RENEW_DUE = ['notRenewed', 'overdue', 'expired'];
const BOOK_OK = ['current', 'notRenewed']; // financial members: the ones who can book a bench
const VIEWS = {
  home() {
    const next = events().find(e => !closedOn(e.date)), mine = homeMember(), rs = rangeStatus();
    // Next at the range: one compact box. Members who can book get Book a bench, everyone else Add to calendar.
    const action = mine && BOOK_OK.includes(mine.status) ? `<a class="pill-btn" href="#/me/book">Book a bench</a>`
      : `<button type="button" class="pill-btn" data-cal="0">Add to calendar</button>`;
    const nextBox = DATA.events ? (next ? `
        <div class="sp-next">${dateBlock(next.date)}
          <div class="sp-next-main"><div class="sp-next-title">${esc(next.title)}</div>
            <div class="muted">${joinDot(rs.open ? 'Range open now' : whenLabel(daysUntil(next.date)), timeRange(next))}</div>
            ${action}</div>
        </div>` : `<div class="sp-next"><p class="muted">No events posted yet. Check back soon.</p></div>`)
      : `<div class="sp-next">${FAILED.events ? `<p class="muted">Can't load events right now.</p>` : `<span class="skel skel-line"></span>`}</div>`;
    const sc = mine
      ? spShortcut(ICON.card, 'My card', '#/me')
        + (BOOK_OK.includes(mine.status) ? spShortcut(ICON.bench, 'Book a bench', '#/me/book') : spShortcut(ICON.doc, 'Documents', '#/me/documents'))
        + spShortcut(ICON.chart, 'My shooting', '#/me/results')
        + (RENEW_DUE.includes(mine.status) ? spShortcut(ICON.refresh, 'Renew', mine.renew || '#/me') : BOOK_OK.includes(mine.status) ? spShortcut(ICON.doc, 'Documents', '#/me/documents') : spShortcut(ICON.help, 'FAQs', FAQ_URL))
      : spShortcut(ICON.join, 'Join', JOIN_URL) + spShortcut(ICON.pin, 'Visit us', VISIT_URL) + spShortcut(ICON.fees, 'Fees', JOIN_URL) + spShortcut(ICON.help, 'FAQs', FAQ_URL);
    // Coming up: the next two competitions (room is left on the right of each row for "I'm in" later)
    const comps = events().filter(e => e !== next && isCompetition(e)).slice(0, 2);
    const latest = days()[0], pic = photos()[0];
    const placed = latest && mine && ME && ME.linked && !viewingOther()
      ? (ME.results || []).filter(r => r.date === latest.date && Number(r.place) >= 1 && Number(r.place) <= 3).sort((a, b) => Number(a.place) - Number(b.place))[0] : null;
    const resultsRow = latest ? spRow(ICON.trophy, 'Results: ' + longDate(latest.date).replace(/ \d{4}$/, ''), '#/results',
        joinDot(compWord(latest.competitions.length), placed && `you were ${placeLabel(placed.place)} in ${placed.competition}`))
      : DATA.results || FAILED.results ? '' : skeletonRows(1);
    const albumCount = pic ? photos().filter(p => p.album === pic.album && p.date === pic.date).length : 0;
    const photosRow = pic ? spRow(ICON.camera, 'Photos: ' + pic.album, '#/photos', joinDot(shortDate(pic.date), albumCount + (albumCount === 1 ? ' photo' : ' photos')))
      : DATA.photos || FAILED.photos ? '' : skeletonRows(1);
    return `
      ${rangeBanners()}
      <div class="page-title"><h1>${mine ? `G'day ${esc(mine.first)}` : 'Welcome to the club'}</h1></div>
      <section class="section" aria-label="Next at the range">${nextBox}</section>
      <nav class="shortcuts" aria-label="Shortcuts">${sc}</nav>
      ${comps.length ? spGroup('Coming up', comps.map(e => spRow(ICON.calendar, e.title, '#/events', joinDot(shortDate(e.date), closedOn(e.date) ? 'Range closed' : timeRange(e)))).join('')) : ''}
      ${spGroup('Latest', resultsRow + photosRow + (mine ? spRow(ICON.help, 'FAQs', FAQ_URL) : ''))}`;
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
                <div class="list-title">${esc(ev.title)}${ev.audience ? ' ' + badge(ev.audience) : ''}${closedOn(ev.date) ? ' <span class="badge badge-closed">Range closed</span>' : ''}</div>
                <div class="muted">${joinDot(DAYS[parseDate(ev.date).getDay()], timeRange(ev), ev.discipline)}</div>
                ${ev.description ? `<div class="muted desc">${esc(ev.description)}</div>` : ''}
              </div>
              <button type="button" class="icon-btn soft" data-cal="${i}" aria-label="Add ${esc(ev.title)} to calendar">${ICON.calendar}</button>
            </div>`).join('')}
        </div>` : empty('No upcoming events', 'New events appear here as soon as the club team posts them.'))}
      </section>`;
  },

  results() {
    const mode = RES.mode, list = days();
    const seg = `<div class="seg rv-seg" role="group" aria-label="How to show the results">${RES_MODES.map(m => `
      <button type="button" data-rv-mode="${m[0]}" aria-pressed="${mode === m[0]}">${m[1]}</button>`).join('')}</div>`;
    return `
      <div class="page-title"><h1>Results</h1></div>
      <section class="section">${seg}</section>
      ${state('results', 4, () => !list.length ? `<section class="section">${empty('No results yet', 'Results appear here after each competition day.')}</section>`
        : mode === 'type' ? resultsByType() : mode === 'all' ? resultsAll() : resultsByDate())}`;
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
      <div class="page-title"><a class="back-link" href="#/club">${ICON.chev}Club</a><h1>Photos</h1><p class="muted">From the range</p></div>
      ${state('photos', 3, () => groups.length ? groups.map(g => `
        <section class="section">
          <div class="section-head"><h2>${esc(g.album)}</h2><span class="muted">${shortDate(g.date)}</span></div>
          <div class="photo-grid">${g.items.map(x => thumb(x.p, x.i)).join('')}</div>
        </section>`).join('') : `<section class="section">${empty('No photos yet', 'Photos from the range appear here.')}</section>`)}`;
  },

  more() { location.replace('#/me'); return ''; },

  me(sub) { return meView(sub); },
  calculator() { return calculatorView(); },
  club() { return clubView(); },
  admin(sub) { return adminView(sub); },

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
    if (sub === 'rangestatus') return rangeStatusView();
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
    if (['payments', 'members', 'people', 'person', 'signups', 'member', 'import', 'oldresults'].includes(sub)) {
      if (!session.admin) return `<div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Admin</h1></div>
        <section class="section">${empty('Admins only', 'Only admins can use this part of On Target.')}</section>`;
      if (sub === 'person' && !personEdit) { location.replace('#/committee/people'); return ''; } // e.g. the page was reloaded
      if (sub === 'member') return memberAdminView(arg);
      if (sub === 'import') return importView();
      if (sub === 'oldresults') return oldResultsView();
      return sub === 'signups' ? signupsView() : sub === 'payments' ? paymentsView() : sub === 'members' ? membersView() : sub === 'people' ? peopleView() : personForm(personEdit);
    }
    location.replace('#/admin'); return ''; // the club team's home is the Club admin screen
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
      : `${postBack}<h1>Post an event</h1>`}</div>
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
            <span class="muted">${joinDot(g.date && shortDate(g.date) + ' ' + parseDate(g.date).getFullYear(), compKind(g), g.rows.length + (g.rows.length === 1 ? ' shooter' : ' shooters'))}</span></span>${ICON.chev}</button>
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
    <div class="page-title">${adminBack}<h1>Manage posts</h1></div>
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
    const sum = { season: d.season || '', notRenewed: Number(d.notRenewed) || 0, overdue: Number(d.overdue) || 0, pending: Number(d.pending) || 0, claimFlags: Number(d.claimFlags) || 0 };
    const same = JSON.stringify(sum) === JSON.stringify(ADMIN.summary);
    ADMIN.summary = sum; ADMIN.mem.season = sum.season || '';
    if (!same && ON_ME()) render(true);
  } catch (e) { /* the counts are only a guide */ }
}
const ON_ME = () => currentPage === 'me' || currentPage === 'admin'; // the two screens that show the club team's counts
/* Posting an event, results or photos starts from Club admin, Post something new */
const postBack = `<a class="back-link" href="#/admin/post">${ICON.chev}Post something new</a>`;
const adminBack = `<a class="back-link" href="#/admin">${ICON.chev}Club admin</a>`;
const loadFailed = (what, attr) => `<div class="card empty"><div class="empty-title">Can't load ${what}</div>
  <p class="muted">Check your signal and try again.</p><button type="button" class="btn btn-outline" ${attr}>${ICON.refresh}Try again</button></div>`;
const niceDate = iso => { if (!/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return ''; const d = parseDate(String(iso).slice(0, 10)); return `${d.getDate()} ${mon(d)} ${d.getFullYear()}`; };
/* 30 June that a payment confirmed today runs to (payments from 1 April count towards the next year, as on the server) */
const paidToYear = () => { const d = new Date(); return d.getFullYear() + (d.getMonth() >= 3 ? 1 : 0); };

/* A family sharing one email: one sign-in email links to one membership, so admins are told (v2.3.1) */
const sharesNote = name => `Shares an email with ${name} – will need their own email for the app, or be added to ${name}'s family.`;

/* ----- payments to confirm ----- */
async function loadPending() {
  if (ADMIN.pendingState === 'loading') return;
  ADMIN.pendingState = 'loading';
  try {
    // Who shares an email with a member already using it to sign in: a note only, so the payments still show if it can't be fetched
    const [list, shares] = await Promise.all([committeeApi('adminPending'), committeeApi('pendingShares').catch(e => { if (e.signedOut) throw e; return {}; })]);
    ADMIN.pending = (Array.isArray(list) ? list : []).map(a => ({ ...a, shares: (shares && shares[a.id]) || '' })); ADMIN.pendingState = '';
  }
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
      ${a.shares ? `<p class="notice share-note">${esc(sharesNote(a.shares))}</p>` : ''}
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
const MEM_FILTERS = [['all', 'All'], ['family', 'Families'], ['current', 'Current'], ['waiting', 'Waiting for payment'], ['notRenewed', 'Not renewed yet'], ['overdue', 'Not financial – renewal overdue'], ['expired', 'Expired']];
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
    <div class="page-title">${adminBack}<h1>All members &amp; status</h1><p class="muted">Tap a member to see or change their family.</p></div>
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
    const fam = m.family ? `<span class="mbadge mbadge-fam">${m.family.primary ? 'Family · pays' : m.family.junior ? 'Family · junior' : 'Family'}</span>` : m.familyToSetUp ? '<span class="mbadge mbadge-amber">Family to set up</span>' : '';
    return `<${m.id ? `a href="#/committee/member/${encodeURIComponent(m.id)}"` : 'div'} class="mem-row mem-link${m.financial ? '' : ' not-financial'}">
      <div class="list-main"><div class="list-title">${esc(m.name || m.email || 'No name')}</div>
        <div class="muted">${joinDot(m.type, m.expiry ? (m.financial ? 'Expires ' : 'Expired ') + niceDate(m.expiry) : 'No expiry date')}</div>
        ${m.shares ? `<div class="muted share-line">${esc(sharesNote(m.shares))}</div>` : ''}</div>
      <div class="mem-badges"><span class="mbadge mbadge-${b[0]}">${b[1]}</span>${m.waiting && m.status !== 'waiting' ? '<span class="mbadge mbadge-grey">Payment waiting</span>' : ''}${fam}</div>
    </${m.id ? 'a' : 'div'}>`;
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
    if (ON_ME()) render(true);
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
    <div class="page-title">${adminBack}<h1>Messages</h1></div>
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
let MEMBERS = null;          // [{id, name, short, first, last, known, ssaa}] from the server; kept in memory only, never saved on the phone
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
/* The shooter picker (v2.9.0): members whose first name, Known as or surname starts with each word typed, or whose SSAA number has
   the digits typed. Only the club team ever sees this list. Exact first names and nicknames come first. */
function memberMatches(text) {
  const words = String(text || '').toLowerCase().replace(/["“”(),.]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length || !MEMBERS) return [];
  const parts = v => String(v || '').toLowerCase().split(/[\s'-]+/).filter(Boolean), num = v => String(v || '').replace(/\D/g, '').replace(/^0+/, '');
  return MEMBERS.map(m => {
    const names = [...parts(m.first), ...parts(m.known), ...parts(m.last)], ssaa = num(m.ssaa);
    const ok = words.every(w => names.some(n => n.startsWith(w)) || (/^\d+$/.test(w) && num(w) && ssaa.includes(num(w))));
    const exact = [m.first, m.known].some(n => String(n || '').toLowerCase() === words[0]);
    return ok ? { m, rank: exact ? 0 : 1 } : null;
  }).filter(Boolean).sort((a, b) => a.rank - b.rank || a.m.name.localeCompare(b.m.name)).slice(0, 6).map(x => x.m);
}
/* "Gordon Gentle ("Gordo") · SSAA 000002", so two Gordons can be told apart */
const memberLabel = m => `<b>${esc(m.name)}</b>${m.known ? ` ("${esc(m.known)}")` : ''}${m.ssaa ? ` · SSAA ${esc(m.ssaa)}` : ''}`;

/* Suggestion lists (by datalist id). Kept up to date when fresh club data arrives while a form is open. */
const SUGGEST = {
  rsCompList: () => options(uniq(pastComps().map(c => c.competition))),
  rsClassList: () => options(uniq(pastComps().flatMap(c => c.rows.map(r => r['class'])))),
  phAlbumList: () => options(uniq(['Around the range', ...photos().map(p => p.album)]))
};
function refreshSuggestions() {
  Object.keys(SUGGEST).forEach(id => { const list = document.getElementById(id); if (list) list.innerHTML = SUGGEST[id](); });
}

/* `r` is an existing result row when editing; its member link is kept for as long as the name is not changed */
let rowCount = 0;
function shooterRow(r) {
  r = r || {};
  const n = ++rowCount;
  return `<div class="rs-row" role="group"${r.memberId ? ` data-member-id="${esc(r.memberId)}" data-linked="${esc(r.shooter)}"` : ''}>
    <label class="field-label rs-shooter"><span class="chip rs-place"></span> Shooter
      <input class="field" data-f="shooter" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="rsPick${n}" maxlength="60" autocomplete="off" autocapitalize="words" value="${esc(r.shooter || '')}"></label>
    <button type="button" class="icon-btn soft rs-remove" data-remove>${ICON.close}</button>
    <div class="rs-pick" id="rsPick${n}" role="listbox" aria-label="Members" hidden></div>
    <p class="rs-member" hidden></p>
    <label class="rs-visitor"><input type="checkbox" data-visitor${r.visitor ? ' checked' : ''}> Visitor <span class="muted">(not a member)</span></label>
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
      : `${postBack}<h1>Post results</h1>`}</div>
    <section class="section"><form class="card form" id="resultsForm" novalidate${item ? ' data-mode="edit"' : ''}>
      <label class="field-label" for="rsDate">Competition day</label>
      ${dateField('rsDate', start.date)}
      <fieldset class="choices choices-row" id="rsDisc">
        <legend class="field-label">Discipline</legend>
        ${DISCIPLINES.map(d => `<label class="choice"><input type="radio" name="rsDisc" value="${d}"${d === mainDiscipline(start) ? ' checked' : ''}><span class="choice-title">${d}</span></label>`).join('')}
      </fieldset>
      <label class="choice"><input type="checkbox" id="rsBP"${item && isBlackPowder(item) ? ' checked' : ''}>
        <span><span class="choice-title">Black powder</span><span class="choice-text">Tick for a black powder competition. It shows under its discipline and under Black powder.</span></span></label>
      <label class="field-label" for="rsComp">Competition name</label>
      <input class="field" id="rsComp" maxlength="80" list="rsCompList" autocomplete="off" value="${esc(start.competition || '')}" required>
      <datalist id="rsCompList">${SUGGEST.rsCompList()}</datalist>
      <datalist id="rsClassList">${SUGGEST.rsClassList()}</datalist>

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
  return 'Start typing a first name, nickname, surname or SSAA number, then pick the member from the list. For someone who isn\'t a member, tick Visitor.';
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
    const name = rowValue(row, 'shooter'), m = linkFor(row), note = row.querySelector('.rs-member'), visitor = row.querySelector('[data-visitor]').checked;
    row.querySelector('[data-remove]').setAttribute('aria-label', name ? 'Remove ' + name : 'Remove this empty row');
    // Not linked and not a visitor: said once they have moved on from the box (or tried to post)
    const loose = name && !m && !visitor && (form.dataset.tried || document.activeElement !== row.querySelector('[data-f="shooter"]'));
    note.hidden = !m && !loose;
    note.classList.toggle('rs-warn', !!loose);
    note.innerHTML = m ? `${ICON.check}<span>Member${m.full ? ` · ${memberLabel(m.full)}` : ''}${m.kept ? '' : ` · shows as ${esc(m.short)} on the results`}</span>`
      : loose ? `${ICON.alert}<span>Not linked to a member: pick from the list, or tick Visitor</span>` : '';
  });
  const count = rows.filter(row => !rowEmpty(row)).length, verb = form.dataset.mode === 'edit' ? 'Save' : 'Post';
  const btn = form.querySelector('#rsSubmit');
  if (!btn.disabled) btn.textContent = form.dataset.anyway ? `${verb} anyway` : count ? `${verb} ${count} result${count === 1 ? '' : 's'}` : `${verb} results`;
}
const looseRows = form => [...form.querySelectorAll('.rs-row')].filter(row => !rowEmpty(row) && !linkFor(row) && !row.querySelector('[data-visitor]').checked);

/* The picker under a shooter box: up to 6 members matching what is typed */
function showPicks(input) {
  const row = input.closest('.rs-row'), box = row.querySelector('.rs-pick'), text = input.value.trim();
  const list = row.querySelector('[data-visitor]').checked || linkFor(row) ? [] : memberMatches(text);
  box.innerHTML = list.map((m, i) => `<button type="button" class="rs-option" role="option" id="${box.id}o${i}" aria-selected="false" data-member-pick="${esc(m.id)}">${memberLabel(m)}</button>`).join('')
    + (text && !list.length && MEMBERS && !linkFor(row) && !row.querySelector('[data-visitor]').checked ? '<p class="muted rs-none">No member found. Tick Visitor if they aren\'t a member.</p>' : '');
  box.hidden = !box.innerHTML;
  input.setAttribute('aria-expanded', String(!!list.length));
  input.removeAttribute('aria-activedescendant');
}
function hidePicks(row) {
  const box = row.querySelector('.rs-pick'), input = row.querySelector('[data-f="shooter"]');
  box.hidden = true; box.innerHTML = '';
  input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
}
function pickMember(row, id) {
  const m = (MEMBERS || []).find(x => x.id === id), input = row.querySelector('[data-f="shooter"]');
  if (!m) return;
  input.value = m.name;
  row.dataset.memberId = m.id; row.dataset.linked = m.name;
  row.querySelector('[data-visitor]').checked = false;
  hidePicks(row);
  tidyRows(row.closest('form'));
}

/* The member a row is linked to: one picked from the list (while the name is unchanged), the link an existing result already had,
   or a full name typed that belongs to exactly one member. A visitor is never linked. */
function linkFor(row) {
  if (row.querySelector('[data-visitor]').checked) return null;
  const name = rowValue(row, 'shooter');
  if (row.dataset.memberId && name === row.dataset.linked) {
    const full = (MEMBERS || []).find(x => x.id === row.dataset.memberId);
    // Picked just now: saved under its public name. Already saved: kept as it was.
    return full && full.name === name ? { id: full.id, short: full.short, full } : { id: row.dataset.memberId, short: name, full, kept: true };
  }
  const m = memberFor(name);
  return m ? { id: m.id, short: m.short, full: m } : null;
}

const rsDiscipline = form => (form.querySelector('input[name="rsDisc"]:checked') || {}).value || '';
/* Everything typed in the results form, to tell whether it has changed since it was opened */
function resultsSnapshot(form) {
  return JSON.stringify([form.querySelector('#rsDate').value, rsDiscipline(form), form.querySelector('#rsBP').checked, form.querySelector('#rsComp').value.trim(),
    [...form.querySelectorAll('.rs-row')].filter(row => [...row.querySelectorAll('input:not([type="checkbox"])')].some(i => i.value.trim()))
      .map(row => [...['shooter', 'class', 'score'].map(f => rowValue(row, f)), row.querySelector('[data-visitor]').checked, row.dataset.memberId || ''])]);
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
  const comp = { date: form.querySelector('#rsDate').value, discipline: rsDiscipline(form), blackPowder: form.querySelector('#rsBP').checked, competition: form.querySelector('#rsComp').value.trim() };
  const filled = [...form.querySelectorAll('.rs-row')].filter(row => !rowEmpty(row));
  if (!comp.date) return fail('Please choose the competition day.', form.querySelector('#rsDate'));
  if (!comp.discipline) return fail('Please choose the discipline: Pistol, Rifle or Clay.', form.querySelector('input[name="rsDisc"]'));
  if (!comp.competition) return fail('Please enter the competition name.', form.querySelector('#rsComp'));
  if (!filled.length) return fail('Please add at least one shooter.', form.querySelector('[data-f="shooter"]'));
  // Names not linked to a member and not ticked as a visitor: say so once, then they can be saved anyway
  const loose = looseRows(form), verb = form.dataset.mode === 'edit' ? 'Save' : 'Post';
  if (loose.length && !form.dataset.anyway) {
    form.dataset.tried = form.dataset.anyway = '1';
    tidyRows(form);
    return fail(`${loose.length === 1 ? '1 shooter is' : loose.length + ' shooters are'} not linked to a member: pick each one from the list, or tick Visitor. To ${verb.toLowerCase()} them as they are, tap "${verb} anyway".`, loose[0].querySelector('[data-f="shooter"]'));
  }
  comp.rows = filled.map((row, i) => {
    const m = linkFor(row);
    const r = { place: String(i + 1), shooter: m ? m.short : rowValue(row, 'shooter'), 'class': rowValue(row, 'class'), score: rowValue(row, 'score') };
    if (m) r.memberId = m.id;
    else if (row.querySelector('[data-visitor]').checked) r.visitor = true;
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
    <div class="page-title">${postBack}<h1>Add photos</h1></div>
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
  const page = (VIEWS[name] ? name : 'home') + (name === 'committee' && ['event', 'results', 'photos', 'manage', 'edit', 'messages', 'message', 'reply', 'payments', 'members', 'people', 'person', 'signups', 'emergency', 'documents', 'document', 'range', 'rangestatus', 'walkin', 'reserve', 'requests', 'member', 'import', 'oldresults'].includes(sub) ? '/' + sub : '')
    + (name === 'me' && ['results', 'details', 'email', 'documents', 'book', 'bookings', 'request', 'family'].includes(sub) ? '/' + sub : '')
    + (name === 'admin' && sub === 'post' ? '/post' : '');
  document.body.classList.toggle('signpost', ['home', 'me', 'club', 'admin'].includes(page)); // white, list-style screens (v2.6.0)
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
    if (page !== 'me/results') CLAIMS.note = '';
    if (page !== 'committee/oldresults') OLDRES = { data: null, state: '', note: '', filter: '', who: {} };
    benchLeave(page);
    familyLeave(page);
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
    if (a.dataset.tab === (page === 'me/documents' ? 'club' : { committee: 'me', more: 'me', calculator: 'club', photos: 'club', admin: 'me' }[page.split('/')[0]] || page.split('/')[0])) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
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
  if (t.closest('[data-rv-mode]')) { RES.mode = t.closest('[data-rv-mode]').dataset.rvMode; RES.picking = false; saveResView(); resRender(); view.querySelector(`[data-rv-mode="${RES.mode}"]`).focus(); }
  if (t.closest('[data-rv-type]')) { RES.type = t.closest('[data-rv-type]').dataset.rvType; saveResView(); resRender(); view.querySelector(`[data-rv-type="${CSS.escape(RES.type)}"]`).focus(); }
  if (t.closest('[data-rv-pick]')) { RES.picking = !RES.picking; resRender(); view.querySelector('[data-rv-pick]').focus(); }
  if (t.closest('[data-rv-day]')) {
    const b = t.closest('[data-rv-day]'), dir = b.dataset.rvDir;
    if (b.dataset.rvDay) {
      RES.day = b.dataset.rvDay; RES.picking = false; resRender();
      const again = dir && view.querySelector(`[data-rv-dir="${dir}"]:not([disabled])`); // keep stepping with the same arrow
      (again || view.querySelector('[data-rv-pick]')).focus();
    }
  }
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
  if (form && form.id === 'resultsForm') {
    delete form.dataset.anyway;
    if (e.target.dataset.f === 'shooter') showPicks(e.target);
    tidyRows(form);
  }
});
/* The shooter picker (v2.9.0): arrow keys move through the members, Enter picks, Escape closes */
view.addEventListener('keydown', e => {
  if (e.target.dataset.f !== 'shooter' || !e.target.closest('#resultsForm')) return;
  const row = e.target.closest('.rs-row'), opts = [...row.querySelectorAll('.rs-option')];
  const at = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && opts.length) {
    e.preventDefault();
    const next = e.key === 'ArrowDown' ? (at + 1) % opts.length : (at <= 0 ? opts.length : at) - 1;
    opts.forEach((o, i) => o.setAttribute('aria-selected', String(i === next)));
    e.target.setAttribute('aria-activedescendant', opts[next].id);
    opts[next].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && opts.length) {
    e.preventDefault(); // never posts the form from inside the picker
    pickMember(row, opts[Math.max(0, at)].dataset.memberPick);
  } else if (e.key === 'Escape' && !row.querySelector('.rs-pick').hidden) { e.preventDefault(); hidePicks(row); }
});
view.addEventListener('mousedown', e => { if (e.target.closest('.rs-option')) e.preventDefault(); }); // keep the box focused while picking
view.addEventListener('click', e => {
  const opt = e.target.closest('[data-member-pick]');
  if (opt) { const row = opt.closest('.rs-row'); pickMember(row, opt.dataset.memberPick); row.querySelector('[data-f="shooter"]').focus(); }
});
view.addEventListener('focusin', e => { if (e.target.dataset.f === 'shooter' && e.target.closest('#resultsForm') && e.target.value.trim()) showPicks(e.target); });
view.addEventListener('focusout', e => {
  if (e.target.dataset.f !== 'shooter' || !e.target.closest('#resultsForm')) return;
  const row = e.target.closest('.rs-row'), form = e.target.form;
  setTimeout(() => { if (!row.contains(document.activeElement)) hidePicks(row); if (form.isConnected) tidyRows(form); }, 120);
});
view.addEventListener('change', e => {
  if (!e.target.matches('[data-visitor]') || !e.target.closest('#resultsForm')) return;
  const row = e.target.closest('.rs-row'), form = e.target.form;
  if (e.target.checked) hidePicks(row);
  delete form.dataset.anyway; form.querySelector('#rsError').hidden = true;
  tidyRows(form);
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
  MEMBERS = null; membersFailed = false; BENCH = blankBench(); if (!member) VIEW_AS = '';
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
  if (/^#\/(committee|admin|me\/)/.test(location.hash)) location.hash = '#/me'; else render();
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
const mePill = (key, extra) => `<span class="me-pill me-pill-${ME_PILL[key][0]}">${ME_PILL[key][1]}${extra || ''}</span>`;
const initialsOf = name => { const w = String(name || '').trim().split(/\s+/).filter(Boolean); return ((w[0] || '').charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase(); };
const maskEmail = email => { const [a, b] = String(email).split('@'); return a.charAt(0) + '•••@' + (b || ''); };
/* Who is asking for their own membership: a member's sign-in token, or the PIN of a club team member
   (the server shows them the membership an admin has linked their PIN to in People and PINs). */
const selfAuth = () => member ? member.token : session ? 'pin:' + session.pin : '';
/* Families (v2.4.0): VIEW_AS is the family member being viewed ('' = yourself). The server checks it on every request. */
let VIEW_AS = '';
const meAuth = () => selfAuth() + (VIEW_AS && selfAuth() ? '|as:' + VIEW_AS : '');
const viewingOther = () => !!(ME && ME.viewing && !ME.viewing.self);
/* "Viewing: Sam" under a page heading, while looking at a family member */
const viewingLine = () => viewingOther() ? `<p class="viewing-line">Viewing: <b>${esc(ME.viewing.first)}</b>${ME.viewing.junior ? ' <span class="junior-tag">Junior</span>' : ''}</p>` : '';
function viewAs(key) {
  if (key === VIEW_AS) return;
  VIEW_AS = key; ME = null; meState = ''; meNote = ''; BENCH = Object.assign(blankBench(), { waiting: BENCH.waiting, countAt: BENCH.countAt });
  render(true);
}
async function memberApi(fn, args, asSelf) {
  const viaPin = !member;
  try {
    return await api(fn, undefined, [asSelf ? selfAuth() : meAuth()].concat(args || []));
  } catch (e) {
    // Taken out of the family, or hidden, while this phone was viewing them: back to yourself
    if (/no longer view that family member/i.test(e.message) && VIEW_AS) { e.signedOut = true; viewAs(''); if (location.hash !== '#/me') location.hash = '#/me'; throw e; }
    if (viaPin && e.badPin) {
      signOut();
      openSignIn('You have been signed out because your PIN is no longer recognised. It may have been changed. Please sign in with your new PIN.');
      e.signedOut = true;
    } else if (!viaPin && /signed out/i.test(e.message)) { e.signedOut = true; forgetMember(); }
    throw e;
  }
}
function forgetMember() {
  BENCH = blankBench(); VIEW_AS = '';
  member = null; memberStore.set(null); ME = null; meState = ''; meNote = ''; relinking = false; DOCS = null; docsState = '';
  if (location.hash.indexOf('#/me/') === 0) location.hash = '#/me'; else render();
}
/* One Sign out for everything: the member sign-in and the club team PIN */
function signOutAll() {
  if (member) {
    api('memberSignOut', undefined, [member.token]).catch(() => { /* the phone forgets the sign-in either way */ });
    member = null; memberStore.set(null); ME = null; meState = ''; meNote = ''; relinking = false; DOCS = null; docsState = ''; VIEW_AS = '';
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
    if (ME.familyReset || (VIEW_AS && !viewingOther())) VIEW_AS = ''; // they can no longer be viewed
    if (member && !viewingOther()) {
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

/* Me (v2.6.1): just personal. Signing in, the membership card and shortcuts, Renew, and the app itself (Club admin for the club team).
   The club's own links live on the Club tab. */
/* Everything waiting for the club team: new messages and booking requests, and for admins payments and app sign-ups too */
const adminWaiting = () => !session ? 0 : (msgUnread || 0) + (BENCH.waiting || 0) + (session.admin ? ((ADMIN.summary && ADMIN.summary.pending) || 0) + (ADMIN.signCount || 0) + ((ADMIN.summary && ADMIN.summary.claimFlags) || 0) : 0);
function loadAdminCounts() { if (session) { loadUnread(); loadBenchCount(); if (session.admin) loadAdminSummary(); } }
function meView(sub) {
  const signedIn = !!(member || session), linked = !!(signedIn && ME && ME.linked);
  if (sub === 'documents') return documentsView(); // open to everyone: the server sends only what each person may see
  if (sub && !linked) { if (!signedIn || (ME && !ME.linked)) { location.replace('#/me'); return ''; } }
  else if (sub === 'results') return meResults();
  else if (sub === 'details') return meDetails();
  else if (sub === 'email') return meEmail();
  else if (sub === 'book') return bookView();
  else if (sub === 'bookings') return bookingsView();
  else if (sub === 'request') return requestView();
  else if (sub === 'family') return familyView();
  loadAdminCounts();
  const first = (linked && ME.first) || (member && member.first) || (session && String(session.name || '').trim().split(/\s+/)[0]) || '';
  // Signed in with a PIN that no admin has linked to a membership yet
  const linkHint = session && !member && ME && !ME.linked ? `<p class="muted">Link your membership: ${session.admin
    ? 'choose yourself in <a href="#/committee/people">People and PINs</a>.' : 'ask an admin to link you in People and PINs.'}</p>` : '';
  const waiting = adminWaiting();
  const install = isInstalled() ? '' : `<button type="button" class="menu-row install-row" data-install><span class="tile-ico">${ICON.phone}</span><span class="row-text">Add On Target to your phone</span>${ICON.chev}</button>`;
  // APP (v2.6.1): the club team's way in is Club admin once signed in with a PIN, otherwise Club team sign-in
  const team = session
    ? `<a class="menu-row admin-row" href="#/admin"><span class="tile-ico">${ICON.key}</span><span class="row-text">Club admin<span class="muted">Messages, posts, range, members</span></span>
        ${waiting ? `<span class="btn-admin-badge" aria-label="${waiting} waiting">${waiting} new</span>` : ''}${ICON.chev}</a>`
    : `<button type="button" class="menu-row" data-signin><span class="tile-ico">${ICON.key}</span><span class="row-text">Club team sign-in<span class="muted">For our volunteers helping run the club</span></span>${ICON.chev}</button>`;
  const app = install + team + (signedIn ? `<button type="button" class="menu-row" data-signout-all><span class="tile-ico">${ICON.signout}</span><span class="row-text">Sign out</span>${ICON.chev}</button>` : '');
  return `
    ${linked ? '<h1 class="sr-only">Me</h1>' : `<div class="page-title"><h1>${signedIn && first ? `G'day ${esc(first)}` : 'Me'}</h1>${linkHint}</div>`}
    ${memberBlock()}
    ${spGroup('App', app)}
    <section class="section me-end">
      ${signedIn ? `<p class="muted">${[member && ME ? 'Signed in as ' + esc(ME.email) : '', session ? 'Club team: ' + esc(session.name) + (session.admin ? ' (admin)' : '') : ''].filter(Boolean).join(' · ')}</p>` : ''}
      <p class="muted">On Target v${APP_VERSION}${TEST_SERVER ? ' · TEST SERVER' : ''}</p>
    </section>`;
}

/* Range status (v2.7.0), any club team PIN: close the range for today or some days, or set it back to open as normal.
   Saving asks first, saying how many bookings will be cancelled and members emailed. */
const RS_CHOICES = [['open', 'Open as normal', ''], ['fire', 'Closed: fire danger', ''], ['ro', 'Closed: no range officer available', ''], ['weather', 'Closed: weather', ''],
  ['works', 'Closed: maintenance or working bee', ''], ['other', 'Other', 'Type a short reason']];
let RSTAT = { data: null, state: '', note: '', form: null };
async function loadRangeStatus() {
  if (RSTAT.state === 'loading') return;
  RSTAT.state = 'loading';
  try { RSTAT.data = await committeeApi('rangeStatus'); RSTAT.state = ''; }
  catch (e) { if (e.signedOut) return; RSTAT.state = 'failed'; }
  if (currentPage === 'committee/rangestatus') render();
}
/* What the form says now: {reason, other, days, from, until, note} */
function rsForm(form) {
  const f = form || document.getElementById('rangeForm'), val = sel => (f.querySelector(sel) || {}).value || '';
  const today = isoOf(new Date()), days = val('input[name="rsDays"]:checked') || 'today';
  return { reason: val('input[name="rsReason"]:checked'), other: val('#rsOther').trim(), note: val('#rsNote').trim(), days,
    from: days === 'today' ? today : val('#rsFrom'), until: days === 'today' ? today : val('#rsUntil') || val('#rsFrom') };
}
const rsText = d => d.reason === 'other' ? d.other : (RS_CHOICES.find(c => c[0] === d.reason) || [, ''])[1].replace(/^Closed: /, '').replace(/^./, m => m.toUpperCase());
/* The banner as members will see it, drawn from the form */
function rsPreview(d) {
  if (!d.reason) return '<p class="muted">Choose what is happening to see the banner.</p>';
  if (d.reason === 'open') return '<p class="muted">On normal days members see no banner.</p>';
  if (!d.from) return '<p class="muted">Choose the days to see the banner.</p>';
  return rangeBanner({ from: d.from, until: d.until < d.from ? d.from : d.until, reason: rsText(d) || 'Other', note: d.note, fire: d.reason === 'fire' });
}
function rangeStatusView() {
  if (!RSTAT.data && RSTAT.state !== 'failed') setTimeout(loadRangeStatus, 0);
  const head = `<div class="page-title">${adminBack}<h1>Range status</h1><p class="muted">Close the range for today or a few days. Members see a red banner on Home and the Club tab, bookings on those days are cancelled, and each member is emailed.</p></div>`;
  if (!RSTAT.data) return head + `<section class="section">${RSTAT.state === 'failed' ? loadFailed('the range status', 'data-rs-reload') : skeletonRows(3)}</section>`;
  const list = RSTAT.data.closures, f = RSTAT.form || { reason: 'fire', days: 'today', from: '', until: '', other: '', note: '' };
  return `${head}
    <section class="section">
      ${RSTAT.note ? `<p class="notice" role="status">${esc(RSTAT.note)}</p>` : ''}
      <h2 class="caps-head">Now</h2>
      ${list.length ? `<div class="card list">${list.map((c, i) => `<div class="list-row rs-closure"><span class="list-ico rs-ico">${ICON.alert}</span>
          <span class="list-main"><span class="list-title">Closed ${esc(closureDays(c))}</span><span class="muted">${joinDot(c.text, c.note)}</span><span class="muted">Set by ${esc(c.by)}</span></span>
          <button type="button" class="btn btn-outline rs-open" data-rs-open="${i}">Reopen</button></div>`).join('')}</div>`
        : `<div class="card rs-open-now"><span class="list-ico">${ICON.check}</span><span><b>Open as normal</b><span class="muted">No closures are set.</span></span></div>`}
    </section>
    <section class="section"><form class="card form" id="rangeForm" novalidate>
      <h2 class="form-head">Set the range</h2>
      <fieldset class="choices"><legend class="field-label">What's happening?</legend>${radios('rsReason', RS_CHOICES.map(c => [c[0], c[1], '']), f.reason)}</fieldset>
      <div id="rsOtherWrap"${f.reason === 'other' ? '' : ' hidden'}><label class="field-label" for="rsOther">Reason <span class="field-hint">short, e.g. "Police inspection"</span></label>
        <input class="field" id="rsOther" maxlength="60" value="${esc(f.other)}"></div>
      <fieldset class="choices choices-row rs-days"><legend class="field-label">Which days?</legend>${radios('rsDays', [['today', 'Today', ''], ['range', 'Some days', '']], f.days)}</fieldset>
      <div id="rsRange"${f.days === 'range' ? '' : ' hidden'}>
        <label class="field-label" for="rsFrom">From</label>${dateField('rsFrom', f.from)}
        <label class="field-label" for="rsUntil">Until <span class="field-hint">the last day; it opens as normal by itself after that</span></label>${dateField('rsUntil', f.until)}
      </div>
      <label class="field-label" for="rsNote">Note <span class="field-hint">optional, e.g. "Expected to reopen Saturday"</span></label>
      <input class="field" id="rsNote" maxlength="140" value="${esc(f.note)}">
      <h3 class="field-label">What members will see</h3>
      <div id="rsPreview" class="rs-preview">${rsPreview(f.reason ? Object.assign({}, f, f.days === 'today' ? { from: isoOf(new Date()), until: isoOf(new Date()) } : {}) : f)}</div>
      <p class="form-error" id="rsError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="rsSubmit">Save</button>
    </form></section>`;
}
function rsRefresh() {
  const form = document.getElementById('rangeForm');
  if (!form) return;
  const d = rsForm(form);
  form.querySelector('#rsOtherWrap').hidden = d.reason !== 'other';
  form.querySelector('#rsRange').hidden = d.days !== 'range';
  form.querySelector('#rsPreview').innerHTML = rsPreview(d);
}
async function rsSave(form) {
  const d = rsForm(form), error = form.querySelector('#rsError'), btn = form.querySelector('#rsSubmit');
  const fail = (msg, el) => { error.textContent = msg; error.hidden = false; if (el) el.focus(); };
  if (!d.reason) return fail('Please choose what is happening.', form.querySelector('input[name="rsReason"]'));
  if (d.reason === 'other' && !d.other) return fail('Please type a short reason.', form.querySelector('#rsOther'));
  if (!d.from) return fail('Please choose the first day.', form.querySelector('#rsFrom'));
  if (d.until < d.from) return fail('The last day can\'t be before the first day.', form.querySelector('#rsUntil'));
  error.hidden = true; RSTAT.form = d;
  const days = closureDays(d), label = btn.textContent;
  if (d.reason === 'open') return confirmAsk({ title: `Open as normal ${d.from === isoOf(new Date()) && d.until === d.from ? 'today' : days}?`,
    text: 'Any closure set for those days is taken off, and members can book again. Bookings that were cancelled stay cancelled.',
    yes: 'Yes, open as normal', busy: 'Saving…', no: 'No, go back', run: () => committeeApi('rangeSet', [d]), done: rsDone });
  btn.disabled = true; btn.textContent = 'Checking…';
  let p;
  try { p = await committeeApi('rangePreview', [d]); } catch (e) { btn.disabled = false; btn.textContent = label; if (!e.signedOut) fail(e.message); return; }
  btn.disabled = false; btn.textContent = label;
  const n = (x, one, many) => `${x} ${x === 1 ? one : many}`;
  const effects = p.bookings || p.requests
    ? `${n(p.bookings, 'bench booking', 'bench bookings')} will be cancelled${p.requests ? ` and ${n(p.requests, 'booking request', 'booking requests')} declined` : ''}. ${n(p.members, 'member is', 'members are')} emailed${p.members > p.emailsLeft ? ` (only ${p.emailsLeft} closure emails are left today: you'll get the names of anyone not emailed)` : ''}.`
    : 'There are no bookings on those days.';
  confirmAsk({ title: `Close the range ${days}?`, text: `${rsText(d)}. ${effects}${p.reserved ? ` ${n(p.reserved, 'bench reserved for a competition is', 'benches reserved for a competition are')} released.` : ''} The club inbox gets an email too.`,
    yes: 'Yes, close the range', busy: 'Closing… this can take a minute', no: 'No, go back', run: () => committeeApi('rangeSet', [d]), done: rsDone });
}
function rsDone(out) {
  RSTAT = { data: null, state: '', note: (out && out.message) || 'Saved.', form: null };
  BENCH.info = null; BENCH.infoState = '';
  refresh('range', true);
  render(); view.focus();
}
function rsReopen(i) {
  const c = RSTAT.data && RSTAT.data.closures[i];
  if (!c) return;
  const today = isoOf(new Date()), d = { reason: 'open', from: c.from < today ? today : c.from, until: c.until };
  confirmAsk({ title: `Reopen ${closureDays(d)}?`, text: `The range goes back to open as normal for those days, and members can book again. Bookings that were cancelled stay cancelled.`,
    yes: 'Yes, reopen', busy: 'Saving…', no: 'No, go back', run: () => committeeApi('rangeSet', [d]), done: rsDone });
}
view.addEventListener('input', e => { if (e.target.closest('#rangeForm')) rsRefresh(); });
view.addEventListener('change', e => { if (e.target.closest('#rangeForm')) rsRefresh(); });
view.addEventListener('submit', e => { if (e.target.id === 'rangeForm') { e.preventDefault(); rsSave(e.target); } });
view.addEventListener('click', e => {
  const o = e.target.closest('[data-rs-open]'); if (o) rsReopen(Number(o.dataset.rsOpen));
  if (e.target.closest('[data-rs-reload]')) { RSTAT.state = ''; render(true); }
});

/* Club (v2.6.1): the club's own things, the same for everyone. Room is kept at the top for the range status banner (v2.7). */
function clubView() {
  const signedIn = !!(member || session), pics = photos().slice(0, 4);
  const club = spRow(ICON.doc, 'Club documents', '#/me/documents') + spRow(ICON.pin, 'Visit the range', VISIT_URL) + spRow(ICON.help, 'FAQs', FAQ_URL)
    + spRow(ICON.mail, 'Contact the club', 'mailto:info@ravenshoegunclub.com.au') + spRow(ICON.calc, 'Handgun shoot calculator', '#/calculator') + spRow(ICON.web, 'Club website', SITE_URL);
  return `
    ${rangeBanners()}
    <div class="page-title"><h1>Club</h1></div>
    <section class="section sp-group"><h2 class="sp-head">Photos</h2>
      ${state('photos', 1, () => pics.length ? `<div class="club-thumbs">${pics.map((p, i) => thumb(p, i)).join('')}</div>` : '<p class="muted">Photos from the range appear here.</p>')}
      <div class="sp-list">${spRow(ICON.camera, 'All photos', '#/photos')}</div>
    </section>
    ${spGroup('Club', club)}
    ${signedIn ? '' : spGroup('Join us', spRow(ICON.join, 'Join the club', JOIN_URL) + spRow(ICON.fees, 'Fees', JOIN_URL))}`;
}

/* Club admin (v2.3.0): everything the club team does, on its own screen. Admin only is hidden from range officers. */
function adminView(sub) {
  if (!session) return `
    <div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Club admin</h1></div>
    <section class="section"><div class="card empty">
      <div class="empty-title">Please sign in</div>
      <p class="muted">This part of On Target is for the club team.</p>
      <button type="button" class="btn btn-primary btn-big" data-signin>Club team sign-in</button>
    </div></section>`;
  if (sub === 'post') return `
    <div class="page-title">${adminBack}<h1>Post something new</h1><p class="muted">What would you like to post?</p></div>
    <section class="section"><div class="post-tiles">
      <a class="tile" href="#/committee/event"><span class="tile-ico">${ICON.calendar}</span>Event</a>
      <a class="tile" href="#/committee/results"><span class="tile-ico">${ICON.trophy}</span>Results</a>
      <a class="tile" href="#/committee/photos"><span class="tile-ico">${ICON.camera}</span>Photos</a>
    </div></section>`;
  loadAdminCounts();
  const sum = ADMIN.summary, signCount = ADMIN.signCount;
  const count = (n, what) => n ? `<span class="count-badge" aria-label="${n} ${what}">${n}</span>` : '';
  const row = (icon, label, href, extra, sub2) => `<a class="menu-row" href="${href}"><span class="tile-ico">${icon}</span><span class="row-text">${label}${sub2 ? `<span class="muted">${sub2}</span>` : ''}</span>${extra || ''}${ICON.chev}</a>`;
  const group = (title, rows) => `<div class="sp-block"><h2 class="sp-head">${title}</h2><div class="sp-list">${rows}</div></div>`;
  return `
    <div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Club admin</h1></div>
    <section class="section">
      <a class="btn btn-emergency btn-big" href="#/committee/emergency">${ICON.firstaid}Emergency contacts</a>
      ${group('Every day', row(ICON.mail, 'Messages', '#/committee/messages', unreadBadge()) + row(ICON.plus, 'Post something new', '#/admin/post') + row(ICON.doc, 'Manage posts', '#/committee/manage'))}
      ${group('Range', row(ICON.alert, 'Range status', '#/committee/rangestatus', '', closures().length ? `Closed ${esc(closureDays(closures()[0]))}${closures().length > 1 ? ' and more' : ''}` : 'Open as normal')
        + row(ICON.check, 'Today at the range', '#/committee/range') + row(ICON.calendar, 'Booking requests', '#/committee/requests', count(BENCH.waiting, 'waiting'))
        + row(ICON.trophy, 'Reserve for a competition', '#/committee/reserve'))}
      ${group('Club', row(ICON.doc, 'Manage club documents', '#/committee/documents', '', 'Add · edit · remove'))}
      ${session.admin ? `${group('Admin only', row(ICON.fees, 'Payments to confirm', '#/committee/payments', count(sum && sum.pending, 'waiting'))
        + row(ICON.people, 'All members &amp; status', '#/committee/members') + row(ICON.join, 'App sign-ups to check', '#/committee/signups', count(signCount, 'waiting'))
        + row(ICON.key, 'People and PINs', '#/committee/people') + row(ICON.doc, 'Import members list', '#/committee/import', '', 'From the club’s spreadsheet')
        + row(ICON.trophy, 'Link old results', '#/committee/oldresults', count(sum && sum.claimFlags, 'to check'), 'Older results to members'))}
        ${sum && (sum.season === 'renew' || sum.season === 'followup') ? `<div class="admin-counts">
          ${sum.season === 'renew' ? `<a class="admin-count amber" href="#/committee/members" data-mem-filter="notRenewed">Not renewed yet: <b>${sum.notRenewed}</b></a>` : ''}
          ${sum.season === 'followup' ? `<a class="admin-count red" href="#/committee/members" data-mem-filter="overdue">Not financial – overdue: <b>${sum.overdue}</b></a>` : ''}
        </div>` : ''}` : ''}
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
      <p class="muted form-foot family-line">Sharing an email with a family member? One family member can sign in for everyone on a family membership. Anyone else needs their own email to sign in.</p>
      ${joinLink}
    </form></section>`;
  if (!ME) {
    if (meState !== 'failed' && meState !== 'loading') setTimeout(loadMe, 0);
    return `<section class="section">${meState === 'failed' ? loadFailed('your membership', 'data-me-reload') : skeletonRows(3)}</section>`;
  }
  if (!ME.linked) return !member ? '' : ME.pending && !relinking ? mePending() : linkForm();
  return meTop();
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
/* The family's name chips: tap one to see that person's card, results and bookings */
function familyChips() {
  if (!ME.family || ME.family.length < 2) return '';
  return `<section class="section fam-chips-wrap"><div class="chips fam-chips" role="group" aria-label="Whose membership to show">${ME.family.map(f => `
    <button type="button" class="chip-btn" data-view-as="${esc(f.key)}" aria-pressed="${f.key === (ME.viewing.self ? '' : ME.viewing.key)}">${esc(f.first)}${f.junior ? ' <span class="junior-tag">Junior</span>' : ''}</button>`).join('')}</div>
    ${viewingLine()}</section>`;
}
/* The top of Me for a linked member (v2.6.0): the membership card, four shortcuts, and Renew */
function meTop() {
  const other = viewingOther(), whose = other ? esc(ME.viewing.first) + "'s" : 'My';
  const key = meStatus(ME), r = ME.renew || {};
  const note = key === 'notRenewed' ? `Renew by ${ME.renewBy}` : ME_PILL[key][2];
  const fam = ME.inFamily || (ME.family && ME.family.length > 1);
  const renewSub = key === 'notRenewed' ? `Due by ${esc(ME.renewBy)}` : key === 'overdue' ? 'Overdue: please renew now' : key === 'expired' ? 'Expired: renew to rejoin' : '';
  const renew = r.open
    ? `<a class="menu-row" href="${esc(r.url)}" target="_blank" rel="noopener"><span class="tile-ico">${ICON.refresh}</span><span class="row-text">Renew my membership${renewSub ? `<span class="muted">${renewSub}</span>` : ''}</span>${ICON.chev}</a>`
    : `<div class="menu-row"><span class="tile-ico">${ICON.refresh}</span><span class="row-text">Renew<span class="muted">${key === 'waiting' ? 'Payment being checked' : 'Opens ' + esc(r.opens)}</span></span></div>`;
  return `
    ${familyChips()}
    <section class="section">
      <div class="me-card">${ICON.rings}
        <div class="me-card-club">MEMBER · RAVENSHOE &amp; DISTRICT SPORTING SHOOTERS</div>
        <div class="me-card-name">${esc(ME.name)}</div>
        <div class="me-card-facts">
          <div><span>SSAA no.</span><b>${esc(ME.ssaa) || '–'}</b></div>
          <div><span>Valid to</span><b>${esc(ME.validToText) || '–'}</b></div>
        </div>
        <div class="me-card-status">${mePill(key, ME.inFamily ? ' · Family' : '')}${ME.junior ? '<span class="junior-tag">Junior</span>' : ''}${note ? `<span class="me-card-note">${esc(note)}</span>` : ''}</div>
      </div>
      <p class="muted me-hint">Show your SSAA card and licence at the range.</p>
    </section>
    <nav class="shortcuts${fam ? '' : ' shortcuts-3'}" aria-label="${whose} membership">
      ${spShortcut(ICON.chart, `${whose} shooting`, '#/me/results')}${spShortcut(ICON.bench, `${whose} bookings`, '#/me/bookings')}${spShortcut(ICON.join, `${whose} details`, '#/me/details')}
      ${fam ? spShortcut(ICON.people, 'My family', '#/me/family') : ''}
    </nav>
    ${spGroup('Membership', renew)}`;
}


/* Club documents: the files in the club's "On Target – Club documents" Drive folder, for members and the club team */
let DOCS = null, docsState = '';
async function loadDocs() {
  if (docsState === 'loading') return;
  docsState = 'loading';
  try {
    // The club team and linked members get every document; anyone else gets the ones marked Everyone
    const list = session ? await committeeApi('clubDocuments') : await api('clubDocuments', undefined, member ? [member.token] : []);
    DOCS = Array.isArray(list) ? list : []; docsState = '';
  } catch (e) {
    if (e.signedOut) { docsState = ''; return; }
    if (/signed out/i.test(e.message)) return forgetMember();
    docsState = /for members/i.test(e.message) ? 'members' : 'failed';
  }
  if (currentPage === 'me/documents') render(true);
}
/* Grouped by type, in this order; a group with nothing in it isn't shown */
const DOC_GROUPS = [['Form', 'Forms'], ['Policy', 'Policies'], ['Minutes', 'Minutes'], ['Other', 'Other']];
function documentsView() {
  if (!DOCS && !docsState) setTimeout(loadDocs, 0);
  const row = d => `<a class="menu-row doc-row" href="${esc(d.url)}" target="_blank" rel="noopener"><span class="tile-ico">${ICON.doc}</span>
    <span class="list-main"><b class="doc-name">${esc(d.name)}</b>${d.what ? `<span class="doc-what">${esc(d.what)}</span>` : ''}${d.who ? `<span class="doc-who">${esc(d.who)}</span>` : ''}</span>${ICON.chev}</a>`;
  const groups = () => {
    const list = DOCS.filter(d => /^https:\/\//.test(d.url)), known = DOC_GROUPS.map(g => g[0]);
    return DOC_GROUPS.map(([type, title]) => {
      const docs = list.filter(d => d.type === type || (type === 'Other' && !known.includes(d.type)));
      return docs.length ? `<div class="section-head"><h2>${title}</h2></div><div class="card list">${docs.map(row).join('')}</div>` : '';
    }).join('');
  };
  return `
    <div class="page-title"><a class="back-link" href="#/club">${ICON.chev}Club</a><h1>Club documents</h1><p class="muted">Forms and club papers. Tap one to open it.</p></div>
    <section class="section">${DOCS ? (DOCS.length ? groups() + (member || session ? '' : '<p class="muted">Members see more club documents here once they have signed in.</p>')
        : member || session ? `<div class="card empty"><p class="muted">Coming soon: club policies and forms will be here.</p></div>`
        : empty('Nothing here yet', 'Members see the club documents here once they have signed in.'))
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
/* My shooting (v2.9.0): the results linked to them, and "Are these yours?" for older results posted before they were linked.
   A member can claim, hide or unlink for themselves, or for a junior they are viewing; another adult's are theirs alone. */
let CLAIMS = { auth: '', data: null, state: '', note: '' };
async function loadClaims() {
  const auth = meAuth();
  if (CLAIMS.state === 'loading' && CLAIMS.auth === auth) return;
  CLAIMS = { auth, data: null, state: 'loading', note: CLAIMS.auth === auth ? CLAIMS.note : '' };
  try { CLAIMS.data = await memberApi('memberClaimList'); CLAIMS.state = ''; }
  catch (e) { if (e.signedOut) return; CLAIMS.state = 'failed'; }
  if (CLAIMS.auth === meAuth() && currentPage === 'me/results') render(true);
}
const resultLine = r => [r.place && placeLabel(r.place) + ' place', r.score && 'Score ' + esc(r.score), r['class'] && 'Class ' + esc(r['class'])].filter(Boolean).join(' · ');
function meResults() {
  const next = events().find(e => /competition/i.test(e.discipline || '')), other = viewingOther(), who = other ? esc(ME.viewing.first) : '';
  if (ME.canClaim && (CLAIMS.auth !== meAuth() || (!CLAIMS.data && !CLAIMS.state))) setTimeout(loadClaims, 0);
  const c = CLAIMS.auth === meAuth() ? CLAIMS.data : null;
  const claims = !ME.canClaim ? '' : c && c.items.length ? `
    <section class="section">
      <div class="section-head"><h2 class="caps-head">Are these ${other ? who + "'s" : 'yours'}?</h2></div>
      <p class="muted">Results from before On Target linked them to members, under a name like ${other ? who + "'s" : 'yours'}. Tap Yes to add one to ${other ? who + "'s" : 'your'} results.</p>
      <div class="card list">${c.items.map(r => `
        <div class="list-row claim-row">${dateBlock(r.date)}
          <div class="list-main"><div class="list-title">${esc(r.competition)}</div>
            <div class="muted">Listed as <b>${esc(r.shooter)}</b>${resultLine(r) ? ' · ' + resultLine(r) : ''}</div>
            <div class="btn-row claim-btns">
              <button type="button" class="btn btn-primary" data-claim-yes="${esc(r.key)}">Yes, ${other ? who + "'s" : 'mine'}</button>
              <button type="button" class="btn btn-outline" data-claim-no="${esc(r.key)}">Not ${other ? who : 'me'}</button>
            </div></div>
        </div>`).join('')}</div>
      ${c.more ? `<p class="muted">And ${c.more} more. They show here as you go through these.</p>` : ''}
    </section>` : c && c.waiting ? '' : CLAIMS.state === 'loading' && CLAIMS.auth === meAuth() ? `<section class="section">${skeletonRows(1)}</section>` : '';
  const waiting = c && c.waiting ? `<p class="muted">${c.waiting === 1 ? '1 result' : c.waiting + ' results'} ${other ? who : 'you'} claimed ${c.waiting === 1 ? 'is' : 'are'} with the club team to check.</p>` : '';
  return `
    <div class="page-title">${meBack}<h1>${other ? who + "'s" : 'My'} shooting</h1>${viewingLine()}${ME.results.length ? `<p class="muted">${esc(resultsSummary())}</p>` : ''}</div>
    ${CLAIMS.note && CLAIMS.auth === meAuth() ? `<section class="section"><p class="notice" role="status">${esc(CLAIMS.note)}</p></section>` : ''}
    <section class="section">${ME.results.length ? `<div class="card list">${ME.results.map(r => `
      <div class="list-row">${dateBlock(r.date)}
        <div class="list-main"><div class="list-title">${esc(r.competition)}</div>
          <div class="muted">${resultLine(r)}</div></div>
        ${ME.canClaim && r.key ? `<button type="button" class="btn-link claim-unlink" data-unlink="${esc(r.key)}" aria-label="Not ${other ? who + "'s" : 'mine'}: ${esc(r.competition)}, ${esc(shortDate(r.date))}">Not ${other ? who + "'s" : 'mine'}?</button>` : ''}
      </div>`).join('')}</div>${waiting}` : `${waiting}<div class="card empty">
      <div class="empty-title">No competition results yet</div>
      <p class="muted">Fancy having a go? ${next ? `Next competition: ${esc(shortDate(next.date))}${next.start ? ', ' + esc(niceTime(next.start) || next.start) : ''}. ` : ''}All levels welcome.</p>
      <a class="btn btn-outline" href="#/events">${ICON.calendar}See what's on</a>
    </div>`}</section>
    ${claims}`;
}
async function claimResult(btn, key, yes) {
  if (btn.disabled) return;
  view.querySelectorAll('[data-claim-yes],[data-claim-no],[data-unlink]').forEach(b => { b.disabled = true; });
  btn.textContent = yes ? 'Adding…' : 'Hiding…';
  try {
    const out = await memberApi('memberClaim', [key, yes]);
    ME = out.me; CLAIMS.data = out.claims; CLAIMS.note = out.message || '';
  } catch (e) {
    if (e.signedOut) return;
    CLAIMS.note = e.message; CLAIMS.data = null; CLAIMS.state = '';
  }
  render(true);
}
function askUnlink(key) {
  const r = ME.results.find(x => x.key === key), other = viewingOther();
  if (!r) return;
  confirmAsk({ title: `Take this off ${other ? ME.viewing.first + "'s" : 'your'} results?`, text: `${r.competition}, ${shortDate(r.date)}. Use this if it was linked to ${other ? ME.viewing.first : 'you'} by mistake. It won't be suggested again.`,
    yes: 'Yes, take it off', busy: 'Taking it off…', no: 'No, keep it', run: () => memberApi('memberUnlink', [key]),
    done: out => { ME = out.me; CLAIMS.data = out.claims; CLAIMS.note = out.message || ''; render(true); } });
}
view.addEventListener('click', e => {
  const yes = e.target.closest('[data-claim-yes]'), no = e.target.closest('[data-claim-no]'), un = e.target.closest('[data-unlink]');
  if (yes) claimResult(yes, yes.dataset.claimYes, true);
  if (no) claimResult(no, no.dataset.claimNo, false);
  if (un && !un.disabled) askUnlink(un.dataset.unlink);
});
/* My details: members change their own, and it is saved straight away with no club team approval.
   Name and SSAA number are the two things only the club can change. */
function meDetails() {
  const row = (label, value) => `<div class="detail-row"><span class="muted">${label}</span><b>${esc(value)}</b></div>`;
  const em = ME.emergency || {}, other = viewingOther(), who = other ? ME.viewing.first : '';
  // Another adult's contact details are theirs alone; a junior's are looked after by the adults in the family
  if (other && !ME.viewing.details) return `
    <div class="page-title">${meBack}<h1>${esc(who)}'s details</h1>${viewingLine()}</div>
    <section class="section">
      <div class="card form">${row('Name', ME.name)}${row('SSAA number', ME.ssaa || 'None on our records')}</div>
      ${empty(`Private to ${who}`, `${who}'s email, mobile and emergency contact are private. Only ${who} can see or change them, after signing in with their own email.`)}
      <a class="btn btn-outline btn-big" href="#/me/family">${ICON.people}My family</a>
    </section>`;
  return `
    <div class="page-title">${meBack}<h1>${other ? esc(who) + "'s" : 'My'} details</h1>${viewingLine()}</div>
    <section class="section">
      ${meNote ? `<p class="notice" role="status">${esc(meNote)}</p>` : ''}
      <div class="card form">
        ${row('Name', ME.name)}
        ${row('SSAA number', ME.ssaa || 'None on our records')}
        <p class="muted">To change ${other ? 'their' : 'your'} name or SSAA number, <a href="mailto:info@ravenshoegunclub.com.au?subject=${encodeURIComponent('Change my details')}">ask the club</a>.</p>
        ${other ? '' : `${row('Email', ME.email || 'None on our records')}
        <a class="btn btn-outline btn-big" href="#/me/email">${ICON.mail}Change my email</a>`}
      </div>
      ${ME.inFamily && !other ? `<a class="btn btn-outline btn-big" href="#/me/family">${ICON.people}My family</a>` : ''}
    </section>
    <section class="section"><form class="card form" id="detailsForm" novalidate>
      <label class="field-label" for="mdKnown">Known as <span class="field-hint">optional, e.g. Bob</span></label>
      <input class="field" id="mdKnown" maxlength="30" autocomplete="off" autocapitalize="words" value="${esc(ME.knownAs || '')}" aria-describedby="mdKnownHint">
      <p class="muted" id="mdKnownHint">The name ${other ? esc(who) + ' goes' : 'you go'} by at the range. It helps the club team find ${other ? 'them' : 'you'} when they post results.</p>
      <label class="field-label" for="mdMobile">Mobile <span class="field-hint">optional</span></label>
      <input class="field" id="mdMobile" type="tel" inputmode="tel" autocomplete="${other ? 'off' : 'tel'}" maxlength="30" value="${esc(ME.mobile || '')}">
      <h2 class="form-head">Emergency contact <span class="field-hint">optional</span></h2>
      <p class="muted">Only the club team can see this, and only to call them if something happens to ${other ? esc(who) : 'you'} at the range.</p>
      <label class="field-label" for="mdEmName">Contact name</label>
      <input class="field" id="mdEmName" maxlength="60" autocomplete="off" autocapitalize="words" value="${esc(em.name || '')}">
      <label class="field-label" for="mdEmRelation">Who are they to ${other ? esc(who) : 'you'}? <span class="field-hint">${other ? 'mother, father, guardian…' : 'wife, son, friend…'}</span></label>
      <input class="field" id="mdEmRelation" maxlength="40" autocomplete="off" value="${esc(em.relation || '')}">
      <label class="field-label" for="mdEmPhone">Their phone</label>
      <input class="field" id="mdEmPhone" type="tel" inputmode="tel" autocomplete="off" maxlength="30" value="${esc(em.phone || '')}">
      ${other ? '' : `<label class="choice"><input type="checkbox" id="mdNews"${ME.news ? ' checked' : ''}>
        <span><span class="choice-title">Send me club news and renewal reminders</span><span class="choice-text">Sent to your email address above.</span></span></label>`}
      ${ME.inFamily && !other && !ME.junior ? `<label class="choice"><input type="checkbox" id="mdHide"${ME.hide ? ' checked' : ''}>
        <span><span class="choice-title">Hide me from my family's view</span><span class="choice-text">Your family won't see your card, results or bookings when they sign in. You still see theirs.</span></span></label>` : ''}
      <p class="form-error" id="mdError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="mdSubmit">Save ${other ? esc(who) + "'s" : 'my'} details</button>
    </form></section>`;
}
async function saveDetails(form) {
  const btn = form.querySelector('#mdSubmit'), error = form.querySelector('#mdError'), val = id => form.querySelector(id).value.trim();
  if (btn.disabled) return;
  const fail = (msg, id) => { error.textContent = msg; error.hidden = false; if (id) form.querySelector(id).focus(); };
  const tick = id => { const box = form.querySelector(id); return box ? box.checked : undefined; }, label = btn.textContent;
  const d = { known: val('#mdKnown').replace(/["“”]/g, ''), mobile: val('#mdMobile'), emName: val('#mdEmName'), emRelation: val('#mdEmRelation'), emPhone: val('#mdEmPhone'), news: !!tick('#mdNews'), hide: tick('#mdHide') };
  if ((d.emName || d.emRelation || d.emPhone) && !d.emName) return fail("Please type the emergency contact's name.", '#mdEmName');
  if (d.emName && !d.emPhone) return fail("Please type the emergency contact's phone number.", '#mdEmPhone');
  error.hidden = true; btn.disabled = true; btn.textContent = 'Saving…';
  try {
    ME = await memberApi('memberSaveDetails', [d]);
    meNote = viewingOther() ? `Saved. ${ME.viewing.first}'s details are up to date.` : 'Saved. Your details are up to date.';
    form.remove(); render();
    view.focus();
  } catch (e) {
    if (e.signedOut) return;
    btn.disabled = false; btn.textContent = label;
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
      await memberApi('memberChangeEmail', [email], true);
      emailChange = { email };
      form.remove(); render();
      return document.getElementById('ecCode').focus();
    }
    await memberApi('memberConfirmEmail', [email, code], true);
    ME = null; meState = '';
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
const DOC_TYPES = ['Form', 'Policy', 'Minutes', 'Other'], DOC_MAX_MB = 10;
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
    <div class="page-title">${adminBack}<h1>Manage club documents</h1><p class="muted">People see these in On Target under Me, Club documents. “Everyone” documents show to anyone; “Members only” ones need a sign-in.</p></div>
    <section class="section">
      ${DOCADMIN.note ? `<p class="notice" role="status">${esc(DOCADMIN.note)}</p>` : ''}
      <button type="button" class="btn btn-primary btn-big" data-doc="new">${ICON.plus}Add a document</button>
      ${DOCADMIN.list ? (DOCADMIN.list.length ? `<div class="card list">${DOCADMIN.list.map((d, i) => `
        <button type="button" class="list-row manage-row" data-doc="${i}"><span class="list-ico">${ICON.doc}</span>
          <span class="list-main"><span class="list-title">${esc(d.name)}</span><span class="muted">${esc(d.type || 'Other')}${d.what ? ' · ' + esc(d.what) : ' · no description yet'}</span><span class="badge-row">${badge(d.see === 'Everyone' ? 'Everyone' : 'Members')}${d.see === 'Everyone' ? `<span class="badge badge-web">${ICON.web}On website</span>` : ''}</span></span>${ICON.chev}</button>`).join('')}</div>`
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
      <label class="field-label" for="dcTitle">Name</label>
      <p class="muted" id="dcTitleHint">Short and plain. Start with the form number if it has one.</p>
      <input class="field" id="dcTitle" maxlength="100" autocomplete="off" aria-describedby="dcTitleHint" value="${esc(d.name || '')}">
      <label class="field-label" for="dcWhat">What it's for</label>
      <p class="muted" id="dcWhatHint">One sentence a new member would understand.</p>
      <textarea class="field" id="dcWhat" rows="2" maxlength="160" aria-describedby="dcWhatHint">${esc(d.what || '')}</textarea>
      <label class="field-label" for="dcWho">Who it's for</label>
      <p class="muted" id="dcWhoHint">Keep it short, e.g. “Visitors without a licence”.</p>
      <input class="field" id="dcWho" maxlength="60" autocomplete="off" aria-describedby="dcWhoHint" value="${esc(d.who || '')}">
      <label class="field-label" for="dcType">Type</label>
      <select class="field" id="dcType">${DOC_TYPES.map(t => `<option${(d.type || 'Form') === t ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <fieldset class="choices"><legend class="field-label">Who can see this?</legend>${radios('dcSee', [['Everyone', 'Everyone', 'Anyone who opens On Target, signed in or not, and it also goes on the club website.'], ['Members', 'Members only', 'Members who have signed in, and the club team']], d.see === 'Everyone' ? 'Everyone' : 'Members')}</fieldset>
      ${isNew ? bar : ''}
      <p class="form-error" id="dcError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="dcSubmit">${isNew ? 'Upload document' : 'Save changes'}</button>
      ${isNew ? '' : `
      ${/^https:\/\//.test(d.url) ? `<a class="btn btn-outline btn-big" href="${esc(d.url)}" target="_blank" rel="noopener">${ICON.doc}Open the document</a>` : ''}
      <h2 class="form-head">A newer version</h2>
      <p class="muted">Choose the newer file (a PDF, a Word document or a photo). It takes this document's place; the name, type and descriptions stay the same.</p>
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
  const text = id => form.querySelector(id).value.replace(/\s+/g, ' ').trim();
  const meta = { title: text('#dcTitle'), type: form.querySelector('#dcType').value, what: text('#dcWhat'), who: text('#dcWho'),
    see: (form.querySelector('input[name="dcSee"]:checked') || {}).value === 'Everyone' ? 'Everyone' : 'Members' };
  if (!d.id && !docFile) return fail('Please choose a file first.', form.querySelector('[data-doc-choose]'));
  if (!meta.title) return fail('Please give the document a name.', form.querySelector('#dcTitle'));
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
  try { const d = await committeeApi('memberLinkCount'); const n = Number(d && d.waiting) || 0; if (n !== ADMIN.signCount) { ADMIN.signCount = n; if (ON_ME()) render(true); } }
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
  const head = `<div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>Book a bench</h1>${viewingOther() ? viewingLine() + `<p class="muted">This booking will be in ${esc(ME.viewing.first)}'s name.</p>` : ''}</div>`;
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
      <div class="chips">${info.days.map(d => d.closed
        ? `<button type="button" class="chip-btn chip-closed" disabled aria-label="${shortDate(d.date)}, closed: ${esc(d.closed)}">${shortDate(d.date)}<small>Closed: ${esc(d.closed)}</small></button>`
        : `<button type="button" class="chip-btn" data-bk-day="${d.date}" aria-pressed="${p.date === d.date}">${shortDate(d.date)}</button>`).join('')}</div>
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
  const head = `<div class="page-title"><a class="back-link" href="#/me">${ICON.chev}Me</a><h1>${viewingOther() ? esc(ME.viewing.first) + "'s" : 'My'} bookings</h1>${viewingLine()}</div>`;
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
  const head = `<div class="page-title"><a class="back-link" href="#/me/bookings">${ICON.chev}My bookings</a><h1>Request a booking</h1>${viewingLine()}
    <p class="muted">For a Tuesday, Thursday or Friday. A range officer will answer by email.</p></div>`;
  if (!BENCH.info) return head + `<section class="section">${BENCH.infoState === 'failed' ? benchFailed() : skeletonRows(3)}</section>`;
  const info = BENCH.info, days = info.appointmentDays;
  if (!days.length) return head + `<section class="section">${empty('No days to ask for', 'Please check back soon.')}</section>`;
  return `${head}
    <section class="section"><form class="card form" id="benchReqForm" novalidate>
      <label class="field-label" for="rqDay">Which day?</label>
      <select class="field" id="rqDay"><option value="">Choose a day…</option>${days.map(d => `<option value="${d.date}"${d.closed ? ' disabled' : ''}>${esc(benchDayLabel(d.date))}${d.closed ? ' – closed: ' + esc(d.closed) : ''}</option>`).join('')}</select>
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
    if (ON_ME()) render(true);
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
      : `<button type="button" class="bench ${on ? 'bench-competition' : 'bench-free'}${big ? ' bench-big' : ''}" data-res-bench="${k}" aria-pressed="${on}" aria-label="Bench ${k}, ${on ? 'reserved for the competition' : 'free'}"><b>${k}</b><span>${on ? 'Comp' : 'Free'}</span></button>`;
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

/* ---------- Handgun shoot calculator (v2.2.2): "How many shoots do I need?" ----------
   For Category H licence holders, from the Queensland Police participation requirements. Nothing is sent
   anywhere or saved: it is worked out on the phone. m = whole months the class has been held this financial year.
   - One class: floor(6 x m / 12) competitions.
   - Two or more: floor(4 x m / 12) shoots for each class; of the total, the competitions needed are the smaller of
     the total and floor(6 x longest months / 12); Class C's own number must be accredited events. */
const QPS_URL = 'https://www.police.qld.gov.au/weapon-licensing/concealable-firearms-class-and-participation-requirements';
const HANDGUN_CLASSES = [['A', 'Air pistols', 'All air pistols'], ['B', 'Centre-fire up to .38 / 9mm', 'Includes black-powder pistols'],
  ['C', 'Centre-fire over .38 up to .45', 'High-calibre class'], ['D', 'Rimfire pistols', 'e.g. .22']];
/* held: [{key, months}] for the classes ticked */
function shootsNeeded(held) {
  if (!held.length) return { none: true };
  if (held.length === 1) { const n = Math.floor(6 * held[0].months / 12); return { total: n, competitions: n, classes: [{ ...held[0], shoots: n }], accredited: null, partYear: false }; }
  const classes = held.map(h => ({ ...h, shoots: Math.floor(4 * h.months / 12) })), total = classes.reduce((sum, c) => sum + c.shoots, 0);
  const c = classes.find(x => x.key === 'C');
  return { total, competitions: Math.min(total, Math.floor(6 * Math.max(...held.map(h => h.months)) / 12)), classes,
    accredited: c ? c.shoots : null, partYear: held.some(h => h.months < 12) };
}
/* The financial year today falls in: 1 July to 30 June */
function financialYear() { const d = new Date(), from = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1; return { from, to: from + 1, label: `${from}–${String(from + 1).slice(2)}` }; }
function calculatorView() {
  const fy = financialYear();
  return `
    <div class="page-title"><a class="back-link" href="#/club">${ICON.chev}Club</a><h1>Handgun shoot calculator</h1><p class="muted">How many shoots do I need? Financial year ${fy.label}.</p></div>
    <section class="section"><form class="card form" id="calcForm" novalidate>
      <p>For Category H (handgun) licence holders. Tick each class of pistol you have registered. It doesn't matter how many of each.</p>
      ${HANDGUN_CLASSES.map(([key, name, hint]) => `<div class="calc-class">
        <label class="choice"><input type="checkbox" id="calc${key}" data-calc-class="${key}">
          <span><span class="choice-title">${key} – ${name}</span><span class="choice-text">${hint}</span></span></label>
        <div class="calc-held" id="calcHeld${key}" hidden><label class="field-label" for="calcMonths${key}">Held</label>
          <select class="field" id="calcMonths${key}" aria-label="Months you have held class ${key} this financial year">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${i === 11 ? ' selected' : ''}>${i + 1} month${i ? 's' : ''}</option>`).join('')}</select></div>
      </div>`).join('')}
      <p class="muted">“Held” = whole months you've had that class this financial year (1 July – 30 June). Leave at 12 if you've had it all year.</p>
      <button type="submit" class="btn btn-primary btn-big">Work it out</button>
    </form></section>
    <section class="section" id="calcResult" aria-live="polite"></section>`;
}
function calculatorResult(r) {
  const fy = financialYear(), plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`, name = key => HANDGUN_CLASSES.find(c => c[0] === key)[1];
  const guide = `<p class="muted calc-guide">A guide only. Based on Queensland Police participation requirements. Only one shoot a day counts. Keep your own participation record signed by a range officer (not yourself). Check with QPS Weapons Licensing if unsure.
    <a href="${QPS_URL}" target="_blank" rel="noopener">Queensland Police: classes and participation requirements</a></p>`;
  if (r.none) return `<div class="card empty"><div class="empty-title">No shoot requirement</div>
    <p class="muted">No shoot requirement, but you must stay a financial member of an approved Queensland pistol club.</p></div>${guide}`;
  const one = r.classes.length === 1, row = (label, n, note) => `<div class="list-row"><div class="list-main"><div class="list-title">${label}</div>${note ? `<div class="muted">${note}</div>` : ''}</div><b class="calc-n">${n}</b></div>`;
  return `
    <div class="me-card calc-card">${ICON.rings}
      <div class="me-card-club">FINANCIAL YEAR ${fy.label}</div>
      <div class="calc-big"><b>${r.total}</b><span>${one ? `handgun shooting competition${r.total === 1 ? '' : 's'}` : `handgun shoot${r.total === 1 ? '' : 's'}`}</span></div>
      <div>${r.total === 1 ? 'B' : 'Each on a different day, b'}etween 1 July ${fy.from} and 30 June ${fy.to}</div>
    </div>
    <div class="section-head"><h2 class="caps-head">By class</h2></div>
    <div class="card list">${r.classes.map(c => row(`${c.key} – ${name(c.key)}`, c.shoots, `Held ${plural(c.months, 'month')}`)).join('')}</div>
    <div class="section-head"><h2 class="caps-head">Of those</h2></div>
    <div class="card list">
      ${row('Competitions', r.competitions, one ? 'Every shoot must be a handgun shooting competition' : 'At least this many must be handgun shooting competitions')}
      ${r.accredited === null ? '' : row('Class C accredited events', r.accredited, 'Metallic silhouette or single action')}
    </div>
    ${r.partYear ? '<p class="notice">Part-year with several classes – please check your exact numbers with QPS Weapons Licensing.</p>' : ''}
    ${guide}`;
}
view.addEventListener('change', e => {
  const key = e.target.dataset && e.target.dataset.calcClass;
  if (!key) return;
  document.getElementById('calcHeld' + key).hidden = !e.target.checked;
  document.getElementById('calcResult').innerHTML = ''; // the answer on show no longer matches the ticks
});
view.addEventListener('submit', e => {
  if (e.target.id !== 'calcForm') return;
  e.preventDefault();
  const held = HANDGUN_CLASSES.map(c => c[0]).filter(key => document.getElementById('calc' + key).checked)
    .map(key => ({ key, months: Number(document.getElementById('calcMonths' + key).value) || 12 }));
  const out = document.getElementById('calcResult');
  out.innerHTML = calculatorResult(shootsNeeded(held));
  out.scrollIntoView({ block: 'start', behavior: 'smooth' });
});

/* ---------- Families (v2.4.0) ----------
   One sign-in covers a family membership. The name chips on Me choose whose card, results and bookings are on
   show (VIEW_AS); the server decides on every request who may be viewed, so nothing here is trusted.
   Admins set families up in All members & status, and can bring in the club's members list spreadsheet. */
let FAM = { key: '', name: '', email: '' };          // My family: adding a family member's own email ({email} once a code has gone)
let MEMADMIN = { id: '', data: null, state: '', note: '', error: '' };   // All members & status: the member that is open
let IMPORT = { name: '', rows: null, report: null, state: '', error: '', note: '' };   // memory only, like all member details
function familyLeave(page) {
  if (page !== 'me/family') FAM = { key: '', name: '', email: '' };
  if (page !== 'committee/member') MEMADMIN = { id: '', data: null, state: '', note: '', error: '' };
  if (page !== 'committee/import') IMPORT = { name: '', rows: null, report: null, state: '', error: '', note: '' };
}

/* ----- My family (from My details) ----- */
function familyView() {
  const back = `<div class="page-title"><a class="back-link" href="#/me/details">${ICON.chev}My details</a><h1>My family</h1>`;
  if (FAM.key) return `${back}</div>
    <section class="section"><form class="card form" id="famEmailForm" novalidate>
      <h2 class="form-head">${esc(FAM.name)}'s own email</h2>
      ${FAM.email ? `
      <p class="notice" role="status">We've sent a code to ${esc(FAM.email)}. It lasts 15 minutes.</p>
      <label class="field-label" for="feCode">The 6-digit code from that email</label>
      <input class="field pin-box" id="feCode" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="6">
      <p class="form-error" id="feError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="feSubmit">Confirm ${esc(FAM.name)}'s email</button>
      <button type="button" class="btn btn-outline btn-big" data-fam-back>Use a different address</button>` : `
      <p class="muted">With their own email, ${esc(FAM.name)} can sign in to On Target separately. They still show in your family view, and you in theirs.</p>
      <label class="field-label" for="feEmail">${esc(FAM.name)}'s email address</label>
      <input class="field" id="feEmail" type="email" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="120">
      <p class="muted">We'll email a 6-digit code to that address. Nothing changes until the code is typed in here.</p>
      <p class="form-error" id="feError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="feSubmit">Email them a code</button>
      <button type="button" class="btn btn-outline btn-big" data-fam-cancel>Cancel</button>`}
    </form></section>`;
  const fam = (ME.family || []), self = !viewingOther();
  return `${back}<p class="muted">Everyone on your family membership. On Me, tap a name to see that person's card, results and bookings.</p></div>
    <section class="section">
      ${meNote ? `<p class="notice" role="status">${esc(meNote)}</p>` : ''}
      ${fam.length ? `<div class="card list">${fam.map(f => `
        <div class="list-row"><div class="list-main"><div class="list-title">${esc(f.name)}${f.self ? ' <span class="lab lab-tag">You</span>' : ''}${f.junior ? ' <span class="junior-tag">Junior</span>' : ''}</div>
          <div class="muted">${f.self || f.ownEmail ? 'Signs in with their own email' : 'Uses the family sign-in'}</div></div>
          ${!f.self && !f.ownEmail ? `<button type="button" class="btn btn-outline" data-fam-email="${esc(f.key)}">Add their own email</button>` : ''}</div>`).join('')}</div>`
        : empty('Just you for now', 'Nobody else is on your family membership yet.')}
      <p class="muted">A family member who has chosen “Hide me from my family's view” isn't listed. To add or remove a family member, <a href="mailto:info@ravenshoegunclub.com.au?subject=${encodeURIComponent('My family membership')}">ask the club</a>.</p>
    </section>`;
}
async function familyEmail(form) {
  const btn = form.querySelector('#feSubmit'), error = form.querySelector('#feError'), label = btn.textContent;
  if (btn.disabled) return;
  const fail = (msg, el) => { error.textContent = msg; error.hidden = false; if (el) el.focus(); };
  const box = form.querySelector(FAM.email ? '#feCode' : '#feEmail');
  const email = FAM.email || box.value.trim().toLowerCase(), code = FAM.email ? box.value.replace(/\D/g, '') : '';
  if (!FAM.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please check the email address.', box);
  if (FAM.email && code.length !== 6) return fail('Please type all 6 digits of the code.', box);
  error.hidden = true; btn.disabled = true; btn.textContent = FAM.email ? 'Checking…' : 'Sending…';
  try {
    if (!FAM.email) {
      await memberApi('familyEmailStart', [FAM.key, email], true);
      FAM.email = email;
      form.remove(); render();
      return document.getElementById('feCode').focus();
    }
    await memberApi('familyEmailConfirm', [FAM.key, email, code], true);
    meNote = `Done. ${FAM.name} can now sign in to On Target with ${email}.`;
    FAM = { key: '', name: '', email: '' }; ME = null; meState = '';
    form.remove(); render();
  } catch (e) {
    if (e.signedOut) return;
    btn.disabled = false; btn.textContent = label;
    fail(e.message, box);
  }
}

/* ----- Admins: one member, and their family ("Add to family" / "Remove from family") ----- */
const membersBack = `<a class="back-link" href="#/committee/members">${ICON.chev}All members &amp; status</a>`;
async function loadMemberAdmin(id) {
  if (MEMADMIN.state === 'loading') return;
  MEMADMIN.id = id; MEMADMIN.state = 'loading';
  try { MEMADMIN.data = await committeeApi('familyGet', [id]); MEMADMIN.state = ''; }
  catch (e) { if (e.signedOut) { MEMADMIN.state = ''; return; } MEMADMIN.state = 'failed'; MEMADMIN.error = e.message; }
  if (currentPage === 'committee/member') render(true);
}
function memberAdminView(arg) {
  const id = decodeURIComponent(arg || '');
  if (!id) { location.replace('#/committee/members'); return ''; }
  if (MEMADMIN.id !== id) MEMADMIN = { id, data: null, state: '', note: MEMADMIN.note, error: '' };
  if (!MEMADMIN.data && MEMADMIN.state !== 'failed') setTimeout(() => loadMemberAdmin(id), 0);
  const d = MEMADMIN.data;
  if (!d) return `<div class="page-title">${membersBack}<h1>Member</h1></div><section class="section">${MEMADMIN.state === 'failed'
    ? `<div class="card empty"><div class="empty-title">Can't open that member</div><p class="muted">${esc(MEMADMIN.error)}</p><button type="button" class="btn btn-outline" data-memadmin-reload>${ICON.refresh}Try again</button></div>` : skeletonRows(3)}</section>`;
  const b = MEM_BADGE[d.status] || MEM_BADGE.none, fam = d.family, year = new Date().getFullYear();
  const tags = m => `<span class="mbadge mbadge-fam">${m.role === 'Primary' ? 'Pays' : m.role}${m.yob ? ', born ' + m.yob : ''}</span>${m.ownEmail ? '<span class="mbadge mbadge-grey">Own sign-in</span>' : ''}${m.hidden ? '<span class="mbadge mbadge-grey">Hidden from family</span>' : ''}`;
  const others = fam ? fam.members.filter(m => m.id !== d.id) : [], me = fam ? fam.members.find(m => m.id === d.id) : null;
  return `
    <div class="page-title">${membersBack}<h1>${esc(d.name)}</h1></div>
    <section class="section">
      ${MEMADMIN.note ? `<p class="notice" role="status">${esc(MEMADMIN.note)}</p>` : ''}
      <div class="card form">
        <div class="detail-row"><span class="muted">SSAA number</span><b>${esc(d.ssaa || 'None on our records')}</b></div>
        <div class="detail-row"><span class="muted">Membership</span><b>${esc(d.type || 'None')}${d.expiry ? ' · ' + (d.status === 'expired' ? 'expired ' : 'to ') + niceDate(d.expiry) : ''}</b></div>
        <div class="mem-badges"><span class="mbadge mbadge-${b[0]}">${b[1]}</span>${me ? tags(me) : ''}</div>
      </div>
    </section>
    <section class="section"><form class="card form" id="knownForm" novalidate>
      <label class="field-label" for="kaText">Known as <span class="field-hint">optional, e.g. Bob</span></label>
      <input class="field" id="kaText" maxlength="30" autocomplete="off" autocapitalize="words" value="${esc(d.known || '')}">
      <p class="muted">Helps the club team find ${esc(d.name)} when posting results. Members can also change it in My details.</p>
      <p class="form-error" id="kaError" role="alert" hidden></p>
      <button type="submit" class="btn btn-outline btn-big" id="kaSave">Save "Known as"</button>
    </form></section>
    <section class="section">
      <div class="section-head"><h2 class="caps-head">Family</h2></div>
      ${fam ? `<p class="muted">${fam.isPrimary ? `${esc(d.name)} pays for this family membership. Everyone in it has the same status.` : fam.primary ? `In ${esc(fam.primary.name)}'s family. <a href="#/committee/member/${encodeURIComponent(fam.primary.id)}">Open ${esc(fam.primary.name)}</a> to add people.` : 'In a family whose paying member can no longer be found.'}</p>
        ${others.length ? `<div class="card list">${others.map(m => `<div class="mem-row"><div class="list-main"><div class="list-title">${esc(m.name)}</div><div class="mem-badges">${tags(m)}</div></div>
          ${m.role === 'Primary' ? '' : `<button type="button" class="btn btn-outline" data-fam-remove="${esc(m.id)}">Remove from family</button>`}</div>`).join('')}</div>` : '<p class="muted">Nobody else is in this family yet.</p>'}
        ${!fam.isPrimary || !others.length ? `<button type="button" class="btn btn-danger" data-fam-remove="${esc(d.id)}">Remove ${esc(d.name)} from ${fam.isPrimary ? 'the' : 'this'} family</button>` : ''}`
      : `<p class="muted">${esc(d.name)} is not in a family.</p>`}
      ${d.familyText && d.canAdd ? `<p class="notice">On their form, the family members were given as: <b>${esc(d.familyText)}</b></p>` : ''}
    </section>
    ${d.canAdd ? `<section class="section"><form class="card form" id="famAddForm" novalidate>
      <h2 class="form-head">Add to ${esc(d.name)}'s family</h2>
      <p class="muted">${esc(d.name)} is the one who pays. Each family member gets their own membership card, and the family's status.</p>
      <fieldset class="choices"><legend class="field-label">Who are you adding?</legend>${radios('faWho', [['new', 'Someone new', 'Not in the members list yet, e.g. a child'], ['old', 'Someone already in the members list', 'They keep their results and details']], 'new')}</fieldset>
      <div id="faNew">
        <label class="field-label" for="faFirst">First name</label><input class="field" id="faFirst" maxlength="40" autocomplete="off" autocapitalize="words">
        <label class="field-label" for="faLast">Surname</label><input class="field" id="faLast" maxlength="40" autocomplete="off" autocapitalize="words">
        <label class="field-label" for="faSsaa">SSAA number <span class="field-hint">if they have one</span></label><input class="field" id="faSsaa" maxlength="20" autocomplete="off">
      </div>
      <div id="faOld" hidden>
        <label class="field-label" for="faPick">Which member?</label>
        <select class="field" id="faPick"><option value="">Choose a member…</option>${d.candidates.map(m => `<option value="${esc(m.id)}">${esc(m.name)}${m.ssaa ? ' (SSAA ' + esc(m.ssaa) + ')' : ''}</option>`).join('')}</select>
      </div>
      <label class="field-label" for="faYob">Year of birth <span class="field-hint">juniors (under 18) only; leave empty for an adult</span></label>
      <input class="field" id="faYob" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="e.g. ${year - 12}">
      <p class="form-error" id="faError" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-big" id="faSubmit">Add to family</button>
    </form></section>` : ''}`;
}
async function addToFamily(form) {
  const btn = form.querySelector('#faSubmit'), error = form.querySelector('#faError'), val = id => form.querySelector(id).value.trim();
  if (btn.disabled) return;
  const fail = (msg, id) => { error.textContent = msg; error.hidden = false; if (id) form.querySelector(id).focus(); };
  const old = (form.querySelector('input[name="faWho"]:checked') || {}).value === 'old', yob = val('#faYob');
  const d = old ? { memberId: val('#faPick'), yob } : { first: val('#faFirst'), last: val('#faLast'), ssaa: val('#faSsaa'), yob };
  if (old && !d.memberId) return fail('Please choose a member from the list.', '#faPick');
  if (!old && !d.first) return fail('Please type their first name.', '#faFirst');
  if (!old && !d.last) return fail('Please type their surname.', '#faLast');
  if (yob && !/^\d{4}$/.test(yob)) return fail('Please type the year of birth as four digits, or leave it empty for an adult.', '#faYob');
  error.hidden = true; btn.disabled = true; btn.textContent = 'Adding…';
  try {
    const out = await committeeApi('familyAdd', [MEMADMIN.id, d]);
    MEMADMIN.note = (out && out.message) || 'Added.'; MEMADMIN.data = null; ADMIN.mem.items = null;
    form.remove(); render();
  } catch (e) { if (e.signedOut) return; btn.disabled = false; btn.textContent = 'Add to family'; fail(e.message); }
}
function askRemoveFromFamily(id) {
  const d = MEMADMIN.data, m = d && d.family && d.family.members.find(x => x.id === id);
  if (!m) return;
  confirmAsk({ title: `Remove ${m.name} from the family?`, text: `It takes effect straight away, even on phones already signed in: the family no longer sees ${m.name}, and ${m.name} no longer has the family's membership.`,
    yes: 'Yes, remove them', busy: 'Removing…', no: 'No, go back', run: () => committeeApi('familyRemove', [id]),
    done: out => { MEMADMIN.note = (out && out.message) || 'Removed.'; MEMADMIN.data = null; ADMIN.mem.items = null; render(); } });
}

/* ----- Admins: import the club's members list spreadsheet -----
   The file is read here, on the admin's own device (an Excel .xlsx or a .csv), and only the rows are sent.
   The server first says what WOULD happen to every row; nothing is added until the admin agrees. */
const IMPORT_COLS = [['last', /^(surname|last name|family name)\b/], ['first', /^(first name|given name|first)\b/], ['ssaa', /ssaa/], ['type', /single or family|^membership/], ['group', /family group/],
  ['paidTo', /paid up to|paid to|^expiry/], ['mobile', /mobile|phone/], ['email', /e ?mail/], ['notes', /^notes?\b/], ['yob', /year of birth|birth year|\byob\b/],
  ['known', /^(known as|nickname|preferred name|goes by)\b/]];
/* A heading as typed ("Surname *", "SURNAME:", "First Name (required)") -> plain lower-case words, so small differences don't matter */
const importHead = v => String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/* A date as typed in the spreadsheet -> yyyy-mm-dd, or the text itself when it can't be read (the server then says so) */
function importDate(v) {
  const t = String(v == null ? '' : v).trim(), pad = n => String(n).padStart(2, '0'), iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  let m;
  if (!t) return '';
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t))) return iso(m[1], m[2], m[3]);
  if ((m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(t))) return iso(m[3], m[2], m[1]); // day first, as written in Australia
  if ((m = /^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})$/.exec(t))) { const at = MONTHS.indexOf(m[2].toUpperCase()); if (at >= 0) return iso(m[3], at + 1, m[1]); }
  if (/^\d{5}(\.\d+)?$/.test(t)) { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(t)) * 86400000); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); } // Excel's day number
  return t;
}
function csvCells(text) {
  const rows = [[]]; let cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === ',') { rows[rows.length - 1].push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; rows[rows.length - 1].push(cell); cell = ''; rows.push([]); }
    else cell += ch;
  }
  rows[rows.length - 1].push(cell);
  return rows;
}
/* An .xlsx file is a zip of XML files. This opens every sheet with what the browser already has: no library.
   Gives back one grid of cells for each sheet, in the files' own order. */
async function xlsxCells(buf) {
  const view = new DataView(buf), bytes = new Uint8Array(buf), text = new TextDecoder();
  let end = buf.byteLength - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('not a zip');
  const files = {};
  for (let at = view.getUint32(end + 16, true), n = view.getUint16(end + 10, true); n > 0; n--) {
    const nameLen = view.getUint16(at + 28, true), local = view.getUint32(at + 42, true);
    files[text.decode(bytes.subarray(at + 46, at + 46 + nameLen))] = { method: view.getUint16(at + 10, true), size: view.getUint32(at + 20, true), local };
    at += 46 + nameLen + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  const read = async name => {
    const f = files[name];
    if (!f) return '';
    const start = f.local + 30 + view.getUint16(f.local + 26, true) + view.getUint16(f.local + 28, true), data = bytes.subarray(start, start + f.size);
    if (f.method === 0) return text.decode(data);
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  };
  const xml = async name => new DOMParser().parseFromString(await read(name), 'application/xml');
  const all = (node, tag) => [...node.getElementsByTagNameNS('*', tag)]; // whatever prefix the file's maker gave the tags
  // Phonetic guides (rPh) are left out of a cell's text
  const words = node => all(node, 't').filter(t => !(t.parentNode && t.parentNode.localName === 'rPh')).map(t => t.textContent).join('');
  const shared = all(await xml('xl/sharedStrings.xml'), 'si').map(words);
  const sheets = Object.keys(files).filter(n => /^xl\/worksheets\/[^\/]+\.xml$/.test(n)).sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0));
  if (!sheets.length) throw new Error('no sheet');
  const grids = [];
  for (const sheet of sheets) {
    const rows = [];
    all(await xml(sheet), 'row').forEach((row, i) => {
      const at = (Number(row.getAttribute('r')) || i + 1) - 1, cells = rows[at] = [];
      all(row, 'c').forEach((c, j) => {
        let col = 0;
        for (const ch of (c.getAttribute('r') || '').replace(/[^A-Za-z]/g, '').toUpperCase()) col = col * 26 + ch.charCodeAt(0) - 64;
        const v = all(c, 'v')[0], type = c.getAttribute('t');
        cells[(col || j + 1) - 1] = type === 's' ? shared[Number(v && v.textContent)] || '' : type === 'inlineStr' ? words(c) : v ? v.textContent : '';
      });
    });
    grids.push(Array.from(rows, r => Array.from(r || [], c => c == null ? '' : c)));
  }
  return grids;
}
/* The sheets' cells -> the rows the server takes. The members are on the first sheet that has a heading row with
   "Surname" in it (a template often has a notes or instructions sheet first, and a title above the headings). */
function importRows(grids) {
  const clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim(), is = n => c => IMPORT_COLS[n][1].test(importHead(c));
  // The heading row has "Surname" AND "First name" in it: a line of instructions that only mentions one of them isn't it
  let cells = null, head = -1;
  for (const g of grids) { head = g.findIndex(r => r && r.some(is(0)) && r.some(is(1))); if (head >= 0) { cells = g; break; } }
  if (!cells) {
    // Say what was found, so it is plain what to change
    const first = (grids.find(g => g.some(r => r && r.some(c => clean(c)))) || []).find(r => r && r.some(c => clean(c))) || [];
    const seen = first.map(clean).filter(Boolean).slice(0, 8).join(', ');
    throw new Error(`That file has no row of headings with "Surname" and "First name" in it. Please use the RDSS Members list template.${seen ? ` The first row On Target can read is: ${seen}.` : ' On Target could not read any words in it.'}`);
  }
  const at = {};
  cells[head].forEach((h, i) => { const hit = IMPORT_COLS.find(([key, re]) => !(key in at) && re.test(importHead(h))); if (hit) at[hit[0]] = i; });
  const out = [];
  let examples = 0;
  cells.slice(head + 1).forEach((r, i) => {
    const get = key => key in at && r ? clean(r[at[key]]) : '';
    const row = { line: head + i + 2, last: get('last'), first: get('first'), ssaa: get('ssaa').replace(/\.0$/, ''), type: get('type'), group: get('group'), paidTo: importDate(get('paidTo')),
      mobile: get('mobile'), email: get('email'), notes: get('notes'), yob: get('yob').replace(/\.0$/, ''), known: get('known').replace(/["“”]/g, '') };
    if (/^\d{9}$/.test(row.mobile) && /^[2-478]/.test(row.mobile)) row.mobile = '0' + row.mobile; // Excel drops the leading 0 of a number
    // The template's own example rows are never members: the ones whose surname starts "EXAMPLE –" (any kind of dash)
    if (/^example\s*[–—-]/i.test(row.last)) examples++;
    else if (row.last || row.first || row.ssaa || row.email) out.push(row);
  });
  if (!out.length) throw new Error(`There are no members under the headings in that file yet${examples ? ' (only the example rows, which are left out)' : ''}. Fill in the template, save it, and choose it again.`);
  out.examples = examples;
  return out;
}
async function chooseImport(file) {
  IMPORT = { name: file.name, rows: null, report: null, state: 'reading', error: '', note: '' };
  render(true);
  try {
    const grids = /\.csv$/i.test(file.name) ? [csvCells((await file.text()).replace(/^\uFEFF/, ''))] : await xlsxCells(await file.arrayBuffer());
    IMPORT.rows = importRows(grids);
    IMPORT.examples = IMPORT.rows.examples || 0;
  } catch (e) {
    IMPORT.state = 'failed';
    console.warn('Import', e);
    IMPORT.error = /template|no members|headings/.test(e.message) ? e.message : "That file can't be read. Please choose the members list saved as an Excel workbook (.xlsx) or as CSV.";
    return render(true);
  }
  checkImport();
}
async function checkImport() {
  IMPORT.state = 'checking'; render(true);
  try { IMPORT.report = await committeeApi('membersImport', [IMPORT.rows, false]); IMPORT.state = ''; }
  catch (e) { if (e.signedOut) return; IMPORT.state = 'failed'; IMPORT.error = e.message; }
  if (currentPage === 'committee/import') render(true);
}
function importView() {
  const r = IMPORT.report, n = (k, one, many) => `<div class="admin-count"><span>${r[k] === 1 ? one : many}</span><b>${r[k]}</b></div>`;
  const rows = r ? r.rows.slice().sort((a, b) => (b.problem ? 1 : 0) - (a.problem ? 1 : 0) || a.line - b.line) : [];
  return `
    <div class="page-title">${adminBack}<h1>Import members list</h1><p class="muted">Brings the club's members list spreadsheet into On Target.</p></div>
    <section class="section">
      ${IMPORT.note ? `<p class="notice" role="status">${esc(IMPORT.note)}</p>` : ''}
      <div class="card form">
        <p>Use the <b>RDSS Members list – template</b>. Its headings are: Surname, First name, Known as, SSAA member number, Single or Family, Family group, Paid up to, Mobile, Email, Notes, Year of birth (juniors only).</p>
        <p class="muted">Give everyone in one family the same name under “Family group”. The first adult listed in a family is taken as the one who pays.</p>
        <input type="file" id="imFile" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>
        <button type="button" class="btn ${r ? 'btn-outline' : 'btn-primary'} btn-big" data-import-choose${IMPORT.state === 'reading' || IMPORT.state === 'checking' ? ' disabled' : ''}>${ICON.doc}${IMPORT.name ? 'Choose a different file' : 'Choose the file'}</button>
        ${IMPORT.name ? `<p class="muted" role="status">${IMPORT.state === 'reading' ? 'Reading ' : IMPORT.state === 'checking' ? 'Checking ' : 'Chosen: '}${esc(IMPORT.name)}${IMPORT.state === 'reading' || IMPORT.state === 'checking' ? '…' : ''}</p>` : ''}
        ${IMPORT.state === 'failed' ? `<p class="form-error" role="alert">${esc(IMPORT.error)}</p>` : ''}
      </div>
      ${IMPORT.state === 'checking' ? skeletonRows(3) : ''}
      ${r ? `<div class="admin-counts">${n('added', 'New member', 'New members')}${n('already', 'Already in the list', 'Already in the list')}${n('families', 'Family', 'Families')}
          ${r.problems ? `<div class="admin-count red"><span>${r.problems === 1 ? 'Row with a problem' : 'Rows with a problem'}</span><b>${r.problems}</b></div>` : ''}</div>
        ${IMPORT.examples ? `<p class="muted">${IMPORT.examples === 1 ? 'The example row is' : 'The ' + IMPORT.examples + ' example rows are'} left out.</p>` : ''}
        <p class="muted">Nothing has been added yet. Rows with a problem are left out: fix them in the spreadsheet and choose the file again. Nobody already in the members list is changed, except to be put in their family.</p>
        ${r.added ? `<button type="button" class="btn btn-primary btn-big" data-import-go>Add ${r.added} new member${r.added === 1 ? '' : 's'}</button>` : '<p class="notice">There is nobody new to add from this file.</p>'}
        <div class="card list">${rows.map(x => `<div class="mem-row${x.problem ? ' not-financial' : ''}"><div class="list-main"><div class="list-title">${esc(x.name)}</div>
          <div class="muted">Row ${x.line} · ${x.problem ? `<b class="import-bad">${esc(x.problem)}</b>` : esc(x.note)}</div></div></div>`).join('')}</div>` : ''}
    </section>`;
}
function askImport() {
  const r = IMPORT.report;
  if (!r || !r.added) return;
  confirmAsk({ title: `Add ${r.added} new member${r.added === 1 ? '' : 's'}?`, text: 'They go into the private Members spreadsheet with the "Paid up to" date from your file. No emails are sent.',
    yes: 'Yes, add them', busy: 'Adding… this can take a minute', no: 'No, go back', run: () => committeeApi('membersImport', [IMPORT.rows, true]),
    done: out => { IMPORT = { name: '', rows: null, report: null, state: '', error: '', note: (out && out.message) || 'Done.' }; ADMIN.mem.items = null; ADMIN.summaryAt = 0; render(true); } });
}

view.addEventListener('click', e => {
  let v; const hit = attr => { const x = e.target.closest(`[${attr}]`); if (!x || x.disabled) return null; v = x.getAttribute(attr); return x; };
  if (hit('data-view-as')) viewAs(v);
  if (hit('data-fam-email') && ME && ME.family) { const f = ME.family.find(x => x.key === v); if (f) { FAM = { key: f.key, name: f.first, email: '' }; meNote = ''; render(); } }
  if (hit('data-fam-cancel')) { FAM = { key: '', name: '', email: '' }; render(); }
  if (hit('data-fam-back')) { FAM.email = ''; render(); }
  if (hit('data-memadmin-reload')) { MEMADMIN.state = ''; render(true); }
  if (hit('data-fam-remove')) askRemoveFromFamily(v);
  if (hit('data-import-choose')) document.getElementById('imFile').click();
  if (hit('data-import-go')) askImport();
});
view.addEventListener('submit', e => {
  if (e.target.id === 'famEmailForm') { e.preventDefault(); familyEmail(e.target); }
  if (e.target.id === 'famAddForm') { e.preventDefault(); addToFamily(e.target); }
  if (e.target.id === 'knownForm') { e.preventDefault(); saveKnownAs(e.target); }
});
/* Admins: a member's "Known as" (v2.9.0) */
async function saveKnownAs(form) {
  const btn = form.querySelector('#kaSave'), error = form.querySelector('#kaError'), label = btn.textContent;
  if (btn.disabled) return;
  error.hidden = true; btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const out = await committeeApi('memberSetKnownAs', [MEMADMIN.id, form.querySelector('#kaText').value.trim().replace(/["“”]/g, '')]);
    MEMADMIN.note = (out && out.message) || 'Saved.'; if (MEMADMIN.data) MEMADMIN.data.known = out.known;
    MEMBERS = null; // the shooter picker loads the names again, with the new nickname
    form.remove(); render();
  } catch (e) {
    if (e.signedOut) return;
    btn.disabled = false; btn.textContent = label;
    error.textContent = e.message; error.hidden = false;
  }
}
view.addEventListener('change', e => {
  if (e.target.id === 'imFile' && e.target.files[0]) chooseImport(e.target.files[0]);
  if (e.target.name === 'faWho') { const old = e.target.value === 'old', form = e.target.form; form.querySelector('#faOld').hidden = !old; form.querySelector('#faNew').hidden = old; }
});

/* ---------- Link old results (v2.9.0, admins only) ----------
   Results posted before shooters were picked from the members list have no member linked. They are grouped by the name
   on the results, each with a suggested member; an admin links them one name at a time (all the results, or just the
   ticked ones), or marks a name as a visitor. Results that a second member has claimed are listed first, to sort out. */
let OLDRES = { data: null, state: '', note: '', filter: '', who: {} };   // who: the member chosen for each name, by group number
async function loadOldResults() {
  if (OLDRES.state === 'loading') return;
  OLDRES.state = 'loading';
  if (!MEMBERS) loadMembers();
  try {
    OLDRES.data = await committeeApi('oldResults'); OLDRES.state = ''; OLDRES.who = {};
    OLDRES.data.groups.forEach((g, i) => { if (g.suggest) OLDRES.who[i] = g.suggest.id; });
  } catch (e) { if (e.signedOut) { OLDRES.state = ''; return; } OLDRES.state = 'failed'; OLDRES.error = e.message; }
  if (currentPage === 'committee/oldresults') render(true);
}
const orMember = id => (MEMBERS || []).find(m => m.id === id) || null;
function orChosen(i) {
  const g = OLDRES.data.groups[i], id = OLDRES.who[i], m = orMember(id) || (g.suggest && g.suggest.id === id ? g.suggest : null);
  if (m) return `${ICON.check}<span>${id === (g.suggest && g.suggest.id) ? 'Suggested: ' : ''}${memberLabel(m)}</span>`;
  if (g.could.length) return `<span>Could be ${g.could.map(c => esc(c.name)).join(' or ')}. Type to choose.</span>`;
  return '<span>No member has this name. Type to search, or mark them as a visitor.</span>';
}
function orGroup(g, i) {
  const n = g.lines.length, linked = !!OLDRES.who[i];
  return `<div class="card or-group" data-or="${i}">
    <div class="or-head"><b>${esc(g.name)}</b><span class="muted">${n} result${n === 1 ? '' : 's'}</span></div>
    <label class="field-label" for="orWho${i}">Member</label>
    <input class="field" id="orWho${i}" data-or-who="${i}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="orPick${i}" maxlength="60" autocomplete="off"
      placeholder="Name, nickname or SSAA number" value="${esc(linked ? ((orMember(OLDRES.who[i]) || g.suggest || {}).name || '') : '')}">
    <div class="rs-pick" id="orPick${i}" role="listbox" aria-label="Members" hidden></div>
    <p class="rs-member or-chosen${linked ? '' : ' or-none'}">${orChosen(i)}</p>
    <details class="or-lines"><summary>Choose which results (all ${n} ticked)</summary>
      ${g.lines.map((l, j) => `<label class="choice or-line"><input type="checkbox" data-or-line="${j}" checked>
        <span><span class="choice-title">${esc(l.competition)}, ${esc(niceDate(l.date))}</span><span class="choice-text">${resultLine(l) || 'No place or score'}</span></span></label>`).join('')}
    </details>
    <div class="btn-row or-btns">
      <button type="button" class="btn btn-primary" data-or-link="${i}"${linked ? '' : ' disabled'}>Link ${n === 1 ? 'it' : 'all ' + n}</button>
      <button type="button" class="btn btn-outline" data-or-visitor="${i}">Visitor</button>
    </div>
  </div>`;
}
function oldResultsView() {
  if (!OLDRES.data && OLDRES.state !== 'failed') setTimeout(loadOldResults, 0);
  const d = OLDRES.data, q = OLDRES.filter.toLowerCase();
  const head = `<div class="page-title">${adminBack}<h1>Link old results</h1><p class="muted">Results posted before shooters were picked from the members list. Link each name to the member, so the results show in their My shooting.</p></div>`;
  if (!d) return head + `<section class="section">${OLDRES.state === 'failed' ? `<div class="card empty"><div class="empty-title">Couldn't load the results</div><p class="muted">${esc(OLDRES.error || '')}</p>
    <button type="button" class="btn btn-outline" data-or-reload>${ICON.refresh}Try again</button></div>` : skeletonRows(4)}</section>`;
  const shown = d.groups.map((g, i) => [g, i]).filter(([g]) => !q || g.name.toLowerCase().includes(q)), max = 40;
  return head + `
    ${OLDRES.note ? `<section class="section"><p class="notice" role="status">${esc(OLDRES.note)}</p></section>` : ''}
    ${d.flags.length ? `<section class="section">
      <div class="section-head"><h2 class="caps-head">Claimed by two members</h2></div>
      <p class="muted">A member said these are theirs, but they were already linked to someone else. Nothing has changed until you choose.</p>
      ${d.flags.map(f => `<div class="card or-flag">
        <div class="list-title">${esc(f.competition)}, ${esc(niceDate(f.date))}</div>
        <p class="muted">Listed as <b>${esc(f.shooter)}</b>${f.score ? ' · Score ' + esc(f.score) : ''}. Linked to <b>${esc(f.linkedTo)}</b>; <b>${esc(f.member)}</b> says it's theirs${f.by ? ' (' + esc(f.by) + ' asked for them)' : ''}.</p>
        <div class="btn-row or-btns">
          <button type="button" class="btn btn-primary" data-claim-move="${esc(f.id)}">Give it to ${esc(f.member)}</button>
          <button type="button" class="btn btn-outline" data-claim-keep="${esc(f.id)}">Keep with ${esc(f.linkedTo)}</button>
        </div></div>`).join('')}
    </section>` : ''}
    <section class="section">
      ${d.groups.length ? `<div class="section-head"><h2 class="caps-head">${d.lines} result${d.lines === 1 ? '' : 's'} under ${d.groups.length} name${d.groups.length === 1 ? '' : 's'}</h2></div>
      <div class="card form" role="search"><label class="field-label" for="orFilter">Find a name</label>
        <input class="field" id="orFilter" type="search" autocomplete="off" value="${esc(OLDRES.filter)}" placeholder="e.g. Gordon"></div>
      <div id="orGroups">${shown.slice(0, max).map(([g, i]) => orGroup(g, i)).join('') || '<p class="muted">No names match.</p>'}</div>
      ${shown.length > max ? `<p class="muted">Showing the ${max} names with the most results. Type a name above to find the other ${shown.length - max}.</p>` : ''}`
      : empty('All linked', 'Every result is linked to a member or marked as a visitor.')}
    </section>`;
}
function orPicks(input) {
  const i = Number(input.dataset.orWho), box = document.getElementById('orPick' + i), list = memberMatches(input.value);
  box.innerHTML = list.map((m, j) => `<button type="button" class="rs-option" role="option" id="orPick${i}o${j}" aria-selected="false" data-or-pick="${esc(m.id)}">${memberLabel(m)}</button>`).join('');
  box.hidden = !list.length; input.setAttribute('aria-expanded', String(!!list.length));
}
function orSet(i, id) {
  const card = view.querySelector(`[data-or="${i}"]`); if (!card) return;
  if (id) OLDRES.who[i] = id; else delete OLDRES.who[i];
  const m = orMember(id), input = card.querySelector('[data-or-who]'), box = card.querySelector('.rs-pick');
  if (m) input.value = m.name;
  box.hidden = true; box.innerHTML = ''; input.setAttribute('aria-expanded', 'false');
  const note = card.querySelector('.or-chosen'); note.innerHTML = orChosen(i); note.classList.toggle('or-none', !id);
  card.querySelector('[data-or-link]').disabled = !id;
}
function orTicked(i) {
  const card = view.querySelector(`[data-or="${i}"]`), g = OLDRES.data.groups[i];
  return [...card.querySelectorAll('[data-or-line]')].filter(b => b.checked).map(b => g.lines[Number(b.dataset.orLine)].key);
}
function orDone(out) { OLDRES.note = (out && out.message) || 'Done.'; OLDRES.data = null; OLDRES.state = ''; ADMIN.summaryAt = 0; render(true); view.focus(); }
async function orLink(btn, i) {
  const keys = orTicked(i), id = OLDRES.who[i];
  if (!id || btn.disabled) return;
  if (!keys.length) { OLDRES.note = 'Tick at least one result to link.'; return render(true); }
  btn.disabled = true; btn.textContent = 'Linking…';
  try { orDone(await committeeApi('oldResultsLink', [keys, id])); }
  catch (e) { if (e.signedOut) return; btn.disabled = false; btn.textContent = 'Link'; OLDRES.note = e.message; render(true); }
}
function orVisitor(i) {
  const keys = orTicked(i), g = OLDRES.data.groups[i];
  if (!keys.length) { OLDRES.note = 'Tick at least one result first.'; return render(true); }
  confirmAsk({ title: `Mark ${g.name} as a visitor?`, text: `${keys.length === 1 ? 'This result' : 'These ' + keys.length + ' results'} will stay on the results as they are, and leave this list. They won't be suggested to members.`,
    yes: 'Yes, a visitor', busy: 'Saving…', no: 'No, go back', run: () => committeeApi('oldResultsVisitor', [keys]), done: orDone });
}
async function orResolve(btn, id, move) {
  if (btn.disabled) return;
  view.querySelectorAll('[data-claim-move],[data-claim-keep]').forEach(b => { b.disabled = true; });
  btn.textContent = 'Saving…';
  try { orDone(await committeeApi('claimResolve', [id, move])); }
  catch (e) { if (e.signedOut) return; OLDRES.note = e.message; OLDRES.data = null; render(true); }
}
view.addEventListener('input', e => {
  if (e.target.id === 'orFilter') {
    OLDRES.filter = e.target.value.trim();
    const q = OLDRES.filter.toLowerCase(), box = document.getElementById('orGroups');
    box.innerHTML = OLDRES.data.groups.map((g, i) => [g, i]).filter(([g]) => !q || g.name.toLowerCase().includes(q)).slice(0, 40).map(([g, i]) => orGroup(g, i)).join('') || '<p class="muted">No names match.</p>';
  }
  if (e.target.dataset.orWho !== undefined) {
    const i = Number(e.target.dataset.orWho), m = orMember(OLDRES.who[i]);
    if (!m || m.name !== e.target.value) orSet(i, ''); // typing again un-chooses
    orPicks(e.target);
  }
});
view.addEventListener('keydown', e => {
  if (e.target.id === 'orFilter' && e.key === 'Enter') e.preventDefault();
  if (e.target.dataset.orWho === undefined) return;
  const i = Number(e.target.dataset.orWho), opts = [...document.getElementById('orPick' + i).querySelectorAll('.rs-option')];
  const at = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && opts.length) {
    e.preventDefault();
    const next = e.key === 'ArrowDown' ? (at + 1) % opts.length : (at <= 0 ? opts.length : at) - 1;
    opts.forEach((o, j) => o.setAttribute('aria-selected', String(j === next)));
    e.target.setAttribute('aria-activedescendant', opts[next].id);
  } else if (e.key === 'Enter' && opts.length) { e.preventDefault(); orSet(i, opts[Math.max(0, at)].dataset.orPick); }
  else if (e.key === 'Escape') { const box = document.getElementById('orPick' + i); box.hidden = true; }
});
view.addEventListener('focusout', e => {
  if (e.target.dataset.orWho === undefined) return;
  const box = document.getElementById('orPick' + e.target.dataset.orWho);
  setTimeout(() => { if (box && !box.contains(document.activeElement)) box.hidden = true; }, 150);
});
view.addEventListener('change', e => {
  if (e.target.dataset.orLine === undefined) return;
  const card = e.target.closest('[data-or]'), boxes = [...card.querySelectorAll('[data-or-line]')], on = boxes.filter(b => b.checked).length;
  card.querySelector('summary').textContent = `Choose which results (${on === boxes.length ? 'all ' + on : on + ' of ' + boxes.length} ticked)`;
  const link = card.querySelector('[data-or-link]');
  link.textContent = on === boxes.length ? (on === 1 ? 'Link it' : 'Link all ' + on) : `Link ${on}`;
});
view.addEventListener('mousedown', e => { if (e.target.closest('[data-or-pick]')) e.preventDefault(); });
view.addEventListener('click', e => {
  let v; const hit = attr => { const x = e.target.closest(`[${attr}]`); if (!x || x.disabled) return null; v = x.getAttribute(attr); return x; };
  let b;
  if ((b = hit('data-or-pick'))) { const i = Number(b.closest('[data-or]').dataset.or); orSet(i, v); }
  if ((b = hit('data-or-link'))) orLink(b, Number(v));
  if (hit('data-or-visitor')) orVisitor(Number(v));
  if ((b = hit('data-claim-move'))) orResolve(b, v, true);
  if ((b = hit('data-claim-keep'))) orResolve(b, v, false);
  if (hit('data-or-reload')) { OLDRES.state = ''; render(true); }
});

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

