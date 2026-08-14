import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SLOTS, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function saveResponse(row) {
  const { data, error } = await supabase
    .from('whua_draft_responses')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchResponses() {
  const { data, error } = await supabase
    .from('whua_draft_responses')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function latestByName(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(String(row.display_name).trim().toLowerCase(), row);
  }
  return [...map.values()];
}

export function tally(rows) {
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
  const bestLabels = SLOTS.filter((s) => bestIds.has(s.id)).map((s) => s.label);
  return { latest, counts, namesBySlot, max, bestIds, bestLabels };
}
