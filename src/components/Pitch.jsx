import PlayerCard from './PlayerCard.jsx';
import { BY_ID } from '../state/initialState.js';
import { POSITIONS } from '../state/fplRules.js';

export default function Pitch({ state, dispatch }) {
  const starting = state.squad.filter((s) => s.starting);
  const bench = state.squad.filter((s) => !s.starting);

  const onCardClick = (id) => {
    const sel = state.selectedId;
    if (sel && sel !== id) {
      const a = state.squad.find((s) => s.id === sel);
      const b = state.squad.find((s) => s.id === id);
      // Clicking one starter then one sub means "swap these two round".
      if (a && b && a.starting !== b.starting && BY_ID[sel].position === BY_ID[id].position) {
        dispatch({ type: 'swapStarting', a: sel, b: id });
        return;
      }
    }
    dispatch({ type: 'select', id });
  };

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

      {state.highlightLabel && state.highlighted.length > 0 && (
        <p className="highlight-note">
          <span className="dot" /> {state.highlightLabel}
          <button type="button" className="linkish" onClick={() => dispatch({ type: 'clearHighlight' })}>clear</button>
        </p>
      )}
    </section>
  );
}
