import { useEffect, useState, useRef } from 'react';
import { getChatMessages, sendChatMessage } from '../api';
import { format } from 'date-fns';
import { Send, Users, Loader2 } from 'lucide-react';

// Generate a UUID v4 for client-side message dedup
function generateClientMessageId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function ChatRoom() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sender] = useState('David'); // Mocked user
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    const data = await getChatMessages();
    setMessages(data);
  };

  useEffect(() => {
    loadMessages();
    const timer = setInterval(loadMessages, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const clientMessageId = generateClientMessageId();
    const content = input.trim();

    setSending(true);
    setInput('');
    try {
      await sendChatMessage({
        sender,
        content,
        topic: 'General',
        client_message_id: clientMessageId,
      });
      await loadMessages();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center">
        <Users className="w-5 h-5 mr-2 text-blue-500" />
        <h3 className="font-medium text-gray-900">Meeting Room (Holographic Ops)</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === sender ? 'items-end' : 'items-start'}`}>
            <span className="text-xs text-gray-500 mb-1 ml-1">{msg.sender} • {format(new Date(msg.timestamp), 'HH:mm:ss')}</span>
            <div className={`px-4 py-2 rounded-lg max-w-2xl ${msg.sender === sender ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSend} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message to the room (anyone can see, no need to @)..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
