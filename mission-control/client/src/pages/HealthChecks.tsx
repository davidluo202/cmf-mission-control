import React, { useEffect, useState, useCallback } from 'react';
import { getHealthChecksSummary, resolveHealthCheck } from '../api';
import { formatDistanceToNow } from 'date-fns';
import { HeartPulse, RefreshCw, CheckCircle, AlertTriangle, XCircle, HelpCircle, X } from 'lucide-react';

const CHECK_TYPES = [
  { key: 'gateway_status', label: 'Gateway' },
  { key: 'model_api',      label: 'Model API' },
  { key: 'session_health', label: 'Session' },
  { key: 'vpn_routing',    label: 'VPN' },
  { key: 'heartbeat_stale', label: 'Heartbeat' },
];

type CheckStatus = 'OK' | 'WARNING' | 'ERROR' | 'UNKNOWN';

interface CheckCell {
  id: string;
  status: CheckStatus;
  detail: string | null;
  timestamp: string;
  auto_resolved: number;
}

interface Summary {
  [agent_id: string]: {
    [check_type: string]: CheckCell;
  };
}

const STATUS_DOT: Record<CheckStatus, string> = {
  OK:      'bg-green-500',
  WARNING: 'bg-yellow-400',
  ERROR:   'bg-red-500',
  UNKNOWN: 'bg-gray-300',
};

const STATUS_RING: Record<CheckStatus, string> = {
  OK:      'ring-green-300',
  WARNING: 'ring-yellow-300',
  ERROR:   'ring-red-300',
  UNKNOWN: 'ring-gray-200',
};

const STATUS_ICON: Record<CheckStatus, React.ReactElement> = {
  OK:      <CheckCircle className="w-4 h-4 text-green-500" />,
  WARNING: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  ERROR:   <XCircle className="w-4 h-4 text-red-500" />,
  UNKNOWN: <HelpCircle className="w-4 h-4 text-gray-400" />,
};

const STATUS_LABEL_COLOR: Record<CheckStatus, string> = {
  OK:      'text-green-700 bg-green-50 border-green-200',
  WARNING: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  ERROR:   'text-red-700 bg-red-50 border-red-200',
  UNKNOWN: 'text-gray-500 bg-gray-50 border-gray-200',
};

function getOverallStatus(agentChecks: { [check_type: string]: CheckCell }): CheckStatus {
  const statuses = Object.values(agentChecks).map(c => c.status);
  if (statuses.includes('ERROR'))   return 'ERROR';
  if (statuses.includes('WARNING')) return 'WARNING';
  if (statuses.every(s => s === 'OK')) return 'OK';
  return 'UNKNOWN';
}

export default function HealthChecks() {
  const [summary, setSummary] = useState<Summary>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<{ agent: string; type: string; cell: CheckCell } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [filterAgent, setFilterAgent] = useState('');
  const [filterStatus, setFilterStatus] = useState<CheckStatus | ''>('');

  const fetchData = useCallback(async () => {
    try {
      const data = await getHealthChecksSummary();
      setSummary(data || {});
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleResolve = async () => {
    if (!selected) return;
    setResolving(true);
    try {
      await resolveHealthCheck(selected.cell.id);
      await fetchData();
      setSelected(null);
    } finally {
      setResolving(false);
    }
  };

  const agents = Object.keys(summary).filter(a => {
    if (filterAgent && !a.toLowerCase().includes(filterAgent.toLowerCase())) return false;
    if (filterStatus) {
      const overall = getOverallStatus(summary[a]);
      if (overall !== filterStatus) return false;
    }
    return true;
  });

  // Summary counts
  const allAgents = Object.keys(summary);
  const healthyCount  = allAgents.filter(a => getOverallStatus(summary[a]) === 'OK').length;
  const warningCount  = allAgents.filter(a => getOverallStatus(summary[a]) === 'WARNING').length;
  const errorCount    = allAgents.filter(a => getOverallStatus(summary[a]) === 'ERROR').length;
  const unknownCount  = allAgents.filter(a => getOverallStatus(summary[a]) === 'UNKNOWN').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-rose-500" />
          Agent Health Checks
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary bar */}
      {!loading && allAgents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setFilterStatus(filterStatus === 'OK' ? '' : 'OK')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-sm text-sm transition-all ${filterStatus === 'OK' ? 'ring-2 ring-green-400' : ''} bg-white hover:border-green-300`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
            <span className="font-semibold text-gray-900">{healthyCount}</span>
            <span className="text-gray-500 text-xs">Healthy</span>
          </button>
          <button
            onClick={() => setFilterStatus(filterStatus === 'WARNING' ? '' : 'WARNING')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-sm text-sm transition-all ${filterStatus === 'WARNING' ? 'ring-2 ring-yellow-400' : ''} bg-white hover:border-yellow-300`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
            <span className="font-semibold text-gray-900">{warningCount}</span>
            <span className="text-gray-500 text-xs">Warnings</span>
          </button>
          <button
            onClick={() => setFilterStatus(filterStatus === 'ERROR' ? '' : 'ERROR')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-sm text-sm transition-all ${filterStatus === 'ERROR' ? 'ring-2 ring-red-400' : ''} bg-white hover:border-red-300`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
            <span className="font-semibold text-gray-900">{errorCount}</span>
            <span className="text-gray-500 text-xs">Errors</span>
          </button>
          <button
            onClick={() => setFilterStatus(filterStatus === 'UNKNOWN' ? '' : 'UNKNOWN')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-sm text-sm transition-all ${filterStatus === 'UNKNOWN' ? 'ring-2 ring-gray-400' : ''} bg-white hover:border-gray-300`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 shrink-0" />
            <span className="font-semibold text-gray-900">{unknownCount}</span>
            <span className="text-gray-500 text-xs">Unknown</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          placeholder="Filter by agent..."
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-48"
        />
        {filterStatus && (
          <button
            onClick={() => setFilterStatus('')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-500"
          >
            <X className="w-3 h-3" /> Clear filter
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading health data...</div>
        ) : agents.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <HeartPulse className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium text-gray-500">
              {allAgents.length === 0 ? 'No health checks reported yet' : 'No agents match your filter'}
            </p>
            <p className="text-xs mt-1">
              {allAgents.length === 0
                ? 'Agents report health via POST /api/health-checks or the health field in POST /api/agents'
                : 'Try clearing your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Agent</th>
                  {CHECK_TYPES.map(ct => (
                    <th key={ct.key} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {ct.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {agents.map(agent => {
                  const agentChecks = summary[agent] || {};
                  const overall = getOverallStatus(agentChecks);
                  return (
                    <tr key={agent} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${STATUS_DOT[overall]}`} />
                          <span className="font-semibold text-gray-900 capitalize">{agent}</span>
                        </div>
                      </td>
                      {CHECK_TYPES.map(ct => {
                        const cell = agentChecks[ct.key] as CheckCell | undefined;
                        const status: CheckStatus = cell?.status || 'UNKNOWN';
                        return (
                          <td key={ct.key} className="text-center px-4 py-3">
                            <button
                              onClick={() => cell && setSelected({ agent, type: ct.key, cell })}
                              disabled={!cell}
                              title={cell ? `${ct.label}: ${status}${cell.detail ? ' — ' + cell.detail : ''}` : 'No data'}
                              className={`
                                inline-flex items-center justify-center w-8 h-8 rounded-full
                                transition-all ring-2 ${STATUS_RING[status]}
                                ${cell ? 'cursor-pointer hover:scale-110 hover:shadow-md' : 'cursor-default opacity-40'}
                                ${STATUS_DOT[status]}
                              `}
                            >
                              <span className="sr-only">{status}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
                  {CHECK_TYPES.find(ct => ct.key === selected.type)?.label}
                </p>
                <h3 className="text-lg font-bold text-gray-900 capitalize">{selected.agent}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold mb-4 ${STATUS_LABEL_COLOR[selected.cell.status]}`}>
              {STATUS_ICON[selected.cell.status]}
              {selected.cell.status}
            </div>

            {selected.cell.detail && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 mb-4 leading-relaxed">
                {selected.cell.detail}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-400 mb-5">
              <span>ID: <code className="font-mono text-gray-500">{selected.cell.id}</code></span>
              <span>
                {formatDistanceToNow(new Date(selected.cell.timestamp))} ago
              </span>
            </div>

            {selected.cell.status !== 'OK' && (
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="w-full py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {resolving ? 'Resolving...' : 'Mark as Resolved'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
