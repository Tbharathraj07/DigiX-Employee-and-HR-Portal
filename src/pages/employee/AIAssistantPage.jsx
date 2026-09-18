import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AI_FAQ_KNOWLEDGE } from '../../mock/initialData';
import { Button } from '../../components/common/Button';
import { Bot, Send, Sparkles, User, HelpCircle, CornerDownLeft } from 'lucide-react';

export const AIAssistantPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Hello ${user?.name.split(' ')[0]}! 👋 I'm **DigiX Assistant**, your internal AI guide for HR policies, employee benefits, time-off requests, and IT services at DigiX Technologies. How can I assist you today?`,
      time: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const samplePrompts = [
    'How do I apply for casual or sick leave?',
    'What is our hybrid and work from home policy?',
    'How do I claim health and medical insurance benefits?',
    'When do we get paid and where are payslips stored?',
    'What are the upcoming DigiX corporate holidays?'
  ];

  const handleSend = (textToSend = input) => {
    const text = textToSend.trim();
    if (!text) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Find best match in knowledge base
    setTimeout(() => {
      const lower = text.toLowerCase();
      let match = AI_FAQ_KNOWLEDGE.find((faq) =>
        faq.keywords.some((k) => lower.includes(k))
      );

      let botReply = match
        ? match.response
        : `Thank you for asking about "${text}". According to the DigiX Employee Handbook, our People Operations team regularly updates these policies. For personalized exceptions or ticket creation, please contact your manager (Priyanka, HR Manager) or visit the HR portal.`;

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
      {/* AI Assistant Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-digix-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                DigiX AI Assistant
              </h2>
              <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Trained on DigiX Policies, Employee Handbook v4.2 & Corporate FAQ
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
          <Sparkles className="w-4 h-4 text-digix-500" />
          <span>Internal Model</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                m.sender === 'user'
                  ? 'bg-digix-500 text-white'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {m.sender === 'user' ? 'You' : <Bot className="w-4 h-4 text-digix-600" />}
            </div>

            <div
              className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-digix-500 text-white rounded-tr-none'
                  : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-line">{m.text}</div>
              <div
                className={`text-[10px] mt-2 text-right ${
                  m.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                {m.time}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs">
              <Bot className="w-4 h-4 text-digix-600" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-digix-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-digix-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-digix-600 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Quick Prompt Pills */}
      <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 flex-shrink-0">
          <HelpCircle className="w-3.5 h-3.5" /> Suggestions:
        </span>
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask anything about DigiX policies, benefits, leaves, or IT..."
          className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:bg-white focus:border-digix-500 focus:ring-1 focus:ring-digix-500 transition-colors"
        />
        <Button
          variant="primary"
          onClick={() => handleSend()}
          disabled={!input.trim()}
          rightIcon={<Send className="w-4 h-4" />}
          className="py-3 px-4"
        >
          Send
        </Button>
      </div>
    </div>
  );
};
