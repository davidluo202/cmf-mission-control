import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, AlertTriangle, FileText,
  Activity, Menu, X, LogOut, HeartPulse, Bell, XCircle, Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Dashboard from './pages/Dashboard';
import ChatRoom from './pages/ChatRoom';
import AgentDetail from './pages/AgentDetail';
import Proposals from './pages/Proposals';
import Incidents from './pages/Incidents';
import HealthChecks from './pages/HealthChecks';
import Alerts from './pages/Alerts';
import Login from './pages/Login';
import AgentPairing from './pages/AgentPairing';
import { getUnacknowledgedCount, getAlerts } from './api';

function Sidebar({
  sidebarOpen,
  closeSidebar,
  alertCount,
}: {
  sidebarOpen: boolean;
  closeSidebar: () => void;
  alertCount: number;
}) {
  const location = useLocation();

  const navLinks = [
    { to: '/',              icon: <LayoutDashboard className="w-5 h-5 mr-3" />, label: 'Overview' },
    { to: '/chatroom',      icon: <MessageSquare   className="w-5 h-5 mr-3" />, label: 'Chat Room' },
    { to: '/proposals',     icon: <FileText        className="w-5 h-5 mr-3" />, label: 'Proposals' },
    { to: '/incidents',     icon: <AlertTriangle   className="w-5 h-5 mr-3" />, label: 'Incidents' },
    { to: '/health-checks', icon: <HeartPulse      className="w-5 h-5 mr-3" />, label: 'Health' },
    { to: '/agent-pairing', icon: <Users          className="w-5 h-5 mr-3" />, label: 'Pairing' },
    {
      to: '/alerts',
      icon: (
        <span className="relative mr-3 flex-shrink-0 inline-flex">
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </span>
      ),
      label: 'Alerts',
    },
  ];

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-30
          bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800
          text-white flex flex-col shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:z-auto lg:shadow-none
        `}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center mr-2.5">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold tracking-tight">Mission Control</h1>
          </div>
          <button
            className="lg:hidden text-gray-400 hover:text-white p-1 rounded"
            onClick={closeSidebar}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeSidebar}
              className={`flex items-center px-3 py-2.5 rounded-lg transition-all text-sm ${
                isActive(link.to)
                  ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-900/40'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <p className="text-center text-xs text-gray-500">Nova • Mission Control v0.6.0</p>
        </div>
      </aside>
    </>
  );
}

function BellDropdown({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlerts({ acknowledged: 'false' })
      .then(data => {
        // Sort CRITICAL first, then by timestamp desc, take top 3
        const sorted = [...data].sort((a: any, b: any) => {
          const sevOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
          const ao = sevOrder[a.severity] ?? 3;
          const bo = sevOrder[b.severity] ?? 3;
          if (ao !== bo) return ao - bo;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        setRecentAlerts(sorted.slice(0, 3));
      })
      .catch(() => setRecentAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  function normalizeTs(ts: string) {
    return ts.endsWith('Z') ? ts : ts + 'Z';
  }

  const sevColor: Record<string, string> = {
    CRITICAL: 'text-red-600',
    WARNING:  'text-yellow-600',
    INFO:     'text-blue-600',
  };
  const sevDot: Record<string, string> = {
    CRITICAL: 'bg-red-500',
    WARNING:  'bg-yellow-400',
    INFO:     'bg-blue-400',
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-semibold text-gray-700">Recent Alerts</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-0.5 rounded">
          <XCircle className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-xs text-gray-400">Loading...</div>
      ) : recentAlerts.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-gray-400">No unacknowledged alerts</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {recentAlerts.map(alert => (
            <div key={alert.id} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sevDot[alert.severity] || 'bg-gray-400'}`} />
                <span className={`text-xs font-semibold ${sevColor[alert.severity] || 'text-gray-600'}`}>
                  {alert.severity}
                </span>
                {alert.agent_id && (
                  <span className="text-xs text-gray-500">· {alert.agent_id}</span>
                )}
                <span className="ml-auto text-xs text-gray-400">
                  {formatDistanceToNow(new Date(normalizeTs(alert.timestamp)))} ago
                </span>
              </div>
              <p className="text-xs text-gray-700 leading-snug line-clamp-2">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        <button
          onClick={() => { navigate('/alerts'); onClose(); }}
          className="w-full text-xs text-blue-600 font-medium hover:text-blue-800 text-center"
        >
          View all alerts →
        </button>
      </div>
    </div>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('mc_token') || '');
  const [alertCount, setAlertCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogin = (tok: string) => {
    localStorage.setItem('mc_token', tok);
    setToken(tok);
  };

  const handleLogout = () => {
    localStorage.removeItem('mc_token');
    setToken('');
  };

  // Fetch alert count every 15s
  useEffect(() => {
    if (!token) return;
    const fetchCount = () => {
      getUnacknowledgedCount()
        .then(data => setAlertCount(data.total || 0))
        .catch(() => {});
    };
    fetchCount();
    const timer = setInterval(fetchCount, 15000);
    return () => clearInterval(timer);
  }, [token]);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [bellOpen]);

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} closeSidebar={closeSidebar} alertCount={alertCount} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-sm lg:text-base font-semibold text-gray-800 leading-tight truncate">
                  Canton Financial AI Team
                </h2>
                <p className="text-xs text-gray-400 hidden sm:block">Mission Control v0.6.0</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Bell icon with badge */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => setBellOpen(o => !o)}
                  className={`relative p-2 rounded-lg transition-colors ${
                    bellOpen
                      ? 'bg-gray-100 text-gray-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                  title="Alerts"
                >
                  <Bell className="w-4 h-4" />
                  {alertCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {alertCount > 99 ? '99+' : alertCount}
                    </span>
                  )}
                </button>
                {bellOpen && <BellDropdown onClose={() => setBellOpen(false)} />}
              </div>

              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                D
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 lg:p-6">
            <Routes>
              <Route path="/"           element={<Dashboard />} />
              <Route path="/chatroom"   element={<ChatRoom />} />
              <Route path="/agent/:id"  element={<AgentDetail />} />
              <Route path="/proposals"     element={<Proposals />} />
              <Route path="/incidents"     element={<Incidents />} />
              <Route path="/health-checks" element={<HealthChecks />} />
              <Route path="/agent-pairing" element={<AgentPairing />} />
              <Route path="/alerts"        element={<Alerts />} />
            </Routes>
          </div>

          <footer className="shrink-0 h-8 bg-white border-t border-gray-100 flex items-center justify-center">
            <p className="text-xs text-gray-400">Nova • Mission Control v0.6.0 · Canton Financial AI Team</p>
          </footer>
        </main>
      </div>
    </Router>
  );
}

export default App;
