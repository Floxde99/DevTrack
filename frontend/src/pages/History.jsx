import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/http.js';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDuration } from '../theme.js';

const CATEGORIES = ['coding', 'web', 'communication', 'terminal', 'design'];

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

export default function History() {
  const [weekData, setWeekData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);

  const today = new Date();
  const weekAgo = new Date(Date.now() - 6 * 24 * 3600 * 1000);

  const [from, setFrom] = useState(fmtDate(weekAgo));
  const [to, setTo] = useState(fmtDate(today));
  const [category, setCategory] = useState('');
  const [appName, setAppName] = useState('');
  const [projectId, setProjectId] = useState('');

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

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (category) p.set('category', category);
    if (appName.trim()) p.set('app_name', appName.trim());
    if (projectId) p.set('project_id', projectId);

    api
      .get(`/api/activities?${p.toString()}`)
      .then(setActivities)
      .catch(() => setActivities([]));
  }, [from, to, category, appName, projectId]);

  async function exportCsv() {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (category) p.set('category', category);
    if (appName.trim()) p.set('app_name', appName.trim());
    if (projectId) p.set('project_id', projectId);

    const { blob, contentDisposition } = await api.download(
      `/api/activities/export?${p.toString()}`
    );

    const m = /filename="([^"]+)"/.exec(contentDisposition);
    const filename = m?.[1] || `activities_${from}_to_${to}.csv`;

    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

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

      <div className="mt-6 bg-surface-container border border-outline-variant rounded p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em]">
            Activities
          </div>
          <button
            type="button"
            onClick={() => exportCsv().catch(() => {})}
            className="text-xs px-3 py-2 border border-outline-variant rounded bg-surface-container-low hover:bg-surface-container text-on-surface"
          >
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-4">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em]">
              From
            </span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded px-2 py-2 text-xs text-on-surface"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em]">
              To
            </span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded px-2 py-2 text-xs text-on-surface"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em]">
              Category
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded px-2 py-2 text-xs text-on-surface"
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em]">
              App
            </span>
            <input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="chrome.exe"
              className="bg-surface-container-low border border-outline-variant rounded px-2 py-2 text-xs text-on-surface"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em]">
              Project
            </span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded px-2 py-2 text-xs text-on-surface"
            >
              <option value="">All</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-auto border border-outline-variant rounded">
          <table className="w-full text-xs">
            <thead className="bg-surface-container-low">
              <tr className="text-on-surface-variant">
                <th className="text-left font-medium px-3 py-2">Start</th>
                <th className="text-left font-medium px-3 py-2">End</th>
                <th className="text-left font-medium px-3 py-2">Duration</th>
                <th className="text-left font-medium px-3 py-2">Category</th>
                <th className="text-left font-medium px-3 py-2">App</th>
                <th className="text-left font-medium px-3 py-2">Project</th>
                <th className="text-left font-medium px-3 py-2">Window</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-on-surface-variant" colSpan={7}>
                    No activities for these filters.
                  </td>
                </tr>
              ) : (
                activities.map((a) => {
                  const start = new Date(a.started_at);
                  const end = a.ended_at ? new Date(a.ended_at) : null;
                  const seconds =
                    end && Number.isFinite(end.getTime()) && Number.isFinite(start.getTime())
                      ? Math.max(0, Math.floor((end - start) / 1000))
                      : null;

                  return (
                    <tr key={a.id} className="border-t border-outline-variant">
                      <td className="px-3 py-2 text-on-surface tabular-nums">
                        {Number.isFinite(start.getTime()) ? start.toLocaleString() : a.started_at}
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant tabular-nums">
                        {end
                          ? Number.isFinite(end.getTime())
                            ? end.toLocaleString()
                            : a.ended_at
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-on-surface tabular-nums">
                        {seconds === null ? '—' : formatDuration(seconds)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className="inline-flex items-center gap-2"
                          style={{ color: CATEGORY_COLORS[a.category] ?? '#d3c5ac' }}
                        >
                          <span
                            className="w-2 h-2 rounded-sm inline-block"
                            style={{ background: CATEGORY_COLORS[a.category] ?? '#4f4633' }}
                          />
                          {CATEGORY_LABELS[a.category] ?? a.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-on-surface">{a.app_name}</td>
                      <td className="px-3 py-2 text-on-surface">
                        {a.project_name ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant max-w-[420px] truncate">
                        {a.window_title ?? '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

