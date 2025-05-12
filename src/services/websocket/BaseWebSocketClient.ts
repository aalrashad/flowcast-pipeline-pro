
import { Logger } from '../../utils/Logger';
import { MessageCallback, StatusCallback, WebSocketClientConfig } from './WebSocketTypes';

/**
 * Base WebSocket client with core functionality
 */
export class BaseWebSocketClient {
  protected ws: WebSocket | null = null;
  protected url: string;
  protected logger: Logger;
  protected statusCallbacks: StatusCallback[] = [];
  protected messageCallbacks: { [key: string]: MessageCallback[] } = {};
  protected connected: boolean = false;
  protected connecting: boolean = false;
  
  // Reconnection properties
  protected reconnectInterval: number = 3000; // Initial reconnect interval
  protected maxReconnectInterval: number = 60000; // Maximum reconnect interval
  protected reconnectAttempts: number = 0; // Number of reconnection attempts
  protected reconnectTimeoutId: number | null = null;
  
  // Connection attempt properties
  protected lastConnectionUrl: string = ""; // Store the last URL we tried to connect to
  protected connectionAttemptTimeout: number | null = null;
  protected maxTimeoutAttempts: number = 3;
  protected timeoutAttempts: number = 0;

  constructor(url: string, logger: Logger, config?: WebSocketClientConfig) {
    this.url = url;
    this.logger = logger;
    
    // Apply configuration if provided
    if (config) {
      this.reconnectInterval = config.reconnectInterval ?? this.reconnectInterval;
      this.maxReconnectInterval = config.maxReconnectInterval ?? this.maxReconnectInterval;
      this.maxTimeoutAttempts = config.maxTimeoutAttempts ?? this.maxTimeoutAttempts;
    }
  }

  /**
   * Register a status callback
   * @param callback Function to call when status changes
   * @returns Unsubscribe function
   */
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

  /**
   * Register a message callback for a specific message type
   * @param type Message type to listen for
   * @param callback Function to call when message is received
   * @returns Unsubscribe function
   */
  public on(type: string, callback: MessageCallback): () => void {
    if (!this.messageCallbacks[type]) {
      this.messageCallbacks[type] = [];
    }
    this.messageCallbacks[type].push(callback);
    return () => {
      this.messageCallbacks[type] = this.messageCallbacks[type].filter(cb => cb !== callback);
    };
  }

  /**
   * Invoke all registered status callbacks
   * @param status Status to send
   * @param error Optional error object
   */
  protected invokeStatusCallbacks(status: string, error?: any): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status, error);
      } catch (err) {
        this.logger.error('Error in status callback', err);
      }
    });
  }

  /**
   * Invoke all registered message callbacks for a specific message type
   * @param type Message type
   * @param data Message data
   */
  protected invokeMessageCallbacks(type: string, data: any): void {
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

  /**
   * Get connection status
   * @returns Current connection status
   */
  public getConnectionStatus(): string {
    return this.connected ? 'connected' : (this.connecting ? 'connecting' : 'disconnected');
  }
  
  /**
   * Get the last URL we tried to connect to for debugging
   * @returns Last connection URL
   */
  public getDebugConnectionUrl(): string {
    return this.lastConnectionUrl || this.url;
  }
  
  /**
   * Get the number of reconnection attempts
   * @returns Number of reconnection attempts
   */
  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}
