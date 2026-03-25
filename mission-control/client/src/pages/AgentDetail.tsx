import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Activity, Code, AlertCircle } from 'lucide-react';

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      const res = await api.get(`/agents/${id}/timeline`);
      setEvents(res.data.events);
    };
    loadEvents();
    const timer = setInterval(loadEvents, 5000);
    return () => clearInterval(timer);
  }, [id]);

  const getEventIcon = (type: string) => {
    if (type.includes('error') || type.includes('alert')) return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (type.includes('task')) return <Code className="w-5 h-5 text-blue-500" />;
    return <Activity className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/" className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-6 h-6" /></Link>
        <h2 className="text-2xl font-bold text-gray-900 capitalize">{id} Timeline</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-gray-900">Event Logs</h3>
        </div>
        <div className="p-6">
          {events.length === 0 ? <div className="text-gray-500 text-center">No events found.</div> : (
            <div className="space-y-6">
              {events.map((evt, idx) => (
                <div key={evt.id} className="relative flex space-x-4">
                  {idx !== events.length - 1 && <div className="absolute left-2.5 top-8 bottom-[-24px] w-0.5 bg-gray-200" />}
                  <div className="relative z-10 bg-white rounded-full p-1 border border-gray-200 flex-shrink-0">
                    {getEventIcon(evt.type)}
                  </div>
                  <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-gray-900">{evt.summary}</p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatDistanceToNow(new Date(evt.timestamp))} ago</span>
                    </div>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">{evt.type}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${evt.priority === 'critical' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        {evt.priority}
                      </span>
                    </div>
                    {evt.detail && (
                      <p className="mt-2 text-sm text-gray-600 bg-white p-2 rounded border border-gray-200 font-mono whitespace-pre-wrap">
                        {evt.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
