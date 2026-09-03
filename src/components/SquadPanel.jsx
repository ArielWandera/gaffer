import { useState } from 'react';
import { BY_ID, SNAPSHOT_DATE } from '../state/initialState.js';
import { RULES, CHIP_LABELS } from '../state/fplRules.js';
import { pointsHit } from '../state/reducer.js';
import { validateSquad, squadWarnings } from '../state/validate.js';

function planText(state) {
  const lines = [`Gaffer — GW${state.gameweek} plan`, ''];
  if (state.transfersMade.length === 0) lines.push('No transfers.');
  for (const t of state.transfersMade) {
    lines.push(`OUT ${BY_ID[t.out].name} (${BY_ID[t.out].team})  ->  IN ${BY_ID[t.in].name} (${BY_ID[t.in].team})`);
    if (t.reason) lines.push(`    ${t.reason}`);
  }
  lines.push('');
  lines.push(`Captain: ${state.captain ? BY_ID[state.captain].name : '—'}`);
  lines.push(`Vice:    ${state.viceCaptain ? BY_ID[state.viceCaptain].name : '—'}`);
  lines.push(`Bank:    £${state.bank.toFixed(1)}m`);
  lines.push(`Cost:    ${pointsHit(state)} points`);
  if (state.activeChip) lines.push(`Chip:    ${CHIP_LABELS[state.activeChip]}`);
  return lines.join('\n');
}

export default function SquadPanel({ state, dispatch, mcpStatus }) {
  const [copied, setCopied] = useState(false);
  const { valid, violations } = validateSquad(state, BY_ID);
  const warnings = squadWarnings(state, BY_ID);
  const hit = pointsHit(state);
  const value = Math.round(state.squad.reduce((n, s) => n + BY_ID[s.id].price, 0) * 10) / 10;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(planText(state));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside className="panel squad" aria-label="Squad summary">
      <header className="brand">
        <h1>Gaffer</h1>
        <p className="tag">Gameweek {state.gameweek} planning board</p>
      </header>

      <dl className="stats">
        <div><dt>Bank</dt><dd className={state.bank < 0 ? 'bad' : ''}>£{state.bank.toFixed(1)}m</dd></div>
        <div><dt>Value</dt><dd>£{value.toFixed(1)}m</dd></div>
        <div><dt>Free transfers</dt><dd>{state.freeTransfers}<span className="of"> / {RULES.MAX_BANKED_TRANSFERS}</span></dd></div>
        <div><dt>Points cost</dt><dd className={hit ? 'bad' : ''}>{hit ? `−${hit}` : '0'}</dd></div>
      </dl>

      <section className="chips">
        <h3>Chips</h3>
        <div className="chip-row">
          {RULES.CHIPS.map((c) => {
            const used = state.chipsUsed.includes(c);
            const active = state.activeChip === c;
            return (
              <span key={c} className={`chip ${used ? 'used' : ''} ${active ? 'active' : ''}`}>
                {CHIP_LABELS[c]}{used ? ' ✓' : ''}
              </span>
            );
          })}
        </div>
        <p className="fine">Two of each per season, one per half. First set expires at GW{RULES.FIRST_HALF_LAST_GW}.</p>
      </section>

      {violations.length > 0 && (
        <section className="alerts bad-alerts">
          <h3>Illegal squad</h3>
          <ul>{violations.map((v) => <li key={v}>{v}</li>)}</ul>
        </section>
      )}
      {warnings.length > 0 && (
        <section className="alerts warn-alerts">
          <h3>Watch out</h3>
          <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </section>
      )}

      {state.transfersMade.length > 0 && (
        <section className="transfers">
          <h3>This session</h3>
          <ul>
            {state.transfersMade.map((t, i) => (
              <li key={i}>
                <span className="out">{BY_ID[t.out].name}</span>
                <span className="arrow">→</span>
                <span className="in">{BY_ID[t.in].name}</span>
                {t.cost > 0 && <span className="cost">−{t.cost}</span>}
                {t.reason && <em className="why">{t.reason}</em>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.log.length > 0 && (
        <section className="agentlog">
          <h3>Agent</h3>
          <ul>{state.log.map((l, i) => <li key={i}>{l.text}</li>)}</ul>
        </section>
      )}

      <button type="button" className="primary" onClick={copy} disabled={!valid && violations.length > 0}>
        {copied ? 'Copied' : 'Copy plan'}
      </button>

      <footer className="foot">
        <span className={`mcp ${mcpStatus.ok ? 'on' : 'off'}`}>
          <i /> {mcpStatus.ok
            ? `WebMCP · ${mcpStatus.count} tools live · ${mcpStatus.api}`
            : 'WebMCP not detected'}
        </span>
        <span className="fine">Player data snapshot {SNAPSHOT_DATE}</span>
      </footer>
    </aside>
  );
}
