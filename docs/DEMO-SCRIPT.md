# Demo script — target 1:55, hard ceiling 3:00

Read this out. Unscripted runs long. The 0:20–1:20 block is **one unbroken take**.

Before recording: fresh incognito-style window, no bookmarks bar, zoom 100%,
board loaded at https://gaffer-psi.vercel.app, agent panel open alongside.

---

## 0:00 – 0:20 · the problem

> "Eleven million people play Fantasy Premier League. Every week you sit here in
> the hour before the deadline — half-planning. Swap someone in, undo it, try
> something else. **None of that is saved anywhere.** It's not on a server, it's
> not in a database. It only exists in this tab. So nothing can help you with it."

Cursor idles over the squad. Don't click yet.

---

## 0:20 – 1:20 · one unbroken take

**Beat 1 — the agent reads what's on screen.**

> "Watkins has left the league and he's still in my starting eleven. Let's ask."

Type: **"Have a look at my squad and tell me what's wrong with my attack."**

The agent calls `get_squad_state`. Say, over it:

> "It's reading the board as it sits — the bank, the bench, everything."

It comes back with Watkins (unavailable, £7.8m, still starting) and a tight £0.8m bank.

**Beat 2 — it shows its work on screen.**

Type: **"Show me who I could replace him with."**

`search_players`, then `highlight_players` — cards light up amber on the board.

> "That's the agent drawing on my board, not just talking at me."

**Beat 3 — the constraint bites.** *(safety net: if it doesn't reach for Arsenal on its own, ask directly — "what about an Arsenal defender?")*

When it proposes a 4th Arsenal player:

> "It can't. I already have three Arsenal players and it gets told exactly that."

The refusal reads: *"4 players from ARS — the limit is 3 per club."* It corrects itself.

**Beat 4 — the override. This is the whole point of the video.**

It proposes Watkins → João Pedro. Before accepting, **click a different player out by hand.**

> "Now watch. **I've changed this myself, and nothing has been saved.** No submit,
> no refresh, no request to any server. There is no API anywhere that knows what
> I just did."

Type: **"I changed something — carry on."**

It calls `get_squad_state` again and adapts to *your* version.

> "It re-read my draft and picked up from where I left it."

**Beat 5 — the tool set changes under it.**

That transfer spent the last free transfer.

> "And the move I just made changed what the agent is even able to do."

---

## 1:20 – 1:45 · cut to the code

Screen-record `src/webmcp/tools.js`.

Point at `get_squad_state`:

> "This is the state that only exists in the tab."

Scroll to the dynamic block:

> "And this is the part I care about. The tools that are registered **are** the
> legal moves. A second ago there was a `make_free_transfer` tool. I used my free
> transfer, so it was unregistered and `take_points_hit` took its place — it now
> has to acknowledge the four-point cost. Play the wildcard and `play_wildcard`
> stops existing entirely. **An illegal move isn't rejected. It's uncallable.**"

Two seconds on **Copy plan** producing the plain-text plan.

---

## 1:45 – 2:00 · the pattern

> "FPL is the case study, not the product. The pattern is: **the agent reads the
> draft state you made by hand, and the tools it's given are exactly the legal
> moves.** That fits any planning surface on the web — a portfolio, a sprint
> board, a shift rota. This is the reference implementation."

Hold on the URL: **gaffer-psi.vercel.app**

---

## If something breaks mid-take

- Agent won't call a tool → *"read my squad first"* usually forces it.
- Tool list looks stale → swap a player by hand; that re-registers everything.
- Transfer refused unexpectedly → that's the validator working, use it: read the
  violation aloud and let the agent recover. It's a better beat than a clean run.
