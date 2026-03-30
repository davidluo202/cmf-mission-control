import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, AlertTriangle, FileText,
  Activity, Menu, X, LogOut, HeartPulse,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ChatRoom from './pages/ChatRoom';
import AgentDetail from './pages/AgentDetail';
import Proposals from './pages/Proposals';
import Incidents from './pages/Incidents';
import HealthChecks from './pages/HealthChecks';
import Login from './pages/Login';

function Sidebar({ sidebarOpen, closeSidebar }: { sidebarOpen: boolean; closeSidebar: () => void }) {
  const location = useLocation();

  const navLinks = [
    { to: '/',              icon: <LayoutDashboard className="w-5 h-5 mr-3" />, label: 'Overview' },
    { to: '/chatroom',      icon: <MessageSquare   className="w-5 h-5 mr-3" />, label: 'Chat Room' },
    { to: '/proposals',     icon: <FileText        className="w-5 h-5 mr-3" />, label: 'Proposals' },
    { to: '/incidents',     icon: <AlertTriangle   className="w-5 h-5 mr-3" />, label: 'Incidents' },
    { to: '/health-checks', icon: <HeartPulse      className="w-5 h-5 mr-3" />, label: 'Health' },
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
          <p className="text-center text-xs text-gray-500">Nova • Mission Control v0.5.1</p>
        </div>
      </aside>
    </>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('mc_token') || '');

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogin = (tok: string) => {
    localStorage.setItem('mc_token', tok);
    setToken(tok);
  };

  const handleLogout = () => {
    localStorage.removeItem('mc_token');
    setToken('');
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} closeSidebar={closeSidebar} />

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
                <p className="text-xs text-gray-400 hidden sm:block">Mission Control v0.5.1</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
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
            </Routes>
          </div>

          <footer className="shrink-0 h-8 bg-white border-t border-gray-100 flex items-center justify-center">
            <p className="text-xs text-gray-400">Nova • Mission Control v0.5.1 · Canton Financial AI Team</p>
          </footer>
        </main>
      </div>
    </Router>
  );
}

export default App;
