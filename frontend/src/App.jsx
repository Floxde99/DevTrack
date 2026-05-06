import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { api } from './api/http.js';
import Sidebar from './components/Sidebar.jsx';
import Config from './pages/Config.jsx';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import Projects from './pages/Projects.jsx';

export default function App() {
  const [stats, setStats] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const navigate = useNavigate();

  const reloadActiveProject = useCallback(async () => {
    const ps = await api.get('/api/projects').catch(() => []);
    setActiveProject(ps.find((p) => p.is_active === 1) ?? null);
  }, []);

  useEffect(() => {
    api.get('/api/stats/today').then(setStats).catch(() => {});
    reloadActiveProject();
  }, [reloadActiveProject]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        stats={stats}
        activeProject={activeProject}
        onProjectClick={() => {
          navigate('/projects');
        }}
      />
      <main className="flex-1 overflow-auto bg-surface">
        <Routes>
          <Route
            path="/"
            element={<Dashboard activeProject={activeProject} onActiveProjectChanged={reloadActiveProject} />}
          />
          <Route path="/projects" element={<Projects onActiveProjectChanged={reloadActiveProject} />} />
          <Route path="/history" element={<History />} />
          <Route path="/config" element={<Config />} />
        </Routes>
      </main>
    </div>
  );
}

