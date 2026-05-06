import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { api } from './api/http.js';
import Sidebar from './components/Sidebar.jsx';
import Config from './pages/Config.jsx';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import Projects from './pages/Projects.jsx';

export default function App() {
  const [stats, setStats] = useState(null);
  const [activeProject, setActiveProject] = useState(null);

  useEffect(() => {
    api.get('/api/stats/today').then(setStats).catch(() => {});
    api
      .get('/api/projects')
      .then((ps) => setActiveProject(ps.find((p) => p.is_active === 1) ?? null))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar stats={stats} activeProject={activeProject} onProjectClick={() => {}} />
      <main className="flex-1 overflow-auto bg-surface">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/history" element={<History />} />
          <Route path="/config" element={<Config />} />
        </Routes>
      </main>
    </div>
  );
}

