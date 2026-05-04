import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiMessageCircle, FiSend, FiX, FiHelpCircle, FiCpu, FiLoader } from 'react-icons/fi';
import { chatbotAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const starterPrompts = [
  'How do I log in?',
  'How do students start an exam?',
  'How do teachers create exams?',
  'How do admins manage users?',
];

export default function ChatbotWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'I can help with the exam system, including login, courses, exams, grading, and results.',
    },
  ]);
  const bottomRef = useRef(null);

  const roleLabel = useMemo(() => {
    if (!user?.role) return 'Assistant';
    return `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)} Assistant`;
  }, [user?.role]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open]);

  const sendMessage = async (text) => {
    const content = String(text || '').trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setMessage('');
    setLoading(true);

    try {
      const history = nextMessages.slice(0, -1).map((item) => ({ role: item.role, content: item.content }));
      const response = await chatbotAPI.sendMessage({ message: content, history });
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: response.data.reply },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'I could not reach the assistant right now. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-gradient-to-r from-primary-600 to-violet-700 px-4 py-3 text-white shadow-glow transition-all hover:scale-105 active:scale-95"
      >
        <FiMessageCircle size={18} />
        <span className="hidden sm:inline font-medium">AI Assistant</span>
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl dark:border-[#2d3148] dark:bg-[#1a1d27]">
          <div className="flex items-start justify-between border-b border-gray-100 bg-gradient-to-r from-primary-600 to-violet-700 px-4 py-4 text-white dark:border-[#2d3148]">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FiCpu size={16} />
                {roleLabel}
              </div>
              <p className="mt-1 text-xs text-white/75">Ask about exams, results, grading, or account access.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white">
              <FiX size={18} />
            </button>
          </div>

          <div className="max-h-[24rem] overflow-y-auto px-4 py-4">
            <div className="mb-4 flex items-start gap-3 rounded-2xl bg-gray-50 px-3 py-3 text-xs text-gray-600 dark:bg-[#111420] dark:text-gray-300">
              <FiHelpCircle className="mt-0.5 flex-shrink-0 text-primary-600 dark:text-primary-400" size={16} />
              <span>Try a quick question below or type your own request. I answer based on the current role and the exam system flow.</span>
            </div>

            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`mb-3 flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${item.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-800 dark:bg-[#111420] dark:text-gray-100'
                    }`}
                >
                  {item.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-[#111420] dark:text-gray-400">
                  <FiLoader className="animate-spin" size={14} />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-100 px-4 py-4 dark:border-[#2d3148]">
            <div className="mb-3 flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-primary-300 hover:text-primary-700 disabled:opacity-50 dark:border-[#2d3148] dark:text-gray-300 dark:hover:border-primary-700 dark:hover:text-primary-300"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(message);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask the assistant..."
                className="input flex-1"
              />
              <button type="submit" disabled={loading || !message.trim()} className="btn-primary px-4 py-3">
                <FiSend size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}