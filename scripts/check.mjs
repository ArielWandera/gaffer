// Headless walk through the freeze checklist. Drives the real reducer and the
// real registerTools against a fake document.modelContext.
import { initialState, EXAMPLE_TEAM, BY_ID } from '../src/state/initialState.js';
import { reducer } from '../src/state/reducer.js';
import { validateSquad, squadWarnings } from '../src/state/validate.js';
import { registerTools, resolveModelContext } from '../src/webmcp/tools.js';

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

// The board now starts empty, so every squad test needs one loaded first —
// through the same reducer path the Load button and the agent's tool both use.
let state = reducer(initialState, { type: 'loadTeam', team: EXAMPLE_TEAM });
// Kept aside because `state` is mutated as the checks run; anything asserting a
// tool *count* needs a board that has not had its wildcard played.
const FRESH = state;
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

// 1 — an empty board offers only the moves that are legal with no squad
{
  const empty = registerTools(initialState, () => {});
  ok(empty.names.length === 3, `empty board registers three tools (${empty.names.join(', ')})`);
  ok(!empty.names.includes('propose_transfer') && !empty.names.includes('set_captain'),
    'nothing squad-dependent is offered before a squad exists');
  ok(empty.names.includes('load_manager_team'), 'loading a team is offered');
  ok(validateSquad(initialState, BY_ID).empty === true, 'an empty board reports empty, not fifteen violations');
  empty.dispose();
}

// 1b — the example squad loads and is legal
ok(validateSquad(state, BY_ID).valid, 'example squad passes validation');
ok(state.squad.length === 15, 'example squad has 15 players');

// 2 — tool list
const first = await cycle(async (h) => h.names);
ok(first.length === 9, `nine tools registered imperatively (${first.join(', ')})`);
ok(first.includes('make_free_transfer') && !first.includes('take_points_hit'), 'free-transfer tool present, hit tool absent at 1 FT');

// 3 — get_squad_state reflects a MANUAL change made by clicking
state = reducer(state, { type: 'swapStarting', a: 55, b: 464 }); // bench Watkins, start Wissa
const read = await cycle(() => call('get_squad_state'));
ok(read.bench.some((p) => p.name === 'Watkins'), 'get_squad_state sees the hand-made bench swap');
ok(read.free_transfers === 1 && read.bank_m === 0.8, 'bank and free transfers reported');

ok(squadWarnings(state, BY_ID).some((w) => w.includes('Watkins')), 'unavailable player surfaced as a warning');

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

// 8b — substitutions, and the shape rule that governs them
{
  const before = await cycle(() => call('get_squad_state'));
  // Verbruggen is the reserve keeper. Bringing him on for an outfielder would
  // leave two goalkeepers in the XI, which is not a shape you may field.
  const illegalSub = await cycle(() => call('substitute_player', { starter_id: 12, bench_id: 109 }));
  ok(illegalSub.ok === false && illegalSub.violations?.some((v) => v.includes('GK')),
    `two-keeper XI refused: "${illegalSub.violations?.[0]}"`);
  ok(validateSquad(state, BY_ID).valid, 'state untouched after the illegal substitution');

  // Egan is a defender coming on for a midfielder, so this crosses positions and
  // is still legal — the defence grows by one and the shape stays fieldable.
  const legalSub = await cycle(() => call('substitute_player', {
    starter_id: 454, bench_id: 277, reason: 'shore up the defence',
  }));
  ok(legalSub.ok === true, `cross-position substitution accepted: ${legalSub.summary || legalSub.error}`);
  // Do not hardcode the shape: earlier sections have already transferred players
  // in and out. Assert the invariant instead — ten outfielders, and one more
  // defender than before now that a defender has come on for a forward.
  const shape = (f) => f.split('-').map(Number);
  ok(/^\d-\d-\d$/.test(legalSub.formation) && shape(legalSub.formation).reduce((a, b) => a + b) === 10,
    `formation reported back as ${legalSub.formation}, ten outfielders`);
  ok(shape(legalSub.formation)[0] === shape(before.formation)[0] + 1,
    `defence grew from ${before.formation} to ${legalSub.formation}`);
}

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


// 10 — the client may keep the model context somewhere else. A client that only
// exposes the older navigator.modelContext used to get no tools at all: we
// checked document, found nothing and returned silently. Prove both spellings
// work, and that an implementation which rejects the options argument still
// gets its tools.
{
  const saved = globalThis.document;
  const seen = new Map();
  const shim = (accepts) => ({
    registerTool(tool, opts) {
      if (!accepts && opts) throw new TypeError('options not supported');
      seen.set(tool.name, tool);
    },
  });

  const setNav = (v) => Object.defineProperty(globalThis, 'navigator', {
    value: v, configurable: true, writable: true,
  });
  globalThis.document = {};
  setNav({ modelContext: shim(true) });
  // initialState, not the mutated `state` above: the tool set is state-dependent
  // and this check is about where the context lives, not which moves are legal.
  let r = registerTools(FRESH, () => {});
  ok(r.supported && r.names.length === 9, `navigator.modelContext found (${r.api})`);

  seen.clear();
  setNav({ modelContext: shim(false) });
  r = registerTools(FRESH, () => {});
  ok(seen.size === 9, 'tools still register when the options argument is rejected');

  setNav(undefined);
  globalThis.document = {};
  ok(resolveModelContext().ctx === null, 'no context anywhere is reported, not thrown');
  ok(registerTools(initialState, () => {}).supported === false, 'registerTools reports unsupported cleanly');

  globalThis.document = saved;
}

console.log(fail ? `\n${fail} FAILED` : '\nall checks passed');
process.exit(fail ? 1 : 0);
