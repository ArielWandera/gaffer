import { BY_ID } from './initialState.js';
import { RULES } from './fplRules.js';

const round = (n) => Math.round(n * 10) / 10;

// Every mutation funnels through here, so the state the read tool reports is
// always the state the screen is showing, including changes the user made by hand.
export function reducer(state, action) {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: state.selectedId === action.id ? null : action.id };

    case 'transfer': {
      const { outId, inId, source, reason } = action;
      const out = BY_ID[outId];
      const inc = BY_ID[inId];
      if (!out || !inc) return state;
      const idx = state.squad.findIndex((s) => s.id === outId);
      if (idx === -1) return state;

      const squad = state.squad.slice();
      squad[idx] = { ...squad[idx], id: inId };

      // Free Hit and Wildcard make transfers free; otherwise spend a free
      // transfer, and once they are gone each move is a four point hit.
      const freeMove = state.activeChip === 'wildcard' || state.activeChip === 'freehit';
      const free = freeMove || state.freeTransfers > 0;
      const cost = free ? 0 : RULES.HIT_COST;
      const freeTransfers = freeMove ? state.freeTransfers : Math.max(0, state.freeTransfers - 1);

      return {
        ...state,
        squad,
        bank: round(state.bank + out.price - inc.price),
        freeTransfers,
        transfersMade: [...state.transfersMade, { out: outId, in: inId, cost, reason: reason || null }],
        captain: state.captain === outId ? null : state.captain,
        viceCaptain: state.viceCaptain === outId ? null : state.viceCaptain,
        selectedId: null,
        log: logged(state, source, `${out.name} → ${inc.name}${reason ? ` · ${reason}` : ''}`),
      };
    }

    case 'toggleStarting': {
      const squad = state.squad.map((s) => (s.id === action.id ? { ...s, starting: !s.starting } : s));
      return { ...state, squad, selectedId: null, log: logged(state, action.source, `moved ${BY_ID[action.id]?.name}`) };
    }

    // Swapping two squad members between pitch and bench in one move keeps the
    // XI at eleven, which is what a user dragging a sub actually means.
    case 'swapStarting': {
      const a = state.squad.find((s) => s.id === action.a);
      const b = state.squad.find((s) => s.id === action.b);
      if (!a || !b || a.starting === b.starting) return state;
      const squad = state.squad.map((s) =>
        s.id === a.id ? { ...s, starting: b.starting } : s.id === b.id ? { ...s, starting: a.starting } : s
      );
      return { ...state, squad, selectedId: null };
    }

    case 'setCaptain': {
      const { id, role } = action;
      if (role === 'vice') {
        return {
          ...state,
          viceCaptain: id,
          captain: state.captain === id ? null : state.captain,
          log: logged(state, action.source, `${BY_ID[id]?.name} is vice-captain`),
        };
      }
      return {
        ...state,
        captain: id,
        viceCaptain: state.viceCaptain === id ? null : state.viceCaptain,
        log: logged(state, action.source, `${BY_ID[id]?.name} is captain`),
      };
    }

    case 'highlight':
      return {
        ...state,
        highlighted: action.ids,
        highlightLabel: action.label || null,
        log: logged(state, action.source, `${action.label || 'highlighted'} (${action.ids.length})`),
      };

    case 'clearHighlight':
      return { ...state, highlighted: [], highlightLabel: null };

    case 'playChip': {
      if (state.chipsUsed.includes(action.chip)) return state;
      return {
        ...state,
        chipsUsed: [...state.chipsUsed, action.chip],
        activeChip: action.chip,
        log: logged(state, action.source, `played ${action.chip}`),
      };
    }

    case 'setGameweek':
      return { ...state, gameweek: action.gameweek };

    // Replace the whole board with a squad fetched from FPL. Everything
    // provisional is dropped on purpose: pending transfers, highlights and
    // chips played in this session belonged to the previous team, not this one.
    case 'loadTeam': {
      const { team } = action;
      const known = team.picks.filter((p) => BY_ID[p.id]);
      if (known.length !== RULES.SQUAD_SIZE) return state;
      const cap = known.find((p) => p.captain);
      const vice = known.find((p) => p.vice);
      return {
        ...state,
        squad: known.map((p, slot) => ({ id: p.id, starting: p.starting, slot })),
        captain: cap ? cap.id : null,
        viceCaptain: vice ? vice.id : null,
        bank: round(team.bank),
        freeTransfers: 1,
        transfersMade: [],
        chipsUsed: Array.isArray(team.chips_used) ? team.chips_used : [],
        activeChip: null,
        highlighted: [],
        highlightLabel: null,
        selectedId: null,
        loaded: {
          entryId: team.entry_id,
          teamName: team.team_name,
          manager: team.manager,
          gameweek: team.gameweek,
        },
        log: logged(state, action.source, `loaded ${team.team_name}`),
      };
    }

    case 'setFreeTransfers':
      return { ...state, freeTransfers: Math.max(0, Math.min(RULES.MAX_BANKED_TRANSFERS, action.n)) };

    default:
      return state;
  }
}

function logged(state, source, text) {
  if (source !== 'agent') return state.log;
  return [...state.log, { text, at: Date.now() }].slice(-6);
}

export const pointsHit = (state) => state.transfersMade.reduce((n, t) => n + t.cost, 0);
