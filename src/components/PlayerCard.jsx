import { BY_ID } from '../state/initialState.js';

const STATUS_MARK = { i: 'INJ', d: 'DBT', s: 'SUS', u: 'OUT', n: 'N/A' };

export function Fixtures({ player, compact }) {
  return (
    <div className={compact ? 'fixtures compact' : 'fixtures'}>
      {player.fixtures.length === 0 && <span className="fix-none">no fixture</span>}
      {player.fixtures.map((f) => (
        <span
          key={f.gameweek + f.opponent}
          className={`fix fdr-${f.difficulty}`}
          title={`GW${f.gameweek} ${f.home ? 'vs' : 'at'} ${f.opponent} — difficulty ${f.difficulty}/5`}
        >
          {f.home ? f.opponent : f.opponent.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

export default function PlayerCard({
  id, starting, state, onClick, variant = 'pitch', badge,
}) {
  const p = BY_ID[id];
  if (!p) return null;
  const highlighted = state.highlighted.includes(id);
  const selected = state.selectedId === id;
  const isCap = state.captain === id;
  const isVice = state.viceCaptain === id;
  const flagged = p.status !== 'a';

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'card', `card-${variant}`,
        selected && 'is-selected',
        highlighted && 'is-highlighted',
        flagged && 'is-flagged',
        starting === false && 'is-benched',
      ].filter(Boolean).join(' ')}
      title={p.news || `${p.name} — ${p.team} ${p.position} £${p.price}m`}
    >
      <span className="card-top">
        <span className="club" data-club={p.team}>{p.team}</span>
        <span className="pos">{p.position}</span>
        {isCap && <span className="armband cap">C</span>}
        {isVice && <span className="armband vice">V</span>}
        {flagged && <span className="flag">{STATUS_MARK[p.status] || '!'}</span>}
      </span>
      <span className="name">{p.name}</span>
      <span className="card-bottom">
        <span className="price">£{p.price.toFixed(1)}</span>
        <span className="form" title="Form — average points over recent games">{p.form.toFixed(1)}</span>
      </span>
      <Fixtures player={p} compact={variant === 'pitch'} />
      {badge && <span className="card-badge">{badge}</span>}
    </button>
  );
}
