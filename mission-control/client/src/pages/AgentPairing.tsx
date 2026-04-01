import React, { useEffect, useState } from 'react';
import { getAgents, assignPartners, getPartners } from '../api';
import { Users, Link, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const EMOJI_MAP: Record<string, string> = {
  '👀': '已读/在看',
  '🧠': '在分析',
  '🪏': '在执行',
  '☕️': '待命',
  '✅': '完成',
  '🛑': '需确认',
};

const VALID_EMOJIS = ['👀', '🧠', '🪏', '☕️', '✅', '🛑'];

export default function AgentPairing() {
  const [agents, setAgents] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [assignA, setAssignA] = useState('');
  const [assignB, setAssignB] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    setAgents(await getAgents());
    setPartners(await getPartners());
  };

  useEffect(() => { load(); }, []);

  const handleAssign = async () => {
    if (!assignA || !assignB || assignA === assignB) return;
    setAssigning(true);
    try {
      await assignPartners({ agent_a: assignA, agent_b: assignB });
      setAssignA('');
      setAssignB('');
      await load();
    } finally {
      setAssigning(false);
    }
  };

  // Build partner map
  const partnerMap: Record<string, string> = {};
  for (const p of partners) {
    partnerMap[p.agent_id] = p.partner_agent_id;
  }

  // Group agents into pairs
  const paired = new Set<string>();
  const pairs: { a: any; b: any }[] = [];
  for (const agent of agents) {
    if (paired.has(agent.agent_id)) continue;
    const partnerId = partnerMap[agent.agent_id];
    if (partnerId) {
      const partner = agents.find(a => a.agent_id === partnerId);
      if (partner) {
        pairs.push({ a: agent, b: partner });
        paired.add(agent.agent_id);
        paired.add(partnerId);
      }
    }
  }
  const unpaired = agents.filter(a => !paired.has(a.agent_id) && !partnerMap[a.agent_id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium text-gray-900">Agent 互助配对 & 状态 Emoji</h3>
        </div>

        {/* Assignment Form */}
        <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-xs text-gray-500 font-medium">Agent A</label>
            <select
              value={assignA}
              onChange={e => setAssignA(e.target.value)}
              className="mt-1 block w-40 text-sm border border-gray-300 rounded px-3 py-1.5 bg-white"
            >
              <option value="">选择 Agent...</option>
              {agents.map(a => (
                <option key={a.agent_id} value={a.agent_id}>{a.agent_id}</option>
              ))}
            </select>
          </div>
          <div className="text-gray-400 pb-2">↔</div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Agent B</label>
            <select
              value={assignB}
              onChange={e => setAssignB(e.target.value)}
              className="mt-1 block w-40 text-sm border border-gray-300 rounded px-3 py-1.5 bg-white"
            >
              <option value="">选择 Agent...</option>
              {agents.filter(a => a.agent_id !== assignA).map(a => (
                <option key={a.agent_id} value={a.agent_id}>{a.agent_id}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAssign}
            disabled={assigning || !assignA || !assignB}
            className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Link className="w-4 h-4" />
            {assigning ? '配对中...' : '配对'}
          </button>
          <button
            onClick={load}
            className="p-1.5 text-gray-500 hover:text-gray-700"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Paired Agents */}
      {pairs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">已配对 ({pairs.length} 对)</span>
          </div>
          <div className="divide-y divide-gray-100">
            {pairs.map((pair, idx) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{pair.a.agent_id}</span>
                    {pair.a.partner_status_emoji && (
                      <span className="text-2xl" title={EMOJI_MAP[pair.a.partner_status_emoji] || ''}>
                        {pair.a.partner_status_emoji}
                      </span>
                    )}
                  </div>
                  <Link className="w-5 h-5 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{pair.b.agent_id}</span>
                    {pair.b.partner_status_emoji && (
                      <span className="text-2xl" title={EMOJI_MAP[pair.b.partner_status_emoji] || ''}>
                        {pair.b.partner_status_emoji}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {pair.a.current_task?.slice(0, 30) || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unpaired Agents */}
      {unpaired.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">未配对 ({unpaired.length})</span>
          </div>
          <div className="divide-y divide-gray-100">
            {unpaired.map(agent => (
              <div key={agent.agent_id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{agent.agent_id}</span>
                  {agent.partner_status_emoji && (
                    <span className="text-2xl" title={EMOJI_MAP[agent.partner_status_emoji] || ''}>
                      {agent.partner_status_emoji}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">{agent.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h4 className="text-xs font-medium text-gray-500 mb-2">状态 Emoji 说明</h4>
        <div className="flex flex-wrap gap-3">
          {VALID_EMOJIS.map(emoji => (
            <span key={emoji} className="inline-flex items-center gap-1 text-xs">
              <span className="text-lg">{emoji}</span>
              <span className="text-gray-600">{EMOJI_MAP[emoji]}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}