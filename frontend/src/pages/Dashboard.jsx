import { useCallback, useEffect, useRef, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import StatsCards from '../components/StatsCards.jsx';
import Timeline from '../components/Timeline.jsx';
import ActivityLog from '../components/ActivityLog.jsx';
import DonutChart from '../components/DonutChart.jsx';
import ProjectBreakdown from '../components/ProjectBreakdown.jsx';
import { api } from '../api/http.js';
import { useDevTrackWs } from '../api/ws.js';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard({ activeProject, onActiveProjectChanged }) {
  const [date, setDate] = useState(todayStr());
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  /** Foreground app from WebSocket (daemon); avoids stale GET /stats when the UI loads before DB catches up. */
  const [liveCurrent, setLiveCurrent] = useState(null);

  const dateRef = useRef(date);
  dateRef.current = date;

  const loadData = useCallback(async (d) => {
    const [s, a] = await Promise.all([
      api.get(`/api/stats/today?date=${encodeURIComponent(d)}`).catch(() => null),
      api.get(`/api/activities?date=${d}`).catch(() => []),
    ]);
    setStats(s);
    setActivities(a);
  }, []);

  useEffect(() => {
    loadData(date);
  }, [date, loadData]);

  useEffect(() => {
    if (date !== todayStr()) setLiveCurrent(null);
  }, [date]);

  useDevTrackWs((msg) => {
    const t = msg?.type;
    const shouldRefresh =
      t === 'activity_changed' || t === 'activity_start' || t === 'activity_end';
    if (!shouldRefresh) return;

    if (
      (t === 'activity_start' || t === 'activity_changed') &&
      msg.app_name &&
      msg.category &&
      msg.started_at &&
      !msg.ended_at
    ) {
      setLiveCurrent({
        app_name: msg.app_name,
        window_title: msg.window_title ?? '',
        browser_domain: msg.browser_domain ?? null,
        browser_url: msg.browser_url ?? null,
        category: msg.category,
        started_at: msg.started_at,
      });
    }

    loadData(dateRef.current);
  });

  useEffect(() => {
    if (date !== todayStr()) return undefined;
    const id = setInterval(() => loadData(dateRef.current), 15000);
    return () => clearInterval(id);
  }, [date, loadData]);

  const displayCurrent =
    date === todayStr() && liveCurrent ? liveCurrent : (stats?.current ?? null);

  const statsForCards =
    stats == null
      ? liveCurrent && date === todayStr()
        ? {
            current: displayCurrent,
            date,
            by_category: [],
            by_project: [],
            total_active_seconds: 0,
          }
        : null
      : { ...stats, current: displayCurrent };

  const isToday = date === todayStr();
  const prevDay = () =>
    setDate((d) => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() - 1);
      return dt.toISOString().slice(0, 10);
    });
  const nextDay = () => {
    if (!isToday) {
      setDate((d) => {
        const dt = new Date(d);
        dt.setDate(dt.getDate() + 1);
        return dt.toISOString().slice(0, 10);
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        current={displayCurrent}
        activeProject={activeProject}
        date={date}
        onPrev={prevDay}
        onNext={nextDay}
        canNext={!isToday}
      />

      <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
        <StatsCards stats={statsForCards} />

        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          <div className="bg-surface-container border border-outline-variant rounded p-5 flex flex-col gap-4 overflow-hidden">
            <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em]">
              Timeline
            </div>
            <Timeline activities={activities} />
            <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em] mt-1">
              Recent activity
            </div>
            <div className="flex-1 overflow-hidden">
              <ActivityLog activities={activities} />
            </div>
          </div>

          <div className="flex flex-col gap-4 min-h-0">
            <div className="bg-surface-container border border-outline-variant rounded p-5">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em] mb-4">
                Breakdown
              </div>
              <div className="h-40">
                <DonutChart stats={statsForCards} />
              </div>
            </div>

            <div className="bg-surface-container border border-outline-variant rounded p-5 overflow-hidden">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em] mb-4">
                Projects
              </div>
              <ProjectBreakdown
                onActiveChanged={() => {
                  onActiveProjectChanged?.();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

