# Devpost submission text

**Live URL:** https://gaffer-psi.vercel.app (no auth required)
**Repo:** https://github.com/ArielWandera/gaffer (public, MIT)

---

## Why WebMCP fits this problem

FPL managers spend the hour before a deadline in a provisional state: a player
swapped in, a transfer not yet confirmed, a budget recalculating, three ideas
half-tried.

**That state lives only in the browser tab.** It has never been sent anywhere, so
there is no endpoint that returns it — not the official API, not a conventional
MCP server. An assistant asked "should I sell Anderson?" is answering blind about
a squad it cannot see.

Gaffer holds that draft in one `useReducer` at the app root and exposes it with
`get_squad_state`. One call returns the squad exactly as it sits on screen,
unsaved edits included. That is the whole argument for WebMCP in a single tool:
the page is the only thing that knows, so the page is what should carry the tools.

This is openly a companion planner rather than a retrofit of the official site —
a reference implementation of the pattern, not a fork.

## How it makes for a better user experience

The loop is **propose → override by hand → agent re-reads and adapts.**

Ask it to fix your attack. It reads the board, searches the market, outlines two
candidates *on the page* with `highlight_players`, and proposes a transfer with a
stated reason. Disagree, and click a different player out yourself. Nothing was
saved and nothing was submitted — but the next `get_squad_state` returns your
version, and it works from that.

A chatbot bolted onto a page reasons about its own private copy of your team and
tells you what to type. Here the agent works on *your* draft, on your board. Its
actions are deliberately visible — highlighted cards get a warm outline and a
reason label, and every agent action is logged in the sidebar — so a person
watching can tell what the model did and what the human did.

## What humans and agents can now do together that they couldn't before

**1. An agent acting on unsaved, human-made state.** No save, no refresh, no
server round trip. The bench swap made two seconds ago is in the agent's next read.

This is now demonstrable in one sitting. `load_manager_team` fetches any
manager's *saved* squad from FPL's public API. Every edit made after that exists
only in the tab: `/my-team/` answers 403 without that manager's session cookie,
and even authenticated it returns saved state only. The provisional squad is in
no endpoint at any level of access. One panel of the app proves what the rest of
it is for.

**2. Illegal moves are not rejected — they are uncallable.**

The registered tool set *is* the set of legal moves. With a free transfer in hand
the agent sees `make_free_transfer`. Spend it and that tool is unregistered;
`take_points_hit` appears in its place, and its description states the four-point
cost, so the agent must reckon with the price. Play the Wildcard and
`play_wildcard` ceases to exist.

Tool registration lives in a `useEffect` keyed on the whole state object, so any
change — including one the user made by clicking — aborts the previous
`AbortController`, tears down every tool from the last render, and registers the
set that is legal now. Re-registration is itself the change signal; per Chrome's
guidance the page manages its own tool set with `registerTool` and `AbortSignal`
rather than dispatching a change event.

Constraints that can't be expressed as tool presence — the three-per-club limit,
squad shape, the bank — are validated before mutation, and the violation text is
*returned* rather than thrown, so the agent self-corrects on the next call:
*"4 players from BHA — the limit is 3 per club."*

## Impact

Built for FPL's ~11 million managers, who all face the same pre-deadline hour.
The same disease — draft state, hard constraints, a deadline — afflicts every
fantasy platform, a market worth roughly $31–37B in 2025 heading toward ~$80B by
2031. `docs/APPLICABILITY.md` documents the constraint model of five of them.
UEFA Champions League Fantasy is the sharpest case: its per-club limit *rises as
the competition progresses* — three in the league phase, then four, five, six,
eight — so a transfer that is illegal in October is legal in April. A game whose
legal move set genuinely changes underneath you is the argument for dynamic tool
registration, written into its own rulebook. And the architecture is not about football: *the agent reads the draft
state the human made by hand, and the registered tools are the current legal
moves.* That fits any constraint-based planning surface — portfolio rebalancing,
sprint planning, shift scheduling, product configurators.

FPL is the case study. The pattern is the product.

## How we implemented it

- **Imperative API** for nine stateful tools: `document.modelContext.registerTool(tool, { signal })`
  with an `AbortController` for cleanup, and `annotations: { readOnlyHint: true }`
  on the two read-only tools. All of it in one file, `src/webmcp/tools.js`.
  The model context is resolved across `document`, `navigator` and `window`, with
  fallbacks for clients that reject the options argument or expose only the older
  array-shaped `provideContext` — a client that keeps it elsewhere gets tools
  rather than silence.
- **Declarative API** for `set_planning_gameweek` — a plain `<form>` carrying
  `toolname`, `tooldescription` and `toolparamdescription`, with no JS registration.
- **Dynamic registration** keyed on app state, as described above.
- **One `useReducer`** is the single source of truth; the UI and the tools dispatch
  into it, and a tool validates a move by running the *same pure reducer* to preview
  the next state before committing.
- **No database and no application backend.** Vite + React, plain CSS, static build
  on Vercel. The squad lives entirely in the tab, which is the point.
- **One serverless function**, `api/team.js`, and it exists for exactly one reason:
  the FPL API sends no CORS headers, so the browser cannot call it from our origin.
  It is a pass-through — no state, no storage, no credentials, every endpoint it
  touches public.
- **Static player snapshot** dated 3 September 2026 (651 players), with the current
  gameweek derived from the fixture list rather than hardcoded.
- `scripts/check.mjs` runs 31 checks against the real reducer and the real
  `registerTools`, through a fake `document.modelContext`: the club-limit block and
  recovery, the free-transfer → points-hit tool swap, the wildcard vanishing,
  substitutions refused for producing an XI you may not field, `readOnlyHint`,
  AbortController teardown, the context-resolution fallbacks, and a graceful no-op
  in a browser with no WebMCP at all.
