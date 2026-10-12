import type {
  EscalationListResponse,
  EscalationTicket,
  HealthInfo,
  ServiceInfo,
  SupportRequest,
  SupportResponse,
} from '../types/support';

const API_BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      let errorData: unknown;
      try {
        errorData = await res.json();
      } catch {
        errorData = await res.text();
      }
      const message =
        typeof errorData === 'object' && errorData !== null && 'detail' in errorData
          ? String((errorData as { detail: unknown }).detail)
          : `HTTP error ${res.status}: ${res.statusText}`;
      throw new ApiError(message, res.status, errorData);
    }

    return (await res.json()) as T;
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : 'Network request failed. Is the backend running on port 8000?';
    throw new ApiError(message, 0, error);
  }
}

export const api = {
  investigateSupport: (payload: SupportRequest): Promise<SupportResponse> => {
    return request<SupportResponse>('/support/investigate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getEscalations: (): Promise<EscalationListResponse> => {
    return request<EscalationListResponse>('/support/escalations');
  },

  getEscalationDetail: (ticketId: string): Promise<EscalationTicket> => {
    return request<EscalationTicket>(`/support/escalations/${encodeURIComponent(ticketId)}`);
  },

  getServiceInfo: (): Promise<ServiceInfo> => {
    return request<ServiceInfo>('/service-info');
  },

  getHealth: (): Promise<HealthInfo> => {
    return request<HealthInfo>('/health');
  },
};

