import { useEffect, useState } from 'react';
import { getIncidents, reviveIncident } from '../api';
import { api } from '../api';
import {
  AlertTriangle, ShieldCheck, RefreshCw, Plus,
  ChevronDown, ChevronUp, Zap, Clock
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const REASON_COLORS: Record<string, string> = {
  RATE_LIMIT:        'bg-yellow-100 text-yellow-800 border-yellow-200',
  BILLING_EXHAUSTED: 'bg-red-100 text-red-900 border-red-300',
  AUTH_FAILED:       'bg-orange-100 text-orange-800 border-orange-200',
  BUILD_FAILED:      'bg-red-100 text-red-800 border-red-200',
  SERVICE_DOWN:      'bg-red-200 text-red-900 border-red-400',
  BLOCKED:           'bg-orange-100 text-orange-800 border-orange-200',
  TIMEOUT:           'bg-gray-100 text-gray-800 border-gray-200',
};

const KNOWN_AGENTS = ['Nova', 'Qual', 'Icy', 'Imax', 'Nas'];
const KNOWN_REASONS = ['RATE_LIMIT', 'BILLING_EXHAUSTED', 'AUTH_FAILED', 'BUILD_FAILED', 'SERVICE_DOWN', 'BLOCKED', 'TIMEOUT', 'OTHER'];

function NewIncidentForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    agent_id: 'Nova',
    reason_code: 'BLOCKED',
    human_message: '',
    next_action: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.human_message.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/incidents', form);
      setForm({ agent_id: 'Nova', reason_code: 'BLOCKED', human_message: '', next_action: '' });
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-dashed border-gray-300 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:bg-gray-50">
        <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Report New Incident</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 bg-gray-50 border-t border-gray-200">
          <div className="pt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Agent</label>
              <select value={form.agent_id} onChange={e => setForm(f => ({ ...f, agent_id: e.target.value }))}
                className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                {KNOWN_AGENTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Reason Code</label>
              <select value={form.reason_code} onChange={e => setForm(f => ({ ...f, reason_code: e.target.value }))}
                className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                {KNOWN_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Description *</label>
            <textarea value={form.human_message} onChange={e => setForm(f => ({ ...f, human_message: e.target.value }))} required rows={2}
              placeholder="What happened?"
              className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Suggested Next Action</label>
            <input value={form.next_action} onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))}
              placeholder="e.g. Retry after 60s, switch model..."
              className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
              {submitting ? 'Reporting...' : 'Report'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Incidents() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [reviving, setReviving] = useState<string | null>(null);

  const load = async () => setIncidents(await getIncidents());

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleRevive = async (id: string) => {
    setReviving(id);
    await reviveIncident(id);
    await load();
    setReviving(null);
  };

  const filtered = filter === 'ALL' ? incidents : incidents.filter(i => i.status === filter);
  const openCount = incidents.filter(i => i.status === 'OPEN').length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${openCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            <h3 className="font-medium text-gray-900">Incidents & Revive</h3>
            {openCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full font-semibold animate-pulse">
                {openCount} open
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {(['ALL', 'OPEN', 'RESOLVED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                {f === 'ALL' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <NewIncidentForm onCreated={load} />

          {filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-green-500" />
              <p className="text-sm font-medium text-green-600">All clear — no incidents</p>
            </div>
          ) : filtered.map(i => {
            const reasonColor = REASON_COLORS[i.reason_code] || 'bg-gray-100 text-gray-700 border-gray-200';
            const isOpen = i.status === 'OPEN';

            return (
              <div key={i.id} className={`rounded-lg border overflow-hidden ${
                isOpen ? 'border-red-200' : 'border-gray-200'
              }`}>
                <div className={`px-4 py-3 flex items-start justify-between gap-3 ${
                  isOpen ? 'bg-red-50' : 'bg-gray-50'
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 capitalize">{i.agent_id}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full border font-mono font-medium ${reasonColor}`}>
                        {i.reason_code}
                      </span>
                      {isOpen ? (
                        <span className="flex items-center gap-1 text-xs text-red-600 font-bold">
                          <AlertTriangle className="w-3 h-3" /> ACTION REQUIRED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <ShieldCheck className="w-3 h-3" /> RESOLVED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(i.timestamp), 'MM/dd HH:mm')}
                      {' · '}
                      {formatDistanceToNow(new Date(i.timestamp))} ago
                    </p>
                  </div>

                  {isOpen && (
                    <button
                      onClick={() => handleRevive(i.id)}
                      disabled={reviving === i.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-black disabled:opacity-50 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${reviving === i.id ? 'animate-spin' : ''}`} />
                      {reviving === i.id ? 'Reviving...' : 'Revive'}
                    </button>
                  )}
                </div>

                <div className="px-4 py-3 bg-white border-t border-gray-100 space-y-1.5">
                  <p className="text-sm text-gray-700">{i.human_message}</p>
                  {i.next_action && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span className="font-medium">Suggested:</span> {i.next_action}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
