import { useEffect, useState, useRef } from 'react';
import { getChatMessages, sendChatMessage } from '../api';
import { format } from 'date-fns';
import { Send, Users, Loader2, Hash, AtSign } from 'lucide-react';

const KNOWN_AGENTS = ['Nova', 'Qual', 'Icy', 'Imax', 'Nas', 'David'];
const TOPICS = ['General', 'Deploy', 'Bug', 'Proposal', 'Urgent'];

function generateClientMessageId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Parse @mention names from content */
function parseMentions(content: string): string[] {
  const matches = content.match(/@(\w+)/g);
  return matches ? [...new Set(matches.map(m => m.slice(1)))] : [];
}

/** Render message content with @mentions highlighted */
function MessageContent({ content, self }: { content: string; self: boolean }) {
  const parts = content.split(/(@\w+)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className={`font-semibold ${self ? 'text-blue-200' : 'text-blue-600'}`}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function ChatRoom() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [topic, setTopic] = useState('General');
  const [filterTopic, setFilterTopic] = useState<string>('');
  const [showMentionHint, setShowMentionHint] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [sender] = useState('David');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // @mention autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) {
      setMentionFilter(atMatch[1].toLowerCase());
      setShowMentionHint(true);
    } else {
      setShowMentionHint(false);
    }
  };

  const insertMention = (name: string) => {
    const newVal = input.replace(/@(\w*)$/, `@${name} `);
    setInput(newVal);
    setShowMentionHint(false);
    inputRef.current?.focus();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const content = input.trim();
    const mentions = parseMentions(content);
    const clientMessageId = generateClientMessageId();

    setSending(true);
    setInput('');
    setShowMentionHint(false);
    try {
      await sendChatMessage({
        sender,
        content,
        topic,
        mentions: mentions.length > 0 ? mentions : null,
        client_message_id: clientMessageId,
      });
      await loadMessages();
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = filterTopic
    ? messages.filter(m => m.topic === filterTopic)
    : messages;

  const filteredAgents = KNOWN_AGENTS.filter(a =>
    a.toLowerCase().startsWith(mentionFilter)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-500" />
          <h3 className="font-medium text-gray-900">Meeting Room</h3>
        </div>

        {/* Topic filter */}
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-gray-400" />
          <select
            value={filterTopic}
            onChange={e => setFilterTopic(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">All Topics</option>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {filteredMessages.map((msg) => {
          const isSelf = msg.sender === sender;
          const mentions: string[] = (() => {
            try { return msg.mentions ? JSON.parse(msg.mentions) : []; } catch { return []; }
          })();
          const isMentioned = mentions.includes(sender);

          return (
            <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">
                  {msg.sender} • {format(new Date(msg.timestamp), 'HH:mm:ss')}
                </span>
                {msg.topic && msg.topic !== 'General' && (
                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                    #{msg.topic}
                  </span>
                )}
                {isMentioned && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                    @mentioned
                  </span>
                )}
              </div>
              <div className={`px-4 py-2 rounded-lg max-w-2xl text-sm ${
                isSelf
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : isMentioned
                  ? 'bg-amber-50 border border-amber-200 text-gray-800 rounded-bl-none shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
              }`}>
                <MessageContent content={msg.content} self={isSelf} />
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        {/* Mention autocomplete */}
        {showMentionHint && filteredAgents.length > 0 && (
          <div className="mb-2 flex gap-1 flex-wrap">
            {filteredAgents.map(name => (
              <button
                key={name}
                onClick={() => insertMention(name)}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full hover:bg-blue-100"
              >
                <AtSign className="w-3 h-3" />
                {name}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex space-x-2">
          {/* Topic picker */}
          <select
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-2 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
          >
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message... use @Name to mention"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
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
