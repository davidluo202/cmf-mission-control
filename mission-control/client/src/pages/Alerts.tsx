import React, { useEffect, useState, useCallback } from 'react';
import { getAlerts, acknowledgeAlert, acknowledgeAllAlerts } from '../api';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell, BellOff, AlertTriangle, XCircle, Info, RefreshCw, Check, CheckCheck,
} from 'lucide-react';

const SEVERITY_CONFIG: Record<string, { badge: string; iconClass: string; icon: React.ReactElement; border: string }> = {
  CRITICAL: {
    badge: 'bg-red-100 text-red-800 border-red-300',
    iconClass: 'bg-red-100 text-red-600',
    icon: <XCircle className="w-4 h-4" />,
    border: 'border-red-300',
  },
  WARNING: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    iconClass: 'bg-yellow-100 text-yellow-600',
    icon: <AlertTriangle className="w-4 h-4" />,
    border: 'border-yellow-300',
  },
  INFO: {
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    iconClass: 'bg-blue-100 text-blue-600',
    icon: <Info className="w-4 h-4" />,
    border: 'border-blue-200',
  },
};

const SEV_ORDER: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };

function normalizeTs(ts: string) {
  return ts.endsWith('Z') ? ts : ts + 'Z';
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterAck, setFilterAck] = useState('false');

  const fetchAlerts = useCallback(async () => {
    const params: Record<string, string> = {};
    if (filterSeverity) params.severity = filterSeverity;
    if (filterAgent)    params.agent_id  = filterAgent;
    if (filterAck !== '') params.acknowledged = filterAck;
    const data = await getAlerts(params);
    setAlerts(data);
    setLoading(false);
  }, [filterSeverity, filterAgent, filterAck]);

  useEffect(() => {
    fetchAlerts();
    const timer = setInterval(fetchAlerts, 10000);
    return () => clearInterval(timer);
  }, [fetchAlerts]);

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert(id, 'David');
    fetchAlerts();
  };

  const handleAcknowledgeAll = async () => {
    await acknowledgeAllAlerts('David');
    fetchAlerts();
  };

  const sorted = [...alerts].sort((a, b) => {
    const ao = SEV_ORDER[a.severity] ?? 3;
    const bo = SEV_ORDER[b.severity] ?? 3;
    if (ao !== bo) return ao - bo;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const unackCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Alerts</h2>
          {unackCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 border border-red-200 rounded-full font-semibold">
              {unackCount} unacknowledged
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unackCount > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-sm"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Acknowledge All
            </button>
          )}
          <button
            onClick={fetchAlerts}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="WARNING">WARNING</option>
          <option value="INFO">INFO</option>
        </select>
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Agents</option>
          {['Nova', 'Icy', 'Qual', 'Nas', 'Imax', 'Binghome', 'SYSTEM'].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={filterAck}
          onChange={e => setFilterAck(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="false">Unacknowledged</option>
          <option value="true">Acknowledged</option>
          <option value="">All</option>
        </select>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Loading alerts...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <BellOff className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-sm font-semibold text-gray-500">No alerts</p>
          <p className="text-xs mt-1 text-gray-400">
            {filterAck === 'false' ? 'All clear — no unacknowledged alerts' : 'No alerts match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
            const ts = new Date(normalizeTs(alert.timestamp));
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border shadow-sm p-4 transition-opacity ${
                  alert.acknowledged ? 'opacity-50' : ''
                } ${!alert.acknowledged && alert.severity === 'CRITICAL' ? cfg.border : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.iconClass}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${cfg.badge}`}>
                          {alert.severity}
                        </span>
                        {alert.agent_id && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-full">
                            {alert.agent_id}
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                          → {alert.target}
                        </span>
                        <span className="text-xs font-mono text-gray-400 truncate">{alert.alert_type}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-gray-800">{alert.message}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDistanceToNow(ts)} ago
                        {alert.acknowledged && alert.acknowledged_by && (
                          <span className="ml-2 text-green-600">
                            · Acked by {alert.acknowledged_by}
                            {alert.acknowledged_at
                              ? ` ${formatDistanceToNow(new Date(normalizeTs(alert.acknowledged_at)))} ago`
                              : ''}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Ack
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
