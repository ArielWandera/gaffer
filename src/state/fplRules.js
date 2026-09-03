// FPL 2026/27 rules. Single place for every number the validator and the tools quote.
export const RULES = {
  SQUAD_SIZE: 15,
  POSITION_COUNTS: { GK: 2, DEF: 5, MID: 5, FWD: 3 },
  MAX_PER_CLUB: 3,
  STARTING_XI: 11,
  // Starting XI shape: exactly one keeper, then min/max per outfield line.
  XI_LIMITS: { GK: [1, 1], DEF: [3, 5], MID: [2, 5], FWD: [1, 3] },
  // One free transfer per gameweek, up to five may be banked.
  MAX_BANKED_TRANSFERS: 5,
  // Every purchase beyond the free ones costs four points.
  HIT_COST: 4,
  // Two of each chip per season, one half each. Only one chip per gameweek.
  // The first set expires at the GW19 deadline and does not carry over.
  CHIPS: ['wildcard', 'freehit', 'triplecaptain', 'benchboost'],
  FIRST_HALF_LAST_GW: 19,
};

export const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];

export const CHIP_LABELS = {
  wildcard: 'Wildcard',
  freehit: 'Free Hit',
  triplecaptain: 'Triple Captain',
  benchboost: 'Bench Boost',
};
