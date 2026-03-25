import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, AlertTriangle, FileText, Activity } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ChatRoom from './pages/ChatRoom';
import AgentDetail from './pages/AgentDetail';
import Proposals from './pages/Proposals';
import Incidents from './pages/Incidents';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 text-white flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-800">
            <Activity className="w-6 h-6 mr-2 text-blue-400" />
            <h1 className="text-lg font-bold">Mission Control</h1>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            <Link to="/" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-md">
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Overview
            </Link>
            <Link to="/chatroom" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-md">
              <MessageSquare className="w-5 h-5 mr-3" />
              Chat Room
            </Link>
            <Link to="/proposals" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-md">
              <FileText className="w-5 h-5 mr-3" />
              Proposals
            </Link>
            <Link to="/incidents" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-md">
              <AlertTriangle className="w-5 h-5 mr-3" />
              Incidents
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b flex items-center justify-between px-6">
            <h2 className="text-xl font-semibold text-gray-800">Canton Financial AI Team</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">System v0.2.0</span>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                D
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6">
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
