import { useEffect, useState, useRef } from 'react';
import { getChatMessages, sendChatMessage, clearChatMessages } from '../api';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import {
  Send, Users, Loader2, Hash, AtSign, ArrowDown,
  Search, X, Trash2, MessageSquare,
} from 'lucide-react';

const KNOWN_AGENTS = ['Nova', 'Qual', 'Icy', 'Imax', 'Nas', 'Binghome', 'David'];
const TOPICS = ['General', 'Deploy', 'Bug', 'Proposal', 'Urgent'];

function generateClientMessageId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function parseMentions(content: string): string[] {
  const matches = content.match(/@(\w+)/g);
  return matches ? [...new Set(matches.map(m => m.slice(1)))] : [];
}

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

function DateSeparator({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  else label = format(date, 'MMMM d, yyyy');

  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-100 rounded-full whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export default function ChatRoom() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [topic, setTopic] = useState('General');
  const [filterTopic, setFilterTopic] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showMentionHint, setShowMentionHint] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [clearing, setClearing] = useState(false);
  const [sender] = useState('David');
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadMessages = async () => {
    const data = await getChatMessages(200);
    setMessages(data);
  };

  useEffect(() => {
    loadMessages();
    const timer = setInterval(loadMessages, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (autoScroll && !searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll, searchQuery]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    setAutoScroll(atBottom);
  };

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
    setAutoScroll(true);
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

  const handleClearChat = async () => {
    if (!confirm('Clear all chat messages? This cannot be undone.')) return;
    setClearing(true);
    try {
      await clearChatMessages();
      setMessages([]);
    } finally {
      setClearing(false);
    }
  };

  const toggleSearch = () => {
    setShowSearch(s => {
      if (!s) setTimeout(() => searchRef.current?.focus(), 50);
      else setSearchQuery('');
      return !s;
    });
  };

  // Filter by topic then by search query
  const filteredMessages = messages
    .filter(m => !filterTopic || m.topic === filterTopic)
    .filter(m => !searchQuery || m.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  m.sender?.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredAgents = KNOWN_AGENTS.filter(a =>
    a.toLowerCase().startsWith(mentionFilter)
  );

  // Build display list with date separators inserted
  type DisplayItem =
    | { kind: 'separator'; date: Date; key: string }
    | { kind: 'message'; msg: any };

  const displayItems: DisplayItem[] = [];
  let lastDate: Date | null = null;
  for (const msg of filteredMessages) {
    const msgDate = new Date(msg.timestamp);
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      displayItems.push({ kind: 'separator', date: msgDate, key: `sep-${msg.id}` });
      lastDate = msgDate;
    }
    displayItems.push({ kind: 'message', msg });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-blue-500 shrink-0" />
          <h3 className="font-semibold text-gray-900 text-sm">Meeting Room</h3>
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 font-mono shrink-0">
            {filteredMessages.length} msg{filteredMessages.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Search toggle */}
          <button
            onClick={toggleSearch}
            title="Search messages"
            className={`p-1.5 rounded-lg transition-colors ${showSearch ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-200'}`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Topic filter */}
          <div className="flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={filterTopic}
              onChange={e => setFilterTopic(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">All</option>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Clear Chat */}
          <button
            onClick={handleClearChat}
            disabled={clearing || messages.length === 0}
            title="Clear all messages"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Search bar (collapsible) */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-gray-100 bg-blue-50/50 flex items-center gap-2 shrink-0">
          <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {searchQuery && (
            <span className="text-xs text-blue-500 font-medium whitespace-nowrap">
              {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/50 relative"
      >
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 opacity-40" />
            </div>
            <p className="text-sm font-medium">
              {searchQuery ? 'No messages match your search' : 'No messages yet'}
            </p>
            {!searchQuery && <p className="text-xs">Start the conversation below</p>}
          </div>
        ) : (
          displayItems.map(item => {
            if (item.kind === 'separator') {
              return <DateSeparator key={item.key} date={item.date} />;
            }

            const { msg } = item;
            const isSelf = msg.sender === sender;
            const mentions: string[] = (() => {
              try { return msg.mentions ? JSON.parse(msg.mentions) : []; } catch { return []; }
            })();
            const isMentioned = mentions.includes(sender);

            return (
              <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-gray-500">
                    {msg.sender} · {format(new Date(msg.timestamp), 'HH:mm')}
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
                <div className={`px-3.5 py-2 rounded-2xl max-w-2xl text-sm leading-relaxed ${
                  isSelf
                    ? 'bg-blue-600 text-white rounded-br-sm shadow-md shadow-blue-200'
                    : isMentioned
                    ? 'bg-amber-50 border border-amber-200 text-gray-800 rounded-bl-sm shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                }`}>
                  <MessageContent content={msg.content} self={isSelf} />
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />

        {!autoScroll && !searchQuery && (
          <button
            onClick={() => {
              setAutoScroll(true);
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-full shadow-lg hover:bg-blue-700 transition-all z-10"
          >
            <ArrowDown className="w-3 h-3" />
            Latest
          </button>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-200 shrink-0">
        {showMentionHint && filteredAgents.length > 0 && (
          <div className="mb-2 flex gap-1 flex-wrap">
            {filteredAgents.map(name => (
              <button
                key={name}
                onClick={() => insertMention(name)}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                <AtSign className="w-3 h-3" />
                {name}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
