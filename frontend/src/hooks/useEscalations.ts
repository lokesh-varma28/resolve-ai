import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { EscalationTicket } from '../types/support';

export interface EscalationsState {
  tickets: EscalationTicket[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  selectedTicket: EscalationTicket | null;
  setSelectedTicket: (ticket: EscalationTicket | null) => void;
  refresh: () => Promise<void>;
  inspectTicket: (ticketId: string) => Promise<void>;
}

export function useEscalations(): EscalationsState {
  const [tickets, setTickets] = useState<EscalationTicket[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<EscalationTicket | null>(null);

  const fetchEscalations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getEscalations();
      setTickets(data.tickets || []);
      setTotalCount(data.count || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch escalations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const inspectTicket = useCallback(async (ticketId: string) => {
    try {
      const ticket = await api.getEscalationDetail(ticketId);
      setSelectedTicket(ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ticket ${ticketId}`);
    }
  }, []);

  useEffect(() => {
    void fetchEscalations();
  }, [fetchEscalations]);

  return {
    tickets,
    totalCount,
    isLoading,
    error,
    selectedTicket,
    setSelectedTicket,
    refresh: fetchEscalations,
    inspectTicket,
  };
}

