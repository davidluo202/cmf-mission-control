import React, { useEffect, useState } from 'react';
import { getProposals, approveProposal } from '../api';
import { FileText, Check, X, Clock, CheckCircle2, XCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../api';

const LEVEL_COLORS: Record<string, string> = {
  DAVID: 'bg-purple-100 text-purple-800 border-purple-200',
  ICY:   'bg-blue-100 text-blue-800 border-blue-200',
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactElement; label: string }> = {
  WAITING_DECISION: {
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: <Clock className="w-3.5 h-3.5" />,
    label: 'Waiting',
  },
  APPROVED: {
    color: 'bg-green-50 border-green-200 text-green-800',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: 'Approved',
  },
  REJECTED: {
    color: 'bg-red-50 border-red-200 text-red-800',
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: 'Rejected',
  },
};

const IMPACT_COLORS: Record<string, string> = {
  High:   'text-red-600 bg-red-50',
  Medium: 'text-amber-600 bg-amber-50',
  Low:    'text-green-600 bg-green-50',
};

function NewProposalForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    author: 'Nova',
    title: '',
    decision_level: 'ICY',
    impact: 'Medium',
    cost: '0',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.reason.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/proposals', form);
      setForm({ author: 'Nova', title: '', decision_level: 'ICY', impact: 'Medium', cost: '0', reason: '' });
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-dashed border-gray-300 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Submit New Proposal</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 bg-gray-50 border-t border-gray-200">
          <div className="pt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Author</label>
              <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Decision Level</label>
              <select value={form.decision_level} onChange={e => setForm(f => ({ ...f, decision_level: e.target.value }))}
                className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                <option>ICY</option>
                <option>DAVID</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
              placeholder="Proposal title..."
              className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Impact</label>
              <select value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))}
                className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Cost</label>
              <input value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                placeholder="e.g. $0 / $500 / 2 days"
                className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Reason / Detail *</label>
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required rows={3}
              placeholder="Why is this needed? What's the plan?"
              className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Proposals() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'WAITING_DECISION' | 'APPROVED' | 'REJECTED'>('ALL');
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => setProposals(await getProposals());

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (id: string, action: string) => {
    setActing(id + action);
    await approveProposal(id, action);
    await load();
    setActing(null);
  };

  const filtered = filter === 'ALL' ? proposals : proposals.filter(p => p.status === filter);
  const waiting = proposals.filter(p => p.status === 'WAITING_DECISION').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <h3 className="font-medium text-gray-900">Proposals & Decision Pool</h3>
            {waiting > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full font-semibold">
                {waiting} pending
              </span>
            )}
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1">
            {(['ALL', 'WAITING_DECISION', 'APPROVED', 'REJECTED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                {f === 'ALL' ? 'All' : f === 'WAITING_DECISION' ? 'Pending' : f === 'APPROVED' ? 'Approved' : 'Rejected'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <NewProposalForm onCreated={load} />

          {filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No proposals in this category.</p>
            </div>
          ) : filtered.map(p => {
            const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.WAITING_DECISION;
            return (
              <div key={p.id} className={`border rounded-lg overflow-hidden ${
                p.status === 'WAITING_DECISION' ? 'border-amber-200' : 'border-gray-200'
              }`}>
                {/* Card header */}
                <div className={`px-4 py-3 flex items-start justify-between gap-3 ${
                  p.status === 'WAITING_DECISION' ? 'bg-amber-50' : 'bg-gray-50'
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900">{p.title}</h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border font-medium ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${LEVEL_COLORS[p.decision_level] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {p.decision_level}
                      </span>
                      {p.impact && (
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${IMPACT_COLORS[p.impact] || 'text-gray-600 bg-gray-100'}`}>
                          {p.impact} impact
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      by <span className="font-medium capitalize">{p.author}</span>
                      {p.cost && p.cost !== '0' && <> · Cost: <span className="font-medium">{p.cost}</span></>}
                      {' · '}{format(new Date(p.timestamp), 'MM/dd HH:mm')}
                    </p>
                  </div>

                  {p.status === 'WAITING_DECISION' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleAction(p.id, 'APPROVED')}
                        disabled={!!acting}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {acting === p.id + 'APPROVED' ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleAction(p.id, 'REJECTED')}
                        disabled={!!acting}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        {acting === p.id + 'REJECTED' ? '...' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Reason */}
                {p.reason && (
                  <div className="px-4 py-3 border-t border-gray-100 bg-white">
                    <p className="text-xs text-gray-500 font-medium mb-1">Reason</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{p.reason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
