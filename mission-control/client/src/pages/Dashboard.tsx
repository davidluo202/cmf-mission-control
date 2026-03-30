import React, { useEffect, useState, useCallback } from 'react';
import { getAgents, getProposals, getIncidents, getHealth, sendChatMessage } from '../api';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Bot, CheckCircle, Clock, AlertTriangle, PlayCircle,
  Pause, XCircle, ChevronRight, FileText, ShieldAlert,
  Cpu, Users, RefreshCw, Megaphone, Server, Loader2,
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

const OFFLINE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

function getEffectiveStatus(agent: any): string {
  if (!agent.updated_at) return agent.status;
  const lastSeen = new Date(agent.updated_at + 'Z').getTime();
  if (Date.now() - lastSeen > OFFLINE_THRESHOLD_MS) return 'OFFLINE';
  return agent.status;
}

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

function SkeletonCard() {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
      <div className="h-2 bg-gray-100 rounded w-2/3" />
    </div>
  );
}

function SkeletonAgentRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-2 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-12" />
    </div>
  );
}

export default function Dashboard() {
  const [agents, setAgents] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchData = useCallback(async () => {
    const [a, p, i, h] = await Promise.allSettled([
      getAgents(),
      getProposals(),
      getIncidents(),
      getHealth(),
    ]);
    if (a.status === 'fulfilled') setAgents(a.value);
    if (p.status === 'fulfilled') setProposals(p.value);
    if (i.status === 'fulfilled') setIncidents(i.value);
    if (h.status === 'fulfilled') setHealthInfo(h.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    setBroadcasting(true);
    try {
      await sendChatMessage({
        sender: 'System',
        content: broadcastText.trim(),
        topic: 'General',
      });
      setBroadcastText('');
      setBroadcastOpen(false);
    } finally {
      setBroadcasting(false);
    }
  };

  const pendingProposals = proposals.filter(p => p.status === 'WAITING_DECISION');
  const openIncidents = incidents.filter(i => i.status === 'OPEN');
  const runningAgents = agents.filter(a => {
    const eff = getEffectiveStatus(a);
    return eff === 'RUNNING' || eff === 'working';
  });

  return (
    <div className="space-y-5">
      {/* Quick actions bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Overview</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </button>
          <button
            onClick={() => setBroadcastOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            <Megaphone className="w-3.5 h-3.5" />
            Broadcast
          </button>
        </div>
      </div>

      {/* Broadcast form (inline) */}
      {broadcastOpen && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5" />
            Send Broadcast to Chat Room
          </p>
          <form onSubmit={handleBroadcast} className="flex gap-2">
            <input
              type="text"
              value={broadcastText}
              onChange={e => setBroadcastText(e.target.value)}
              placeholder="System message to all agents..."
              autoFocus
              className="flex-1 text-sm px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
            <button
              type="submit"
              disabled={broadcasting || !broadcastText.trim()}
              className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {broadcasting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
              Send
            </button>
            <button
              type="button"
              onClick={() => { setBroadcastOpen(false); setBroadcastText(''); }}
              className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 bg-gradient-to-br from-white to-blue-50/30">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-500 text-sm font-medium">Active Agents</h3>
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {runningAgents.length}
              <span className="text-lg text-gray-400 font-normal"> / {agents.length}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {agents.length === 0 ? 'No agents registered' : `${agents.length - runningAgents.length} idle or offline`}
            </p>
          </div>

          <Link to="/proposals" className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all group bg-gradient-to-br from-white to-amber-50/20">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-500 text-sm font-medium">Pending Decisions</h3>
              <FileText className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
            </div>
            <div className={`mt-2 text-3xl font-bold ${pendingProposals.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {pendingProposals.length}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {pendingProposals.length > 0 ? 'Requires your attention →' : 'All decisions made'}
            </p>
          </Link>

          <Link to="/incidents" className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-red-300 hover:shadow-md transition-all group bg-gradient-to-br from-white to-red-50/20">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-500 text-sm font-medium">Open Incidents</h3>
              <ShieldAlert className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
            </div>
            <div className={`mt-2 text-3xl font-bold ${openIncidents.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {openIncidents.length}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {openIncidents.length > 0 ? 'Action required →' : 'All systems green ✓'}
            </p>
          </Link>
        </div>
      )}

      {/* Server info bar */}
      {healthInfo && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-green-500" />
            <span className="font-medium text-gray-700">Server v{healthInfo.version}</span>
          </span>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Uptime: <span className="font-mono ml-1">{formatUptime(healthInfo.uptime_sec)}</span>
          </span>
          {healthInfo.started_at && (
            <>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <span>
                Started {formatDistanceToNow(new Date(healthInfo.started_at))} ago
              </span>
            </>
          )}
          <span className="ml-auto flex items-center gap-1 text-green-500 font-medium">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
            Online
          </span>
        </div>
      )}

      {/* Agents Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
            <Bot className="w-4 h-4 text-blue-500" />
            Agent Status
            {agents.length > 0 && (
              <span className="text-xs text-gray-400 font-normal">({agents.length} registered)</span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(5)].map((_, i) => <SkeletonAgentRow key={i} />)}
          </div>
        ) : agents.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Bot className="w-8 h-8 opacity-30" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No agents registered yet</p>
            <p className="text-xs mt-1 text-gray-400">Agents appear here when they connect via the SDK</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {agents.map(agent => {
              const effectiveStatus = getEffectiveStatus(agent);
              const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.IDLE;
              const isOffline = effectiveStatus === 'OFFLINE';
              const lastSeenDate = agent.updated_at
                ? new Date(agent.updated_at.endsWith('Z') ? agent.updated_at : agent.updated_at + 'Z')
                : null;
              return (
                <Link
                  key={agent.agent_id}
                  to={`/agent/${agent.agent_id}`}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition-colors group ${isOffline ? 'opacity-60' : ''}`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm uppercase ${isOffline ? 'bg-gray-300' : 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-md shadow-blue-200'}`}>
                      {agent.agent_id.charAt(0)}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${cfg.dot}`} />
                  </div>

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
                      {agent.needs_support_from && !isOffline && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full">
                          <Users className="w-2.5 h-2.5" />
                          {agent.needs_support_from}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {isOffline
                        ? (agent.offline_reason || 'No heartbeat — agent may be offline')
                        : (agent.current_task || 'No active task')}
                    </p>
                    {agent.model && !isOffline && (
                      <p className="text-xs text-blue-400 mt-0.5 flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5" />
                        {agent.model}
                      </p>
                    )}
                    {agent.reason_code && !isOffline && (
                      <p className="text-xs text-orange-600 font-mono mt-0.5">⚠ {agent.reason_code}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className={`text-xs ${isOffline ? 'text-red-400' : 'text-gray-400'}`}>
                      {lastSeenDate ? formatDistanceToNow(lastSeenDate) + ' ago' : ''}
                    </span>
                    {agent.progress_pct > 0 && !isOffline && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${agent.progress_pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{agent.progress_pct}%</span>
                      </div>
                    )}
                    {agent.model_usage && !isOffline && (() => {
                      try {
                        const u = typeof agent.model_usage === 'string' ? JSON.parse(agent.model_usage) : agent.model_usage;
                        return (
                          <div className="flex items-center gap-1.5" title={`${u.tokens_used?.toLocaleString()} / ${u.quota?.toLocaleString()} tokens`}>
                            <Cpu className="w-2.5 h-2.5 text-gray-300" />
                            <div className="w-14 bg-gray-200 rounded-full h-1">
                              <div
                                className={`h-1 rounded-full ${u.pct > 80 ? 'bg-red-400' : u.pct > 50 ? 'bg-yellow-400' : 'bg-green-400'}`}
                                style={{ width: `${Math.min(u.pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">{u.pct}%</span>
                          </div>
                        );
                      } catch { return null; }
                    })()}
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick alerts */}
      {(pendingProposals.length > 0 || openIncidents.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pendingProposals.length > 0 && (
            <Link to="/proposals" className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-all">
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
            <Link to="/incidents" className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 hover:shadow-md transition-all">
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
