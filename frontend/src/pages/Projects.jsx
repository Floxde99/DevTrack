import { useEffect, useState } from 'react';
import { api } from '../api/http.js';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#fbbf24');

  const load = () => api.get('/api/projects').then(setProjects).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/api/projects', { name: name.trim(), color });
    setName('');
    load();
  }

  async function activate(id) {
    await api.patch(`/api/projects/${id}`, { is_active: true });
    load();
  }

  async function remove(id) {
    await api.delete(`/api/projects/${id}`);
    load();
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-on-surface font-semibold tracking-tight text-lg mb-4">Projects</h1>

      <form onSubmit={create} className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          required
          className="flex-1 bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary-container"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 rounded border border-outline-variant bg-surface-container-low cursor-pointer"
          aria-label="Project color"
        />
        <button
          type="submit"
          className="bg-primary-container text-on-primary px-4 py-2 rounded text-sm font-semibold hover:bg-secondary-container"
        >
          Create
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 bg-surface-container border border-outline-variant rounded px-4 py-3"
          >
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: p.color }} />
            <span className="flex-1 text-sm text-on-surface truncate">{p.name}</span>
            {p.is_active === 1 && (
              <span className="text-[10px] text-live bg-surface-container-high border border-outline-variant px-2 py-0.5 rounded-full">
                active
              </span>
            )}
            <button
              type="button"
              onClick={() => activate(p.id)}
              className="text-xs text-on-surface-variant hover:text-on-surface border border-outline-variant bg-surface-container-low rounded px-2 py-1"
            >
              Activate
            </button>
            <button
              type="button"
              onClick={() => remove(p.id)}
              className="text-xs text-on-surface-variant hover:text-danger border border-outline-variant bg-surface-container-low rounded px-2 py-1"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

