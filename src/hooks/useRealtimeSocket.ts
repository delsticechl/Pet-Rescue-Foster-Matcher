import { useEffect, useState, useCallback } from 'react';
import {
  realtimeWs,
  WsConnectionStatus,
  WsEventPayload,
  WsEventListener,
} from '../services/websocket';
import { User } from '../types';

export function useRealtimeSocket(currentUser?: User | null) {
  const [status, setStatus] = useState<WsConnectionStatus>(realtimeWs.getStatus());
  const [onlineCount, setOnlineCount] = useState<number>(realtimeWs.getOnlineCount());

  // Bind current user to websocket for personal alerts
  useEffect(() => {
    if (currentUser) {
      realtimeWs.setUser({
        userId: currentUser.userId,
        email: currentUser.email,
        role: currentUser.role,
      });
    } else {
      realtimeWs.setUser(null);
    }
  }, [currentUser]);

  // Subscribe to connection status changes
  useEffect(() => {
    const unsub = realtimeWs.subscribeStatus((newStatus) => {
      setStatus(newStatus);
      setOnlineCount(realtimeWs.getOnlineCount());
    });
    return unsub;
  }, []);

  // Listen to specific WebSocket events with auto-cleanup
  const useEventListener = useCallback(
    <T = any>(event: string, handler: WsEventListener<T>) => {
      useEffect(() => {
        const unsub = realtimeWs.on<T>(event, handler);
        return unsub;
      }, [event, handler]);
    },
    []
  );

  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    onlineCount,
    reconnect: () => realtimeWs.manualReconnect(),
    on: realtimeWs.on.bind(realtimeWs),
    useEventListener,
  };
}
