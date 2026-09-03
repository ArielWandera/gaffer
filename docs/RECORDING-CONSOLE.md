# Recording without an agent client

No WebMCP chat client to hand. It does not matter: `document.modelContext`
exposes `executeTool`, which is the *same* entry point an agent calls. Driving it
from the console shows the real path, and the board reacts on camera.

Open DevTools (F12) on https://gaffer-psi.vercel.app, dock it to the right so the
board stays visible, and paste this once:

```js
const mc = document.modelContext;
const run = async (n, a = {}) => {
  const r = await mc.executeTool(n, a);
  try { return JSON.parse(r.content[0].text); } catch { return r; }
};
const tools = async () => (await mc.getTools()).map(t => t.name);
```

---

## 1 — the page hands the agent its tools

```js
await tools()
```

Ten names. Nine registered from JavaScript, one from markup on the form.

> "The page is handing an agent eight tools. It's not scraping my UI — the page
> is telling it what it's allowed to do."

## 2 — it reads the board as it sits

```js
await run('get_squad_state')
```

Bank £0.0m, the bench, the captain, the lot.

**Now click a player out by hand on the board, then run it again.**

```js
await run('get_squad_state')
```

> "I changed that myself. Nothing was saved, nothing was submitted, no request
> went anywhere. And it can still see it — because it's reading the tab, not a
> server."

## 3 — the constraint bites

Hinshelwood is £6.0m on 8.0 form: affordable, in form, and illegal.

```js
await run('propose_transfer', { player_out_id: 481, player_in_id: 123, reason: 'better form than Anderson' })
```

Returns `ok: false` and *"4 players from BHA — the limit is 3 per club."*

> "Not an error page. A sentence it can act on."

## 3b — substitutions obey the shape rule

Kinsky is the reserve keeper. Bringing him on leaves two goalkeepers in the XI:

```js
await run('substitute_player', { starter_id: 426, bench_id: 496 })
```

*"Starting XI has 2 GK, must have exactly 1."* Now one that is legal — O'Shea, a
defender, comes on for a forward, and 3-5-2 becomes 4-5-1:

```js
await run('substitute_player', { starter_id: 165, bench_id: 304, reason: 'shore up the defence' })
```

> "Positions don't have to match. It just has to be a shape I'm allowed to field."

## 4 — it draws on my board

```js
await run('highlight_players', { player_ids: [411, 426, 165], label: 'premium attackers' })
```

Cards outline in amber on the pitch.

## 5 — the legal move

```js
await run('propose_transfer', { player_out_id: 481, player_in_id: 565, reason: 'Anderson is on 2.5 form; Sangare is on 9.0 and cheaper' })
```

## 6 — THE MONEY SHOT: the tool set itself changed

```js
await tools()
```

`make_free_transfer` is **gone**. `take_points_hit` is **there instead**.

> "That transfer spent my free transfer. So the tool to make a free one stopped
> existing, and the only move left costs four points — the agent has to
> acknowledge that. **An illegal move isn't rejected. It's uncallable.**"

---

## Player ids

| | |
|---|---|
| Anderson (MCI, £6.4m, form 2.5) | 481 |
| Hinshelwood (BHA, £6.0m, form 8.0) — blocked | 123 |
| M.Sangaré (BRE, £5.7m, form 9.0) — the buy | 565 |
| Haaland 411 · B.Fernandes 426 · João Pedro 165 | |
| Muniz 271 (bench) · Kinsky 496 (bench) | |

## To reset between takes

Reload the page. All state is in memory.
