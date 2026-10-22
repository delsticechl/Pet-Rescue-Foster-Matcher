// Real-Time WebSocket Client Service for PawFund
export type WsConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface WsEventPayload<T = any> {
  event: string;
  data: T;
  timestamp: string;
}

export type WsEventListener<T = any> = (payload: WsEventPayload<T>) => void;

class RealtimeWebSocketService {
  private ws: WebSocket | null = null;
  private status: WsConnectionStatus = 'disconnected';
  private listeners: Map<string, Set<WsEventListener>> = new Map();
  private statusListeners: Set<(status: WsConnectionStatus) => void> = new Set();
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private baseReconnectDelay = 1500;
  private pingInterval: any = null;
  private currentUser: { userId?: string; email?: string; role?: string } | null = null;
  private onlineUsersCount = 1;

  constructor() {
    // Lazy connect or connect on browser window load
    if (typeof window !== 'undefined') {
      this.initConnection();
    }
  }

  public getStatus(): WsConnectionStatus {
    return this.status;
  }

  public getOnlineCount(): number {
    return this.onlineUsersCount;
  }

  public setUser(user: { userId?: string; email?: string; role?: string } | null) {
    this.currentUser = user;
    if (this.ws && this.ws.readyState === WebSocket.OPEN && user) {
      this.sendAuth();
    }
  }

  public subscribeStatus(cb: (status: WsConnectionStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  public on<T = any>(event: string, listener: WsEventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  private setStatus(newStatus: WsConnectionStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((cb) => cb(newStatus));
  }

  private initConnection() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }

    this.setStatus('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        if (this.currentUser) {
          this.sendAuth();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed: WsEventPayload = JSON.parse(event.data);

          if (parsed.event === 'connected') {
            if (parsed.data?.onlineUsers) {
              this.onlineUsersCount = parsed.data.onlineUsers;
            }
          }

          if (parsed.event === 'auth:ack') {
            if (parsed.data?.totalOnline) {
              this.onlineUsersCount = parsed.data.totalOnline;
            }
          }

          // Dispatch event to listeners
          const directListeners = this.listeners.get(parsed.event);
          if (directListeners) {
            directListeners.forEach((listener) => {
              try {
                listener(parsed);
              } catch (err) {
                console.error(`Error in listener for event ${parsed.event}:`, err);
              }
            });
          }

          // Also notify wildcard '*' listeners
          const wildcardListeners = this.listeners.get('*');
          if (wildcardListeners) {
            wildcardListeners.forEach((listener) => {
              try {
                listener(parsed);
              } catch (err) {
                console.error('Error in wildcard listener:', err);
              }
            });
          }
        } catch {
          // ignore non-JSON messages
        }
      };

      this.ws.onclose = (event) => {
        this.cleanupHeartbeat();
        this.setStatus('disconnected');
        const reason = event.reason ? ` | Reason: ${event.reason}` : '';
        console.warn(
          `[WS] Connection closed. Code: ${event.code}${reason}. ` +
          `Attempt #${this.reconnectAttempts + 1} reconnect scheduled.`
        );
        this.scheduleReconnect();
      };

      this.ws.onerror = (event) => {
        this.cleanupHeartbeat();
        this.setStatus('disconnected');
        console.error('[WS] Connection error. Will attempt reconnect.', event);
        try {
          this.ws?.close();
        } catch {
          // ignore
        }
      };
    } catch {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private sendAuth() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.currentUser) return;
    try {
      this.ws.send(
        JSON.stringify({
          type: 'auth',
          userId: this.currentUser.userId,
          email: this.currentUser.email,
          role: this.currentUser.role,
        })
      );
    } catch {
      // ignore
    }
  }

  private startHeartbeat() {
    this.cleanupHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // ignore
        }
      }
    }, 25000);
  }

  private cleanupHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      15000
    );
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.initConnection();
    }, delay);
  }

  public manualReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = 0;
    this.initConnection();
  }
}

export const realtimeWs = new RealtimeWebSocketService();
