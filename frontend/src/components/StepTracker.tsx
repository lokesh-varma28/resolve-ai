import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Wrench,
  ShieldCheck,
  Ticket,
  ChevronDown,
  ChevronUp,
  Code,
  Sparkles,
  Info,
  Clock,
  Layers,
} from 'lucide-react';
import type { SupportResponse, ToolResult } from '../types/support';
import { ExecutionModeBanner } from './ExecutionModeBanner';

interface StepTrackerProps {
  response: SupportResponse | null;
  onViewRawJson: () => void;
}

export const StepTracker: React.FC<StepTrackerProps> = ({ response, onViewRawJson }) => {
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({});

  const toggleTool = (idx: number) => {
    setExpandedTools((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!response) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-300 mb-1">
          Backend Investigation Inspector
        </h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Select a test scenario or send a customer message to inspect the authoritative backend pipeline execution in real time.
        </p>
      </div>
    );
  }

  const { intent, tool_results, action, escalation, execution_mode, conversation_id } = response;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-rose-400 bg-rose-950/60 border-rose-800/60';
      case 'high':
        return 'text-orange-400 bg-orange-950/60 border-orange-800/60';
      case 'medium':
        return 'text-amber-400 bg-amber-950/60 border-amber-800/60';
      case 'low':
      default:
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
    }
  };

  const getActionColor = (act: string) => {
    switch (act) {
      case 'refund_review':
        return 'text-cyan-300 bg-cyan-950/60 border-cyan-700/60';
      case 'escalate':
        return 'text-amber-300 bg-amber-950/60 border-amber-700/60';
      case 'none':
      default:
        return 'text-emerald-300 bg-emerald-950/60 border-emerald-700/60';
    }
  };

  return (
    <div className="space-y-4">
      {/* Session Top Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300">Session ID:</span>
          <span className="font-mono text-xs text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
            {conversation_id}
          </span>
        </div>
        <button
          onClick={onViewRawJson}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1 rounded-lg transition border border-slate-700 cursor-pointer"
          title="View raw backend JSON response"
        >
          <Code className="w-3.5 h-3.5 text-indigo-400" />
          <span>Raw Backend JSON</span>
        </button>
      </div>

      {/* Fallback / Mode Resilient Callout */}
      <ExecutionModeBanner mode={execution_mode} />

      {/* Step 1: Intent Classification */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
              1
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Intent Classification
            </h4>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Backend Authoritative
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 text-xs">
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-medium">Intent</div>
            <div className="font-mono font-semibold text-indigo-300 mt-0.5 truncate">
              {intent.intent}
            </div>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-medium">Confidence</div>
            <div className="font-semibold text-slate-200 mt-0.5">
              {(intent.confidence * 100).toFixed(0)}%
            </div>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
            <div className="text-[10px] text-slate-400 uppercase font-medium">Assigned Priority</div>
            <div className="mt-0.5">
              <span
                className={`inline-block px-2 py-0.2 text-[10px] uppercase font-bold rounded border ${getPriorityColor(
                  intent.priority
                )}`}
              >
                {intent.priority}
              </span>
            </div>
          </div>
        </div>

        {(intent.order_id || intent.payment_id) && (
          <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
            {intent.order_id && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px]">
                <span className="text-slate-500">Order:</span> {intent.order_id}
              </span>
            )}
            {intent.payment_id && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px]">
                <span className="text-slate-500">Payment:</span> {intent.payment_id}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Tool Execution Records */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
              2
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Tool Invocations ({tool_results.length})
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            {tool_results.length > 0 ? 'Executed via Bounded Registry' : 'No Tools Required'}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {tool_results.length === 0 ? (
            <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/60 text-xs text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>No external tools were executed for this inquiry. Resolved by orchestrator policy.</span>
            </div>
          ) : (
            tool_results.map((toolResult: ToolResult, idx: number) => {
              const isExpanded = expandedTools[idx] ?? false;
              return (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-lg overflow-hidden transition-all"
                >
                  <div
                    onClick={() => toggleTool(idx)}
                    className="p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-900/70 select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Wrench className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                        {toolResult.tool}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {toolResult.success ? (
                        <span className="text-[10px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Success
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-rose-950/70 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-400" /> Failed
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[11px] font-mono overflow-x-auto">
                      {toolResult.error && (
                        <div className="text-rose-400 mb-1.5 pb-1.5 border-b border-rose-950">
                          Error: {toolResult.error}
                        </div>
                      )}
                      <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify(toolResult.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Step 3: Safety Validation Gate */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
              3
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Safety & Action Determination
            </h4>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-cyan-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Server-Enforced
          </span>
        </div>

        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 font-medium">Validated Action:</span>
            <span
              className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded border uppercase ${getActionColor(
                action
              )}`}
            >
              {action}
            </span>
          </div>

          <p className="text-slate-400 text-[11px] leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-900">
            {action === 'refund_review' && (
              <span className="text-cyan-300">
                • <strong>Human-in-the-Loop Approval Gate</strong>: Financial refunds cannot be executed autonomously. Orchestrator opened a refund review ticket.
              </span>
            )}
            {action === 'escalate' && (
              <span className="text-amber-300">
                • <strong>Controlled Escalation</strong>: Request involves a verified complaint or boundary condition; transferred safely to a support specialist.
              </span>
            )}
            {action === 'none' && (
              <span className="text-emerald-300">
                • <strong>Safe Direct Resolution</strong>: Request was fulfilled strictly within authorized read bounds.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Step 4: Outcome & Escalation Ticket */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">
              4
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Resolution Outcome
            </h4>
          </div>
          <span className="text-[11px] text-purple-300 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Customer Response Ready
          </span>
        </div>

        <div className="mt-3">
          {escalation ? (
            <div className="bg-gradient-to-br from-indigo-950/70 to-purple-950/50 border border-indigo-700/50 rounded-lg p-3.5 text-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-slate-100">Ticket Generated:</span>
                  <span className="font-mono font-bold text-indigo-300 bg-indigo-900/50 px-2 py-0.5 rounded border border-indigo-700/50">
                    {escalation.ticket_id}
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded">
                  {escalation.status}
                </span>
              </div>
              <div className="text-slate-300 text-[11px] mt-1">
                <span className="text-slate-400 font-medium">Reason:</span> {escalation.reason}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(escalation.created_at).toLocaleString()}
                </span>
                <span>Customer: {escalation.customer_id}</span>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Automated Direct Resolution Formulated. Zero human escalation required.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

