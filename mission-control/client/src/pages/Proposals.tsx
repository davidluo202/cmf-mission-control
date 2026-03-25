import { useEffect, useState } from 'react';
import { getProposals, approveProposal } from '../api';
import { FileText, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Proposals() {
  const [proposals, setProposals] = useState<any[]>([]);

  const load = async () => setProposals(await getProposals());
  
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (id: string, action: string) => {
    await approveProposal(id, action);
    load();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center">
        <FileText className="w-5 h-5 mr-2 text-blue-500" />
        <h3 className="font-medium text-gray-900">Proposals & Decisions</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {proposals.length === 0 ? <div className="text-gray-500 text-center">No proposals found.</div> : proposals.map(p => (
            <div key={p.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-3">
                  <h4 className="text-lg font-semibold text-gray-900">{p.title}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full border ${p.status === 'WAITING_DECISION' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : p.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {p.status}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">Level: {p.decision_level}</span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>Author:</strong> <span className="capitalize">{p.author}</span></p>
                  <p><strong>Impact:</strong> {p.impact || 'None'} | <strong>Cost:</strong> {p.cost || 'None'}</p>
                  <p className="mt-1"><strong>Reason:</strong> {p.reason || 'N/A'}</p>
                </div>
                <div className="mt-2 text-xs text-gray-400">Created {formatDistanceToNow(new Date(p.timestamp))} ago</div>
              </div>
              
              {p.status === 'WAITING_DECISION' && (
                <div className="flex space-x-2">
                  <button onClick={() => handleAction(p.id, 'APPROVED')} className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </button>
                  <button onClick={() => handleAction(p.id, 'REJECTED')} className="flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                    <X className="w-4 h-4 mr-1" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
