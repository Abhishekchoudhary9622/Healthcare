import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import {
  MessageCircle, X, Send, Bot, User,
  Loader2, Minimize2, Sparkles, Trash2,
} from 'lucide-react';

const WELCOME = {
  role: 'assistant',
  content: `Hi! I'm **HealthSync AI**, your personal health assistant powered by Gemini.\n\nI can help you with:\n• Understanding symptoms\n• Medication questions\n• Appointment guidance\n• General health advice\n\nHow can I help you today?`,
};

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-2.5 items-end', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'h-7 w-7 rounded-full flex items-center justify-center shrink-0 mb-0.5',
        isUser
          ? 'bg-brand-600 text-white'
          : 'bg-gradient-to-br from-violet-500 to-brand-600 text-white'
      )}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      {/* Bubble */}
      <div className={cn(
        'max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
        isUser
          ? 'bg-brand-600 text-white rounded-br-sm'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-bl-sm border border-[var(--border)]'
      )}>
        {/* Render bold markdown (**text**) */}
        {msg.content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-1' : ''}>
            {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 items-end">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center shrink-0">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
        <span className="h-2 w-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export default function AiChat() {
  const user = useAuthStore(s => s.user);
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread]   = useState(0);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Send only the last 10 messages to keep context manageable
      const history = [...messages, userMsg].slice(-10).filter(m => m.role !== 'system');
      const { data } = await api.post('/chat', { messages: history });
      const assistantMsg = { role: 'assistant', content: data.data.reply };
      setMessages(prev => [...prev, assistantMsg]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => setMessages([WELCOME]);

  const quickPrompts = [
    'What are common cold symptoms?',
    'How do I prepare for my appointment?',
    'What should I do for a fever?',
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center',
          'bg-gradient-to-br from-brand-600 to-violet-600 text-white',
          'hover:shadow-xl hover:scale-105 active:scale-95',
          open && 'rotate-90'
        )}
        style={{ transition: 'transform 0.2s, box-shadow 0.2s' }}
        title="HealthSync AI Assistant"
      >
        {open
          ? <X className="h-6 w-6" />
          : <MessageCircle className="h-6 w-6" />
        }
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[560px] flex flex-col rounded-2xl shadow-2xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-brand-600 to-violet-600 text-white shrink-0">
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">HealthSync AI</p>
              <p className="text-[11px] text-white/70">Powered by Gemini · Always available</p>
            </div>
            <button
              onClick={clearChat}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/20 text-white/70 hover:text-white shrink-0"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/20 text-white/70 hover:text-white shrink-0"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts — show only when just welcome message */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-col gap-1.5 shrink-0">
              <p className="text-[11px] text-[var(--text-muted)] font-medium">Quick questions:</p>
              {quickPrompts.map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-left text-xs px-3 py-2 rounded-xl border border-[var(--border)] hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 text-[var(--text-secondary)] hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask me anything about health..."
                className="flex-1 resize-none px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 max-h-24"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                  'bg-brand-600 text-white',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'hover:bg-brand-700'
                )}
              >
                {loading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center">
              AI responses are for informational purposes only. Always consult your doctor.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
