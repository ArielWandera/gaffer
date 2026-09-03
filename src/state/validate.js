import { RULES, POSITIONS } from './fplRules.js';

// Runs after every mutation. The violation strings are surfaced in the UI *and*
// returned from the tools, so an agent that breaks a rule is told exactly which
// one and can correct itself on the next call.
export function validateSquad(state, byId) {
  const violations = [];
  const squad = state.squad.map((s) => ({ ...s, player: byId[s.id] })).filter((s) => s.player);

  if (state.squad.length !== RULES.SQUAD_SIZE) {
    violations.push(`Squad has ${state.squad.length} players, must have ${RULES.SQUAD_SIZE}.`);
  }

  for (const pos of POSITIONS) {
    const want = RULES.POSITION_COUNTS[pos];
    const have = squad.filter((s) => s.player.position === pos).length;
    if (have !== want) violations.push(`Squad has ${have} ${pos}, must have exactly ${want}.`);
  }

  const perClub = {};
  for (const s of squad) perClub[s.player.team] = (perClub[s.player.team] || 0) + 1;
  for (const [club, n] of Object.entries(perClub)) {
    if (n > RULES.MAX_PER_CLUB) {
      violations.push(`${n} players from ${club} — the limit is ${RULES.MAX_PER_CLUB} per club.`);
    }
  }

  if (state.bank < -1e-9) {
    violations.push(`Bank is £${state.bank.toFixed(1)}m — you cannot go below £0.0m.`);
  }

  const xi = squad.filter((s) => s.starting);
  if (xi.length !== RULES.STARTING_XI) {
    violations.push(`Starting XI has ${xi.length} players, must have ${RULES.STARTING_XI}.`);
  }
  for (const pos of POSITIONS) {
    const [min, max] = RULES.XI_LIMITS[pos];
    const have = xi.filter((s) => s.player.position === pos).length;
    if (have < min || have > max) {
      const range = min === max ? `exactly ${min}` : `${min}–${max}`;
      violations.push(`Starting XI has ${have} ${pos}, must have ${range}.`);
    }
  }

  const capIn = xi.some((s) => s.id === state.captain);
  const viceIn = xi.some((s) => s.id === state.viceCaptain);
  if (!capIn) violations.push('Captain must be in the starting XI.');
  if (!viceIn) violations.push('Vice-captain must be in the starting XI.');
  if (state.captain && state.captain === state.viceCaptain) {
    violations.push('Captain and vice-captain must be different players.');
  }

  return { valid: violations.length === 0, violations };
}

// Warnings are not rule breaks — an unavailable player in the XI is legal but costly.
// Kept separate so validateSquad stays a pure legality check.
export function squadWarnings(state, byId) {
  const out = [];
  for (const s of state.squad) {
    const p = byId[s.id];
    if (!p || p.status === 'a') continue;
    const where = s.starting ? 'in your starting XI' : 'on your bench';
    const label = { i: 'injured', d: 'a doubt', s: 'suspended', u: 'unavailable', n: 'unavailable' }[p.status] || 'flagged';
    out.push(`${p.name} (${p.team}) is ${label} and ${where}.${p.news ? ' ' + p.news : ''}`);
  }
  return out;
}
