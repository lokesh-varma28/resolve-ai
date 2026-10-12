import React from 'react';
import { Package, Truck, RotateCcw, AlertTriangle, ShieldAlert, HelpCircle } from 'lucide-react';

interface QuickScenariosProps {
  onSelectScenario: (message: string) => void;
  disabled?: boolean;
}

interface ScenarioItem {
  label: string;
  category: string;
  message: string;
  icon: React.ReactNode;
  badge: string;
}

export const QuickScenarios: React.FC<QuickScenariosProps> = ({ onSelectScenario, disabled }) => {
  const scenarios: ScenarioItem[] = [
    {
      label: 'Order Status Inquiry',
      category: 'Direct Resolution',
      message: 'Where is my order ORD-1002?',
      icon: <Package className="w-4 h-4 text-emerald-400" />,
      badge: 'ORD-1002 (Shipped)',
    },
    {
      label: 'Delayed / Damaged Delivery',
      category: 'Fulfillment Escalation',
      message: 'My order ORD-1001 is delayed and damaged, please help!',
      icon: <Truck className="w-4 h-4 text-amber-400" />,
      badge: 'ORD-1001 (Delayed)',
    },
    {
      label: 'Refund Request',
      category: 'Human Approval Gate',
      message: 'I want a refund for order ORD-1004',
      icon: <RotateCcw className="w-4 h-4 text-cyan-400" />,
      badge: 'ORD-1004 (Cancelled)',
    },
    {
      label: 'Charged with Missing Order',
      category: 'Billing Escalation',
      message: 'I was charged for payment PAY-1005 but no order was created!',
      icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
      badge: 'PAY-1005 (No Order)',
    },
    {
      label: 'Account Security / Locked',
      category: 'Security Escalation',
      message: 'My account was locked and someone made an unauthorized purchase',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
      badge: 'Security Gate',
    },
    {
      label: 'Unknown / Out-of-Scope Query',
      category: 'Graceful Handoff',
      message: 'Can you recommend a good book to read?',
      icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
      badge: 'Fallback Intent',
    },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Demo Test Scenarios
        </span>
        <span className="text-[11px] text-slate-400">
          Click any preset to test the safety pipeline
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {scenarios.map((sc, index) => (
          <button
            key={index}
            onClick={() => onSelectScenario(sc.message)}
            disabled={disabled}
            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="p-1.5 rounded-md bg-slate-900 group-hover:bg-slate-800 transition shrink-0 mt-0.5">
              {sc.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  {sc.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                "{sc.message}"
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-800/40">
                  {sc.category}
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                  {sc.badge}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
