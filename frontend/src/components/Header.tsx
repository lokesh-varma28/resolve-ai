import React from 'react';
import { Bot, Shield, Server, RefreshCw, Ticket, UserCheck, AlertCircle } from 'lucide-react';
import type { ServiceInfo } from '../types/support';

interface HeaderProps {
  isBackendOnline: boolean;
  serviceInfo: ServiceInfo | null;
  isLoadingHealth: boolean;
  onRefreshHealth: () => void;
  customerId: string;
  ticketCount: number;
  onOpenTickets: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isBackendOnline,
  serviceInfo,
  isLoadingHealth,
  onRefreshHealth,
  customerId,
  ticketCount,
  onOpenTickets,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">ResolveAI</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v2.0 Orchestrator
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Autonomous Customer Support & Controlled Safety Layer
            </p>
          </div>
        </div>

        {/* Status Pills and Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Customer Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400 font-medium">Customer:</span>
            <span className="font-mono font-semibold text-slate-200">{customerId}</span>
          </div>

          {/* Backend Health Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              isBackendOnline
                ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-600/40 text-rose-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <Server className="w-3.5 h-3.5" />
            <span>
              {isBackendOnline
                ? `FastAPI Online ${serviceInfo?.llm_provider ? `(${serviceInfo.llm_provider})` : ''}`
                : 'Backend Offline'}
            </span>
            <button
              onClick={onRefreshHealth}
              disabled={isLoadingHealth}
              className="ml-1 hover:text-white transition p-0.5"
              title="Refresh connection status"
            >
              <RefreshCw
                className={`w-3 h-3 ${isLoadingHealth ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {/* Escalations Counter Button */}
          <button
            onClick={onOpenTickets}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 transition text-xs font-semibold cursor-pointer shadow-sm"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Escalation Tickets</span>
            {ticketCount > 0 ? (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                {ticketCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Backend Offline Notice Bar if disconnected */}
      {!isBackendOnline && (
        <div className="bg-rose-950/80 border-t border-rose-800/80 px-4 py-2 text-center text-xs text-rose-200 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>
            FastAPI backend is currently offline at <code className="bg-rose-900/50 px-1 py-0.5 rounded text-white">http://127.0.0.1:8000</code>. Ensure the service is running.
          </span>
        </div>
      )}
    </header>
  );
};

