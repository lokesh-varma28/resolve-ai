import React from 'react';
import { ShieldCheck, Cpu, AlertTriangle, Sparkles } from 'lucide-react';
import type { ExecutionMode } from '../types/support';

interface ExecutionModeBannerProps {
  mode: ExecutionMode | null | undefined;
  className?: string;
}

export const ExecutionModeBanner: React.FC<ExecutionModeBannerProps> = ({ mode, className = '' }) => {
  if (!mode) return null;

  if (mode === 'fallback') {
    return (
      <div
        className={`bg-amber-950/40 border border-amber-500/40 rounded-lg p-3.5 flex items-start gap-3 shadow-sm ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="p-1.5 bg-amber-500/10 rounded-md text-amber-400 mt-0.5 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-300 text-sm">
              AI Provider Unavailable — Deterministic Safety Pipeline Active
            </span>
            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border border-amber-500/30">
              Resilient Fallback
            </span>
          </div>
          <p className="text-amber-200/80 mt-1 leading-relaxed">
            The upstream AI model quota is exhausted or unreachable. ResolveAI automatically engaged its bounded, deterministic safety pipeline to verify customer records and safely protect the customer without service interruption.
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'llm') {
    return (
      <div
        className={`bg-indigo-950/40 border border-indigo-500/40 rounded-lg p-3.5 flex items-start gap-3 shadow-sm ${className}`}
        role="status"
      >
        <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-400 mt-0.5 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-300 text-sm">
              AI Orchestrated Pipeline Active
            </span>
            <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border border-indigo-500/30">
              Autonomous
            </span>
          </div>
          <p className="text-indigo-200/80 mt-1 leading-relaxed">
            LLM agent investigating with bounded tool-calling loop, governed by backend safety gates.
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'deterministic') {
    return (
      <div
        className={`bg-slate-900/60 border border-slate-700/60 rounded-lg p-3.5 flex items-start gap-3 shadow-sm ${className}`}
        role="status"
      >
        <div className="p-1.5 bg-slate-800 rounded-md text-slate-300 mt-0.5 shrink-0">
          <Cpu className="w-5 h-5" />
        </div>
        <div className="flex-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200 text-sm">
              Deterministic Safety Pipeline Active
            </span>
            <span className="bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border border-slate-600">
              Rule-Based
            </span>
          </div>
          <p className="text-slate-400 mt-1 leading-relaxed">
            Executing deterministic policy verification and structured tool lookups.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 flex items-center gap-2 ${className}`}>
      <AlertTriangle className="w-4 h-4 text-slate-500" />
      <span>Execution mode: {mode}</span>
    </div>
  );
};

