import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ServiceInfo } from '../types/support';

export interface BackendStatusState {
  isOnline: boolean;
  isLoading: boolean;
  serviceInfo: ServiceInfo | null;
  error: string | null;
  lastChecked: Date | null;
  refresh: () => Promise<void>;
}

export function useBackendStatus(pollIntervalMs: number = 15000): BackendStatusState {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      // First try root endpoint for metadata
      let info: ServiceInfo | null = null;
      try {
        info = await api.getServiceInfo();
      } catch {
        // Fallback to health endpoint if root doesn't return full service info
        await api.getHealth();
      }

      setIsOnline(true);
      setServiceInfo(info);
      setError(null);
    } catch (err) {
      setIsOnline(false);
      setServiceInfo(null);
      setError(err instanceof Error ? err.message : 'Backend unreachable');
    } finally {
      setIsLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    void checkStatus();
    if (pollIntervalMs > 0) {
      const interval = setInterval(() => {
        void checkStatus();
      }, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [checkStatus, pollIntervalMs]);

  return {
    isOnline,
    isLoading,
    serviceInfo,
    error,
    lastChecked,
    refresh: checkStatus,
  };
}

