import { useEffect, useState } from 'react';
import { api } from '../api/http.js';
import {
  filterRules,
  parseRulesJson,
  RULE_CATEGORIES,
  rulesToJson,
  validateRules,
} from './configRules.js';

export default function Config() {
  const [rules, setRules] = useState([]);
  const [draft, setDraft] = useState([]);
  const [pattern, setPattern] = useState('');
  const [cat, setCat] = useState('coding');
  const [query, setQuery] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const load = () =>
    api
      .get('/api/rules')
      .then((rows) => {
        setRules(rows);
        setDraft(rows);
      })
      .catch((e) => setError(e?.message || 'Failed to load rules.'));
  useEffect(() => {
    load();
  }, []);

  async function addRule(e) {
    e.preventDefault();
    if (!pattern.trim()) return;
    setError('');
    setBusy(true);
    try {
      const next = [...draft, { app_pattern: pattern.trim(), category: cat, priority: 5 }];
      const v = validateRules(next);
      if (!v.ok) throw new Error(v.error);
      await api.put('/api/rules', v.rules);
      setPattern('');
      await load();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeRule(idx) {
    setError('');
    setBusy(true);
    try {
      const next = draft.filter((_, i) => i !== idx);
      const v = validateRules(next);
      if (!v.ok) throw new Error(v.error);
      await api.put('/api/rules', v.rules);
      await load();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    setError('');
    const v = validateRules(draft);
    if (!v.ok) {
      setError(formatValidationErrors(v));
      return;
    }

    setBusy(true);
    try {
      await api.put('/api/rules', v.rules);
      await load();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  async function exportJson() {
    setError('');
    try {
      const json = rulesToJson(draft);
      await navigator.clipboard.writeText(json);
    } catch {
      // clipboard can fail (permissions); fallback to a download
      const json = rulesToJson(draft);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'category_rules.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }

  async function importJson() {
    setError('');
    const parsed = parseRulesJson(importText);
    if (!parsed.ok) {
      setError(formatValidationErrors(parsed));
      return;
    }

    setBusy(true);
    try {
      await api.put('/api/rules', parsed.rules);
      setShowImport(false);
      setImportText('');
      await load();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  const filtered = filterRules(draft, { query, category: filterCat });
  const isDirty = JSON.stringify(draft) !== JSON.stringify(rules);

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-on-surface font-semibold tracking-tight text-lg mb-2">Configuration</h1>
      <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em] mb-4">
        Categorization rules
      </div>

      {error ? (
        <div className="mb-4 bg-surface-container border border-outline-variant rounded px-3 py-2 text-xs text-danger">
          {error}
        </div>
      ) : null}

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
          {RULE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy}
          className="bg-primary-container text-on-primary px-4 py-2 rounded text-sm font-semibold hover:bg-secondary-container disabled:opacity-60"
        >
          Add
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rules…"
          className="flex-1 min-w-[180px] bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary-container"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="bg-surface-container-low border border-outline-variant rounded px-2 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
          aria-label="Filter by category"
        >
          <option value="all">all</option>
          {RULE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          className="bg-surface-container text-on-surface px-3 py-2 rounded text-sm font-semibold border border-outline-variant hover:bg-surface-container-low"
        >
          Import JSON
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="bg-surface-container text-on-surface px-3 py-2 rounded text-sm font-semibold border border-outline-variant hover:bg-surface-container-low"
        >
          Export JSON
        </button>
        <button
          type="button"
          disabled={!isDirty || busy}
          onClick={saveAll}
          className="bg-primary-container text-on-primary px-3 py-2 rounded text-sm font-semibold hover:bg-secondary-container disabled:opacity-60"
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={load}
          className="text-on-surface-variant px-3 py-2 rounded text-sm font-semibold hover:text-on-surface disabled:opacity-60"
        >
          Reset
        </button>
      </div>

      {showImport ? (
        <div className="mb-4 bg-surface-container border border-outline-variant rounded p-3">
          <div className="text-xs text-on-surface-variant mb-2">
            Paste a JSON array of rules (fields: <span className="font-mono">app_pattern</span>,{' '}
            <span className="font-mono">category</span>, <span className="font-mono">priority</span>).
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full h-40 bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-xs text-on-surface font-mono outline-none focus:border-primary-container"
            placeholder='[{"app_pattern":"cursor.exe","category":"coding","priority":10}]'
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setShowImport(false);
                setImportText('');
              }}
              className="text-on-surface-variant px-3 py-2 rounded text-sm font-semibold hover:text-on-surface disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={importJson}
              className="bg-primary-container text-on-primary px-3 py-2 rounded text-sm font-semibold hover:bg-secondary-container disabled:opacity-60"
            >
              Import &amp; overwrite
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto">
        {filtered.map((r, i) => {
          const realIndex = draft.indexOf(r);
          return (
          <div
            key={`${r.app_pattern}-${realIndex}`}
            className="flex items-center gap-3 bg-surface-container border border-outline-variant rounded px-3 py-2 text-xs"
          >
            <input
              value={r.app_pattern}
              onChange={(e) =>
                setDraft((prev) =>
                  prev.map((x, idx) =>
                    idx === realIndex ? { ...x, app_pattern: e.target.value } : x
                  )
                )
              }
              className="text-on-surface font-mono flex-1 truncate bg-surface-container-low border border-outline-variant rounded px-2 py-1 outline-none focus:border-primary-container"
              aria-label="Rule pattern"
            />
            <select
              value={r.category}
              onChange={(e) =>
                setDraft((prev) =>
                  prev.map((x, idx) => (idx === realIndex ? { ...x, category: e.target.value } : x))
                )
              }
              className="bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-xs text-on-surface outline-none focus:border-primary-container"
              aria-label="Rule category"
            >
              {RULE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={r.priority ?? 0}
              onChange={(e) =>
                setDraft((prev) =>
                  prev.map((x, idx) =>
                    idx === realIndex ? { ...x, priority: e.target.value } : x
                  )
                )
              }
              className="w-16 bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-xs text-on-surface tabular-nums outline-none focus:border-primary-container"
              aria-label="Rule priority"
              inputMode="numeric"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => removeRule(realIndex)}
              className="text-on-surface-variant hover:text-danger ml-1"
              aria-label="Remove rule"
            >
              ✕
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function formatValidationErrors(v) {
  if (!v) return 'Invalid rules.';
  if (!v.errors || !Array.isArray(v.errors) || v.errors.length === 0) return v.error || 'Invalid rules.';
  const first = v.errors[0];
  return `${v.error || 'Invalid rules.'} (e.g. #${first.index} ${first.field}: ${first.message})`;
}

function formatError(e) {
  if (!e) return 'Something went wrong.';
  const details = e.details;
  if (details && typeof details === 'object' && details.error) {
    if (details.errors && Array.isArray(details.errors) && details.errors.length) {
      return formatValidationErrors(details);
    }
    return String(details.error);
  }
  return e.message || 'Something went wrong.';
}

