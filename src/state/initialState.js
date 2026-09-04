import data from '../data/players.json' with { type: 'json' };

export const PLAYERS = data.players;
export const TEAMS = data.teams;
export const SNAPSHOT_DATE = data.generated;
// Derived from the fixture list at snapshot time (first unfinished event),
// not hardcoded, so regenerating the snapshot keeps the app correct.
export const CURRENT_GW = data.current_gameweek;

export const BY_ID = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

// A neutral default board, so a first-time visitor sees a squad rather than
// somebody else's team — and so loading a real one is a visible change.
//
// It is deliberately imperfect: Watkins has left the league and is still in the
// starting XI, the bank is tight at £0.8m, and Arsenal are already at the
// three-per-club limit. There is somewhere for the agent to go from here.
const SEED = [
  [226, true], [109, false],                                      // GK
  [8, true], [10, true], [115, true], [586, true], [277, false],  // DEF
  [12, true], [399, true], [367, true], [454, true], [565, false],// MID
  [411, true], [55, true], [464, false],                          // FWD
];

export const initialState = {
  squad: SEED.map(([id, starting], slot) => ({ id, starting, slot })),
  captain: 411,        // Haaland
  viceCaptain: 12,     // Saka
  bank: 0.8,
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
