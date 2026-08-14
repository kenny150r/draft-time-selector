import { HOURS, SLOT_IDS, SLOTS, TIMEZONE, WEEKS } from './config.js';
import { fetchResponses, latestByName, saveResponse, tally } from './db.js';

const $ = (sel, root = document) => root.querySelector(sel);

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const quietAvail = new Set();
let quietBound = false;

export function wantsActualBoard() {
  const q = new URLSearchParams(location.search);
  if (q.has('actual')) return true;
  return location.hash.replace(/^#/, '').toLowerCase() === 'actual';
}

export function showQuietBoard() {
  const root = $('#quiet');
  if (!root) return;
  $('#boot').hidden = true;
  const desktop = $('#desktop');
  if (desktop) desktop.hidden = true;
  $('#clippy')?.classList.remove('show');
  root.hidden = false;
  document.body.classList.add('quiet-mode');
  bindQuietBoard();
  refreshQuietBoard();
}

export function hideQuietBoard() {
  const root = $('#quiet');
  if (root) root.hidden = true;
  document.body.classList.remove('quiet-mode');
}

function bindQuietBoard() {
  if (quietBound) return;
  quietBound = true;
  const root = $('#quiet');
  $('#quiet-name', root).addEventListener('change', () => preloadName());
  $('#quiet-name', root).addEventListener('blur', () => preloadName());
  $('#quiet-save', root).addEventListener('click', () => submitQuiet());
  $('#quiet-cursed', root).addEventListener('click', (e) => {
    e.preventDefault();
    location.replace(location.pathname);
  });
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button.qcell');
    if (!btn) return;
    const id = btn.dataset.slot;
    if (!SLOT_IDS.has(id)) return;
    if (quietAvail.has(id)) quietAvail.delete(id);
    else quietAvail.add(id);
    btn.classList.toggle('on', quietAvail.has(id));
    $('#quiet-err', root).textContent = '';
    $('#quiet-picked', root).textContent = `${quietAvail.size} selected`;
  });
}

async function preloadName() {
  const name = $('#quiet-name').value.trim().toLowerCase();
  if (name.length < 2) return;
  try {
    const rows = await fetchResponses();
    const mine = latestByName(rows).find((r) => String(r.display_name).trim().toLowerCase() === name);
    quietAvail.clear();
    if (mine) {
      for (const id of mine.available_slot_ids || []) {
        if (SLOT_IDS.has(id)) quietAvail.add(id);
      }
    }
    paintQuietCells();
    $('#quiet-note').textContent = mine
      ? `Loaded your last submission (${quietAvail.size} slots). Edit and save to replace it.`
      : 'New name — tap every slot you can do, then save.';
  } catch {
    /* still usable offline-ish */
  }
}

function paintQuietCells() {
  document.querySelectorAll('#quiet button.qcell').forEach((btn) => {
    btn.classList.toggle('on', quietAvail.has(btn.dataset.slot));
  });
  $('#quiet-picked').textContent = `${quietAvail.size} selected`;
}

async function refreshQuietBoard() {
  const grid = $('#quiet-grid');
  let counts = Object.fromEntries(SLOTS.map((s) => [s.id, 0]));
  let namesBySlot = Object.fromEntries(SLOTS.map((s) => [s.id, []]));
  let max = 0;
  let bestIds = new Set();
  let bestLabels = [];
  let people = 0;
  try {
    const tallied = tally(await fetchResponses());
    counts = tallied.counts;
    namesBySlot = tallied.namesBySlot;
    max = tallied.max;
    bestIds = tallied.bestIds;
    bestLabels = tallied.bestLabels;
    people = tallied.latest.length;
  } catch (err) {
    $('#quiet-err').textContent = `Could not load live counts (${err.message || err}). You can still mark times.`;
  }

  grid.innerHTML = WEEKS.map((week) => {
    const rows = week.days
      .map((day) => {
        const cells = HOURS.map((h) => {
          const id = `${day.date}T${h.key}`;
          const n = counts[id] || 0;
          const who = (namesBySlot[id] || []).join(', ') || 'nobody yet';
          const heat = max ? 0.08 + 0.75 * (n / max) : 0.06;
          const on = quietAvail.has(id) ? 'on' : '';
          const best = bestIds.has(id) ? 'best' : '';
          return `<td>
            <button type="button" class="qcell ${on} ${best}" data-slot="${id}" title="${esc(who)}"
              style="--heat:${heat}">
              <span class="qlabel">${esc(h.label.replace(' PT', ''))}</span>
              <span class="qcount">${n}</span>
            </button>
          </td>`;
        }).join('');
        return `<tr><th scope="row">${esc(day.short)}</th>${cells}</tr>`;
      })
      .join('');
    return `<section class="qweek">
      <h2>${esc(week.title)}</h2>
      <table class="qtable">
        <thead><tr><th></th><th>6:00 PM PT</th><th>7:00 PM PT</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
  }).join('');

  $('#quiet-summary').innerHTML =
    people === 0
      ? 'Nobody has submitted yet. First pick is free real estate.'
      : `Best overlap: <strong>${esc(bestLabels.join(' · ') || 'n/a')}</strong> · ${people} ${people === 1 ? 'person' : 'people'} in`;
  paintQuietCells();
}

async function submitQuiet() {
  const name = $('#quiet-name').value.trim();
  const err = $('#quiet-err');
  const note = $('#quiet-note');
  err.textContent = '';
  if (name.length < 2) {
    err.textContent = 'Put your name on it.';
    return;
  }
  if (/arizona|wildcat|uofa|u of a|bear\s*down/i.test(name)) {
    err.textContent = 'That name is on the watchlist. Try one that doesn’t sound like a booster.';
    return;
  }
  if (/^(gary)$/i.test(name) || (/\bgary\b/i.test(name) && !/garrett/i.test(name))) {
    err.textContent = 'He goes by Garrett.';
    return;
  }
  if (quietAvail.size < 1) {
    err.textContent = 'Tap at least one slot you can actually do.';
    return;
  }
  const btn = $('#quiet-save');
  btn.disabled = true;
  try {
    await saveResponse({
      display_name: name.slice(0, 80),
      available_slot_ids: [...quietAvail].filter((id) => SLOT_IDS.has(id)),
      timezone: TIMEZONE,
      gauntlet_seconds: 0,
      rage_clicks: 0,
    });
    note.textContent = 'Saved. Latest submission per name is what counts.';
    await refreshQuietBoard();
  } catch (e) {
    err.textContent = `Save failed: ${e.message || e}`;
  } finally {
    btn.disabled = false;
  }
}
