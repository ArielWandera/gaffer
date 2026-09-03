/**
 * Proxy for the public Fantasy Premier League endpoints.
 *
 * The FPL API sends no CORS headers, so a browser cannot call it from our
 * origin. This is the whole reason the function exists — it is a pass-through,
 * not a backend. It holds no state, stores nothing, and needs no credentials:
 * every endpoint it touches is public.
 *
 * Note what it can and cannot reach. /entry/{id}/event/{gw}/picks/ returns the
 * squad a manager has *saved*. /my-team/{id}/ — the live one — answers 403
 * without that manager's session cookie, and even authenticated it would only
 * ever return saved state. The provisional squad, the transfer lined up but not
 * confirmed, is in no endpoint at any level of access. That is the state this
 * app keeps in the tab and hands to the agent, and it is why the app exists.
 */
const FPL = 'https://fantasy.premierleague.com/api';

async function getJSON(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Gaffer/1.0)' },
  });
  if (!r.ok) {
    const err = new Error(`FPL responded ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

export default async function handler(req, res) {
  const raw = String(req.query?.id ?? '').trim();
  if (!/^\d{1,9}$/.test(raw)) {
    return res.status(400).json({ error: 'Give a numeric FPL entry id, e.g. /api/team?id=6731094' });
  }
  const id = Number(raw);

  try {
    const entry = await getJSON(`${FPL}/entry/${id}/`);

    // The gameweek to read is whichever one this manager last has a squad for.
    const gw = Number(req.query?.gw) || entry.current_event;
    if (!gw) {
      return res.status(409).json({
        error: 'That team has not played a gameweek yet, so there is no squad to load.',
      });
    }

    const [picks, history] = await Promise.all([
      getJSON(`${FPL}/entry/${id}/event/${gw}/picks/`),
      getJSON(`${FPL}/entry/${id}/history/`).catch(() => ({ chips: [] })),
    ]);

    const hist = picks.entry_history || {};
    const body = {
      entry_id: id,
      team_name: entry.name,
      manager: [entry.player_first_name, entry.player_last_name].filter(Boolean).join(' '),
      gameweek: gw,
      overall_rank: entry.summary_overall_rank,
      total_points: entry.summary_overall_points,
      // FPL keeps money in tenths of a million.
      bank: (hist.bank ?? 0) / 10,
      squad_value: (hist.value ?? 0) / 10,
      active_chip: picks.active_chip || null,
      chips_used: (history.chips || []).map((c) => c.name),
      picks: (picks.picks || []).map((p) => ({
        id: p.element,
        starting: p.position <= 11,
        captain: !!p.is_captain,
        vice: !!p.is_vice_captain,
      })),
    };

    // A saved squad only changes when its manager confirms a transfer, so this
    // is safe to cache briefly and cheap to revalidate.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json(body);
  } catch (e) {
    if (e.status === 404) {
      return res.status(404).json({ error: `No FPL team with id ${id}.` });
    }
    return res.status(502).json({ error: 'Could not reach the FPL API. Try again in a moment.' });
  }
}
