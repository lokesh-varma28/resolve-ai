import React, { useState } from 'react';
import { Header } from './components/Header';
import { ChatPanel } from './components/ChatPanel';
import { StepTracker } from './components/StepTracker';
import { EscalationModal } from './components/EscalationModal';
import { RawJsonModal } from './components/RawJsonModal';
import { useBackendStatus } from './hooks/useBackendStatus';
import { useEscalations } from './hooks/useEscalations';
import { useSupportSession } from './hooks/useSupportSession';
import type { SupportResponse } from './types/support';

export const App: React.FC = () => {
  const [isEscalationsOpen, setIsEscalationsOpen] = useState(false);
  const [isRawJsonOpen, setIsRawJsonOpen] = useState(false);

  // Hook for backend health monitoring
  const backend = useBackendStatus(12000);

  // Hook for escalation tickets
  const escalations = useEscalations();

  // Hook for active support chat session
  const support = useSupportSession(() => {
    void escalations.refresh();
  });

  const handleSelectResponse = (resp: SupportResponse) => {
    support.selectResponseForInspection(resp);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        isBackendOnline={backend.isOnline}
        serviceInfo={backend.serviceInfo}
        isLoadingHealth={backend.isLoading}
        onRefreshHealth={backend.refresh}
        customerId={support.customerId}
        ticketCount={escalations.totalCount}
        onOpenTickets={() => setIsEscalationsOpen(true)}
      />

      {/* Main Dual-Panel Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chat Conversation Interface */}
        <section className="lg:col-span-7 h-[calc(100vh-8.5rem)] min-h-[600px] flex flex-col">
          <ChatPanel
            messages={support.messages}
            isLoading={support.isLoading}
            onSendMessage={support.sendMessage}
            onResetSession={support.resetConversation}
            onSelectResponse={handleSelectResponse}
            selectedResponse={support.latestResponse}
            conversationId={support.conversationId}
          />
        </section>

        {/* Right Column: Authoritative Backend Investigation StepTracker */}
        <section className="lg:col-span-5 h-[calc(100vh-8.5rem)] min-h-[600px] flex flex-col overflow-y-auto pr-1">
          <StepTracker
            response={support.latestResponse}
            onViewRawJson={() => setIsRawJsonOpen(true)}
          />
        </section>
      </main>

      {/* Escalations Drawer / Modal */}
      <EscalationModal
        isOpen={isEscalationsOpen}
        onClose={() => setIsEscalationsOpen(false)}
        tickets={escalations.tickets}
        totalCount={escalations.totalCount}
        isLoading={escalations.isLoading}
        onRefresh={escalations.refresh}
      />

      {/* Raw Backend JSON Inspector Modal */}
      <RawJsonModal
        isOpen={isRawJsonOpen}
        onClose={() => setIsRawJsonOpen(false)}
        data={support.latestResponse}
      />
    </div>
  );
};

export default App;
