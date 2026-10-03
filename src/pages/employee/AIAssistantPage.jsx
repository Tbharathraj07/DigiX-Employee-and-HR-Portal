import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { askPortalAssistant } from '../../services/aiAssistantService';
import { Button } from '../../components/common/Button';
import {
  Bot,
  Send,
  Sparkles,
  HelpCircle,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export const AIAssistantPage = () => {
  const { user } = useAuth();
  const { leaveBalances, tasks, trainings, announcements, isPunchedIn } = usePortalData();

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Hello ${user?.name ? user.name.split(' ')[0] : 'there'}! 👋 I'm the **DigiX Portal Assistant**, your internal guide for company policies, employee benefits, leave balances, attendance, and IT support at DigiX Technologies.\n\nHow can I help you today?`,
      time: 'Just now',
      provider: 'portal-knowledge'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastProvider, setLastProvider] = useState('portal-knowledge');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const samplePrompts = [
    'How do I apply for casual or sick leave?',
    'What is our hybrid and work from home policy?',
    'What are my remaining leave balances?',
    'How do I clock in and record attendance?',
    'How do I claim medical insurance benefits?',
    'When do we get paid and where are payslips stored?',
    'How do I update my profile details or emergency contact?'
  ];

  const handleSend = async (textToSend = input) => {
    const text = textToSend.trim();
    if (!text) {
      setErrorMessage('Please enter a question or choose one of the suggestions below.');
      return;
    }

    setErrorMessage(null);

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await askPortalAssistant({
        prompt: text,
        user,
        portalContext: {
          leaveBalances,
          tasks,
          trainings,
          announcements,
          isPunchedIn
        },
        history: messages
      });

      if (response.success && response.reply) {
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: response.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: response.provider || 'portal-knowledge',
          configured: response.configured
        };

        setLastProvider(response.provider || 'portal-knowledge');
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const botErrMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: `⚠️ **Unable to complete request:** ${response.error || 'The assistant could not process your query at this moment. Please try again or rephrase your question.'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        };
        setMessages((prev) => [...prev, botErrMsg]);
      }
    } catch (err) {
      console.error('[AIAssistantPage] Error during chat processing:', err);
      const botErrMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: `⚠️ **System Error:** An unexpected error occurred while communicating with the assistant. Please verify your connection and try again.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages((prev) => [...prev, botErrMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: `Chat reset. Hello ${user?.name ? user.name.split(' ')[0] : 'there'}! 👋 How can I help you navigate the DigiX portal?`,
        time: 'Just now',
        provider: 'portal-knowledge'
      }
    ]);
    setInput('');
    setErrorMessage(null);
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
              Internal guide for DigiX Policies, Workflows, Leaves, Attendance & Portal Help
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200/80 rounded-lg text-xs text-slate-600 shadow-2xs">
            {lastProvider === 'gemini' || lastProvider === 'openai' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold text-indigo-700 capitalize">{lastProvider} AI</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-digix-600" />
                <span className="font-semibold text-slate-700">Knowledge Engine</span>
              </>
            )}
          </div>

          <button
            onClick={handleResetChat}
            title="Reset Conversation"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

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
                  : m.isError
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {m.sender === 'user' ? (
                'You'
              ) : m.isError ? (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              ) : (
                <Bot className="w-4 h-4 text-digix-600" />
              )}
            </div>

            <div
              className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-digix-500 text-white rounded-tr-none'
                  : m.isError
                  ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-none'
                  : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-line">{m.text}</div>
              <div
                className={`text-[10px] mt-2 flex items-center justify-between gap-2 ${
                  m.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                <span>{m.sender === 'bot' && !m.isError ? (m.provider === 'gemini' ? '✨ Gemini AI' : '⚡ Knowledge Engine') : ''}</span>
                <span>{m.time}</span>
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
      <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 flex-shrink-0">
          <HelpCircle className="w-3.5 h-3.5" /> Suggestions:
        </span>
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={isTyping}
            className="text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors disabled:opacity-50"
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
          disabled={isTyping}
          onChange={(e) => {
            setInput(e.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSend()}
          placeholder="Ask anything about DigiX policies, leaves, attendance, or IT support..."
          className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:bg-white focus:border-digix-500 focus:ring-1 focus:ring-digix-500 transition-colors disabled:opacity-60"
        />
        <Button
          variant="primary"
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          rightIcon={<Send className="w-4 h-4" />}
          className="py-3 px-4"
        >
          {isTyping ? 'Thinking...' : 'Send'}
        </Button>
      </div>
    </div>
  );
};
