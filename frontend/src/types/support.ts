export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export type ActionType = 'none' | 'escalate' | 'refund_review';

export type IntentType =
  | 'payment_failed_order_missing'
  | 'refund_request'
  | 'delivery_issue'
  | 'order_status'
  | 'account_issue'
  | 'unknown'
  | (string & {});

export interface SupportRequest {
  customer_id: string;
  message: string;
  conversation_id?: string | null;
}

export interface IntentResult {
  intent: IntentType;
  priority: PriorityLevel;
  confidence: number;
  order_id?: string | null;
  payment_id?: string | null;
}

export interface ToolResult {
  tool: string;
  success: boolean;
  data: Record<string, unknown>;
  error?: string | null;
}

export interface EscalationTicket {
  ticket_id: string;
  customer_id: string;
  original_message: string;
  intent: string;
  priority: string;
  reason: string;
  order?: Record<string, unknown> | null;
  payment?: Record<string, unknown> | null;
  tool_results: Array<Record<string, unknown>>;
  status: string;
  created_at: string;
}

export type ExecutionMode = 'deterministic' | 'llm' | 'fallback' | (string & {});

export interface SupportResponse {
  conversation_id: string;
  intent: IntentResult;
  tool_results: ToolResult[];
  final_message: string;
  action: ActionType;
  escalation?: EscalationTicket | null;
  execution_mode?: ExecutionMode | null;
}

export interface ServiceInfo {
  service: string;
  status: string;
  version: string;
  llm_provider: string;
  llm_model: string;
  execution_mode: string;
  llm_ready: boolean;
}

export interface HealthInfo {
  status: string;
}

export interface EscalationListResponse {
  count: number;
  tickets: EscalationTicket[];
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'ai';
  text: string;
  timestamp: string;
  supportResponse?: SupportResponse;
  isLoading?: boolean;
  isError?: boolean;
}

