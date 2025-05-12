
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
  private lastConnectionUrl: string = ""; // Store the last URL we tried to connect to

  constructor(url: string, logger: Logger) {
    this.url = url;
    this.logger = logger;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        this.logger.info('WebSocket already connected');
        resolve();
        return;
      }
      
      if (this.connecting) {
        this.logger.info('WebSocket connection already in progress');
        resolve();
        return;
      }
      
      this.connecting = true;
      
      // Determine if we need to use secure WebSocket based on the current protocol
      let wsUrl = this.url;
      if (window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
        // Convert ws:// to wss:// when on https
        wsUrl = wsUrl.replace('ws://', 'wss://');
        this.logger.info('Using secure WebSocket connection');
      }
      
      // Store the URL we're connecting to for debugging
      this.lastConnectionUrl = wsUrl;
      
      try {
        this.ws = new WebSocket(wsUrl);
      } catch (error) {
        this.connecting = false;
        this.logger.error('Failed to create WebSocket', error);
        this.invokeStatusCallbacks('error', error);
        reject(error);
        return;
      }

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
        // Don't reconnect here, let onclose handle it
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
    this.invokeStatusCallbacks('reconnecting', { attempt: this.reconnectAttempts, delay: this.reconnectInterval });
    
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
    
    // Immediately call with current status if available
    if (this.connected) {
      try {
        callback('connected');
      } catch (error) {
        this.logger.error('Error in status callback', error);
      }
    } else if (this.connecting) {
      try {
        callback('connecting');
      } catch (error) {
        this.logger.error('Error in status callback', error);
      }
    } else {
      try {
        callback('disconnected');
      } catch (error) {
        this.logger.error('Error in status callback', error);
      }
    }
    
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  private invokeStatusCallbacks(status: string, error?: any): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status, error);
      } catch (err) {
        this.logger.error('Error in status callback', err);
      }
    });
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
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.logger.error('Error in message callback', error);
        }
      });
    }
  }

  // Add a method to get the current connection status
  public getConnectionStatus(): string {
    return this.connected ? 'connected' : (this.connecting ? 'connecting' : 'disconnected');
  }
  
  // Get the last URL we tried to connect to for debugging
  public getDebugConnectionUrl(): string {
    return this.lastConnectionUrl || this.url;
  }

  // Add method to check if secure connection is needed
  private isSecureConnection(): boolean {
    return window.location.protocol === 'https:';
  }
  
  // Get the number of reconnection attempts
  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

// Update WebSocket URL to make it more flexible with fallbacks and secure connections
export const wsClient = new WebSocketClient(
  // Try to use the environment variable first
  import.meta.env.VITE_WEBSOCKET_URL || 
  // Default to backend running on port 8080, regardless of the frontend port
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8080`,
  new Logger('WebSocketClient')
);

export default wsClient;
