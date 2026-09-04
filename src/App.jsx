import { useEffect, useReducer, useState } from 'react';
import { initialState } from './state/initialState.js';
import { reducer } from './state/reducer.js';
import { registerTools } from './webmcp/tools.js';
import SquadPanel from './components/SquadPanel.jsx';
import Pitch from './components/Pitch.jsx';
import SearchPanel from './components/SearchPanel.jsx';
import GameweekForm from './components/GameweekForm.jsx';
import './styles.css';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [mcp, setMcp] = useState({ ok: false, api: null, count: 0, names: [] });

  // Keyed on the whole state object: any change to the squad, including one the
  // user just made by clicking, tears down the previous tool set via its
  // AbortController and registers the set that is legal now. Re-registration is
  // how the agent learns the moves have changed; the page fires no event itself.
  useEffect(() => {
    const { supported, api, names, dispose } = registerTools(state, dispatch);
    setMcp({ ok: supported, api, count: names.length, names });
    return dispose;
  }, [state]);

  return (
    <main className="app">
      <SquadPanel state={state} dispatch={dispatch} mcpStatus={mcp} />
      <div className="middle">
        <Pitch state={state} dispatch={dispatch} />
        <GameweekForm state={state} dispatch={dispatch} />
      </div>
      <SearchPanel state={state} dispatch={dispatch} />
    </main>
  );
}
