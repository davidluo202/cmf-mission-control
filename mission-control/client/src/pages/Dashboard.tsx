import { useEffect, useState } from 'react';
import { getAgents, getProposals, getIncidents } from '../api';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bot, CheckCircle, Clock, AlertTriangle, PlayCircle } from 'lucide-react';

export default function Dashboard() {
  const [agents, setAgents] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setAgents(await getAgents());
      setProposals(await getProposals());
      setIncidents(await getIncidents());
    };
    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, []);

  const pendingProposals = proposals.filter(p => p.status === 'WAITING_DECISION');
  const openIncidents = incidents.filter(i => i.status === 'OPEN');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
      case 'working':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center shrink-0"><PlayCircle className="w-3 h-3 mr-1" /> RUNNING</span>;
      case 'WAITING_DECISION':
      case 'needs_approval':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center shrink-0"><Clock className="w-3 h-3 mr-1" /> WAITING</span>;
      case 'ERROR':
      case 'blocked':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full flex items-center shrink-0"><AlertTriangle className="w-3 h-3 mr-1" /> ERROR</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full flex items-center shrink-0"><CheckCircle className="w-3 h-3 mr-1" /> IDLE</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium">Active Agents</h3>
          <div className="mt-2 text-3xl font-bold text-gray-900">{agents.filter(a => a.status === 'working' || a.status === 'RUNNING').length} / {agents.length}</div>
        </div>
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium">Pending Decisions</h3>
          <div className="mt-2 text-3xl font-bold text-yellow-600">{pendingProposals.length}</div>
        </div>
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium">Open Incidents</h3>
          <div className="mt-2 text-3xl font-bold text-red-600">{openIncidents.length}</div>
        </div>
      </div>

      {/* Agents List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-medium text-gray-900 flex items-center"><Bot className="w-5 h-5 mr-2 text-blue-500" /> Agents Status</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {agents.length === 0 ? (
             <div className="p-6 text-center text-gray-500">No agents registered yet.</div>
          ) : agents.map(agent => (
            <div key={agent.agent_id} className="p-4 lg:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50">
              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/agent/${agent.agent_id}`} className="text-base lg:text-lg font-semibold text-blue-600 hover:underline capitalize truncate max-w-[180px]">{agent.agent_id}</Link>
                  {getStatusBadge(agent.status)}
                  {agent.needs_owner && (
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-md border border-purple-200 shrink-0">
                      Waiting: {agent.needs_owner}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1 truncate">Task: {agent.current_task || 'Idle'}</div>
                {agent.reason_code && (
                  <div className="text-sm text-red-500 mt-1 font-mono break-words">⚠️ {agent.reason_code}</div>
                )}
              </div>
              <div className="flex flex-row sm:flex-col sm:items-end items-center gap-3 shrink-0">
                <div className="text-xs text-gray-500 whitespace-nowrap">Updated {agent.updated_at ? formatDistanceToNow(new Date(agent.updated_at)) : ''} ago</div>
                <div className="w-24 sm:w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${agent.progress_pct || 0}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
