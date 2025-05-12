
import { Logger } from '../../utils/Logger';
import { BaseWebSocketClient } from './BaseWebSocketClient';
import { WebSocketClientConfig } from './WebSocketTypes';
import { getWebSocketUrls } from './WebSocketUrlUtils';

/**
 * WebSocket client with reconnection and multiple URL support
 */
export class WebSocketClient extends BaseWebSocketClient {
  /**
   * Create a WebSocket connection
   * @returns Promise that resolves when connected
   */
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
      this.tryNextUrl(getAllWebSocketUrls(), 0, resolve, reject);
    });
  }

  /**
   * Try to connect to next URL in the list
   * @param urls List of URLs to try
   * @param index Current index
   * @param resolve Promise resolve function
   * @param reject Promise reject function
   */
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

  /**
   * Attempt to reconnect with exponential backoff
   */
  private reconnect(): void {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    // Increment reconnection attempts and adjust interval
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(1.5, Math.min(this.reconnectAttempts, 10) - 1), this.maxReconnectInterval);
    
    this.logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    this.invokeStatusCallbacks('reconnecting', { attempt: this.reconnectAttempts });
    
    // Schedule the reconnection attempt
    this.reconnectTimeoutId = window.setTimeout(() => {
      this.logger.info(`Attempting to reconnect (attempt ${this.reconnectAttempts})`);
      this.connect().catch(error => {
        this.logger.error(`Reconnection attempt ${this.reconnectAttempts} failed`, error);
      });
    }, delay);
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.connectionAttemptTimeout) {
      clearTimeout(this.connectionAttemptTimeout);
      this.connectionAttemptTimeout = null;
    }
    
    // Clear any reconnect timeout
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
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

  /**
   * Send a message through the WebSocket
   * @param type Message type
   * @param payload Message payload
   * @returns true if sent successfully, false otherwise
   */
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
}

// Create multiple potential WebSocket URLs to try
export function getAllWebSocketUrls(): string[] {
  return getWebSocketUrls();
}

// Export a singleton instance with our primary URL
export const wsClient = new WebSocketClient(
  getAllWebSocketUrls()[0] || `ws://localhost:8080/gstreamer`,
  new Logger('WebSocketClient')
);

// Export all potential URLs for debugging
export const allWebSocketUrls = getAllWebSocketUrls();

export default wsClient;
