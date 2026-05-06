import { CATEGORY_COLORS } from '../theme.js';

function getTimePercent(isoStr) {
  const d = new Date(isoStr);
  return ((d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400) * 100;
}

export default function Timeline({ activities }) {
  const now = new Date();
  const startPct = (8 / 24) * 100;
  const endPct = Math.min(((now.getHours() + now.getMinutes() / 60) / 24) * 100, 100);
  const range = Math.max(1, endPct - startPct);

  const hours = Array.from({ length: 9 }, (_, i) => i + 9);

  return (
    <div>
      <div className="relative h-5 bg-surface-container-high border border-outline-variant rounded overflow-hidden">
        {(activities ?? []).map((act, i) => {
          const s = Math.max(getTimePercent(act.started_at), startPct);
          const e = act.ended_at ? Math.min(getTimePercent(act.ended_at), endPct) : endPct;
          const left = ((s - startPct) / range) * 100;
          const width = ((e - s) / range) * 100;
          if (width <= 0) return null;
          return (
            <div
              key={i}
              className="absolute top-0 h-full"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: CATEGORY_COLORS[act.category] ?? '#9c8f79',
              }}
              title={`${act.app_name} (${act.category})`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-on-surface-variant/70">
        {hours.map((h) => (
          <span key={h}>{h}h</span>
        ))}
      </div>
    </div>
  );
}

