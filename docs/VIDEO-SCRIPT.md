# Video script — target 2:30, hard ceiling 3:00

Recorded in the ChatGPT in-app browser at https://gaffer-psi.vercel.app, with
the board visible beside the conversation. Zoom 100%, no bookmarks bar.

Read the quoted lines. Unscripted runs long.

**Start with the board empty of your team** — the default squad loaded — so the
first thing the agent does is fetch yours. That is the strongest opening we have.

---

### 0:00 — the problem  (~20s)

> "Eleven million people play Fantasy Premier League. Every week you sit here in
> the hour before the deadline, half-planning. Swap someone in, undo it, try
> something else.
>
> None of that is saved. It's not on a server, it's not in a database — it only
> exists in this browser tab. Which means nothing has ever been able to help you
> with it."

---

### 0:20 — it fetches my real team  (~25s)

Type: **"Load my FPL team, my id is 6731094."**

The agent calls `load_manager_team`. The board repopulates — your name, your
squad, your bank.

> "That's my actual team. It pulled it from FPL's public API through the page.
> Bank's empty, and Anderson's on two-and-a-half form."

---

### 0:45 — the part no API can reach  (~35s)

Type: **"What's wrong with my squad?"** — it calls `get_squad_state`.

**Now click Anderson out on the board, by hand.**

> "Now watch. I've changed that myself. I haven't submitted anything, nothing was
> saved, no request went anywhere."

Type: **"I changed something — carry on."**

> "It re-read the board and picked up from my version.
>
> And that's the whole point. FPL's API will hand anyone my *saved* team — it just
> did. The version I'm looking at right now, the transfer I haven't confirmed,
> exists in no endpoint at any login. That state has never left this tab."

---

### 1:20 — the constraint bites  (~25s)

Type: **"What about Hinshelwood?"**

> "Six million, eight-point-oh form — exactly the player you'd want. And it's
> illegal, because I've already got three Brighton players."

The refusal reads *"4 players from BHA — the limit is 3 per club."* It corrects
itself. Point at the market panel, where De Cuyper is already greyed out with
**"3 from BHA"**.

---

### 1:45 — the shape rule  (~20s)

Type: **"Bring Kinsky on."**

> "Kinsky's my reserve keeper. That would leave two goalkeepers in the eleven —
> not a shape you're allowed to field. It gets told exactly that, in a sentence
> it can act on."

---

### 2:05 — the money shot  (~30s)

Let it make the legal transfer — Anderson out, Sangaré in. Then:

Type: **"What tools do you have now?"**

> "Watch the tool list. That transfer spent my free transfer — so
> `make_free_transfer` is gone. It doesn't exist any more. `take_points_hit` has
> taken its place, and that one has to acknowledge the four-point cost.
>
> The tools that are registered *are* the legal moves. An illegal move isn't
> rejected. It's uncallable."

---

### 2:35 — the pattern  (~20s)

> "FPL is the case study, not the product. Champions League Fantasy raises its
> per-club limit as the rounds progress — three, then four, five, six, eight. A
> move that's illegal in October is legal in April. Dream11, DraftKings, Yahoo —
> same shape, different nouns.
>
> The pattern is: the agent reads the draft you made by hand, and the tools it's
> handed are exactly the moves that are legal right now. This is the reference
> implementation."

Hold on the URL: **gaffer-psi.vercel.app**

---

## If the agent will not cooperate

- Won't call a tool → *"read my squad first"* usually forces it.
- Tool list looks stale → change a player by hand; that re-registers everything.
- Refusal you didn't expect → use it. Read the violation aloud. Better than a
  clean run.
- Falls over entirely → the console fallback in RECORDING-CONSOLE.md shows the
  same nine tools with none of the conversational risk.

## Numbers on hand

| | |
|---|---|
| Team id | 6731094 — "João you doing?" |
| Bank / value | £0.0m / £100.1m |
| Formation | 3-5-2, Haaland (C), B.Fernandes (V) |
| Blocked buy | Hinshelwood, BHA, £6.0m, form 8.0 |
| Blocked sub | Kinsky on — two keepers |
| The legal move | Anderson out, M.Sangaré in (£5.7m, form 9.0) |
