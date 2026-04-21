import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getAgents, pingAgent } from '../api';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft, Activity, Code, AlertCircle, CheckCircle2,
  Wrench, Play, Pause, RefreshCw, MessageSquare, Zap,
  Cpu, Clock, Users, Heart, ChevronDown, ChevronUp,
  History, Loader2,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  RUNNING:          'bg-green-100 text-green-800 border-green-200',
  IDLE:             'bg-gray-100 text-gray-700 border-gray-200',
  WAITING_AUTH:     'bg-yellow-100 text-yellow-800 border-yellow-200',
  WAITING_DECISION: 'bg-purple-100 text-purple-800 border-purple-200',
  BLOCKED:          'bg-orange-100 text-orange-800 border-orange-200',
  ERROR:            'bg-red-100 text-red-800 border-red-200',
};

const STATUS_DOT: Record<string, string> = {
  RUNNING:          'bg-green-500 animate-pulse',
  IDLE:             'bg-gray-400',
  WAITING_AUTH:     'bg-yellow-400 animate-pulse',
  WAITING_DECISION: 'bg-purple-500 animate-pulse',
  BLOCKED:          'bg-orange-500',
  ERROR:            'bg-red-500',
};

const EVENT_ICONS: Record<string, React.ReactElement> = {
  task_started:   <Play        className="w-4 h-4 text-blue-500" />,
  task_completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  tool_called:    <Wrench      className="w-4 h-4 text-purple-500" />,
  tool_result:    <Code        className="w-4 h-4 text-indigo-500" />,
  blocked:        <Pause       className="w-4 h-4 text-orange-500" />,
  resumed:        <RefreshCw   className="w-4 h-4 text-teal-500" />,
  error_occurred: <AlertCircle className="w-4 h-4 text-red-500" />,
  chat_message:   <MessageSquare className="w-4 h-4 text-gray-500" />,
};

const EVENT_LINE_COLOR: Record<string, string> = {
  task_started:   'border-blue-200 bg-blue-50',
  task_completed: 'border-green-200 bg-green-50',
  tool_called:    'border-purple-200 bg-purple-50',
  tool_result:    'border-indigo-200 bg-indigo-50',
  blocked:        'border-orange-200 bg-orange-50',
  resumed:        'border-teal-200 bg-teal-50',
  error_occurred: 'border-red-200 bg-red-50',
  chat_message:   'border-gray-200 bg-gray-50',
};

function CollapsibleEvent({ evt, idx, total }: { evt: any; idx: number; total: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = !!(evt.detail || evt.next_actions);

  return (
    <div className="relative flex space-x-3">
      {idx !== total - 1 && (
        <div className="absolute left-[18px] top-9 bottom-[-12px] w-0.5 bg-gray-200 z-0" />
      )}

      <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
        {EVENT_ICONS[evt.type] || <Activity className="w-4 h-4 text-gray-400" />}
      </div>

      <div className={`flex-1 min-w-0 rounded-lg border ${EVENT_LINE_COLOR[evt.type] || 'border-gray-100 bg-gray-50'}`}>
        <button
          className="w-full text-left p-3"
          onClick={() => hasDetail && setExpanded(e => !e)}
        >
          <div className="flex justify-between items-start gap-2">
            <p className="text-sm font-medium text-gray-900 leading-tight">{evt.summary}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {format(new Date(evt.timestamp), 'HH:mm:ss')}
              </span>
              {hasDetail && (
                expanded
                  ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs bg-white/70 text-gray-600 rounded-full border border-gray-200">
              {evt.type}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              evt.priority === 'critical' ? 'bg-red-100 text-red-700' :
              evt.priority === 'high'     ? 'bg-orange-100 text-orange-700' :
                                            'bg-blue-50 text-blue-600'
            }`}>
              {evt.priority || 'normal'}
            </span>
          </div>
        </button>

        {expanded && hasDetail && (
          <div className="px-3 pb-3 border-t border-black/5 space-y-2 pt-2">
            {evt.detail && (
              <pre className="text-xs text-gray-600 bg-white/80 p-2 rounded border border-gray-200 whitespace-pre-wrap font-mono overflow-x-auto">
                {evt.detail}
              </pre>
            )}
            {evt.next_actions && (
              <p className="text-xs text-gray-500">
                <span className="font-medium">Next: </span>
                {typeof evt.next_actions === 'string' ? evt.next_actions : JSON.stringify(evt.next_actions)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<any[]>([]);
  const [agentInfo, setAgentInfo] = useState<any>(null);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<'ok' | 'err' | null>(null);

  useEffect(() => {
    const load = async () => {
      const [evtRes, agentsRes] = await Promise.all([
        api.get(`/agents/${id}/timeline`),
        getAgents(),
      ]);
      setEvents(evtRes.data.events);
      setAgentInfo(agentsRes.find((a: any) => a.agent_id === id) || null);
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [id]);

  const handlePing = async () => {
    if (!id) return;
    setPinging(true);
    setPingResult(null);
    try {
      await pingAgent(id);
      setPingResult('ok');
    } catch {
      setPingResult('err');
    } finally {
      setPinging(false);
      setTimeout(() => setPingResult(null), 3000);
    }
  };

  const statusColor = agentInfo ? (STATUS_COLORS[agentInfo.status] || STATUS_COLORS.IDLE) : '';
  const dotColor   = agentInfo ? (STATUS_DOT[agentInfo.status]   || STATUS_DOT.IDLE)   : '';

  // Last 5 completed tasks from event timeline
  const completedTasks = events.filter(e => e.type === 'task_completed').slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-gray-500 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm uppercase shadow-md shadow-blue-200">
              {id?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 capitalize">{id}</h2>
              <p className="text-xs text-gray-500">Agent Detail</p>
            </div>
          </div>
        </div>

        {/* Ping button */}
        <button
          onClick={handlePing}
          disabled={pinging}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
            pingResult === 'ok'  ? 'bg-green-100 text-green-700 border border-green-200' :
            pingResult === 'err' ? 'bg-red-100 text-red-700 border border-red-200' :
            'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          {pinging
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Heart className={`w-4 h-4 ${pingResult === 'ok' ? 'text-green-500' : ''}`} />
          }
          {pingResult === 'ok' ? 'Pong!' : pingResult === 'err' ? 'Failed' : 'Ping Agent'}
        </button>
      </div>

      {/* Status Card */}
      {agentInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                {agentInfo.status}
              </span>
              {agentInfo.needs_owner && (
                <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                  Waiting: {agentInfo.needs_owner}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              Updated {formatDistanceToNow(new Date(
                agentInfo.updated_at
                  ? (agentInfo.updated_at.endsWith('Z') ? agentInfo.updated_at : agentInfo.updated_at + 'Z')
                  : agentInfo.timestamp
              ))} ago
            </span>
          </div>

          {agentInfo.current_task && (
            <p className="mt-3 text-sm text-gray-700">
              <span className="font-medium text-gray-500 mr-1">Task:</span>
              {agentInfo.current_task}
            </p>
          )}

          {agentInfo.progress_pct > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{agentInfo.progress_pct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${agentInfo.progress_pct}%` }}
                />
              </div>
            </div>
          )}

          {agentInfo.reason_code && (
            <p className="mt-2 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-100">
              Reason: {agentInfo.reason_code}
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agentInfo.model && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-medium text-gray-600">Model:</span>
                <span className="font-mono text-gray-700">{agentInfo.model}</span>
              </div>
            )}
            {agentInfo.needs_support_from && (
              <div className="flex items-center gap-2 text-xs text-orange-600">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">Needs support:</span>
                <span>{agentInfo.needs_support_from}</span>
              </div>
            )}
            {agentInfo.offline_reason && (
              <div className="flex items-center gap-2 text-xs text-red-600 col-span-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">Offline reason:</span>
                <span>{agentInfo.offline_reason}</span>
              </div>
            )}
          </div>

          {agentInfo.model_usage && (() => {
            try {
              const usage = typeof agentInfo.model_usage === 'string'
                ? JSON.parse(agentInfo.model_usage)
                : agentInfo.model_usage;
              return (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Token usage</span>
                    <span>{usage.tokens_used?.toLocaleString()} / {usage.quota?.toLocaleString()} ({usage.pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${usage.pct > 80 ? 'bg-red-500' : usage.pct > 50 ? 'bg-yellow-400' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(usage.pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            } catch { return null; }
          })()}

          {agentInfo.last_task && (
            <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
              <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
              <div>
                <span className="font-medium text-gray-600">Last task: </span>
                <span>{agentInfo.last_task}</span>
                {agentInfo.last_task_at && (
                  <span className="ml-1 text-gray-400">
                    ({formatDistanceToNow(new Date(agentInfo.last_task_at))} ago)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Last 5 Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <History className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Recent Completed Tasks</h3>
            <span className="text-xs text-gray-400">({completedTasks.length})</span>
          </div>
          <div className="divide-y divide-gray-100">
            {completedTasks.map(task => (
              <div key={task.id} className="px-6 py-3 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{task.summary}</p>
                  {task.detail && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{task.detail}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                  {format(new Date(task.timestamp), 'MM/dd HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Event Timeline</h3>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{events.length} events</span>
        </div>

        <div className="p-6">
          {events.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <Zap className="w-6 h-6 opacity-30" />
              </div>
              <p className="text-sm font-medium text-gray-500">No events yet</p>
              <p className="text-xs mt-1">Events appear when the agent connects and reports activity.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((evt, idx) => (
                <CollapsibleEvent key={evt.id} evt={evt} idx={idx} total={events.length} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
