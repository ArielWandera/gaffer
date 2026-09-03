import PlayerCard from './PlayerCard.jsx';
import { BY_ID } from '../state/initialState.js';
import { POSITIONS } from '../state/fplRules.js';
import { reducer } from '../state/reducer.js';
import { validateSquad } from '../state/validate.js';

export default function Pitch({ state, dispatch }) {
  const starting = state.squad.filter((s) => s.starting);
  const bench = state.squad.filter((s) => !s.starting);

  // A swap is offered whenever the XI it produces is one you are allowed to
  // field — the same test the agent's substitute_player tool runs. Positions do
  // not have to match: a defender may come on for a midfielder so long as the
  // resulting shape is legal, which is how substitutions actually work.
  const swapIsLegal = (a, b) => {
    const sa = state.squad.find((s) => s.id === a);
    const sb = state.squad.find((s) => s.id === b);
    if (!sa || !sb || sa.starting === sb.starting) return false;
    return validateSquad(reducer(state, { type: 'swapStarting', a, b }), BY_ID).valid;
  };

  const onCardClick = (id) => {
    const sel = state.selectedId;
    if (sel && sel !== id && swapIsLegal(sel, id)) {
      dispatch({ type: 'swapStarting', a: sel, b: id });
      return;
    }
    dispatch({ type: 'select', id });
  };

  const selected = state.selectedId ? state.squad.find((s) => s.id === state.selectedId) : null;
  const selectedPlayer = selected ? BY_ID[selected.id] : null;

  return (
    <section className="pitch" aria-label="Squad pitch">
      {POSITIONS.map((pos) => {
        const row = starting.filter((s) => BY_ID[s.id].position === pos);
        if (!row.length) return null;
        return (
          <div className="row" key={pos} data-line={pos}>
            <span className="row-tag">{pos}</span>
            <div className="row-cards">
              {row.map((s) => (
                <PlayerCard key={s.id} id={s.id} starting state={state} onClick={() => onCardClick(s.id)} />
              ))}
            </div>
          </div>
        );
      })}

      <div className="bench">
        <span className="row-tag">BENCH</span>
        <div className="row-cards">
          {bench.map((s) => (
            <PlayerCard key={s.id} id={s.id} starting={false} state={state} onClick={() => onCardClick(s.id)} />
          ))}
        </div>
      </div>

      {selectedPlayer && (
        <div className="selection-bar">
          <span className="sel-name">{selectedPlayer.name}</span>
          {selected.starting ? (
            <>
              <button
                type="button"
                disabled={state.captain === selected.id}
                onClick={() => dispatch({ type: 'setCaptain', id: selected.id, role: 'captain' })}
              >
                Make captain
              </button>
              <button
                type="button"
                disabled={state.viceCaptain === selected.id}
                onClick={() => dispatch({ type: 'setCaptain', id: selected.id, role: 'vice' })}
              >
                Make vice
              </button>
              <span className="sel-hint">or click a bench player to sub them on</span>
            </>
          ) : (
            <span className="sel-hint">click a starter to bring {selectedPlayer.name} on</span>
          )}
          <button type="button" className="linkish" onClick={() => dispatch({ type: 'select', id: null })}>
            cancel
          </button>
        </div>
      )}

      {state.highlightLabel && state.highlighted.length > 0 && (
        <p className="highlight-note">
          <span className="dot" /> {state.highlightLabel}
          <button type="button" className="linkish" onClick={() => dispatch({ type: 'clearHighlight' })}>clear</button>
        </p>
      )}
    </section>
  );
}
