# Where else this pattern fits

Gaffer models a specific shape of problem, and Fantasy Premier League is only one
instance of it. The shape is:

- a **budget or cap** you cannot exceed
- **positional quotas**, so many of each kind, no more, no fewer
- a **concentration limit**, no more than N from any one source
- a **multiplier choice** (captain) that must fall on something already selected
- a **deadline**, before which everything is provisional

Every fantasy sports platform below is that same shape with different nouns. And
in every one of them, the hour before the deadline is spent in a draft state that
lives only in the browser tab.

## The constraint models

| Platform | Budget / cap | Squad shape | Concentration limit | Multiplier |
|---|---|---|---|---|
| **Fantasy Premier League** | £100.0m | 15: 2 GK, 5 DEF, 5 MID, 3 FWD; XI of 11 | 3 per club | Captain 2×, vice 1.5× |
| **UEFA Champions League Fantasy** | €100m, rising to €105m after the league phase | 15: 2/5/5/3; XI of 11 | **3 per club in the league phase, then 4, 5, 6, 8 as the rounds progress** | Captain 2× |
| **Dream11** (cricket) | 100 credits | 11 players across WK / BAT / AR / BOWL | 7 per real-world team | Captain 2×, vice 1.5× |
| **DraftKings** (NFL classic) | $50,000 salary | 1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX, 1 DST | n/a |, |
| **FanDuel** | $60,000 salary | varies by sport | n/a |, |
| **DraftKings** (NBA) | $50,000 salary | PG, SG, SF, PF, C, G, F, UTIL, slots with overlapping eligibility | n/a |, |

Note the UEFA row. **The per-club limit is not fixed, it rises as the competition
progresses.** A move that is illegal in the league phase becomes legal in the
quarter-finals. That is the argument for dynamic tool registration stated by the
game's own rulebook: the set of legal moves genuinely changes underneath you, and
a tool set that reflects "what you may do right now" is more honest than one that
accepts everything and rejects most of it.

The DFS rows are the richest constraint surface of the lot. A DraftKings NBA
lineup has slots with *overlapping eligibility*, G accepts a PG or an SG, UTIL
accepts anything, so validity is an assignment problem, not a simple count. An
agent that can only be handed legal moves is worth more there than anywhere.

## How reachable is each one

The pattern needs to read a saved squad. Writing back is a separate question, and
mostly the answer is no.

| Platform | Read a squad | Write back | Notes |
|---|---|---|---|
| **Fantasy Premier League** | ✅ public, no auth | ❌ none | What Gaffer uses. `/entry/{id}/event/{gw}/picks/` |
| **Sleeper** | ✅ **public, no auth, no API key at all** | ❌ read-only by design | The most open of the lot. `api.sleeper.app/v1/` |
| **Yahoo Fantasy** | ✅ with OAuth2 | ✅ **`PUT` to the roster resource** | The only one where the loop could actually close |
| **ESPN Fantasy** | ⚠️ undocumented endpoints | ❌ | No supported public API |
| **DraftKings / FanDuel** | ❌ no public API | ❌ | Constraint model is public; the data is not |

Two conclusions follow.

**Sleeper is the obvious next integration.** It is read-only, needs no token and
no OAuth dance, and its documentation is public. It is the same amount of work
FPL was, one proxy function and one mapping, and it opens the whole American
fantasy football audience.

**Yahoo is the only platform where an agent could complete the loop.** It has
OAuth2 and a real write path for lineup changes. Everywhere else, including FPL,
the honest boundary is: plan here, confirm on the official site. Gaffer keeps
that boundary deliberately. Asking someone for their fantasy platform password so
an agent can act as them is a credential-harvesting pattern, and no amount of
convenience justifies it.

## Beyond sport

Strip the nouns and the same tool design applies to any constraint-based planning
surface where the draft is the interesting state:

- **A portfolio rebalance**, allocation cap, sector concentration limit, cash
  floor. Nothing is real until you place the trades.
- **A sprint board**, team capacity, work-in-progress limits per column, a
  dependency ordering. Nothing is real until you commit the sprint.
- **A shift rota**, hours per person, minimum cover per role, statutory rest
  between shifts. Nothing is real until you publish it.
- **A course timetable**, credit total, prerequisite chains, no two classes in
  the same slot.

In each case the same two ideas carry over: the agent should read the draft the
person made by hand, and the tools it is handed should be exactly the moves that
are legal right now.

## Sources

- [UEFA Champions League Fantasy rules 2026/27](https://www.uefa.com/uefachampionsleague/news/025f-0fd4b42cc0a7-74498b7df63b-1000--uefa-champions-league-fantasy-football-rules-2026-27/)
- [Sleeper API documentation](https://docs.sleeper.com/)
- [Yahoo Fantasy API, roster and lineup management](https://help.yahoo.com/kb/SLN7137.html)
- [DraftKings, how to play](https://www.draftkings.com/how-to-play)
- [Dream11, how to play fantasy cricket](https://www.dream11.com/games/fantasy-cricket/how-to-play)
