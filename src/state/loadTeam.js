import { BY_ID } from './initialState.js';
import { RULES } from './fplRules.js';

/**
 * Pull a real squad in from FPL, via our own proxy because the FPL API sends no
 * CORS headers. Shared by the "Load your team" box and by the agent's
 * load_manager_team tool, so both take exactly the same path.
 */
export async function fetchTeam(entryId) {
  const id = String(entryId ?? '').trim();
  if (!/^\d{1,9}$/.test(id)) {
    return { ok: false, error: 'An FPL team id is the number in the URL when you view your team, e.g. 6731094.' };
  }

  let res;
  try {
    res = await fetch(`/api/team?id=${id}`);
  } catch {
    return { ok: false, error: 'Could not reach the network.' };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: 'FPL sent back something we could not read.' };
  }
  if (!res.ok) return { ok: false, error: body.error || `Request failed (${res.status}).` };

  // The player snapshot is bundled at build time, so a squad can in principle
  // contain someone it does not know about. Say who, rather than failing blankly.
  const missing = body.picks.filter((p) => !BY_ID[p.id]);
  if (body.picks.length !== RULES.SQUAD_SIZE || missing.length) {
    return {
      ok: false,
      error: missing.length
        ? `${missing.length} player(s) in that squad are not in this snapshot, so the board would be incomplete.`
        : `That squad has ${body.picks.length} players, not ${RULES.SQUAD_SIZE}.`,
    };
  }

  return { ok: true, team: body };
}
