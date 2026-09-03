import { CURRENT_GW } from '../state/initialState.js';

/**
 * The declarative WebMCP API: a plain HTML form annotated with `toolname`,
 * `tooldescription` and `toolparamdescription`. The browser exposes it as a
 * callable tool with no JavaScript registration at all — the agent fills the
 * fields and submits, and the page handles the submit exactly as it would for
 * a human. Every other tool in this app uses the imperative API in
 * src/webmcp/tools.js; this one is here to cover both.
 */
export default function GameweekForm({ state, dispatch }) {
  const onSubmit = (e) => {
    e.preventDefault();
    const gw = Number(new FormData(e.currentTarget).get('gameweek'));
    if (Number.isFinite(gw) && gw >= 1 && gw <= 38) dispatch({ type: 'setGameweek', gameweek: gw });
  };

  return (
    <form
      className="gw-form"
      onSubmit={onSubmit}
      toolname="set_planning_gameweek"
      tooldescription="Change which gameweek the planning board is set to, between 1 and 38. Use this when the user wants to plan for a different week than the one currently shown."
    >
      <label htmlFor="gw">Planning for gameweek</label>
      <input
        id="gw"
        name="gameweek"
        type="number"
        min="1"
        max="38"
        defaultValue={state.gameweek}
        key={state.gameweek}
        toolparamdescription="The gameweek number to plan for, from 1 to 38."
      />
      <button type="submit">Set</button>
      <span className="fine">Snapshot taken at GW{CURRENT_GW}</span>
    </form>
  );
}
