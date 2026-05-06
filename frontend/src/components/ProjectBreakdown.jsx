import { useEffect, useState } from 'react';
import { api } from '../api/http.js';
import { formatDuration } from '../theme.js';

export default function ProjectBreakdown({ onActiveChanged }) {
  const [projects, setProjects] = useState([]);
  const [byProject, setByProject] = useState([]);

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch(() => {});
    api
      .get('/api/stats/today')
      .then((s) => setByProject(s?.by_project ?? []))
      .catch(() => {});
  }, []);

  if (projects.length === 0) return <div className="text-on-surface-variant text-xs">No projects</div>;

  const secondsById = new Map(byProject.map((r) => [r.project_id, r.seconds ?? 0]));
  const totalSeconds = Array.from(secondsById.values()).reduce((a, n) => a + n, 0);

  async function activate(id) {
    await api.patch(`/api/projects/${id}`, { is_active: true });
    const ps = await api.get('/api/projects').catch(() => []);
    setProjects(ps);
    onActiveChanged?.();
  }

  return (
    <div className="flex flex-col gap-2">
      {projects.map((p) => (
        <button
          type="button"
          key={p.id}
          onClick={() => activate(p.id)}
          className="text-left bg-surface-container-low border border-outline-variant rounded px-4 py-3 hover:bg-surface-container"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium truncate" style={{ color: p.color }}>
              ● {p.name}
            </span>
            {p.is_active === 1 && (
              <span className="text-[10px] bg-surface-container-high border border-outline-variant text-live px-2 py-0.5 rounded-full">
                active
              </span>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-on-surface-variant mb-2">
            <span className="truncate">{formatDuration(secondsById.get(p.id) ?? 0)}</span>
            <span className="tabular-nums">
              {totalSeconds > 0 ? `${Math.round(((secondsById.get(p.id) ?? 0) / totalSeconds) * 100)}%` : '—'}
            </span>
          </div>
          <div className="h-1 bg-surface-container-high rounded overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${totalSeconds > 0 ? ((secondsById.get(p.id) ?? 0) / totalSeconds) * 100 : 0}%`,
                background: p.color,
              }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}

