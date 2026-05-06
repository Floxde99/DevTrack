import { useEffect, useState } from 'react';
import { api } from '../api/http.js';

export default function ProjectBreakdown() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch(() => {});
  }, []);

  if (projects.length === 0) return <div className="text-on-surface-variant text-xs">No projects</div>;

  return (
    <div className="flex flex-col gap-2">
      {projects.map((p) => (
        <div
          key={p.id}
          className="bg-surface-container-low border border-outline-variant rounded px-4 py-3"
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
          <div className="h-1 bg-surface-container-high rounded overflow-hidden">
            <div className="h-full" style={{ width: '40%', background: p.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

