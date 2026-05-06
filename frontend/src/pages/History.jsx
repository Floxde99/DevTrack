import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/http.js';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDuration } from '../theme.js';

const CATEGORIES = ['coding', 'web', 'communication', 'terminal', 'design'];

export default function History() {
  const [weekData, setWeekData] = useState([]);

  useEffect(() => {
    api
      .get('/api/stats/week')
      .then((rows) => {
        const byDay = {};
        for (const row of rows) {
          if (!byDay[row.day]) byDay[row.day] = { day: row.day };
          byDay[row.day][row.category] = row.seconds;
        }
        setWeekData(Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-on-surface font-semibold tracking-tight text-lg mb-4">
        History — last 7 days
      </h1>

      <div className="bg-surface-container border border-outline-variant rounded p-5 mb-4">
        <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em] mb-4">
          Time by category
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={weekData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fill: '#d3c5ac', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
            <YAxis
              tick={{ fill: '#d3c5ac', fontSize: 11 }}
              tickFormatter={(s) => `${Math.floor(s / 3600)}h`}
            />
            <Tooltip
              formatter={(v, name) => [formatDuration(v), CATEGORY_LABELS[name] ?? name]}
              contentStyle={{
                background: '#241f15',
                border: '1px solid #4f4633',
                color: '#ece1d1',
                borderRadius: 4,
              }}
            />
            {CATEGORIES.map((cat) => (
              <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {weekData.map((day) => {
          const total = CATEGORIES.reduce((a, c) => a + (day[c] ?? 0), 0);
          return (
            <div key={day.day} className="bg-surface-container border border-outline-variant rounded p-4">
              <div className="text-[10px] text-on-surface-variant mb-1">
                {new Date(day.day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
              </div>
              <div className="text-base font-bold text-on-surface tabular-nums">{formatDuration(total)}</div>
              <div className="mt-2 flex flex-col gap-1">
                {CATEGORIES.filter((c) => (day[c] ?? 0) > 0).map((c) => (
                  <div key={c} className="flex justify-between text-[10px]">
                    <span style={{ color: CATEGORY_COLORS[c] }}>{CATEGORY_LABELS[c]}</span>
                    <span className="text-on-surface-variant tabular-nums">{formatDuration(day[c])}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

