import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDuration } from '../theme.js';

export default function DonutChart({ stats }) {
  const data = (stats?.by_category ?? [])
    .filter((r) => r.category !== 'idle' && r.seconds > 0)
    .map((r) => ({
      name: CATEGORY_LABELS[r.category] ?? r.category,
      value: r.seconds,
      category: r.category,
    }));

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-on-surface-variant text-sm">No data</div>;
  }

  return (
    <div className="flex items-center gap-5 h-full">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={62}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? '#9c8f79'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => formatDuration(v)}
            contentStyle={{
              background: '#241f15',
              border: '1px solid #4f4633',
              color: '#ece1d1',
              borderRadius: 4,
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-col gap-2">
        {data.map((entry) => (
          <div key={entry.category} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: CATEGORY_COLORS[entry.category] }} />
            <span className="text-on-surface">{entry.name}</span>
            <span className="text-on-surface-variant ml-1 tabular-nums">{formatDuration(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

