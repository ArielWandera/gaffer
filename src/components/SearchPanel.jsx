import { useMemo, useState } from 'react';
import { PLAYERS, BY_ID, TEAMS } from '../state/initialState.js';
import { POSITIONS, RULES } from '../state/fplRules.js';
import { Fixtures } from './PlayerCard.jsx';

export default function SearchPanel({ state, dispatch }) {
  const [pos, setPos] = useState('');
  const [team, setTeam] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minForm, setMinForm] = useState('');
  const [query, setQuery] = useState('');

  const selected = state.selectedId ? BY_ID[state.selectedId] : null;
  const budget = selected ? Math.round((state.bank + selected.price) * 10) / 10 : null;

  const owned = useMemo(() => new Set(state.squad.map((s) => s.id)), [state.squad]);
  const clubCount = useMemo(() => {
    const c = {};
    for (const s of state.squad) { const t = BY_ID[s.id].team; c[t] = (c[t] || 0) + 1; }
    return c;
  }, [state.squad]);

  // When a squad player is selected, the panel narrows to legal replacements
  // for them — same position, inside budget — so the click-to-swap always works.
  const results = useMemo(() => {
    const activePos = selected ? selected.position : pos;
    const cap = selected ? budget : (maxPrice ? Number(maxPrice) : null);
    const q = query.trim().toLowerCase();
    return PLAYERS.filter((p) => {
      if (owned.has(p.id)) return false;
      if (activePos && p.position !== activePos) return false;
      if (team && p.team !== team) return false;
      if (cap != null && p.price > cap + 1e-9) return false;
      if (minForm && p.form < Number(minForm)) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.form - a.form || b.points - a.points).slice(0, 40);
  }, [selected, budget, pos, team, maxPrice, minForm, query, owned]);

  const swap = (p) => {
    if (!selected) return;
    const held = (clubCount[p.team] || 0) - (selected.team === p.team ? 1 : 0);
    if (held >= RULES.MAX_PER_CLUB) return;
    dispatch({ type: 'transfer', outId: selected.id, inId: p.id, source: 'user' });
  };

  return (
    <aside className="panel search" aria-label="Player search">
      <header className="panel-head">
        <h2>Transfer market</h2>
        {selected ? (
          <p className="ctx">
            Replacing <strong>{selected.name}</strong> · budget £{budget.toFixed(1)}m
            <button type="button" className="linkish" onClick={() => dispatch({ type: 'select', id: selected.id })}>
              cancel
            </button>
          </p>
        ) : (
          <p className="ctx muted">Click a player in your squad to swap them out.</p>
        )}
      </header>

      <div className="filters">
        <input placeholder="Search name" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={selected ? selected.position : pos} onChange={(e) => setPos(e.target.value)} disabled={!!selected}>
          <option value="">All positions</option>
          {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="">All clubs</option>
          {TEAMS.map((t) => <option key={t.id} value={t.short}>{t.short}</option>)}
        </select>
        <input
          type="number" step="0.1" placeholder="Max £m"
          value={selected ? budget : maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          disabled={!!selected}
        />
        <input type="number" step="0.5" placeholder="Min form" value={minForm} onChange={(e) => setMinForm(e.target.value)} />
      </div>

      <ol className="results">
        {results.map((p) => {
          const held = (clubCount[p.team] || 0) - (selected && selected.team === p.team ? 1 : 0);
          const blocked = held >= RULES.MAX_PER_CLUB;
          const flagged = p.status !== 'a';
          const highlighted = state.highlighted.includes(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`result ${blocked ? 'is-blocked' : ''} ${highlighted ? 'is-highlighted' : ''}`}
                onClick={() => swap(p)}
                disabled={!selected || blocked}
                title={blocked ? `Already ${held} players from ${p.team}` : p.news || ''}
              >
                <span className="r-name">{p.name}</span>
                <span className="r-meta">
                  <span className="club" data-club={p.team}>{p.team}</span>
                  <span className="pos">{p.position}</span>
                  {flagged && <span className="flag">!</span>}
                </span>
                <span className="r-num">£{p.price.toFixed(1)}</span>
                <span className="r-num form">{p.form.toFixed(1)}</span>
                <Fixtures player={p} compact />
                {blocked && <span className="r-block">3 from {p.team}</span>}
              </button>
            </li>
          );
        })}
        {results.length === 0 && <li className="empty">Nothing matches those filters.</li>}
      </ol>
    </aside>
  );
}
