import { useEffect, useState } from 'react';
import { getIncidents, reviveIncident } from '../api';
import { AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Incidents() {
  const [incidents, setIncidents] = useState<any[]>([]);

  const load = async () => setIncidents(await getIncidents());
  
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleRevive = async (id: string) => {
    await reviveIncident(id);
    load();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
        <h3 className="font-medium text-gray-900">Incidents & Revive</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {incidents.length === 0 ? <div className="text-gray-500 text-center">No open incidents. All systems green.</div> : incidents.map(i => (
            <div key={i.id} className={`border rounded-lg p-4 flex justify-between items-start ${i.status === 'OPEN' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
              <div>
                <div className="flex items-center space-x-3">
                  <span className="font-semibold capitalize text-gray-900">{i.agent_id}</span>
                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-mono">{i.reason_code}</span>
                  {i.status === 'OPEN' ? (
                    <span className="text-xs text-red-600 font-bold flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> ACTION REQUIRED</span>
                  ) : (
                    <span className="text-xs text-green-600 font-bold flex items-center"><ShieldCheck className="w-3 h-3 mr-1"/> RESOLVED</span>
                  )}
                </div>
                <div className="mt-2 text-sm text-gray-700">{i.human_message}</div>
                {i.next_action && <div className="mt-1 text-sm font-medium text-blue-600">Suggested Action: {i.next_action}</div>}
                <div className="mt-2 text-xs text-gray-400">Occurred {formatDistanceToNow(new Date(i.timestamp))} ago</div>
              </div>
              
              {i.status === 'OPEN' && (
                <button onClick={() => handleRevive(i.id)} className="flex items-center px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-black">
                  <RefreshCw className="w-4 h-4 mr-2" /> Revive / Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
