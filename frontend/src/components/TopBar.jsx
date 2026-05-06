import { useEffect, useState } from 'react';
import { formatDuration } from '../theme.js';

export default function TopBar({ current, activeProject, date, onPrev, onNext, canNext }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!current?.started_at) return;
    const start = new Date(current.started_at).getTime();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    setElapsed(Math.floor((Date.now() - start) / 1000));
    return () => clearInterval(id);
  }, [current?.started_at]);

  return (
    <div className="bg-surface border-b border-outline-variant px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3 bg-surface-container border border-outline-variant rounded px-4 py-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-live animate-pulse flex-shrink-0" />
        <span className="text-on-surface text-xs truncate">{current?.app_name ?? '—'}</span>
        <span className="text-on-surface-variant text-xs truncate">
          {current?.category ? `— ${current.category}` : '—'}
        </span>
        <span className="text-on-surface-variant mx-1">|</span>
        <span className="text-on-surface text-sm font-semibold tabular-nums">
          {formatDuration(elapsed)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-on-surface-variant">
        <div className="hidden sm:flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded px-3 py-1.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: activeProject?.color ?? '#9c8f79' }}
          />
          <span className="text-on-surface text-xs truncate">
            {activeProject ? activeProject.name : 'No active project'}
          </span>
        </div>
        <button
          type="button"
          onClick={onPrev}
          className="bg-surface-container-low border border-outline-variant rounded px-2 py-1 hover:bg-surface-container hover:text-on-surface"
        >
          ◀
        </button>
        <span className="tabular-nums">{date}</span>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className={[
            'bg-surface-container-low border border-outline-variant rounded px-2 py-1',
            canNext ? 'hover:bg-surface-container hover:text-on-surface' : 'opacity-40 cursor-default',
          ].join(' ')}
        >
          ▶
        </button>
      </div>
    </div>
  );
}

