# Video script — read this out. Target 2:10, hard ceiling 3:00.

Setup: https://gaffer-psi.vercel.app, DevTools docked right, board visible,
helper snippet from RECORDING-CONSOLE.md already pasted. Zoom 100%.

---

### 0:00 — the problem  (~20s)

> "This is my actual Fantasy Premier League team. Eleven million people play this,
> and every week you sit here in the hour before the deadline, half-planning.
> Swap someone in, undo it, try something else.
>
> None of that is saved. It's not on a server, it's not in a database — it only
> exists in this browser tab. Which means nothing has ever been able to help you
> with it. Not FPL's own API. Not an MCP server. Nothing can see this."

Cursor drifts over the squad. Don't click.

---

### 0:20 — the page hands over its tools  (~20s)

Run: `await tools()`

> "So the page hands the tools over itself. Eight of them. Seven registered from
> JavaScript, one straight from HTML on that form.
>
> I'm calling these from the console so you can see the actual calls — this is the
> same interface an agent gets, just without a chat window in the way."

---

### 0:40 — it reads the draft, not a database  (~35s)

Run: `await run('get_squad_state')`

> "It reads the board as it sits. Bank's empty — nought pounds. Anderson's in my
> midfield on two-and-a-half form."

**Now click Anderson out on the board, by hand.**

Run: `await run('get_squad_state')` again

> "I just changed that myself. I didn't submit anything. Nothing was saved, no
> request went anywhere — and it still sees it, because it's reading this tab
> instead of a server.
>
> FPL's own API will hand you my saved team. The version I'm looking at right now
> exists in no endpoint, at any login. That's the gap this closes."

---

### 1:15 — the constraint bites  (~25s)

Run the Hinshelwood transfer.

> "Hinshelwood. Six million, eight-point-oh form — exactly the player you'd want.
> And it's illegal, because I've already got three Brighton players."

Point at the refusal.

> "Four players from BHA, the limit is three. That's not an error page, that's a
> sentence it can actually act on."

---

### 1:40 — it draws on my board  (~10s)

Run `highlight_players`.

> "And it can mark up the board directly, not just talk at me."

---

### 1:50 — the money shot  (~30s)

Run the legal transfer, then `await tools()`.

> "Now watch the tool list. That transfer spent my free transfer — so
> make_free_transfer is gone. It doesn't exist any more. take_points_hit has taken
> its place, and that one has to acknowledge the four-point cost.
>
> The tools that are registered *are* the legal moves. An illegal move isn't
> rejected. It's uncallable."

---

### 2:20 — the pattern  (~20s)

Cut to `src/webmcp/tools.js`, scroll the dynamic block.

> "FPL is the case study, not the product. The pattern is: the agent reads the
> draft state you made by hand, and the tools it's handed are exactly the moves
> that are legal right now.
>
> That fits any planning surface on the web — a portfolio, a sprint board, a shift
> rota. This is the reference implementation."

Hold on the URL.

---

## If it goes wrong

- Tool call errors → reload, re-paste the helper, carry on.
- Refusal you didn't expect → use it. Read the violation out. It's a better beat.
- Page blank → network, not the app. Reload.
