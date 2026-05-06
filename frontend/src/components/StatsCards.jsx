import { formatDuration } from '../theme.js';

function Card({ label, value, sub, pct, color }) {
  return (
    <div className="bg-surface-container border border-outline-variant rounded p-4">
      <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em] mb-2">
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-xs text-on-surface-variant mt-1">{sub}</div>}
      {pct !== undefined && (
        <div className="h-1 mt-3 bg-surface-container-high rounded overflow-hidden">
          <div
            className="h-full"
            style={{ width: `${Math.max(0, Math.min(pct, 100))}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}

export default function StatsCards({ stats }) {
  const byCategory = stats?.by_category ?? [];
  const totalSec = byCategory
    .filter((r) => r.category !== 'idle')
    .reduce((a, r) => a + r.seconds, 0);
  const codingSec = byCategory.find((r) => r.category === 'coding')?.seconds ?? 0;
  const idleSec = byCategory.find((r) => r.category === 'idle')?.seconds ?? 0;

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card
        label="Active time"
        value={formatDuration(totalSec)}
        sub="Today"
        color="#fbbf24"
        pct={(totalSec / 28800) * 100}
      />
      <Card
        label="Coding"
        value={formatDuration(codingSec)}
        sub={`${totalSec ? Math.round((codingSec / totalSec) * 100) : 0}% of active`}
        color="#ee9800"
        pct={totalSec ? (codingSec / totalSec) * 100 : 0}
      />
      <Card
        label="Idle"
        value={formatDuration(idleSec)}
        sub="Inactivity"
        color="#ffb4ab"
        pct={(idleSec / 3600) * 100}
      />
      <Card
        label="Now"
        value={stats?.current?.app_name ?? '—'}
        sub={stats?.current?.category ?? ''}
        color="#ffe1a7"
      />
    </div>
  );
}

