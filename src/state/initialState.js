import data from '../data/players.json' with { type: 'json' };

export const PLAYERS = data.players;
export const TEAMS = data.teams;
export const SNAPSHOT_DATE = data.generated;
// Derived from the fixture list at snapshot time (first unfinished event),
// not hardcoded, so regenerating the snapshot keeps the app correct.
export const CURRENT_GW = data.current_gameweek;

export const BY_ID = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

// The board starts empty on purpose. A visitor has no reason to care about a
// squad that is not theirs, and starting from nothing makes the point the whole
// project is about: with no squad there is nothing to transfer and nobody to
// captain, so those tools are not registered at all. Load a team and they
// appear. The tool list is the move list.
//
// EXAMPLE_SQUAD is here so someone without an FPL team id can still use the
// app. It is deliberately imperfect: Watkins has left the league and is still
// in the XI, the bank is tight, and Arsenal are already at the three-per-club
// limit — so there is somewhere to go from here.
const EXAMPLE_SQUAD = [
  [226, true], [109, false],                                      // GK
  [8, true], [10, true], [115, true], [586, true], [277, false],  // DEF
  [12, true], [399, true], [367, true], [454, true], [565, false],// MID
  [411, true], [55, true], [464, false],                          // FWD
];

// Shaped like the payload /api/team returns, so loading the example and loading
// a real team travel the identical path through the reducer.
export const EXAMPLE_TEAM = {
  entry_id: null,
  team_name: 'Example squad',
  manager: 'a worked example',
  gameweek: CURRENT_GW,
  bank: 0.8,
  squad_value: 99.2,
  chips_used: [],
  picks: EXAMPLE_SQUAD.map(([id, starting]) => ({
    id,
    starting,
    captain: id === 411,
    vice: id === 12,
  })),
};

export const initialState = {
  squad: [],
  captain: null,
  viceCaptain: null,
  bank: 0,
  freeTransfers: 1,
  transfersMade: [],
  chipsUsed: [],
  activeChip: null,
  highlighted: [],
  highlightLabel: null,
  gameweek: CURRENT_GW,
  loaded: null,        // set once a real team is pulled in from FPL
  selectedId: null,    // the squad player the user has clicked, awaiting a swap
  log: [],             // agent actions, shown in the UI so the video is legible
};
