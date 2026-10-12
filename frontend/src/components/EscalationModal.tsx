import React, { useState } from 'react';
import { X, Ticket, RefreshCw } from 'lucide-react';
import type { EscalationTicket } from '../types/support';

interface EscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: EscalationTicket[];
  totalCount: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export const EscalationModal: React.FC<EscalationModalProps> = ({
  isOpen,
  onClose,
  tickets,
  totalCount,
  isLoading,
  onRefresh,
}) => {
  const [selectedTicket, setSelectedTicket] = useState<EscalationTicket | null>(
    tickets.length > 0 ? tickets[0] : null
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Support Escalation Registry
              </h2>
              <p className="text-xs text-slate-400">
                Live tickets requiring human agent resolution or financial review ({totalCount} total)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Two Column Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[450px]">
          {/* Left Column: Ticket List */}
          <div className="md:col-span-5 border-r border-slate-800 overflow-y-auto p-4 space-y-2 bg-slate-950/40">
            {tickets.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
                <Ticket className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">No escalation tickets created yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Try triggering a delivery issue or refund request scenario.
                </p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicket?.ticket_id === t.ticket_id;
                return (
                  <div
                    key={t.ticket_id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500/70 shadow-sm'
                        : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono text-xs font-bold text-indigo-300">
                        {t.ticket_id}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.2 rounded border uppercase ${
                          t.priority === 'critical'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                            : t.priority === 'high'
                              ? 'bg-orange-950/80 text-orange-300 border-orange-800'
                              : 'bg-amber-950/80 text-amber-300 border-amber-800'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                      {t.reason}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                      <span className="font-mono">Customer: {t.customer_id}</span>
                      <span>{new Date(t.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Ticket Detail View */}
          <div className="md:col-span-7 overflow-y-auto p-6 bg-slate-900/50">
            {selectedTicket ? (
              <div className="space-y-4">
                {/* Detail Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      Ticket Record
                    </span>
                    <h3 className="text-lg font-bold text-indigo-300 font-mono">
                      {selectedTicket.ticket_id}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 uppercase">
                      Status: {selectedTicket.status}
                    </span>
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md uppercase border ${
                        selectedTicket.priority === 'critical'
                          ? 'bg-rose-950/70 text-rose-300 border-rose-800/60'
                          : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                      }`}
                    >
                      {selectedTicket.priority} Priority
                    </span>
                  </div>
                </div>

                {/* Reason & Inquiry */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div>
                    <span className="text-slate-400 font-medium">Customer Original Message:</span>
                    <p className="text-slate-200 italic mt-0.5 bg-slate-900/60 p-2 rounded border border-slate-800">
                      "{selectedTicket.original_message}"
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Escalation Rationale:</span>
                    <p className="text-amber-300 font-semibold mt-0.5">
                      {selectedTicket.reason}
                    </p>
                  </div>
                </div>

                {/* Associated Entities */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-medium">Verified Order:</span>
                    {selectedTicket.order ? (
                      <pre className="font-mono text-[11px] text-slate-300 mt-1 whitespace-pre-wrap">
                        {JSON.stringify(selectedTicket.order, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-slate-500 italic mt-1">None associated</div>
                    )}
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-medium">Verified Payment:</span>
                    {selectedTicket.payment ? (
                      <pre className="font-mono text-[11px] text-slate-300 mt-1 whitespace-pre-wrap">
                        {JSON.stringify(selectedTicket.payment, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-slate-500 italic mt-1">None associated</div>
                    )}
                  </div>
                </div>

                {/* Recorded Tool Results */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <div className="text-slate-400 font-medium mb-1.5">
                    Tool Execution Snapshot ({selectedTicket.tool_results.length})
                  </div>
                  {selectedTicket.tool_results.length === 0 ? (
                    <div className="text-slate-500 italic text-[11px]">No tools recorded</div>
                  ) : (
                    <pre className="font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap bg-slate-900 p-2.5 rounded border border-slate-800">
                      {JSON.stringify(selectedTicket.tool_results, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select a ticket on the left to inspect its details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
