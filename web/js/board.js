import { SLOT_IDS, SLOTS, TIMEZONE, WEEKS } from './config.js';
import { deleteByName, fetchResponses, latestByName, saveResponse, tally, updateSlots } from './db.js';

const $ = (sel, root = document) => root.querySelector(sel);

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

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

function validateName(name) {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Put a name on the row.';
  if (trimmed.length > 80) return 'That name is too long.';
  if (/arizona|wildcat|uofa|u of a|bear\s*down/i.test(trimmed)) {
    return 'That name is on the watchlist.';
  }
  if (/^(gary)$/i.test(trimmed) || (/\bgary\b/i.test(trimmed) && !/garrett/i.test(trimmed))) {
    return 'He goes by Garrett.';
  }
  return '';
}

function bindQuietBoard() {
  if (quietBound) return;
  quietBound = true;
  const root = $('#quiet');
  $('#quiet-add', root).addEventListener('click', () => addRow());
  $('#quiet-new-name', root).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRow();
    }
  });
  $('#quiet-cursed', root).addEventListener('click', (e) => {
    e.preventDefault();
    location.replace(location.pathname);
  });
  root.addEventListener('change', async (e) => {
    const cb = e.target.closest('input[type="checkbox"][data-slot]');
    if (!cb) return;
    const tr = cb.closest('tr[data-id]');
    if (!tr) return;
    await saveRow(tr, cb);
  });
  root.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-delete-name]');
    if (!del) return;
    const name = del.dataset.deleteName;
    const ok = window.confirm(`Delete ${name}'s row? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteByName(name);
      await refreshQuietBoard();
    } catch (err) {
      $('#quiet-err').textContent = `Delete failed: ${err.message || err}`;
    }
  });
}

function slotsFromRow(tr) {
  return [...tr.querySelectorAll('input[data-slot]:checked')]
    .map((cb) => cb.dataset.slot)
    .filter((id) => SLOT_IDS.has(id));
}

async function saveRow(tr, changedBox) {
  const id = tr.dataset.id;
  const prev = changedBox ? !changedBox.checked : null;
  try {
    await updateSlots(id, slotsFromRow(tr));
    paintTotals(tr.closest('table'));
    $('#quiet-err').textContent = '';
  } catch (err) {
    if (changedBox) changedBox.checked = prev;
    $('#quiet-err').textContent = `Could not save: ${err.message || err}`;
  }
}

async function addRow() {
  const input = $('#quiet-new-name');
  const name = input.value.trim();
  const err = validateName(name);
  if (err) {
    $('#quiet-err').textContent = err;
    return;
  }
  try {
    const rows = latestByName(await fetchResponses());
    if (rows.some((r) => String(r.display_name).trim().toLowerCase() === name.toLowerCase())) {
      $('#quiet-err').textContent = `${name} is already on the board. Use that row.`;
      return;
    }
    await saveResponse({
      display_name: name.slice(0, 80),
      available_slot_ids: [],
      timezone: TIMEZONE,
      gauntlet_seconds: 0,
      rage_clicks: 0,
    });
    input.value = '';
    $('#quiet-err').textContent = '';
    await refreshQuietBoard();
  } catch (e) {
    $('#quiet-err').textContent = `Could not add row: ${e.message || e}`;
  }
}

function paintTotals(table) {
  if (!table) return;
  SLOTS.forEach((slot, i) => {
    const n = table.querySelectorAll(`tbody input[data-slot="${slot.id}"]:checked`).length;
    const cell = table.querySelector(`tfoot [data-total="${i}"]`);
    if (cell) cell.textContent = String(n);
  });
}

function headerHtml() {
  const dayHeads = WEEKS.flatMap((week) =>
    week.days.map((day) => `<th colspan="2" class="qday">${esc(day.short)}</th>`),
  ).join('');
  const hourHeads = SLOTS.map((s) => `<th class="qhour">${s.hour === 18 ? '6pm' : '7pm'}</th>`).join('');
  return `<thead>
    <tr>
      <th class="qsticky qname-h" rowspan="2">Name</th>
      ${dayHeads}
      <th class="qdel-h" rowspan="2"></th>
    </tr>
    <tr>${hourHeads}</tr>
  </thead>`;
}

function personRow(row) {
  const have = new Set((row.available_slot_ids || []).filter((id) => SLOT_IDS.has(id)));
  const boxes = SLOTS.map(
    (s) =>
      `<td><label class="qbox"><input type="checkbox" data-slot="${s.id}" ${have.has(s.id) ? 'checked' : ''} aria-label="${esc(`${row.display_name} ${s.label}`)}" /></label></td>`,
  ).join('');
  return `<tr data-id="${esc(row.id)}">
    <th class="qsticky qname" scope="row">${esc(row.display_name)}</th>
    ${boxes}
    <td class="qdel"><button type="button" class="qdel-btn" data-delete-name="${esc(row.display_name)}">Delete</button></td>
  </tr>`;
}

async function refreshQuietBoard() {
  const wrap = $('#quiet-grid');
  try {
    const rows = await fetchResponses();
    const people = latestByName(rows).sort((a, b) =>
      String(a.display_name).localeCompare(String(b.display_name), undefined, { sensitivity: 'base' }),
    );
    const { max, bestLabels } = tally(rows);
    const totals = SLOTS.map((_, i) => `<td data-total="${i}">0</td>`).join('');
    const body = people.map(personRow).join('') || '';
    wrap.innerHTML = `<div class="qscroll">
      <table class="qsheet">
        ${headerHtml()}
        <tbody>${body}</tbody>
        <tfoot>
          <tr>
            <th class="qsticky">Total</th>
            ${totals}
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
    paintTotals(wrap.querySelector('table'));
    $('#quiet-summary').innerHTML =
      people.length === 0
        ? 'Nobody on the board yet. Add a name below.'
        : `${people.length} ${people.length === 1 ? 'person' : 'people'} · best overlap: <strong>${esc(bestLabels.join(' · ') || 'n/a')}</strong>${max ? ` (${max})` : ''}`;
    $('#quiet-err').textContent = '';
  } catch (err) {
    wrap.innerHTML = '';
    $('#quiet-err').textContent = `Could not load the board (${err.message || err}).`;
  }
}
