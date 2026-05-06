import { NavLink } from 'react-router-dom';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDuration } from '../theme.js';

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/history', label: 'History' },
  { to: '/config', label: 'Config' },
];

export default function Sidebar({ stats, activeProject, onProjectClick }) {
  const categories = ['coding', 'web', 'communication', 'terminal', 'design', 'idle', 'other'];
  const totalSec = (stats?.by_category ?? [])
    .filter((r) => r.category !== 'idle')
    .reduce((a, r) => a + r.seconds, 0);

  return (
    <aside className="w-[200px] bg-surface-container-lowest border-r border-outline-variant flex flex-col px-3 py-4 flex-shrink-0">
      <div className="text-on-surface font-semibold tracking-tight">DevTrack</div>

      <div className="mt-3 text-on-surface text-2xl font-bold tabular-nums">
        {formatDuration(totalSec)}
      </div>
      <div className="text-on-surface-variant text-[10px] uppercase tracking-[0.18em]">
        Active time
      </div>

      <div className="mt-5 text-on-surface-variant text-[10px] uppercase tracking-[0.18em] mb-2">
        Categories
      </div>
      <div className="flex flex-col gap-1">
        {categories.map((cat) => {
          const row = stats?.by_category?.find((r) => r.category === cat);
          return (
            <div
              key={cat}
              className="flex justify-between items-center px-2 py-1 border border-outline-variant bg-surface-container-low rounded hover:bg-surface-container cursor-default"
            >
              <span className="text-xs flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-sm inline-block flex-shrink-0"
                  style={{ background: CATEGORY_COLORS[cat] }}
                />
                <span className="truncate">{CATEGORY_LABELS[cat]}</span>
              </span>
              <span className="text-xs text-on-surface-variant tabular-nums">
                {formatDuration(row?.seconds ?? 0)}
              </span>
            </div>
          );
        })}
      </div>

      <nav className="mt-5 border-t border-outline-variant pt-4 flex flex-col gap-1">
        {NAV.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'text-xs px-2 py-2 border border-outline-variant bg-surface-container-low rounded',
                isActive
                  ? 'text-on-primary bg-primary-container border-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-outline-variant pt-4">
        <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em] mb-2">
          Active project
        </div>
        <button
          type="button"
          onClick={onProjectClick}
          className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-2 text-xs text-on-surface flex justify-between items-center hover:bg-surface-container"
        >
          <span className="truncate">
            {activeProject ? `● ${activeProject.name}` : 'None'}
          </span>
          <span className="text-on-surface-variant">▾</span>
        </button>
      </div>
    </aside>
  );
}

