import { useCallback, useState } from 'react';
import { api, ApiError } from '../services/api';
import type { ChatMessage, SupportResponse } from '../types/support';

export const DEMO_CUSTOMER_ID = 'CUS-001';

export interface SupportSessionState {
  customerId: string;
  conversationId: string | null;
  messages: ChatMessage[];
  latestResponse: SupportResponse | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (messageText: string) => Promise<SupportResponse | null>;
  resetConversation: () => void;
  selectResponseForInspection: (response: SupportResponse) => void;
}

export function useSupportSession(
  onEscalationCreated?: () => void
): SupportSessionState {
  const [customerId] = useState<string>(DEMO_CUSTOMER_ID);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [latestResponse, setLatestResponse] = useState<SupportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (messageText: string): Promise<SupportResponse | null> => {
      const trimmed = messageText.trim();
      if (!trimmed || isLoading) return null;

      const userMsgId = `usr-${Date.now()}`;
      const aiMsgId = `ai-${Date.now() + 1}`;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 1. Append customer message
      const userMessage: ChatMessage = {
        id: userMsgId,
        sender: 'customer',
        text: trimmed,
        timestamp: now,
      };

      // 2. Append AI placeholder message
      const loadingAiMessage: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: '',
        timestamp: now,
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingAiMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.investigateSupport({
          customer_id: customerId,
          message: trimmed,
          conversation_id: conversationId,
        });

        // Store active conversation ID from backend
        if (response.conversation_id) {
          setConversationId(response.conversation_id);
        }

        // Replace loading placeholder with authoritative backend response
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === aiMsgId) {
              return {
                ...msg,
                text: response.final_message,
                isLoading: false,
                supportResponse: response,
              };
            }
            return msg;
          })
        );

        setLatestResponse(response);

        // Notify if an escalation was generated
        if (response.escalation && onEscalationCreated) {
          onEscalationCreated();
        }

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Investigation failed unexpectedly';

        setError(errorMessage);

        // Mark placeholder as error
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === aiMsgId) {
              return {
                ...msg,
                text: `[Service Error]: ${errorMessage}`,
                isLoading: false,
                isError: true,
              };
            }
            return msg;
          })
        );

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [customerId, conversationId, isLoading, onEscalationCreated]
  );

  const resetConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setLatestResponse(null);
    setError(null);
  }, []);

  const selectResponseForInspection = useCallback((response: SupportResponse) => {
    setLatestResponse(response);
  }, []);

  return {
    customerId,
    conversationId,
    messages,
    latestResponse,
    isLoading,
    error,
    sendMessage,
    resetConversation,
    selectResponseForInspection,
  };
}

