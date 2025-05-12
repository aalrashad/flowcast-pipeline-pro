
import { Logger } from '../utils/Logger';

type StatusCallback = (status: string, error?: any) => void;
type MessageCallback = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private logger: Logger;
  private statusCallbacks: StatusCallback[] = [];
  private messageCallbacks: { [key: string]: MessageCallback[] } = {};
  private connected: boolean = false;
  private connecting: boolean = false;
  private reconnectInterval: number = 3000; // Initial reconnect interval
  private maxReconnectInterval: number = 60000; // Maximum reconnect interval
  private reconnectAttempts: number = 0; // Number of reconnection attempts

  constructor(url: string, logger: Logger) {
    this.url = url;
    this.logger = logger;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connecting = true;
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.connected = true;
        this.connecting = false;
        this.reconnectAttempts = 0; // Reset reconnection attempts on successful connection
        this.reconnectInterval = 3000; // Reset reconnect interval on successful connection
        this.logger.info('WebSocket connected');
        this.invokeStatusCallbacks('connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.logger.debug('Received message:', data);
          this.invokeMessageCallbacks(data.type, data.payload);
        } catch (error) {
          this.logger.error('Failed to parse message:', error);
        }
      };

      this.ws.onclose = (event) => {
        this.connecting = false;
        this.connected = false;
        this.logger.warn('WebSocket disconnected', event.code, event.reason);
        this.invokeStatusCallbacks('disconnected', { code: event.code, reason: event.reason });
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        this.connecting = false;
        this.connected = false;
        this.logger.error('WebSocket error:', error);
        this.invokeStatusCallbacks('error', error);
        reject(error);
        this.reconnect();
      };
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
      this.connecting = false;
      this.logger.info('WebSocket disconnected');
      this.invokeStatusCallbacks('disconnected');
    }
  }

  private reconnect(): void {
    if (this.connecting) {
      this.logger.info('Already attempting to connect, skipping reconnect');
      return;
    }

    // Increase the reconnection attempts
    this.reconnectAttempts++;

    // Increase the reconnect interval, but not beyond the maximum
    this.reconnectInterval = Math.min(this.reconnectInterval * 1.5, this.maxReconnectInterval);

    this.logger.info(`Attempting to reconnect in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);
    this.connecting = true;
    setTimeout(() => {
      this.connect()
        .catch(() => {
          // If connect fails, it will automatically try to reconnect
          this.connecting = false;
          this.connected = false;
        });
    }, this.reconnectInterval);
  }

  public send(type: string, payload: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload });
      this.ws.send(message);
      this.logger.debug('Sent message:', message);
      return true;
    } else {
      this.logger.warn('WebSocket not connected, message not sent', type, payload);
      return false;
    }
  }

  public onStatus(callback: StatusCallback): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  private invokeStatusCallbacks(status: string, error?: any): void {
    this.statusCallbacks.forEach(callback => callback(status, error));
  }

  public on(type: string, callback: MessageCallback): () => void {
    if (!this.messageCallbacks[type]) {
      this.messageCallbacks[type] = [];
    }
    this.messageCallbacks[type].push(callback);
    return () => {
      this.messageCallbacks[type] = this.messageCallbacks[type].filter(cb => cb !== callback);
    };
  }

  private invokeMessageCallbacks(type: string, data: any): void {
    const callbacks = this.messageCallbacks[type];
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Add a method to get the current connection status
  public getConnectionStatus(): string {
    return this.connected ? 'connected' : (this.connecting ? 'connecting' : 'disconnected');
  }
}

export const wsClient = new WebSocketClient(
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080',
  new Logger('WebSocketClient')
);

export default wsClient;
