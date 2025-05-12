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
  private connectionAttemptTimeout: number | null = null;
  private maxTimeoutAttempts: number = 3;
  private timeoutAttempts: number = 0;

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
      this.invokeStatusCallbacks('connecting');
      
      // Try each URL in the list until one works
      this.tryNextUrl(allWebSocketUrls, 0, resolve, reject);
    });
  }

  private tryNextUrl(urls: string[], index: number, resolve: (value: void) => void, reject: (reason?: any) => void): void {
    if (index >= urls.length) {
      // We've tried all URLs and none worked
      this.connecting = false;
      const error = new Error("Failed to connect to any WebSocket endpoint");
      this.logger.error('All connection attempts failed', error);
      this.invokeStatusCallbacks('error', error);
      reject(error);
      return;
    }

    const url = urls[index];
    if (!url) {
      // Skip undefined/empty URLs
      this.tryNextUrl(urls, index + 1, resolve, reject);
      return;
    }

    this.lastConnectionUrl = url;
    this.logger.info(`Attempting to connect to WebSocket: ${url}`);
    
    try {
      this.ws = new WebSocket(url);
    } catch (error) {
      // Move to the next URL if we can't even create the WebSocket
      this.logger.error(`Failed to create WebSocket for ${url}`, error);
      this.tryNextUrl(urls, index + 1, resolve, reject);
      return;
    }

    // Set a timeout to catch stalled connection attempts
    if (this.connectionAttemptTimeout) {
      clearTimeout(this.connectionAttemptTimeout);
    }
    
    this.connectionAttemptTimeout = window.setTimeout(() => {
      this.timeoutAttempts++;
      if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
        this.logger.warn(`Connection attempt to ${url} timed out`);
        if (this.timeoutAttempts >= this.maxTimeoutAttempts) {
          this.logger.error('Max timeout attempts reached, stopping connection attempts');
          this.connecting = false;
          reject(new Error("Connection attempts timed out"));
          return;
        }
        // Try next URL
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        this.tryNextUrl(urls, index + 1, resolve, reject);
      }
    }, 5000);

    this.ws.onopen = () => {
      if (this.connectionAttemptTimeout) {
        clearTimeout(this.connectionAttemptTimeout);
        this.connectionAttemptTimeout = null;
      }
      
      this.connected = true;
      this.connecting = false;
      this.reconnectAttempts = 0; // Reset reconnection attempts
      this.reconnectInterval = 3000; // Reset reconnect interval
      this.timeoutAttempts = 0; // Reset timeout attempts
      
      this.logger.info(`WebSocket connected to ${url}`);
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
      if (this.connectionAttemptTimeout) {
        clearTimeout(this.connectionAttemptTimeout);
        this.connectionAttemptTimeout = null;
      }
      
      // If we were still trying to connect, try the next URL
      if (this.connecting) {
        this.logger.warn(`Connection to ${url} closed during connection attempt: ${event.code}`);
        this.tryNextUrl(urls, index + 1, resolve, reject);
        return;
      }
      
      this.connecting = false;
      this.connected = false;
      this.logger.warn(`WebSocket disconnected ${event.code} ${event.reason}`);
      this.invokeStatusCallbacks('disconnected', { code: event.code, reason: event.reason });
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      this.logger.error(`WebSocket error with ${url}:`, error);
      
      // If we're still in the connecting phase, try the next URL
      if (this.connecting && !this.connected) {
        if (this.connectionAttemptTimeout) {
          clearTimeout(this.connectionAttemptTimeout);
          this.connectionAttemptTimeout = null;
        }
        
        // Close the errored connection
        if (this.ws) {
          try {
            this.ws.close();
          } catch (e) {
            // Ignore errors during close
          }
          this.ws = null;
        }
        
        this.invokeStatusCallbacks('error', error);
        this.tryNextUrl(urls, index + 1, resolve, reject);
      } else {
        // We were already connected but got an error
        this.connecting = false;
        this.connected = false;
        this.invokeStatusCallbacks('error', error);
        reject(error);
      }
    };
  }

  public disconnect(): void {
    if (this.connectionAttemptTimeout) {
      clearTimeout(this.connectionAttemptTimeout);
      this.connectionAttemptTimeout = null;
    }
    
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // Ignore errors during close
      }
      this.ws = null;
      this.connected = false;
      this.connecting = false;
      this.logger.info('WebSocket disconnected');
      this.invokeStatusCallbacks('disconnected');
    }
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

// Create multiple potential WebSocket URLs to try
function getWebSocketUrls(): string[] {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  
  // Try different combinations of host/port/path
  return [
    // First try the environment variable if available
    import.meta.env.VITE_WEBSOCKET_URL,
    // Try with explicit path and specified port
    `${protocol}//${hostname}:8080/gstreamer`,
    // Try without path
    `${protocol}//${hostname}:8080`,
    // Try IP address with explicit port
    `${protocol}//127.0.0.1:8080/gstreamer`,
    // Try localhost with explicit port
    `${protocol}//localhost:8080/gstreamer`,
    // Try with the same port as the frontend
    `${protocol}//${hostname}:${port}/gstreamer`,
    // Try with IP and same port as frontend
    `${protocol}//127.0.0.1:${port}/gstreamer`,
    // Try with localhost and same port as frontend
    `${protocol}//localhost:${port}/gstreamer`,
  ].filter(Boolean) as string[]; // Filter out undefined/null values
}

// Export a websocket client with our primary URL
export const wsClient = new WebSocketClient(
  getWebSocketUrls()[0] || `ws://localhost:8080/gstreamer`,
  new Logger('WebSocketClient')
);

// Export all potential URLs for debugging
export const allWebSocketUrls = getWebSocketUrls();

export default wsClient;
