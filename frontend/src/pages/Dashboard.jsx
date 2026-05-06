import { useCallback, useEffect, useState } from 'react';
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

export default function Dashboard() {
  const [date, setDate] = useState(todayStr());
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  const loadData = useCallback(async (d) => {
    const [s, a] = await Promise.all([
      api.get('/api/stats/today').catch(() => null),
      api.get(`/api/activities?date=${d}`).catch(() => []),
    ]);
    setStats(s);
    setActivities(a);
  }, []);

  useEffect(() => {
    loadData(date);
  }, [date, loadData]);

  const connected = useDevTrackWs((msg) => {
    if (msg.type === 'activity_changed') loadData(date);
    if (msg.type === 'activity_start') loadData(date);
    if (msg.type === 'activity_end') loadData(date);
  });
  useEffect(() => setWsConnected(connected), [connected]);

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
        current={stats?.current}
        wsConnected={wsConnected}
        date={date}
        onPrev={prevDay}
        onNext={nextDay}
        canNext={!isToday}
      />

      <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
        <StatsCards stats={stats} />

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
                <DonutChart stats={stats} />
              </div>
            </div>

            <div className="bg-surface-container border border-outline-variant rounded p-5 overflow-hidden">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.18em] mb-4">
                Projects
              </div>
              <ProjectBreakdown />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

