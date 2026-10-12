import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RotateCcw, ShieldCheck, Sparkles, Cpu, Layers } from 'lucide-react';
import type { ChatMessage, SupportResponse } from '../types/support';
import { QuickScenarios } from './QuickScenarios';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onResetSession: () => void;
  onSelectResponse: (response: SupportResponse) => void;
  selectedResponse: SupportResponse | null;
  conversationId: string | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onResetSession,
  onSelectResponse,
  selectedResponse,
  conversationId,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Customer Support Session</h2>
            <p className="text-[11px] text-slate-400">
              {conversationId ? (
                <span className="font-mono text-indigo-300">Session: {conversationId}</span>
              ) : (
                'Ready for new inquiry'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onResetSession}
          disabled={messages.length === 0 || isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700/80 rounded-lg transition border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Reset chat conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Session</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Scenarios Panel if session is new or user wants shortcuts */}
        <QuickScenarios onSelectScenario={onSendMessage} disabled={isLoading} />

        {messages.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500">
            <Bot className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-xs text-slate-400">
              No messages yet. Send an inquiry or click a demo scenario above.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'customer';
            const isCurrentSelected =
              msg.supportResponse && selectedResponse?.conversation_id === msg.supportResponse.conversation_id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Sender & Timestamp */}
                  <div
                    className={`flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{isUser ? 'Customer (CUS-001)' : 'ResolveAI Orchestrator'}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : msg.isError
                          ? 'bg-rose-950/80 border border-rose-800 text-rose-200 rounded-tl-none'
                          : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2 text-indigo-300 py-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                        <span className="font-mono">Autonomous orchestrator investigating backend...</span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {/* Metadata chips for AI response */}
                    {msg.supportResponse && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Intent Chip */}
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900/80 text-indigo-300 border border-slate-700/60">
                            {msg.supportResponse.intent.intent}
                          </span>

                          {/* Action Chip */}
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                              msg.supportResponse.action === 'refund_review'
                                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60'
                                : msg.supportResponse.action === 'escalate'
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                            }`}
                          >
                            Action: {msg.supportResponse.action}
                          </span>

                          {/* Fallback / Mode Chip */}
                          {msg.supportResponse.execution_mode === 'fallback' && (
                            <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-amber-400" /> Resilient Fallback
                            </span>
                          )}
                          {msg.supportResponse.execution_mode === 'llm' && (
                            <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-indigo-400" /> LLM Dynamic
                            </span>
                          )}
                          {msg.supportResponse.execution_mode === 'deterministic' && (
                            <span className="text-[10px] font-semibold bg-slate-700/50 text-slate-300 border border-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-slate-400" /> Deterministic
                            </span>
                          )}
                        </div>

                        {/* Button to select and inspect this response */}
                        <button
                          onClick={() => msg.supportResponse && onSelectResponse(msg.supportResponse)}
                          className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded transition cursor-pointer ${
                            isCurrentSelected
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          <Layers className="w-3 h-3" />
                          <span>{isCurrentSelected ? 'Inspecting' : 'Inspect Pipeline'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900/90 border-t border-slate-800">
        <div className="relative flex items-center">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type customer inquiry (e.g. 'Where is my order ORD-1002?' or 'I need a refund')..."
            rows={1}
            disabled={isLoading}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none pr-12 transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="absolute right-2.5 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-600 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
            title="Send inquiry"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between px-1 mt-1.5 text-[10px] text-slate-500">
          <span>Press Enter to send, Shift+Enter for newline</span>
          <span className="font-mono">Demo ID: CUS-001</span>
        </div>
      </form>
    </div>
  );
};
