import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, AlertTriangle, FileText, Activity, Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ChatRoom from './pages/ChatRoom';
import AgentDetail from './pages/AgentDetail';
import Proposals from './pages/Proposals';
import Incidents from './pages/Incidents';

function Sidebar({ sidebarOpen, closeSidebar }: { sidebarOpen: boolean; closeSidebar: () => void }) {
  const location = useLocation();

  const navLinks = [
    { to: '/', icon: <LayoutDashboard className="w-5 h-5 mr-3" />, label: 'Overview' },
    { to: '/chatroom', icon: <MessageSquare className="w-5 h-5 mr-3" />, label: 'Chat Room' },
    { to: '/proposals', icon: <FileText className="w-5 h-5 mr-3" />, label: 'Proposals' },
    { to: '/incidents', icon: <AlertTriangle className="w-5 h-5 mr-3" />, label: 'Incidents' },
  ];

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col z-30
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:z-auto
      `}
    >
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800">
        <div className="flex items-center">
          <Activity className="w-6 h-6 mr-2 text-blue-400" />
          <h1 className="text-lg font-bold">Mission Control</h1>
        </div>
        <button
          className="lg:hidden text-gray-400 hover:text-white"
          onClick={closeSidebar}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            onClick={closeSidebar}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              isActive(link.to)
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <Router>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        {/* Backdrop (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar Drawer */}
        <Sidebar sidebarOpen={sidebarOpen} closeSidebar={closeSidebar} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-6 shrink-0">
            <div className="flex items-center gap-3">
              {/* Hamburger (mobile only) */}
              <button
                className="lg:hidden p-1.5 rounded-md text-gray-600 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-base lg:text-xl font-semibold text-gray-800 truncate">Canton Financial AI Team</h2>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <span className="hidden sm:inline text-sm text-gray-500">System v0.2.0</span>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                D
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-4 lg:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chatroom" element={<ChatRoom />} />
              <Route path="/agent/:id" element={<AgentDetail />} />
              <Route path="/proposals" element={<Proposals />} />
              <Route path="/incidents" element={<Incidents />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
