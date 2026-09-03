import { BY_ID, PLAYERS, SNAPSHOT_DATE } from '../state/initialState.js';
import { RULES, CHIP_LABELS } from '../state/fplRules.js';
import { reducer, pointsHit } from '../state/reducer.js';
import { validateSquad, squadWarnings } from '../state/validate.js';

const text = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj) }] });

const STATUS_TEXT = {
  a: 'available', i: 'injured', d: 'doubtful', s: 'suspended',
  u: 'unavailable', n: 'not in squad',
};

function playerView(p, extra = {}) {
  return {
    id: p.id,
    name: p.name,
    club: p.team,
    position: p.position,
    price_m: p.price,
    form: p.form,
    total_points: p.points,
    points_per_game: p.ppg,
    selected_by_percent: p.selected_by,
    availability: STATUS_TEXT[p.status] || p.status,
    ...(p.news ? { news: p.news } : {}),
    next_fixtures: p.fixtures.map((f) => ({
      gameweek: f.gameweek,
      opponent: f.opponent,
      venue: f.home ? 'home' : 'away',
      difficulty_1_to_5: f.difficulty,
    })),
    ...extra,
  };
}

// A straight, readable dump of the reducer state. This is the whole point of the
// project: the squad below includes edits the user made by hand seconds ago that
// have never been sent to any server, so no server-side API could return them.
export function serialiseState(state) {
  const { valid, violations } = validateSquad(state, BY_ID);
  const squad = state.squad.map((s) =>
    playerView(BY_ID[s.id], {
      starting: s.starting,
      is_captain: state.captain === s.id,
      is_vice_captain: state.viceCaptain === s.id,
    })
  );
  const chipsAvailable = RULES.CHIPS.filter((c) => !state.chipsUsed.includes(c));
  return {
    gameweek: state.gameweek,
    data_snapshot_date: SNAPSHOT_DATE,
    bank_m: state.bank,
    squad_value_m: Math.round(state.squad.reduce((n, s) => n + BY_ID[s.id].price, 0) * 10) / 10,
    free_transfers: state.freeTransfers,
    points_hit_so_far: pointsHit(state),
    starting_xi: squad.filter((p) => p.starting),
    bench: squad.filter((p) => !p.starting),
    captain: state.captain ? BY_ID[state.captain].name : null,
    vice_captain: state.viceCaptain ? BY_ID[state.viceCaptain].name : null,
    pending_transfers_this_session: state.transfersMade.map((t) => ({
      out: BY_ID[t.out].name,
      in: BY_ID[t.in].name,
      points_cost: t.cost,
      reason: t.reason,
    })),
    chips_used: state.chipsUsed.map((c) => CHIP_LABELS[c]),
    chips_available: chipsAvailable.map((c) => CHIP_LABELS[c]),
    active_chip: state.activeChip ? CHIP_LABELS[state.activeChip] : null,
    highlighted_player_ids: state.highlighted,
    is_legal: valid,
    rule_violations: violations,
    warnings: squadWarnings(state, BY_ID),
  };
}

/**
 * Register every tool that is legal right now, and only those.
 *
 * THE IDEA: the registered tool set *is* the set of legal moves. When the user
 * runs out of free transfers, `make_free_transfer` is not left in place to
 * return an error — it is unregistered and `take_points_hit` takes its place.
 * When the wildcard is played, `play_wildcard` ceases to exist. An illegal move
 * is therefore not rejected; it is uncallable.
 *
 * App.jsx calls this from a useEffect keyed on the whole state object, so any
 * change re-runs it: the previous AbortController fires, every tool from the
 * last render is torn down, and the set valid for the new state is registered.
 * Re-registration is itself the change signal — per Chrome's guidance a page
 * manages its own tool set with registerTool and AbortSignal, and does not
 * dispatch a change event of its own.
 */
export function registerTools(state, dispatch) {
  if (typeof document === 'undefined' || !document.modelContext) {
    return { supported: false, names: [], dispose: () => {} };
  }

  const ac = new AbortController();
  const opts = { signal: ac.signal };
  const names = [];
  // registerTool may return a promise; we do not need to await it to keep going.
  const reg = (tool) => {
    names.push(tool.name);
    return document.modelContext.registerTool(tool, opts);
  };

  // Apply an action through the same pure reducer the UI uses, so a tool can
  // check the *result* of a move before committing it.
  const preview = (action) => reducer(state, { ...action, source: 'agent' });
  const commit = (action) => dispatch({ ...action, source: 'agent' });

  // ---------------------------------------------------------------- read tools

  reg({
    name: 'get_squad_state',
    description:
      "Read the user's Fantasy Premier League squad exactly as it stands on screen right now, " +
      'including unsaved changes they have just made by hand and have not confirmed anywhere. ' +
      'Returns all 15 players with club, position, price in millions, form, availability and their ' +
      'next three fixtures with difficulty; who is in the starting XI versus on the bench; the ' +
      'captain and vice-captain; money left in the bank; free transfers remaining; chips already ' +
      'used and still available; every transfer pending in this session with its points cost; and ' +
      'any rule violations or injury warnings. Call this before proposing anything, and again ' +
      'whenever the user says they have changed something themselves.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    async execute() {
      return text(serialiseState(state));
    },
  });

  reg({
    name: 'search_players',
    description:
      'Search the Premier League player pool for transfer targets, sorted by recent form. ' +
      'All prices are in millions of pounds. If you omit max_price it defaults to what the user ' +
      'can actually afford for the player they are replacing, so results are always buyable. ' +
      'Unavailable players (injured, suspended, transferred out of the league) are excluded ' +
      'unless you ask for them. Returns name, club, position, price, form, total points, ' +
      'ownership and the next three fixtures with difficulty rated 1 (easiest) to 5 (hardest).',
    inputSchema: {
      type: 'object',
      properties: {
        position: { type: 'string', enum: ['GK', 'DEF', 'MID', 'FWD'], description: 'Restrict to one position.' },
        max_price: { type: 'number', description: 'Maximum price in millions, e.g. 8.5.' },
        min_form: { type: 'number', description: 'Minimum form rating, e.g. 5.' },
        team: { type: 'string', description: 'Three-letter club code, e.g. ARS, MCI, LIV.' },
        replacing_player_id: {
          type: 'number',
          description:
            'Id of the squad player being replaced. Sets the budget to that player\'s price plus the bank, ' +
            'and flags any result that would break the three-per-club limit.',
        },
        exclude_unavailable: { type: 'boolean', description: 'Defaults to true.' },
        limit: { type: 'number', description: 'Maximum results, default 10.' },
      },
    },
    annotations: { readOnlyHint: true },
    async execute(args = {}) {
      const {
        position, min_form, team, replacing_player_id,
        exclude_unavailable = true, limit = 10,
      } = args;

      const outgoing = replacing_player_id ? BY_ID[replacing_player_id] : null;
      const budget =
        args.max_price != null
          ? args.max_price
          : outgoing
            ? Math.round((state.bank + outgoing.price) * 10) / 10
            : null;

      const owned = new Set(state.squad.map((s) => s.id));
      const clubCount = {};
      for (const s of state.squad) {
        const t = BY_ID[s.id].team;
        clubCount[t] = (clubCount[t] || 0) + 1;
      }

      const results = PLAYERS.filter((p) => {
        if (position && p.position !== position) return false;
        if (team && p.team !== team.toUpperCase()) return false;
        if (budget != null && p.price > budget + 1e-9) return false;
        if (min_form != null && p.form < min_form) return false;
        if (exclude_unavailable && p.status !== 'a') return false;
        if (owned.has(p.id)) return false;
        return true;
      })
        .sort((a, b) => b.form - a.form || b.points - a.points)
        .slice(0, Math.max(1, Math.min(50, limit)))
        .map((p) => {
          const held = (clubCount[p.team] || 0) - (outgoing && outgoing.team === p.team ? 1 : 0);
          const blocked = held >= RULES.MAX_PER_CLUB;
          return playerView(p, blocked
            ? { blocked_by_club_limit: `You already hold ${held} players from ${p.team}.` }
            : {});
        });

      return text({
        budget_applied_m: budget,
        ...(outgoing ? { replacing: `${outgoing.name} (${outgoing.team}, £${outgoing.price}m)` } : {}),
        count: results.length,
        players: results,
      });
    },
  });

  // ------------------------------------------------------------- write tools

  reg({
    name: 'propose_transfer',
    description:
      'Swap one player out of the squad for another, updating the bank and the transfer list. ' +
      'The move is validated against the FPL rules first: if it would break the fifteen-player ' +
      'shape, exceed three players from one club, or overdraw the bank, nothing changes and the ' +
      'exact violation is returned so you can pick a different player and try again. ' +
      'You must give a reason — it is shown to the user next to the transfer.',
    inputSchema: {
      type: 'object',
      properties: {
        player_out_id: { type: 'number', description: 'Id of the squad player to sell.' },
        player_in_id: { type: 'number', description: 'Id of the player to buy.' },
        reason: { type: 'string', description: 'One short sentence on why this improves the squad.' },
      },
      required: ['player_out_id', 'player_in_id', 'reason'],
    },
    async execute({ player_out_id, player_in_id, reason }) {
      const out = BY_ID[player_out_id];
      const inc = BY_ID[player_in_id];
      if (!out) return text({ ok: false, error: `No player with id ${player_out_id}.` });
      if (!inc) return text({ ok: false, error: `No player with id ${player_in_id}.` });
      if (!state.squad.some((s) => s.id === player_out_id)) {
        return text({ ok: false, error: `${out.name} is not in the squad, so cannot be transferred out.` });
      }
      if (state.squad.some((s) => s.id === player_in_id)) {
        return text({ ok: false, error: `${inc.name} is already in the squad.` });
      }
      if (out.position !== inc.position) {
        return text({
          ok: false,
          error: `${out.name} is a ${out.position} and ${inc.name} is a ${inc.position}. ` +
            'A transfer must be like for like, otherwise the squad shape breaks.',
        });
      }

      const action = { type: 'transfer', outId: player_out_id, inId: player_in_id, reason };
      const next = preview(action);
      const { valid, violations } = validateSquad(next, BY_ID);
      if (!valid) {
        return text({
          ok: false,
          error: 'That transfer is not legal, so nothing was changed.',
          violations,
          bank_would_be_m: next.bank,
          hint: 'Call search_players with replacing_player_id set to find targets that fit.',
        });
      }

      commit(action);
      const cost = next.transfersMade[next.transfersMade.length - 1].cost;
      return text({
        ok: true,
        summary: `${out.name} (£${out.price}m) out, ${inc.name} (£${inc.price}m) in.`,
        reason,
        points_cost: cost,
        bank_m: next.bank,
        free_transfers_left: next.freeTransfers,
        note: cost > 0
          ? `This was beyond the free transfers, so it costs ${cost} points.`
          : 'This used a free transfer and costs no points.',
      });
    },
  });

  reg({
    name: 'set_captain',
    description:
      'Set the captain (doubles their points) or the vice-captain (steps in if the captain does ' +
      'not play). The player must already be in the starting XI, and the two roles must be ' +
      'different players. Returns the violation instead of changing anything if either is untrue.',
    inputSchema: {
      type: 'object',
      properties: {
        player_id: { type: 'number', description: 'Id of a player in the starting XI.' },
        role: { type: 'string', enum: ['captain', 'vice'], description: 'Which armband to give them.' },
      },
      required: ['player_id', 'role'],
    },
    async execute({ player_id, role }) {
      const p = BY_ID[player_id];
      if (!p) return text({ ok: false, error: `No player with id ${player_id}.` });
      const slot = state.squad.find((s) => s.id === player_id);
      if (!slot) return text({ ok: false, error: `${p.name} is not in the squad.` });
      if (!slot.starting) {
        return text({
          ok: false,
          error: `${p.name} is on the bench. Only a starting XI player can wear the armband.`,
        });
      }
      const action = { type: 'setCaptain', id: player_id, role };
      const { valid, violations } = validateSquad(preview(action), BY_ID);
      if (!valid) return text({ ok: false, error: 'That would break the lineup.', violations });

      commit(action);
      return text({ ok: true, summary: `${p.name} is now ${role === 'vice' ? 'vice-captain' : 'captain'}.` });
    },
  });

  reg({
    name: 'highlight_players',
    description:
      'Draw the user\'s eye to specific players by outlining their cards on screen with a short ' +
      'label. This is purely visual: it changes nothing about the squad, the bank or the ' +
      'transfers, and is the right way to show the user which players you are about to discuss ' +
      'before you propose anything. Call it with an empty array to clear the highlights.',
    inputSchema: {
      type: 'object',
      properties: {
        player_ids: { type: 'array', items: { type: 'number' }, description: 'Player ids to outline.' },
        label: { type: 'string', description: 'A few words explaining what these players have in common.' },
      },
      required: ['player_ids', 'label'],
    },
    async execute({ player_ids, label }) {
      const ids = (player_ids || []).filter((id) => BY_ID[id]);
      commit({ type: 'highlight', ids, label });
      return text({
        ok: true,
        summary: ids.length
          ? `Outlined ${ids.length} player(s) on screen under "${label}": ${ids.map((i) => BY_ID[i].name).join(', ')}.`
          : 'Cleared the highlights.',
      });
    },
  });

  // ------------------------------------------------- the legal-moves tool set
  //
  // Exactly one of make_free_transfer / take_points_hit exists at a time, and
  // play_wildcard disappears for good once the chip is used. See the comment on
  // registerTools: the tool list an agent can see is the list of moves it may make.

  const onWildcardOrFreeHit = state.activeChip === 'wildcard' || state.activeChip === 'freehit';

  if (state.freeTransfers > 0 || onWildcardOrFreeHit) {
    reg({
      name: 'make_free_transfer',
      description:
        onWildcardOrFreeHit
          ? `The user is playing their ${CHIP_LABELS[state.activeChip]}, so transfers are unlimited and free ` +
            'this gameweek. Swap one player for another at no points cost. The squad rules still apply.'
          : `Swap one player for another using one of the user's ${state.freeTransfers} free transfer(s), ` +
            'costing zero points. Use this rather than take_points_hit whenever a free transfer remains — ' +
            'this tool only exists while one does. The move is validated first and refused with the exact ' +
            'violation if it is illegal.',
      inputSchema: {
        type: 'object',
        properties: {
          player_out_id: { type: 'number', description: 'Id of the squad player to sell.' },
          player_in_id: { type: 'number', description: 'Id of the player to buy.' },
          reason: { type: 'string', description: 'One short sentence on why.' },
        },
        required: ['player_out_id', 'player_in_id', 'reason'],
      },
      execute: (args) => transferExecute(args, 'free'),
    });
  } else {
    reg({
      name: 'take_points_hit',
      description:
        'Swap one player for another when NO free transfers remain. This deducts 4 points from the ' +
        "user's gameweek score, so only use it when the gain clearly outweighs four points, and say " +
        'so in the reason. The free-transfer tool is not available because the user has none left — ' +
        'this is the only transfer route open right now.',
      inputSchema: {
        type: 'object',
        properties: {
          player_out_id: { type: 'number', description: 'Id of the squad player to sell.' },
          player_in_id: { type: 'number', description: 'Id of the player to buy.' },
          reason: { type: 'string', description: 'Why this is worth minus four points.' },
        },
        required: ['player_out_id', 'player_in_id', 'reason'],
      },
      execute: (args) => transferExecute(args, 'hit'),
    });
  }

  if (!state.chipsUsed.includes('wildcard')) {
    reg({
      name: 'play_wildcard',
      description:
        'Play the Wildcard chip: every transfer for the rest of this gameweek becomes free, with no ' +
        'points hits, letting the whole squad be rebuilt at once. It can only be played once per ' +
        'half of the season and cannot be undone, so confirm with the user before calling it. ' +
        'Banked free transfers are not lost. Once played this tool disappears.',
      inputSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why the squad needs a full rebuild now.' },
        },
        required: ['reason'],
      },
      async execute({ reason }) {
        commit({ type: 'playChip', chip: 'wildcard' });
        return text({
          ok: true,
          summary: 'Wildcard played. Transfers are now unlimited and free this gameweek.',
          reason,
          note: 'play_wildcard is no longer registered, and transfers now cost nothing.',
        });
      },
    });
  }

  // Shared body for the two mutually exclusive transfer tools above.
  async function transferExecute({ player_out_id, player_in_id, reason }, mode) {
    const out = BY_ID[player_out_id];
    const inc = BY_ID[player_in_id];
    if (!out || !inc) return text({ ok: false, error: 'Unknown player id.' });
    if (!state.squad.some((s) => s.id === player_out_id)) {
      return text({ ok: false, error: `${out.name} is not in the squad.` });
    }
    if (out.position !== inc.position) {
      return text({ ok: false, error: `${out.name} is a ${out.position}, ${inc.name} is a ${inc.position}.` });
    }
    const action = { type: 'transfer', outId: player_out_id, inId: player_in_id, reason };
    const next = preview(action);
    const { valid, violations } = validateSquad(next, BY_ID);
    if (!valid) {
      return text({ ok: false, error: 'Not legal, nothing changed.', violations, bank_would_be_m: next.bank });
    }
    commit(action);
    return text({
      ok: true,
      summary: `${out.name} out, ${inc.name} in.`,
      reason,
      points_cost: mode === 'hit' ? RULES.HIT_COST : 0,
      bank_m: next.bank,
      free_transfers_left: next.freeTransfers,
    });
  }

  return { supported: true, names, dispose: () => ac.abort() };
}
