// Headless walk through the freeze checklist. Drives the real reducer and the
// real registerTools against a fake document.modelContext.
import { initialState, BY_ID } from '../src/state/initialState.js';
import { reducer } from '../src/state/reducer.js';
import { validateSquad } from '../src/state/validate.js';
import { registerTools } from '../src/webmcp/tools.js';

let fail = 0;
const ok = (c, m) => { console.log(`${c ? ' ok ' : 'FAIL'}  ${m}`); if (!c) fail++; };

// minimal fake of the browser API
const registry = new Map();
globalThis.document = {
  modelContext: {
    registerTool(tool, { signal }) {
      registry.set(tool.name, tool);
      signal.addEventListener('abort', () => registry.delete(tool.name));
    },
  },
};

let state = initialState;
const harness = () => {
  const { names, dispose } = registerTools(state, (a) => { state = reducer(state, a); });
  return { names, dispose };
};
const call = async (name, args) => {
  const t = registry.get(name);
  if (!t) return { __missing: true };
  return JSON.parse((await t.execute(args)).content[0].text);
};
const cycle = async (fn) => { const h = harness(); const r = await fn(h); h.dispose(); return r; };

// 1 — seed squad is legal
ok(validateSquad(state, BY_ID).valid, 'seed squad passes validation');
ok(state.squad.length === 15, 'seed squad has 15 players');

// 2 — tool list
const first = await cycle(async (h) => h.names);
ok(first.length === 7, `seven tools registered (${first.join(', ')})`);
ok(first.includes('make_free_transfer') && !first.includes('take_points_hit'), 'free-transfer tool present, hit tool absent at 1 FT');

// 3 — get_squad_state reflects a MANUAL change made by clicking
state = reducer(state, { type: 'swapStarting', a: 55, b: 464 }); // bench Watkins, start Wissa
const read = await cycle(() => call('get_squad_state'));
ok(read.bench.some((p) => p.name === 'Watkins'), 'get_squad_state sees the hand-made bench swap');
ok(read.warnings.some((w) => w.includes('Watkins')), 'unavailable player surfaced as a warning');
ok(read.free_transfers === 1 && read.bank_m === 0.8, 'bank and free transfers reported');

// 4 — three-per-club rule blocks, with a recoverable message
const arsIn = (await cycle(() => call('search_players', { team: 'ARS', position: 'DEF', limit: 5 }))).players;
const blocked = await cycle(() => call('propose_transfer', {
  player_out_id: 586, player_in_id: arsIn[0].id, reason: 'better fixtures',
}));
ok(blocked.ok === false && blocked.violations?.some((v) => v.includes('ARS')), `4th Arsenal player refused: "${blocked.violations?.[0]}"`);
ok(validateSquad(state, BY_ID).valid, 'state untouched after the illegal proposal');

// 5 — a legal transfer spends the free transfer
const legal = await cycle(() => call('propose_transfer', {
  player_out_id: 55, player_in_id: 165, reason: 'Watkins has left the league; João Pedro is the top-form forward in budget',
}));
ok(legal.ok === true, `legal transfer accepted: ${legal.summary || legal.error}`);
ok(state.freeTransfers === 0, 'free transfers now 0');

// 6 — the tool set itself changed
const second = await cycle(async (h) => h.names);
ok(!second.includes('make_free_transfer'), 'make_free_transfer unregistered at 0 FT');
ok(second.includes('take_points_hit'), 'take_points_hit registered in its place');

// 7 — wildcard disappears once played
ok(second.includes('play_wildcard'), 'play_wildcard available before use');
await cycle(() => call('play_wildcard', { reason: 'squad needs a rebuild' }));
const third = await cycle(async (h) => h.names);
ok(!third.includes('play_wildcard'), 'play_wildcard gone after use');
ok(third.includes('make_free_transfer'), 'transfers free again while the wildcard is active');

// 8 — highlights and captaincy
await cycle(() => call('highlight_players', { player_ids: [411, 12], label: 'premium attackers' }));
ok(state.highlighted.length === 2 && state.highlightLabel === 'premium attackers', 'highlight_players sets visible state');
const benchCap = await cycle(() => call('set_captain', { player_id: 55, role: 'captain' }));
ok(benchCap.ok === false, 'captaincy refused for a non-starter');

// 9 — readOnlyHint annotations
const ann = await cycle(async (h) => ({ s: registry.get('get_squad_state'), p: registry.get('search_players'), t: registry.get('propose_transfer') }));
ok(ann.s.annotations?.readOnlyHint === true && ann.p.annotations?.readOnlyHint === true, 'read tools carry readOnlyHint');
ok(!ann.t.annotations?.readOnlyHint, 'write tool does not claim readOnlyHint');

// 10 — cleanup and graceful absence
const h = harness(); h.dispose();
ok(registry.size === 0, 'AbortController tears every tool down');
const saved = globalThis.document.modelContext;
delete globalThis.document.modelContext;
const none = registerTools(state, () => {});
ok(none.supported === false, 'no crash in a browser without WebMCP');
globalThis.document.modelContext = saved;

console.log(fail ? `\n${fail} FAILED` : '\nall checks passed');
process.exit(fail ? 1 : 0);
