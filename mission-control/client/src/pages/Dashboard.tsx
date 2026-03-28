import React, { useEffect, useState } from 'react';
import { getAgents, getProposals, getIncidents } from '../api';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Bot, CheckCircle, Clock, AlertTriangle, PlayCircle,
  Pause, XCircle, ChevronRight, Zap, FileText, ShieldAlert
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { dot: string; badge: string; icon: React.ReactElement; label: string }> = {
  RUNNING: {
    dot: 'bg-green-500 animate-pulse',
    badge: 'bg-green-100 text-green-800 border-green-200',
    icon: <PlayCircle className="w-3 h-3" />,
    label: 'RUNNING',
  },
  IDLE: {
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: <CheckCircle className="w-3 h-3" />,
    label: 'IDLE',
  },
  WAITING_DECISION: {
    dot: 'bg-purple-500 animate-pulse',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: <Clock className="w-3 h-3" />,
    label: 'WAITING',
  },
  WAITING_AUTH: {
    dot: 'bg-yellow-400 animate-pulse',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Clock className="w-3 h-3" />,
    label: 'AUTH',
  },
  BLOCKED: {
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <Pause className="w-3 h-3" />,
    label: 'BLOCKED',
  },
  ERROR: {
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="w-3 h-3" />,
    label: 'ERROR',
  },
  OFFLINE: {
    dot: 'bg-gray-300',
    badge: 'bg-gray-100 text-gray-400 border-gray-200',
    icon: <XCircle className="w-3 h-3" />,
    label: 'OFFLINE',
  },
};

// Agents are considered offline if no heartbeat in OFFLINE_THRESHOLD_MS
const OFFLINE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

function getEffectiveStatus(agent: any): string {
  if (!agent.updated_at) return agent.status;
  const lastSeen = new Date(agent.updated_at + 'Z').getTime(); // SQLite stores UTC without Z
  const now = Date.now();
  if (now - lastSeen > OFFLINE_THRESHOLD_MS) return 'OFFLINE';
  return agent.status;
}

// Seed demo data so dashboard isn't empty
async function seedDemoData() {
  const agents = [
    { agent_id: 'Nova', status: 'RUNNING', current_task: 'Mission Control development (Phase 3)', progress_pct: 70 },
    { agent_id: 'Qual', status: 'IDLE', current_task: 'Awaiting PR for review', progress_pct: 0 },
    { agent_id: 'Nas', status: 'RUNNING', current_task: 'Hosting Mission Control server', progress_pct: 0 },
    { agent_id: 'Imax', status: 'IDLE', current_task: 'Awaiting deployment instructions', progress_pct: 0 },
    { agent_id: 'Icy', status: 'IDLE', current_task: 'Monitoring team progress', progress_pct: 0 },
  ];
  for (const a of agents) {
    await api.post('/agents', a);
  }
}

export default function Dashboard() {
  const [agents, setAgents] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [seeding, setSeeding] = useState(false);

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
  const runningAgents = agents.filter(a => {
    const eff = getEffectiveStatus(a);
    return eff === 'RUNNING' || eff === 'working';
  });

  const handleSeed = async () => {
    setSeeding(true);
    await seedDemoData();
    setAgents(await getAgents());
    setSeeding(false);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Active Agents</h3>
            <Bot className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {runningAgents.length}
            <span className="text-lg text-gray-400 font-normal"> / {agents.length}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {agents.length === 0 ? 'No agents registered' : `${agents.length - runningAgents.length} idle`}
          </p>
        </div>

        <Link to="/proposals" className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Pending Decisions</h3>
            <FileText className="w-4 h-4 text-gray-400 group-hover:text-amber-500" />
          </div>
          <div className={`mt-2 text-3xl font-bold ${pendingProposals.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {pendingProposals.length}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {pendingProposals.length > 0 ? 'Requires your attention →' : 'All decisions made'}
          </p>
        </Link>

        <Link to="/incidents" className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:border-red-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Open Incidents</h3>
            <ShieldAlert className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
          </div>
          <div className={`mt-2 text-3xl font-bold ${openIncidents.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {openIncidents.length}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {openIncidents.length > 0 ? 'Action required →' : 'All systems green ✓'}
          </p>
        </Link>
      </div>

      {/* Agents Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            Agent Status
          </h3>
          {agents.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Zap className="w-3 h-3" />
              {seeding ? 'Seeding...' : 'Seed Demo Agents'}
            </button>
          )}
        </div>

        {agents.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Bot className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium text-gray-500">No agents registered yet</p>
            <p className="text-xs mt-1">Agents appear here when they connect via the SDK</p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {seeding ? 'Seeding...' : 'Seed Demo Agents'}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {agents.map(agent => {
              const effectiveStatus = getEffectiveStatus(agent);
              const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.IDLE;
              const isOffline = effectiveStatus === 'OFFLINE';
              // Parse updated_at as UTC
              const lastSeenDate = agent.updated_at
                ? new Date(agent.updated_at.endsWith('Z') ? agent.updated_at : agent.updated_at + 'Z')
                : null;
              return (
                <Link
                  key={agent.agent_id}
                  to={`/agent/${agent.agent_id}`}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group ${isOffline ? 'opacity-60' : ''}`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm uppercase ${isOffline ? 'bg-gray-400' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                      {agent.agent_id.charAt(0)}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${cfg.dot}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 capitalize">{agent.agent_id}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border font-medium ${cfg.badge}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      {agent.needs_owner && !isOffline && (
                        <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                          → {agent.needs_owner}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {isOffline ? 'No heartbeat — agent may be offline' : (agent.current_task || 'No active task')}
                    </p>
                    {agent.reason_code && !isOffline && (
                      <p className="text-xs text-orange-600 font-mono mt-0.5">⚠ {agent.reason_code}</p>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className={`text-xs ${isOffline ? 'text-red-400' : 'text-gray-400'}`}>
                      {lastSeenDate ? formatDistanceToNow(lastSeenDate) + ' ago' : ''}
                    </span>
                    {(agent.progress_pct > 0) && !isOffline && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${agent.progress_pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{agent.progress_pct}%</span>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick alerts if any */}
      {(pendingProposals.length > 0 || openIncidents.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pendingProposals.length > 0 && (
            <Link to="/proposals" className="bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Decisions Needed</span>
              </div>
              {pendingProposals.slice(0, 2).map(p => (
                <p key={p.id} className="text-xs text-amber-700 truncate">· {p.title} ({p.decision_level})</p>
              ))}
              {pendingProposals.length > 2 && (
                <p className="text-xs text-amber-500 mt-1">+{pendingProposals.length - 2} more →</p>
              )}
            </Link>
          )}
          {openIncidents.length > 0 && (
            <Link to="/incidents" className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-800">Open Incidents</span>
              </div>
              {openIncidents.slice(0, 2).map(i => (
                <p key={i.id} className="text-xs text-red-700 truncate">· {i.agent_id}: {i.reason_code}</p>
              ))}
              {openIncidents.length > 2 && (
                <p className="text-xs text-red-500 mt-1">+{openIncidents.length - 2} more →</p>
              )}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
