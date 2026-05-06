import { useEffect, useState } from 'react';
import { api } from '../api/http.js';

const CATEGORIES = ['coding', 'web', 'communication', 'terminal', 'design', 'other'];

export default function Config() {
  const [rules, setRules] = useState([]);
  const [pattern, setPattern] = useState('');
  const [cat, setCat] = useState('coding');

  const load = () => api.get('/api/rules').then(setRules).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  async function addRule(e) {
    e.preventDefault();
    if (!pattern.trim()) return;
    const newRules = [...rules, { app_pattern: pattern.trim(), category: cat, priority: 5 }];
    await api.put('/api/rules', newRules);
    setPattern('');
    load();
  }

  async function removeRule(idx) {
    const newRules = rules.filter((_, i) => i !== idx);
    await api.put('/api/rules', newRules);
    load();
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-on-surface font-semibold tracking-tight text-lg mb-2">Configuration</h1>
      <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em] mb-4">
        Categorization rules
      </div>

      <form onSubmit={addRule} className="flex gap-2 mb-4">
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="app_pattern (e.g. cursor.exe, chrome*)"
          className="flex-1 bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary-container"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="bg-surface-container-low border border-outline-variant rounded px-2 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-primary-container text-on-primary px-4 py-2 rounded text-sm font-semibold hover:bg-secondary-container"
        >
          Add
        </button>
      </form>

      <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto">
        {rules.map((r, i) => (
          <div
            key={`${r.app_pattern}-${i}`}
            className="flex items-center gap-3 bg-surface-container border border-outline-variant rounded px-3 py-2 text-xs"
          >
            <span className="text-on-surface font-mono flex-1 truncate">{r.app_pattern}</span>
            <span className="text-on-surface-variant">→</span>
            <span className="text-primary-container">{r.category}</span>
            <span className="text-on-surface-variant/60 tabular-nums ml-auto">p:{r.priority}</span>
            <button
              type="button"
              onClick={() => removeRule(i)}
              className="text-on-surface-variant hover:text-danger ml-1"
              aria-label="Remove rule"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

