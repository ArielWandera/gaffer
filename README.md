# Gaffer

**A Fantasy Premier League planning board where a human and an AI agent build the squad together, over WebMCP.**

🔗 **Live:** https://gaffer-psi.vercel.app
📄 **Tools:** [`src/webmcp/tools.js`](src/webmcp/tools.js) — every tool is in that one file.

---

## The problem

FPL managers spend the hours before a deadline in a provisional state: a player swapped in, a transfer not yet confirmed, a budget recalculating, three ideas half-tried.

**That state lives only in the browser tab.** It has never been saved to a server, so no server-side API and no conventional MCP server can see it. An assistant asked "should I sell Watkins?" is answering blind — it has no idea what you have already changed.

Gaffer registers WebMCP tools so an agent can read the squad *as it currently sits on screen*, propose legal moves, and react when you override it.

The framing is not "AI picks my team." It is a shared planning surface: **the agent proposes, the human overrides, the agent re-reads and adapts.**

---

## Why WebMCP fits

The provisional squad — swaps tried, transfers unconfirmed, a bench reshuffled and then reshuffled back — exists only in the tab's `useReducer` state. There is no endpoint that returns it, because it was never sent anywhere.

`get_squad_state` returns it in one call. That is the entire argument for WebMCP in one tool: the page is the only thing that knows, so the page is what should expose the tools.

This is openly a companion planner rather than a retrofit of fantasy.premierleague.com — a reference implementation of the pattern, not a fork of the real site.

---

## Better UX

The loop is **propose → override by hand → agent re-reads and adapts.**

Ask the agent to fix your attack. It reads the squad, searches the market, outlines two candidates on screen with `highlight_players`, and proposes a transfer with a stated reason. Then you disagree and click a different player out yourself. Nothing was saved, nothing was submitted — but the next `get_squad_state` call returns your version, and the agent works from that.

Contrast with a chatbot bolted onto a page: there the agent works on its own private model of your team and tells you what to type. Here it works on *your* draft.

The agent's actions are deliberately legible on screen — highlighted cards get a warm outline and a reason label, and every agent action is logged in the left panel — so a bystander can see what the model did and what the human did.

---

## What humans and agents can now do together

Two things that were not possible before:

**1. An agent acting on unsaved, human-made state** — no save, no refresh, no server round trip. The manual bench swap you made two seconds ago is in the agent's next read.

**2. Illegal moves are not rejected — they are uncallable.**

The registered tool set *is* the set of legal moves:

| State | Registered |
|---|---|
| `freeTransfers > 0` | `make_free_transfer` (costs 0 points) |
| `freeTransfers === 0` | `take_points_hit` (costs 4 points) — the free tool is gone |
| Wildcard unused | `play_wildcard` |
| Wildcard used | *nothing* — the tool ceases to exist |

Tool registration lives in a `useEffect` keyed on the whole state object. Any change — including one the user made by clicking — aborts the previous `AbortController`, tearing down every tool from the last render, and registers the set that is legal now. Re-registration is itself the change signal; per Chrome's guidance a page manages its own tool set with `registerTool` and `AbortSignal` and does not dispatch a change event of its own.

So an agent that has spent the user's last free transfer does not discover the fact from an error string. It discovers it because the function is no longer there.

Rules that *can't* be expressed as tool presence — the three-per-club limit, squad shape, the bank — are validated before mutation, and the violation text is returned rather than thrown, so the agent self-corrects on the next call:

> `"4 players from ARS — the limit is 3 per club."`

---

## Potential impact

- Built for FPL's **~11 million** managers, who all face the same pre-deadline hour.
- The same disease — draft state, hard constraints, a deadline — afflicts every fantasy platform, in a market worth roughly **$31–37B in 2025**, heading toward **~$80B by 2031**.
- The architecture is not about football. *The agent reads the draft state the human made by hand, and the registered tools are the current legal moves.* That fits any constraint-based planning surface: portfolio rebalancing, sprint planning, shift scheduling, product configurators.

FPL is the case study. The pattern is the product.

---

## How it is implemented

- **Imperative API** for the six stateful tools — `document.modelContext.registerTool(tool, { signal })` with an `AbortController` for cleanup, `annotations: { readOnlyHint: true }` on the two read-only tools.
- **Declarative API** for `set_planning_gameweek` — a plain `<form>` carrying `toolname`, `tooldescription` and `toolparamdescription` attributes, with no JS registration at all. See [`src/components/GameweekForm.jsx`](src/components/GameweekForm.jsx).
- **Dynamic registration** keyed on app state, as described above.
- **One `useReducer`** at the app root is the single source of truth. Both the UI and the tools dispatch into it, and the tools validate a move by running the *same pure reducer* to preview the next state before committing.
- **No backend.** Vite + React, plain CSS, static build.
- **Static FPL snapshot** (see below) because the live API sends no CORS headers. A serverless proxy and real-team import are the named next step.

### The six imperative tools

| Tool | What it does |
|---|---|
| `get_squad_state` | Reads the squad exactly as it stands on screen, including unsaved manual edits: all 15 players with price, form, availability and next three fixtures; XI vs bench; captain and vice; bank; free transfers; chips; pending transfers; rule violations and injury warnings. *Read-only.* |
| `search_players` | Searches the player pool by position, price, form and club, sorted by form. Defaults the budget to what the user can actually afford for the player being replaced, and flags results that would break the three-per-club limit. *Read-only.* |
| `propose_transfer` | Swaps one player out for another. Validates first; on failure returns the violation and changes nothing. Requires a `reason`, which is shown to the user. |
| `set_captain` | Assigns the captain or vice-captain armband. Refuses a benched player or a duplicate. |
| `highlight_players` | Outlines players on screen with a short label. Purely visual — changes nothing about the squad. |
| `make_free_transfer` / `take_points_hit` | Mutually exclusive. Which one exists depends on free transfers remaining. |
| `play_wildcard` | Makes all transfers free this gameweek. Disappears permanently once used. |

Plus `set_planning_gameweek` via the declarative API.

---

## Running it locally

```bash
git clone https://github.com/ArielWandera/gaffer
cd gaffer
npm install
npm run dev
```

Then open the printed URL.

### Enabling WebMCP

**ChatGPT's in-app browser** supports WebMCP out of the box — just open the live URL in it.

**Chrome:** go to `chrome://flags/#enable-webmcp-testing`, set it to **Enabled**, and restart. The [Model Context Tool Inspector](https://chromewebstore.google.com/) extension is useful for confirming which tools are registered on the page.

The app degrades gracefully: if `document.modelContext` is absent it renders and works as a normal planning board, and the left panel reads "WebMCP not detected".

### Checks

```bash
node scripts/check.mjs   # via: npx esbuild scripts/check.mjs --bundle --format=esm --platform=node --loader:.json=json --outfile=/tmp/check.mjs && node /tmp/check.mjs
```

Drives the real reducer and the real `registerTools` against a fake `document.modelContext`, covering the whole flow: the three-per-club block and recovery, the free-transfer → points-hit tool swap, the wildcard vanishing, `readOnlyHint`, AbortController teardown, and no-crash behaviour without WebMCP.

---

## Data

Player data is a **static snapshot taken on 3 September 2026** (`src/data/players.json`, 651 players), generated by [`scripts/fetch_data.py`](scripts/fetch_data.py) from the official FPL endpoints. The live API sends no CORS headers, so a browser cannot call it directly.

The current gameweek is derived from the fixture list (first unfinished event) rather than hardcoded, so regenerating the snapshot keeps the app correct.

Rules encoded are FPL **2026/27**: one free transfer per gameweek, up to five banked, four points per extra transfer; two each of Wildcard, Free Hit, Triple Captain and Bench Boost, one set per half of the season, one chip per gameweek, and banked free transfers preserved through a Wildcard or Free Hit.

The seed squad is deliberately imperfect — Ollie Watkins is still in the starting XI having left the league, the bank is tight at £0.8m, and Arsenal is already at the three-per-club limit — so there is somewhere for the agent to go.

## Licence

MIT — see [LICENSE](LICENSE).
