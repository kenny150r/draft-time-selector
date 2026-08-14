import {
  BOOT_MS,
  CAPTCHA_TILES,
  FAST,
  HOLD_MS,
  HOURS,
  INSTALL_MULT,
  OATH,
  PRIMES,
  SLOT_IDS,
  SLOTS,
  TIMEZONE,
  TZ_OPTIONS,
  WEEKS,
  isPrime,
} from './config.js';
import { fetchResponses, saveResponse } from './db.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function coarse() {
  return window.matchMedia('(pointer: coarse)').matches;
}

const STEP_IDS = [
  'cookies',
  'wildcat',
  'tos',
  'quiz',
  'name',
  'captcha',
  'zone',
  'decoy',
  'avail',
  'hold',
  'oath',
  'install',
];

const LIE_STEPS = ['1 of 3', '2 of 3', '2 of 4', '3 of 4', '3 of 12', '7 of 4', '4 of 4', '5 of 4', '4 of 4', '99 of 4', '4 of 4', '4 of 4'];

const CLIPPY = {
  cookies: 'Before you pick a time, please accept 40 partners, 3 toolbars, and one cursed pixel from Tucson.',
  wildcat: 'Click the wildcat. Or don’t. He has cardio.',
  tos: 'Scroll. No, all the way. Legal added an amendment. They always do.',
  quiz: 'If you say you read the terms I will know you are lying. I am a paperclip, not an idiot.',
  name: 'Names containing “Arizona” will be forwarded to McKale Center.',
  captcha: 'Select every cactus. The cats are a trap. The cats are always a trap.',
  zone: 'The draft is in Pacific time. Arizona in August is the same clock. Bureaucracy still wants you to say Pacific.',
  decoy: 'Minutes must be prime. The commissioner is superstitious about composite numbers.',
  avail: 'Check EVERY Wed–Sun 6pm or 7pm PT you can actually do. Double-click. This is 1998.',
  hold: 'Hold. Commitment is the point. Also the bit.',
  oath: 'ALL CAPS. Like yelling at Tucson.',
  install: 'Please wait while we consult the council, defrag the commissioner, and ping wildcats.arizona.edu (blocked).',
};

const state = {
  step: 0,
  name: '',
  rel: '',
  timezone: '',
  avail: new Set(),
  rage: 0,
  startedAt: 0,
  tosRead: false,
  tosExtended: false,
  oathFails: 0,
  z: 20,
  selectAllLies: true,
  singleClicks: 0,
  allowSingleToggle: false,
  cookieUofa: true,
};

let holdTimer = null;
let holdStarted = 0;

function rage(n = 1) {
  state.rage += n;
}

function clippy(text) {
  const box = $('#clippy');
  const el = $('#clippy-text');
  if (!box || !el) return;
  el.textContent = text;
  box.classList.add('show');
}

function hideClippy() {
  $('#clippy')?.classList.remove('show');
}

function tickClock() {
  const el = $('#clock');
  if (!el) return;
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = d.getHours() >= 12 ? 'PM' : 'AM';
  el.textContent = `${h}:${m} ${ap}`;
}

function bootText() {
  return `WHUA-BIOS v4.0 Release 6.0
Copyright (C) 1997-2026 We Hate UofA Corp.

CPU: Pentium II (commissioner grade)
Memory Test: 65536K OK
League Members: ............ 12
Wildcat Sympathizers: ...... 1 (watching)

Detecting floppy... none
Detecting snacks... Cheez-Its, hope
Blocking wildcats.arizona.edu... OK

Press DEL to enter SETUP (disabled)
Starting Windows 98...`;
}

function makeDraggable(win) {
  const bar = win.querySelector('.title-bar');
  if (!bar) return;
  let dragging = false;
  let ox = 0;
  let oy = 0;
  bar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    dragging = true;
    win.style.zIndex = String(++state.z);
    const r = win.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    bar.setPointerCapture(e.pointerId);
    win.style.transform = 'none';
  });
  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    win.style.left = `${Math.max(0, e.clientX - ox)}px`;
    win.style.top = `${Math.max(0, e.clientY - oy)}px`;
  });
  bar.addEventListener('pointerup', () => {
    dragging = false;
  });
}

function windowChrome(id, title, body, extraClass = '') {
  const el = document.createElement('div');
  el.className = `window ${extraClass}`.trim();
  el.id = `win-${id}`;
  el.style.zIndex = String(++state.z);
  el.innerHTML = `
    <div class="title-bar">
      <div class="title-bar-text">${esc(title)}</div>
      <div class="title-bar-controls">
        <button type="button" aria-label="Minimize" data-win-min="${id}"></button>
        <button type="button" aria-label="Maximize" data-win-max="${id}"></button>
        <button type="button" aria-label="Close" data-win-close="${id}"></button>
      </div>
    </div>
    ${body}
  `;
  makeDraggable(el);
  $('#window-layer').append(el);
  el.addEventListener('mousedown', () => {
    el.style.zIndex = String(++state.z);
  });
  return el;
}

function getWin(id) {
  return document.getElementById(`win-${id}`);
}

function showWin(id) {
  const el = getWin(id);
  if (!el) return;
  el.hidden = false;
  el.style.zIndex = String(++state.z);
}

function closeWin(id) {
  const el = getWin(id);
  if (!el) return;
  if (id === 'wizard') {
    clippy('Closing is a UofA tactic. Minimizing instead.');
    el.hidden = true;
    rage();
    return;
  }
  el.remove();
}

function openWizard() {
  state.startedAt = state.startedAt || Date.now();
  if (getWin('wizard')) {
    showWin('wizard');
    return;
  }
  windowChrome(
    'wizard',
    'Draft Time Selection Wizard 98',
    `
      <div class="window-body scroll">
        <div id="wizard-body"></div>
        <div class="status-bar status-row">
          <p class="status-bar-field" id="status-step">Step 1 of 3</p>
          <p class="status-bar-field" id="status-done">Document: Done (but are you?)</p>
        </div>
      </div>
    `,
    'wizard',
  );
  spawnAds();
  renderStep();
}

function openReadme() {
  if (getWin('readme')) return showWin('readme');
  windowChrome(
    'readme',
    'readme.txt - Notepad',
    `<div class="window-body scroll">
      <pre style="white-space:pre-wrap;font-size:12px;margin:0">WE HATE UofA — 2026 DRAFT
================================
1. Hate UofA. This is the constitution.
2. Draft window: Wednesday through Sunday.
3. Times: 6:00 PM or 7:00 PM Pacific. Not 6:01. Not 7:30. Not "ish".
4. Mark EVERY slot you can do. This is availability, not a wish.
5. The commissioner may still pick a time that hurts you a little.
6. Snacks are mandatory. Tucson-themed snacks are banned.
7. If you went to UofA you draft last and also we are watching you.

- The Commissioner
  (sent from my Windows 98 machine)</pre>
    </div>`,
    'small-dialog',
  );
}

function openInternet() {
  if (getWin('ie')) return showWin('ie');
  windowChrome(
    'ie',
    'The Internet - Microsoft Internet Explorer',
    `<div class="window-body">
      <p><strong>Internet Explorer cannot display the webpage.</strong></p>
      <p>The request was blocked because it resolved to <code>wildcats.arizona.edu</code>.</p>
      <p>This is a feature. AOL Keyword: <s>BEARDOWN</s> NO.</p>
      <button type="button" data-win-close="ie">OK</button>
    </div>`,
    'small-dialog',
  );
}

function openRecycle() {
  if (getWin('recycle')) return showWin('recycle');
  windowChrome(
    'recycle',
    'Recycle Bin',
    `<div class="window-body">
      <p>This folder is empty.</p>
      <p style="font-size:11px;color:#000080">Items previously deleted:</p>
      <ul style="font-size:12px">
        <li>UofA football national titles (0 bytes)</li>
        <li>Bear Down.wav</li>
        <li>reasonable_ux.dll</li>
      </ul>
      <button type="button" data-win-close="recycle">OK</button>
    </div>`,
    'small-dialog',
  );
}

async function openResults() {
  let win = getWin('results');
  if (!win) {
    win = windowChrome(
      'results',
      'Draft Availability.xls - Microsoft Excel',
      `<div class="window-body scroll" id="results-body"><p>Loading from the league mainframe...</p></div>`,
      'results',
    );
  } else {
    showWin('results');
  }
  const body = $('#results-body');
  try {
    const rows = await fetchResponses();
    body.innerHTML = renderResultsHtml(rows);
  } catch (err) {
    body.innerHTML = `<p class="err">Could not reach the database. ${esc(err.message || err)}</p>`;
  }
}

function latestByName(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(String(row.display_name).trim().toLowerCase(), row);
  }
  return [...map.values()];
}

function renderResultsHtml(rows) {
  const latest = latestByName(rows);
  const counts = Object.fromEntries(SLOTS.map((s) => [s.id, 0]));
  const namesBySlot = Object.fromEntries(SLOTS.map((s) => [s.id, []]));
  for (const row of latest) {
    for (const id of row.available_slot_ids || []) {
      if (counts[id] == null) continue;
      counts[id] += 1;
      namesBySlot[id].push(row.display_name);
    }
  }
  const max = Math.max(0, ...Object.values(counts));
  const bestIds = new Set(SLOTS.filter((s) => counts[s.id] === max && max > 0).map((s) => s.id));

  const heatWeeks = WEEKS.map((week) => {
    const rowsHtml = week.days
      .map((day) => {
        const cells = HOURS.map((h) => {
          const id = `${day.date}T${h.key}`;
          const n = counts[id];
          const pct = max ? Math.round((n / max) * 100) : 0;
          const title = (namesBySlot[id] || []).join(', ') || 'nobody';
          return `<td class="${bestIds.has(id) ? 'best' : ''}" title="${esc(title)}">
            <div class="cell-heat" style="background:rgba(140,29,64,${max ? 0.12 + 0.8 * (n / max) : 0.08});color:${max && n / max > 0.55 ? '#fff' : '#000'}">${n}</div>
          </td>`;
        }).join('');
        return `<tr><td class="day">${esc(day.short)}</td>${cells}</tr>`;
      })
      .join('');
    return `<table class="avail-table heat">
      <thead>
        <tr><th class="week-head" colspan="3">${esc(week.title)}</th></tr>
        <tr><th></th><th>6:00 PM PT</th><th>7:00 PM PT</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
  }).join('');

  const bestLabels = SLOTS.filter((s) => bestIds.has(s.id)).map((s) => s.label);
  const guest = [...rows].reverse()
    .map(
      (r) => `<tr>
        <td>${esc(r.display_name)}</td>
        <td>${(r.available_slot_ids || []).length} slots</td>
        <td>${esc(new Date(r.created_at).toLocaleString())}</td>
      </tr>`,
    )
    .join('');

  return `
    <p class="construction">LIVE RESULTS — NOT A UofA SITE</p>
    <p>People who finished the wizard: <strong>${latest.length}</strong>
      (submissions: ${rows.length})</p>
    <p>${max > 0 ? `Best overlap: <strong>${esc(bestLabels.join(' · '))}</strong> (${max} free)` : 'Nobody has survived the form yet.'}</p>
    ${heatWeeks}
    <p class="hint">Numbers are unique people (latest submission per name). Hover a cell for names.</p>
    <h4>Guestbook</h4>
    <table class="guestbook">
      <thead><tr><th>Name</th><th>Marked</th><th>When they suffered</th></tr></thead>
      <tbody>${guest || '<tr><td colspan="3">empty, like UofA’s trophy case</td></tr>'}</tbody>
    </table>
  `;
}

function spawnAds() {
  if ($('#win-ad1')) return;
  windowChrome(
    'ad1',
    'CONGRATULATIONS',
    `<div class="window-body">
      <p class="blink">YOU ARE THE 1,000th VISITOR</p>
      <p>Claim your free UofA parking ticket!</p>
      <button type="button" id="ad-claim">CLAIM NOW</button>
      <button type="button" data-win-close="ad1">No thanks</button>
    </div>`,
    'small-dialog popup-ad',
  );
  const ad = getWin('ad1');
  if (ad) {
    ad.style.left = '24px';
    ad.style.top = '72px';
    ad.style.transform = 'none';
  }
}

function cookieHtml() {
  return `
    <div class="construction">⚠️ COOKIE NOTICE — REQUIRED BY THE COMMISSIONER ⚠️</div>
    <p>This site uses cookies, pixels, carrier pigeons, and one (1) cursed toolbar.</p>
    <fieldset>
      <legend>Manage cookies</legend>
      <div class="field-row"><input id="ck-need" type="checkbox" checked disabled /> <label for="ck-need">Strictly necessary (league spite)</label></div>
      <div class="field-row"><input id="ck-toolbar" type="checkbox" /> <label for="ck-toolbar">Install Ask.com toolbar</label></div>
      <div class="field-row"><input id="ck-saban" type="checkbox" /> <label for="ck-saban">Share my vote with Nick Saban</label></div>
      <div class="field-row"><input id="ck-uofa" type="checkbox" checked /> <label for="ck-uofa">Authorize the University of Arizona to use my likeness</label></div>
      <div class="field-row"><input id="ck-soul" type="checkbox" /> <label for="ck-soul">Sell my soul (optional, honestly already gone)</label></div>
    </fieldset>
    <p class="err" id="ck-err"></p>
    <div class="field-row" style="justify-content:flex-end;gap:6px;display:flex">
      <button type="button" disabled title="Your commissioner needs these">Reject all</button>
      <button type="button" id="ck-accept-all">Accept all</button>
      <button type="button" id="ck-save">Save preferences</button>
    </div>
    <p class="webring">UofA Haters Webring [prev] [random] [next]</p>
  `;
}

function wildcatHtml() {
  return `
    <h2 class="rainbow">Human / Wildcat Verification</h2>
    <p>Click the wildcat to prove you are not one. He will try to leave. They always do.</p>
    <div class="arena" id="arena">
      <button type="button" class="flee-btn" id="wildcat-btn">🐱 I am a wildcat</button>
    </div>
    <p class="hint" id="wildcat-hint"></p>
    <p><a class="skip-trap" href="./404.html">Skip this nonsense →</a></p>
  `;
}

function tosHtml() {
  return `
    <p>Please read the Terms of Spite in full. The Continue button is shy until you hit the bottom.</p>
    <div class="tos" id="tos">${tosBody()}</div>
    <p class="err" id="tos-err"></p>
    <button type="button" id="tos-next" disabled>I have read nothing and I agree</button>
  `;
}

function tosBody() {
  return `
    <h4>1. Parties</h4>
    <p>You (“the manager”, “the guy who always reaches for a kicker too early”) and We Hate UofA LLC (“the league”, “the bit”).</p>
    <h4>2. Definition of “soon”</h4>
    <p>Soon means after this form, which means never, which means Wednesday through Sunday at 6 or 7pm Pacific.</p>
    <h4>3. The University We Don’t Name</h4>
    <p>References to “UofA”, “Arizona”, “Wildcats”, or “Bear Down” are permitted only as insults. Cheering is a fouls against sportsmanship and also against this document.</p>
    <h4>4. Time</h4>
    <p>All times Pacific. If you live in Arizona: in August the clock matches Pacific. You still have to say Pacific because the commissioner enjoys paperwork.</p>
    <h4>5. Snacks</h4>
    <p>A league without snacks is a UofA booster club. Bring something. Not prickly pear anything. We have standards.</p>
    <h4>6. Draft order</h4>
    <p>If you went to UofA you draft last. If you own a red polo you draft last. If you say “bear down” unironically you are removed from the group chat and also history.</p>
    <h4>7. This form</h4>
    <p>This software is provided AS-IS, WHERE-IS, and WHY-IS. Clicking Continue constitutes a legally binding high-five.</p>
    <h4>8. Warranty</h4>
    <p>There is no warranty, express, implied, or hidden in the Recycle Bin. Windows 98 may crash. That is thematically correct.</p>
  `;
}

function quizHtml() {
  return `
    <p>A short quiz, because we do not trust you.</p>
    <fieldset>
      <legend>1. Did you read every word of the terms?</legend>
      <div class="field-row"><input type="radio" name="q1" id="q1t" value="true" /> <label for="q1t">True</label></div>
      <div class="field-row"><input type="radio" name="q1" id="q1f" value="false" /> <label for="q1f">False</label></div>
    </fieldset>
    <fieldset>
      <legend>2. How many football national championships does UofA have?</legend>
      <div class="field-row"><input type="radio" name="q2" id="q2a" value="1" /> <label for="q2a">1 (1997, they keep bringing it up)</label></div>
      <div class="field-row"><input type="radio" name="q2" id="q2b" value="0" /> <label for="q2b">0</label></div>
      <div class="field-row"><input type="radio" name="q2" id="q2c" value="1997" /> <label for="q2c">1997</label></div>
    </fieldset>
    <p class="err" id="quiz-err"></p>
    <button type="button" id="quiz-next">Grade me</button>
  `;
}

function nameHtml() {
  return `
    <div class="geo">
      <div class="marquee"><span>NO BEAR DOWN ALLOWED ON THESE PREMISES · VISITORS: <b class="hit-counter" id="hits">013429</b> · BEST VIEWED IN NETSCAPE 4.0 AT 800×600 ·</span></div>
      <h2>Identify yourself, hater</h2>
      <div class="field-row">
        <label for="mgr-name">Manager name:</label>
        <input id="mgr-name" type="text" maxlength="80" style="width:100%" value="${esc(state.name)}" />
      </div>
      <div class="field-row">
        <label for="mgr-rel">Relationship to UofA:</label>
        <select id="mgr-rel">
          <option value="">-- choose --</option>
          <option value="fan">UofA fan</option>
          <option value="alum">Alum</option>
          <option value="hate">I hate them professionally</option>
          <option value="asu">ASU / the good desert school</option>
          <option value="complicated">It's complicated</option>
        </select>
      </div>
      <div id="complicated-q" hidden>
        <div class="field-row">
          <label for="clap">Have you clapped for a Wildcat in the last 12 months?</label>
          <select id="clap">
            <option value="">-- honesty hour --</option>
            <option value="yes">Yes (accidentally, at a bar)</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>
      <p class="err" id="name-err"></p>
      <button type="button" id="name-next">Continue</button>
    </div>
  `;
}

function captchaHtml() {
  const tiles = shuffle(CAPTCHA_TILES)
    .map(
      (t, i) =>
        `<button type="button" class="cap" data-kind="${t.kind}" data-i="${i}" title="${esc(t.alt)}">${t.emoji}</button>`,
    )
    .join('');
  return `
    <p><strong>Select ALL squares with a cactus.</strong> Do not select Wildcats. They wish you would.</p>
    <div class="captcha-grid">${tiles}</div>
    <p class="err" id="cap-err"></p>
    <button type="button" id="cap-next">Verify</button>
  `;
}

function zoneHtml() {
  const opts = TZ_OPTIONS.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
  return `
    <p>Times are stored in <strong>Pacific</strong>. Choose the timezone of record.</p>
    <select id="tz" style="width:100%">${opts}</select>
    <p class="err" id="tz-err"></p>
    <button type="button" id="tz-next">Set timezone</button>
  `;
}

function decoyHtml() {
  return `
    <p>Preferred local time (this will be discarded, but we need it for compliance).</p>
    <div class="field-row">
      <label>Time (mirrored, as a treat):</label>
      <input id="decoy-time" type="time" class="mirror" />
    </div>
    <div class="field-row">
      <label for="decoy-min">Minute (must be prime):</label>
      <input id="decoy-min" type="number" min="0" max="59" />
    </div>
    <p class="hint" id="decoy-hint"></p>
    <p class="err" id="decoy-err"></p>
    <button type="button" id="decoy-next">Submit preferred time</button>
  `;
}

function availHtml() {
  const weeks = WEEKS.map((week) => {
    const rows = week.days
      .map((day) => {
        const cells = HOURS.map((h) => {
          const id = `${day.date}T${h.key}`;
          const on = state.avail.has(id) ? 'on' : '';
          return `<td><button type="button" class="cell ${on}" data-slot="${id}">${state.avail.has(id) ? 'YES' : '—'}</button></td>`;
        }).join('');
        return `<tr><td class="day">${esc(day.short)}</td>${cells}</tr>`;
      })
      .join('');
    return `
      <table class="avail-table">
        <thead>
          <tr><th class="week-head" colspan="3">${esc(week.title)}</th></tr>
          <tr><th>Day</th><th>6:00 PM PT</th><th>7:00 PM PT</th></tr>
        </thead>
        <tbody>${rows}
          ${
            week === WEEKS[0]
              ? `<tr><td class="day">Tue Aug 18 (UofA mixer)</td>
                 <td colspan="2"><button type="button" class="cell mixer" data-slot="uofa-mixer">absolutely not</button></td></tr>`
              : ''
          }
        </tbody>
      </table>`;
  }).join('');

  return `
    <p><strong>Check every slot you can do.</strong> Wed–Sun, 6pm or 7pm Pacific. This is the actual question.</p>
    <div class="week-tools">
      <button type="button" id="sel-6">Select all 6pm</button>
      <button type="button" id="sel-7">Select all 7pm</button>
      <button type="button" id="sel-none">Select none</button>
    </div>
    ${weeks}
    <p class="hint" id="avail-hint">${coarse() || state.allowSingleToggle ? 'Tap a cell to toggle.' : 'Double-click a cell (Windows 98 certified).'}</p>
    <p class="err" id="avail-err"></p>
    <button type="button" id="avail-next">These nights work</button>
  `;
}

function holdHtml() {
  const n = state.avail.size;
  return `
    <div class="hold-wrap">
      <p>You marked <strong>${n}</strong> slot${n === 1 ? '' : 's'}.</p>
      <p>Hold this button to legally bind your availability. Letting go is a character flaw.</p>
      <progress id="hold-bar" max="100" value="0"></progress>
      <p class="err" id="hold-err"></p>
      <button type="button" class="hold-btn" id="hold-btn">Hold to commit</button>
    </div>
  `;
}

function oathHtml() {
  return `
    <p>Type the following exactly (caps lock recommended):</p>
    <p><code>${esc(OATH)}</code></p>
    <input id="oath" type="text" autocomplete="off" autocorrect="off" spellcheck="false" style="width:100%" />
    <p class="hint" id="oath-hint"></p>
    <p class="err" id="oath-err"></p>
    <button type="button" id="oath-next">Swear it</button>
  `;
}

function installHtml() {
  return `
    <p id="install-label">Copying files...</p>
    <progress id="install-bar" max="100" value="0"></progress>
    <p class="hint">Do not turn off your computer. Or do. It will not help.</p>
  `;
}

function renderStep() {
  const id = STEP_IDS[state.step];
  const body = $('#wizard-body');
  if (!body) return;
  const html = {
    cookies: cookieHtml,
    wildcat: wildcatHtml,
    tos: tosHtml,
    quiz: quizHtml,
    name: nameHtml,
    captcha: captchaHtml,
    zone: zoneHtml,
    decoy: decoyHtml,
    avail: availHtml,
    hold: holdHtml,
    oath: oathHtml,
    install: installHtml,
  }[id];
  body.innerHTML = html();
  $('#status-step').textContent = `Step ${LIE_STEPS[state.step] || '4 of 4'}`;
  clippy(CLIPPY[id]);
  bindStep(id, body);
  if (id === 'install') runInstall();
}

function nextStep() {
  state.step += 1;
  renderStep();
}

function bindStep(id, root) {
  if (id === 'cookies') bindCookies(root);
  if (id === 'wildcat') bindWildcat(root);
  if (id === 'tos') bindTos(root);
  if (id === 'quiz') bindQuiz(root);
  if (id === 'name') bindName(root);
  if (id === 'captcha') bindCaptcha(root);
  if (id === 'zone') bindZone(root);
  if (id === 'decoy') bindDecoy(root);
  if (id === 'avail') bindAvail(root);
  if (id === 'hold') bindHold(root);
  if (id === 'oath') bindOath(root);
}

function bindCookies(root) {
  $('#ck-accept-all', root).addEventListener('click', () => {
    $('#ck-toolbar', root).checked = true;
    $('#ck-saban', root).checked = true;
    $('#ck-uofa', root).checked = true;
    $('#ck-soul', root).checked = true;
    rage();
    clippy('Accept all includes Tucson. Uncheck the Wildcat one. I believe in you.');
  });
  $('#ck-save', root).addEventListener('click', () => {
    if ($('#ck-uofa', root).checked) {
      $('#ck-err', root).textContent = 'You must uncheck the University of Arizona likeness clause. This is the whole league.';
      shakeWizard();
      rage();
      return;
    }
    nextStep();
  });
}

function bindWildcat(root) {
  const btn = $('#wildcat-btn', root);
  const arena = $('#arena', root);
  let dodges = 0;
  const flee = () => {
    dodges += 1;
    rage();
    const r = arena.getBoundingClientRect();
    const x = Math.random() * Math.max(20, r.width - 130);
    const y = Math.random() * Math.max(20, r.height - 40);
    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
    if (dodges >= 4) {
      $('#wildcat-hint', root).textContent = 'He’s winded. You can click him now.';
      clippy('Cardio was not in the Wildcat strength program this year.');
    } else {
      $('#wildcat-hint', root).textContent = `Dodges: ${dodges}. Typical.`;
    }
  };
  btn.addEventListener('pointerenter', () => {
    if (dodges < 4) flee();
  });
  btn.addEventListener('click', (e) => {
    if (dodges < 4) {
      e.preventDefault();
      flee();
      return;
    }
    nextStep();
  });
}

function bindTos(root) {
  const tos = $('#tos', root);
  const btn = $('#tos-next', root);
  tos.addEventListener('scroll', () => {
    if (tos.scrollTop + tos.clientHeight < tos.scrollHeight - 6) return;
    if (!state.tosExtended) {
      state.tosExtended = true;
      tos.insertAdjacentHTML(
        'beforeend',
        `<h4>AMENDMENT A</h4><p>We rewrote the terms while you were scrolling. Please start over. Also UofA still has zero football titles.</p>
         <h4>AMENDMENT B</h4><p>The Continue button will now appear. You are welcome.</p>`,
      );
      tos.scrollTop = 0;
      clippy('Oops. Legal updated the terms. Back to the top you go.');
      rage();
      return;
    }
    state.tosRead = true;
    btn.disabled = false;
  });
  btn.addEventListener('click', () => {
    if (!state.tosRead) {
      $('#tos-err', root).textContent = 'The scrollbar has seen more of the terms than you have.';
      shakeWizard();
      rage();
      return;
    }
    nextStep();
  });
}

function bindQuiz(root) {
  $('#quiz-next', root).addEventListener('click', () => {
    const q1 = root.querySelector('input[name="q1"]:checked')?.value;
    const q2 = root.querySelector('input[name="q2"]:checked')?.value;
    const err = $('#quiz-err', root);
    if (q1 === 'true') {
      err.textContent = 'No you didn’t. Honesty is the only passing grade.';
      rage();
      return;
    }
    if (q1 !== 'false') {
      err.textContent = 'Answer the questions. This is not optional, unlike UofA’s playoff hopes.';
      rage();
      return;
    }
    if (q2 !== '0') {
      err.textContent = 'Football. Zero. Do not confuse it with that 1997 basketball thing they won’t shut up about.';
      rage();
      return;
    }
    nextStep();
  });
}

function bindName(root) {
  const rel = $('#mgr-rel', root);
  rel.addEventListener('change', () => {
    $('#complicated-q', root).hidden = rel.value !== 'complicated';
  });
  $('#name-next', root).addEventListener('click', () => {
    const name = $('#mgr-name', root).value.trim();
    const err = $('#name-err', root);
    if (name.length < 2) {
      err.textContent = 'A name. Any name. “Greg” even.';
      rage();
      return;
    }
    if (/arizona|wildcat|uofa|u of a|bear\s*down/i.test(name)) {
      err.textContent = 'That name is on the watchlist. Try one that doesn’t sound like a booster.';
      rage();
      return;
    }
    if (rel.value === 'fan' || rel.value === 'alum') {
      err.textContent = 'Application denied. This is the We Hate UofA league, not a reunion.';
      rage();
      return;
    }
    if (!rel.value) {
      err.textContent = 'Declare your relationship to the enemy.';
      rage();
      return;
    }
    if (rel.value === 'complicated' && $('#clap', root).value !== 'no') {
      err.textContent = 'Complicated is allowed. Clapping is not.';
      rage();
      return;
    }
    state.name = name;
    state.rel = rel.value;
    if (/kenny/i.test(name)) clippy('Oh hi commissioner. Still filling out your own form? Leadership.');
    nextStep();
  });
}

function bindCaptcha(root) {
  $$('.cap', root).forEach((btn) => {
    btn.addEventListener('click', () => btn.classList.toggle('picked'));
  });
  $('#cap-next', root).addEventListener('click', () => {
    const buttons = $$('.cap', root);
    const ok = buttons.every((b) => {
      const cactus = b.dataset.kind === 'cactus';
      const picked = b.classList.contains('picked');
      return cactus === picked;
    });
    if (!ok) {
      $('#cap-err', root).textContent = 'Cacti only. The cats are Wildcats. The sun is on our side.';
      rage();
      return;
    }
    nextStep();
  });
}

function bindZone(root) {
  $('#tz-next', root).addEventListener('click', () => {
    const v = $('#tz', root).value;
    const err = $('#tz-err', root);
    if (v === 'America/Los_Angeles') {
      state.timezone = TIMEZONE;
      nextStep();
      return;
    }
    if (v === 'America/Phoenix') {
      err.textContent = 'In August the clocks match. The form still requires Pacific. Say Pacific.';
      rage();
      return;
    }
    if (v === 'BearDown' || v === 'America/Phoenix-campus' || v === 'TucsonMean') {
      err.textContent = 'Banned timezone. Try the one that isn’t a mascot.';
      rage();
      return;
    }
    if (!v) {
      err.textContent = 'Pick something. Time is a social construct but also 7:00 PM.';
      rage();
      return;
    }
    err.textContent = 'Draft times are posted in Pacific. The commissioner is not translating for you.';
    rage();
  });
}

function bindDecoy(root) {
  let fails = 0;
  $('#decoy-next', root).addEventListener('click', () => {
    const min = Number($('#decoy-min', root).value);
    const err = $('#decoy-err', root);
    if (!isPrime(min)) {
      fails += 1;
      err.textContent = 'Minutes must be prime. Composites are how Tucson happened.';
      if (fails >= 2) $('#decoy-hint', root).textContent = `Primes under 60: ${PRIMES.join(', ')}`;
      rage();
      return;
    }
    clippy('Cute. Discarding that. The commissioner already decided it’s 6 or 7pm Pacific.');
    nextStep();
  });
}

function toggleSlot(id, btn) {
  if (id === 'uofa-mixer') {
    $('#avail-err').textContent = 'That is a UofA mixer. Absolutely not. Unclick your soul.';
    shakeWizard();
    rage();
    return;
  }
  if (!SLOT_IDS.has(id)) return;
  if (state.avail.has(id)) {
    state.avail.delete(id);
    btn.classList.remove('on');
    btn.textContent = '—';
  } else {
    state.avail.add(id);
    btn.classList.add('on');
    btn.textContent = 'YES';
  }
  $('#avail-err').textContent = '';
}

function bindAvail(root) {
  const canSingle = coarse() || state.allowSingleToggle;
  const last = { id: null, t: 0 };
  $$('button.cell', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.slot;
      if (canSingle) {
        toggleSlot(id, btn);
        return;
      }
      const now = Date.now();
      if (last.id === id && now - last.t < 650) {
        toggleSlot(id, btn);
        last.id = null;
        return;
      }
      last.id = id;
      last.t = now;
      state.singleClicks += 1;
      if (state.singleClicks >= 6) {
        state.allowSingleToggle = true;
        $('#avail-hint', root).textContent = 'Fine. Single click. Touch screens weren’t invented yet but here we are.';
      } else {
        clippy('This is Windows 98. Double-click the cell. Availability is earned.');
      }
    });
  });

  $('#sel-6', root).addEventListener('click', () => {
    const hour = state.selectAllLies ? 19 : 18;
    setHour(hour, true);
    if (state.selectAllLies) {
      state.selectAllLies = false;
      clippy('Wait — other button. I swapped them. Occupational hazard.');
      rage();
      refreshAvailButtons(root);
      return;
    }
    refreshAvailButtons(root);
  });
  $('#sel-7', root).addEventListener('click', () => {
    const hour = state.selectAllLies ? 18 : 19;
    setHour(hour, true);
    if (state.selectAllLies) {
      state.selectAllLies = false;
      clippy('Gotcha. They’re labeled correctly now. Probably.');
      rage();
    }
    refreshAvailButtons(root);
  });
  $('#sel-none', root).addEventListener('click', () => {
    state.avail.clear();
    refreshAvailButtons(root);
  });
  $('#avail-next', root).addEventListener('click', () => {
    if (state.avail.size < 1) {
      $('#avail-err', root).textContent = 'Mark at least one night or we will schedule you for a UofA mixer.';
      shakeWizard();
      rage();
      return;
    }
    nextStep();
  });
}

function setHour(hour, on) {
  for (const slot of SLOTS) {
    if (slot.hour !== hour) continue;
    if (on) state.avail.add(slot.id);
    else state.avail.delete(slot.id);
  }
}

function refreshAvailButtons(root) {
  $$('button.cell[data-slot]', root).forEach((btn) => {
    const id = btn.dataset.slot;
    if (id === 'uofa-mixer') return;
    const on = state.avail.has(id);
    btn.classList.toggle('on', on);
    btn.textContent = on ? 'YES' : '—';
  });
}

function bindHold(root) {
  const btn = $('#hold-btn', root);
  const bar = $('#hold-bar', root);
  const err = $('#hold-err', root);
  const start = () => {
    holdStarted = Date.now();
    err.textContent = '';
    holdTimer = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - holdStarted) / HOLD_MS) * 100);
      bar.value = pct;
      if (pct >= 100) {
        clearInterval(holdTimer);
        holdTimer = null;
        nextStep();
      }
    }, 50);
  };
  const cancel = () => {
    if (!holdTimer) return;
    clearInterval(holdTimer);
    holdTimer = null;
    bar.value = 0;
    err.textContent = 'Commitment issues detected. Hold the whole time.';
    rage();
  };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    start();
  });
  btn.addEventListener('pointerup', cancel);
  btn.addEventListener('pointerleave', cancel);
  btn.addEventListener('pointercancel', cancel);
}

function bindOath(root) {
  const input = $('#oath', root);
  input.addEventListener('paste', (e) => {
    if (state.oathFails < 3) {
      e.preventDefault();
      clippy('Pasting is for Wildcats. Type it.');
      rage();
    }
  });
  $('#oath-next', root).addEventListener('click', () => {
    const v = input.value.trim();
    const err = $('#oath-err', root);
    if (v === 'BEAR DOWN' || v === 'WILDCATS FOREVER') {
      err.textContent = 'ABSOLUTELY NOT.';
      state.oathFails += 1;
      rage();
      return;
    }
    if (v === OATH) {
      nextStep();
      return;
    }
    state.oathFails += 1;
    if (v === OATH.toLowerCase()) err.textContent = 'YELL IT.';
    else err.textContent = 'Not even close.';
    if (state.oathFails >= 2) $('#oath-hint', root).textContent = OATH;
    rage();
  });
}

async function runInstall() {
  const bar = $('#install-bar');
  const label = $('#install-label');
  const stages = [
    { text: 'Copying files...', pct: 12, ms: 500 },
    { text: 'Registering hate.dll...', pct: 28, ms: 700 },
    { text: 'Blocking wildcats.arizona.edu...', pct: 44, ms: 600 },
    { text: 'Optimizing snack schedule...', pct: 61, ms: 800 },
    { text: 'Defragmenting commissioner brain...', pct: 69, ms: 400 },
    { text: 'Contacting draft servers in Tucson...', pct: 87, ms: 900 },
    { text: 'Retrying because Tucson ping timed out...', pct: 40, ms: 200 },
    { text: 'Almost done...', pct: 96, ms: 700 },
    { text: 'Still almost done...', pct: 99, ms: 800 },
    { text: 'Consulting the council of commissioners...', pct: 100, ms: 500 },
  ];
  for (const stage of stages) {
    label.textContent = stage.text;
    await animateBar(bar, stage.pct, stage.ms * INSTALL_MULT);
  }
  await sleep(200 * INSTALL_MULT);
  showBsod();
}

function animateBar(bar, target, ms) {
  return new Promise((resolve) => {
    const start = Number(bar.value) || 0;
    const t0 = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - t0) / Math.max(ms, 1));
      bar.value = start + (target - start) * t;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    tick();
  });
}

function showBsod() {
  const el = $('#bsod');
  el.textContent = `A problem has been detected and Windows has been shut down to prevent damage
to your league.

DRAFT_SLOT_IRQL_NOT_LESS_OR_EQUAL

If this is the first time you've seen this stop error screen, restart
your computer. If this screen appears again, follow these steps:

* Make sure you actually hate UofA
* Remove any newly installed Wildcat merch
* Press any key to anyway continue

Technical information:
*** STOP: 0x0000000A (0xBEA2D000, 0x00000000, 0x00000000, 0x00000000)
`;
  el.classList.add('show');
  const done = async () => {
    window.removeEventListener('keydown', done);
    el.removeEventListener('click', done);
    el.classList.remove('show');
    await finishSave();
  };
  window.addEventListener('keydown', done);
  el.addEventListener('click', done);
}

async function finishSave() {
  const body = $('#wizard-body');
  body.innerHTML = `
    <p>Your availability has been recorded as:</p>
    <p class="fake-time" id="fake-time">WEDNESDAY, FEBRUARY 4, 2015 · 3:47 AM<br/>McKale Center loading dock</p>
    <p class="hint" id="save-status">writing to disk...</p>
  `;
  clippy('Wait wait wait.');
  await sleep(FAST ? 400 : 1600);
  $('#fake-time').innerHTML = `${[...state.avail].length} Pacific evening${state.avail.size === 1 ? '' : 's'}<br/>Wed–Sun · 6pm or 7pm PT`;
  try {
    await saveResponse({
      display_name: state.name.slice(0, 80),
      available_slot_ids: [...state.avail].filter((id) => SLOT_IDS.has(id)),
      timezone: TIMEZONE,
      gauntlet_seconds: Math.round((Date.now() - state.startedAt) / 1000),
      rage_clicks: state.rage,
    });
    $('#save-status').textContent = 'Saved. Stapley is proud, in a paperclip way.';
    confetti();
    const again = document.createElement('div');
    again.innerHTML = `<p><button type="button" id="see-results">View the spreadsheet</button>
      <button type="button" id="again">Suffer again</button></p>`;
    body.append(again);
    $('#see-results').addEventListener('click', () => openResults());
    $('#again').addEventListener('click', () => {
      state.step = 0;
      state.avail = new Set();
      state.oathFails = 0;
      state.tosExtended = false;
      state.tosRead = false;
      renderStep();
    });
    openResults();
  } catch (err) {
    $('#save-status').innerHTML = `<span class="err">Save failed: ${esc(err.message || err)}</span>
      <p><button type="button" id="retry-save">Retry</button></p>`;
    $('#retry-save')?.addEventListener('click', () => finishSave());
  }
}

function confetti() {
  const layer = $('#confetti');
  layer.hidden = false;
  layer.innerHTML = '';
  const words = ['UofA', 'NOPE', 'BEAR DOWN', '0 TITLES'];
  for (let i = 0; i < 28; i++) {
    const n = document.createElement('i');
    n.textContent = words[i % words.length];
    n.style.left = `${Math.random() * 100}%`;
    n.style.animationDuration = `${2 + Math.random() * 2.5}s`;
    n.style.animationDelay = `${Math.random() * 0.4}s`;
    layer.append(n);
  }
  setTimeout(() => {
    layer.hidden = true;
    layer.innerHTML = '';
  }, 4000);
}

function shakeWizard() {
  const win = getWin('wizard');
  if (!win) return;
  win.classList.remove('shake');
  void win.offsetWidth;
  win.classList.add('shake');
}

function updateHits() {
  fetchResponses()
    .then((rows) => {
      const el = $('#hits');
      if (el) el.textContent = String(13429 + rows.length).padStart(6, '0');
    })
    .catch(() => {});
}

function onDesktopClick(e) {
  const open = e.target.closest('[data-open]')?.dataset.open;
  if (open === 'wizard') openWizard();
  if (open === 'results') openResults();
  if (open === 'readme') openReadme();
  if (open === 'internet') openInternet();
  if (open === 'recycle') openRecycle();
}

function bindDesktop() {
  const icons = $$('.icon');
  const isCoarse = coarse();
  icons.forEach((icon) => {
    icon.addEventListener('click', () => {
      icons.forEach((i) => i.classList.remove('selected'));
      icon.classList.add('selected');
      if (isCoarse) icon.dispatchEvent(new Event('open-icon'));
    });
    icon.addEventListener('dblclick', () => icon.dispatchEvent(new Event('open-icon')));
    icon.addEventListener('open-icon', () => {
      const which = icon.dataset.open;
      if (which === 'wizard') openWizard();
      if (which === 'results') openResults();
      if (which === 'readme') openReadme();
      if (which === 'internet') openInternet();
      if (which === 'recycle') openRecycle();
    });
  });

  document.addEventListener('click', (e) => {
    const close = e.target.closest('[data-win-close]')?.dataset.winClose;
    const min = e.target.closest('[data-win-min]')?.dataset.winMin;
    const max = e.target.closest('[data-win-max]')?.dataset.winMax;
    if (close) closeWin(close);
    if (min) {
      const w = getWin(min);
      if (w) w.hidden = true;
      clippy('Minimized. The taskbar in 1998 would show this. Use the icon.');
    }
    if (max) {
      const w = getWin(max);
      if (!w) return;
      w.style.width = '80px';
      w.style.height = '80px';
      clippy('Maximized. …is this not what maximize means?');
      rage();
      setTimeout(() => {
        w.style.width = '';
        w.style.height = '';
      }, 900);
    }
    if (e.target.id === 'ad-claim') {
      clippy('You won a UofA parking ticket. Pay at the bursar.');
      rage();
      getWin('ad1')?.remove();
    }
  });

  $('#start-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#start-menu').classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#start-menu') && e.target.id !== 'start-btn') {
      $('#start-menu').classList.remove('open');
    }
  });
  $('#start-menu').addEventListener('click', onDesktopClick);
  $('#start-run').addEventListener('click', () => {
    clippy('Run: C:\\WINDOWS\\HATE.EXE is already running.');
  });
  $('#start-shutdown').addEventListener('click', () => {
    clippy('You can’t shut down the league. The commissioner tried.');
    rage();
  });
}

async function startBoot() {
  const boot = $('#boot');
  const full = bootText();
  if (FAST) {
    boot.textContent = full;
    await sleep(BOOT_MS);
  } else {
    boot.textContent = '';
    const parts = full.split(/(\s+)/);
    for (const part of parts) {
      boot.textContent += part;
      await sleep(18);
    }
    await sleep(700);
  }
  boot.hidden = true;
  $('#desktop').hidden = false;
  clippy(
    sessionStorage.getItem('whua-shame')
      ? 'Skipping was logged. Welcome back, coward. Double-click Draft Time Selector.exe.'
      : 'Double-click Draft Time Selector.exe. Single-click just selects it. This is Windows.',
  );
  sessionStorage.removeItem('whua-shame');
  bindDesktop();
  tickClock();
  setInterval(tickClock, 1000);
  updateHits();
}

startBoot();
