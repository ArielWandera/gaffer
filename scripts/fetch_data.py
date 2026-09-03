"""Fetch a static snapshot of FPL data.

The live FPL API sends no CORS headers, so the browser cannot call it directly.
We bundle a snapshot instead. Run this once and commit src/data/players.json.
"""
import json, os, requests

BOOT = "https://fantasy.premierleague.com/api/bootstrap-static/"
FIX = "https://fantasy.premierleague.com/api/fixtures/"

boot = requests.get(BOOT, timeout=30).json()
fixtures = requests.get(FIX, timeout=30).json()

teams = {t["id"]: t["short_name"] for t in boot["teams"]}
team_names = {t["id"]: t["name"] for t in boot["teams"]}
POS = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}

# Derive the current gameweek from the fixture list rather than hardcoding it,
# so the snapshot is self-correcting if regenerated later in the season.
unfinished = [f["event"] for f in fixtures if not f.get("finished") and f.get("event")]
current_gw = min(unfinished) if unfinished else 1

upcoming = {}
for f in fixtures:
    if f.get("finished") or f.get("event") is None:
        continue
    for side, opp, diff in (("team_h", "team_a", "team_h_difficulty"),
                            ("team_a", "team_h", "team_a_difficulty")):
        upcoming.setdefault(f[side], []).append({
            "opponent": teams[f[opp]],
            "home": side == "team_h",
            "difficulty": f[diff],
            "gameweek": f["event"],
        })

for tid in upcoming:
    upcoming[tid] = sorted(upcoming[tid], key=lambda x: x["gameweek"])[:3]

players = [{
    "id": p["id"],
    "name": p["web_name"],
    "team": teams[p["team"]],
    "team_id": p["team"],
    "position": POS[p["element_type"]],
    "price": p["now_cost"] / 10,
    "form": float(p["form"] or 0),
    "points": p["total_points"],
    "ppg": float(p["points_per_game"] or 0),
    "selected_by": float(p["selected_by_percent"] or 0),
    "status": p["status"],
    "news": p["news"] or "",
    "fixtures": upcoming.get(p["team"], []),
} for p in boot["elements"]]

out = {
    "generated": "2026-09-03",
    "current_gameweek": current_gw,
    "teams": [{"id": tid, "short": teams[tid], "name": team_names[tid]} for tid in sorted(teams)],
    "players": players,
}

os.makedirs("src/data", exist_ok=True)
with open("src/data/players.json", "w") as fh:
    json.dump(out, fh, separators=(",", ":"))
print(len(players), "players written, current gameweek:", current_gw)
