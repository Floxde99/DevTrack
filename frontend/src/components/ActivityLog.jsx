import { CATEGORY_COLORS, formatDuration } from '../theme.js';

function durationSeconds(a) {
  const end = a.ended_at ? new Date(a.ended_at) : new Date();
  return Math.floor((end - new Date(a.started_at)) / 1000);
}

function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function looksLikePath(p) {
  if (typeof p !== 'string' || p.length < 3) return false;
  if (/^\[redacted\]$/i.test(p)) return false;
  // If it's a SHA-256 hash (privacy hash mode), don't show it in UI.
  if (/^[a-f0-9]{32,}$/i.test(p)) return false;
  return p.includes(':\\') || p.includes(':/') || p.includes('/');
}

export default function ActivityLog({ activities }) {
  const list = (activities ?? []).slice(0, 30);

  return (
    <div className="flex flex-col gap-2 overflow-y-auto">
      {list.map((act, i) => (
        <div
          key={i}
          className="flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-xs"
        >
          <span
            className="w-2 h-2 rounded-sm flex-shrink-0"
            style={{ background: CATEGORY_COLORS[act.category] }}
          />
          <span className="text-on-surface flex-none w-28 truncate">{act.app_name}</span>
          <span className="text-on-surface-variant flex-1 truncate">
            {act.window_title}
            {looksLikePath(act.exe_path) && typeof act.pid === 'number' && Number.isFinite(act.pid) ? (
              <span className="text-on-surface-variant/60">{`  (pid ${act.pid})`}</span>
            ) : null}
          </span>
          <span className="text-on-surface-variant/80 flex-none tabular-nums">
            {formatDuration(durationSeconds(act))}
          </span>
          <span className="text-on-surface-variant/60 flex-none tabular-nums">
            {timeStr(act.started_at)}
          </span>
        </div>
      ))}
      {list.length === 0 && (
        <div className="text-on-surface-variant text-xs text-center py-8">No activity</div>
      )}
    </div>
  );
}

