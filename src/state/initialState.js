import data from '../data/players.json' with { type: 'json' };

export const PLAYERS = data.players;
export const TEAMS = data.teams;
export const SNAPSHOT_DATE = data.generated;
// Derived from the fixture list at snapshot time (first unfinished event),
// not hardcoded, so regenerating the snapshot keeps the app correct.
export const CURRENT_GW = data.current_gameweek;

export const BY_ID = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

// The real squad of FPL entry 6731094 ("João you doing?") as it stood after
// gameweek 2, pulled from the public /entry/{id}/event/{gw}/picks/ endpoint.
// It is a genuinely tight board and that is the point: the bank is empty, so
// nothing can be bought before something is sold; Brighton are already at the
// three-per-club limit; and Anderson and Muniz are both out of form. The agent
// has real constraints to work inside rather than a contrived one.
//
// Note what this squad is: the *saved* team. FPL's own API will serve it to
// anyone. The provisional version — the transfer lined up but not confirmed —
// exists in no endpoint at any auth level. That draft layer is what this board
// hands to the agent, and it is the whole reason the project exists.
const SEED = [
  [109, true], [496, false],                                      // GK
  [4, true], [445, true], [469, true], [304, false], [423, false],// DEF
  [127, true], [426, true], [124, true], [368, true], [481, true],// MID
  [411, true], [165, true], [271, false],                         // FWD
];

export const initialState = {
  squad: SEED.map(([id, starting], slot) => ({ id, starting, slot })),
  captain: 411,        // Haaland
  viceCaptain: 426,    // B.Fernandes
  bank: 0.0,
  freeTransfers: 1,
  transfersMade: [],
  chipsUsed: [],
  activeChip: null,
  highlighted: [],
  highlightLabel: null,
  gameweek: CURRENT_GW,
  selectedId: null,    // the squad player the user has clicked, awaiting a swap
  log: [],             // agent actions, shown in the UI so the video is legible
};
