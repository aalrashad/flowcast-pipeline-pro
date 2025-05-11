
/**
 * WebSocket client for GStreamer backend communication
 */

type WebSocketMessageCallback = (data: any) => void;
type WebSocketStatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error', error?: Error) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private messageHandlers: Map<string, WebSocketMessageCallback[]> = new Map();
  private statusCallbacks: WebSocketStatusCallback[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 2000;
  private reconnectTimer: number | null = null;
  private isReconnecting: boolean = false;
  private messageQueue: Array<{ type: string, payload: any, messageId?: string }> = [];
  private connectionTimeout: number = 10000; // 10 seconds
  private connectionTimeoutTimer: number | null = null;
  private pingInterval: number | null = null;
  private lastPongTime: number = 0;
  private pingTimeoutMs: number = 15000; // 15 seconds
  
  constructor(url: string) {
    this.url = url;
  }
  
  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Close existing connection if any
        if (this.socket) {
          this.socket.close();
        }
        
        this.socket = new WebSocket(this.url);
        
        // Set connection timeout
        this.connectionTimeoutTimer = window.setTimeout(() => {
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket connection timeout');
            this.socket.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, this.connectionTimeout);
        
        this.socket.onopen = () => {
          console.log('WebSocket connected');
          
          // Clear connection timeout
          if (this.connectionTimeoutTimer) {
            clearTimeout(this.connectionTimeoutTimer);
            this.connectionTimeoutTimer = null;
          }
          
          this.reconnectAttempts = 0;
          this.notifyStatusChange('connected');
          
          // Start ping interval
          this.lastPongTime = Date.now();
          this.startPingInterval();
          
          // Send any queued messages
          this.flushMessageQueue();
          
          resolve();
        };
        
        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected', event.code, event.reason);
          
          // Clear connection timeout if it's still active
          if (this.connectionTimeoutTimer) {
            clearTimeout(this.connectionTimeoutTimer);
            this.connectionTimeoutTimer = null;
          }
          
          // Clear ping interval
          this.stopPingInterval();
          
          this.notifyStatusChange('disconnected');
          
          // Attempt to reconnect if not intentionally closed
          if (event.code !== 1000 && !this.isReconnecting) {
            this.scheduleReconnect();
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error', error);
          
          // Clear connection timeout if it's still active
          if (this.connectionTimeoutTimer) {
            clearTimeout(this.connectionTimeoutTimer);
            this.connectionTimeoutTimer = null;
          }
          
          this.notifyStatusChange('error', new Error('WebSocket connection error'));
          reject(error);
        };
        
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle pong message
            if (data.type === 'pong') {
              this.lastPongTime = Date.now();
              return;
            }
            
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message', error);
          }
        };
        
        this.notifyStatusChange('connecting');
      } catch (error) {
        console.error('Failed to create WebSocket connection', error);
        this.notifyStatusChange('error', error as Error);
        reject(error);
      }
    });
  }
  
  // Start ping interval to detect connection issues
  private startPingInterval(): void {
    this.stopPingInterval();
    
    this.pingInterval = window.setInterval(() => {
      // Send ping message
      if (this.isConnected()) {
        this.send('ping', { timestamp: Date.now() });
        
        // Check if we've received a pong recently
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > this.pingTimeoutMs) {
          console.warn(`No pong received for ${timeSinceLastPong}ms, connection may be dead`);
          // Force close the connection so reconnection logic kicks in
          if (this.socket) {
            this.socket.close();
          }
        }
      }
    }, 5000);
  }
  
  // Stop ping interval
  private stopPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  // Send message to WebSocket server with promise for response
  sendWithResponse(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      
      // Create temporary handler for this message
      const responseHandler = (data: any) => {
        if (data.responseTo === messageId) {
          // Remove the temporary handler
          this.off('response', responseHandler);
          
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        }
      };
      
      // Register temporary handler
      this.on('response', responseHandler);
      
      // Send the message with ID
      const success = this.send(type, payload, messageId);
      
      if (!success) {
        // Clean up handler
        this.off('response', responseHandler);
        reject(new Error('Failed to send WebSocket message'));
      }
      
      // Set timeout for response
      setTimeout(() => {
        this.off('response', responseHandler);
        reject(new Error('WebSocket response timeout'));
      }, 10000); // 10 second timeout
    });
  }
  
  // Send message to WebSocket server
  send(type: string, payload: any, messageId?: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, queuing message');
      this.messageQueue.push({ type, payload, messageId });
      return false;
    }
    
    try {
      const message = JSON.stringify({
        type,
        payload,
        id: messageId || this.generateMessageId(),
        timestamp: Date.now()
      });
      
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message', error);
      return false;
    }
  }
  
  // Process queued messages
  private flushMessageQueue(): void {
    if (this.messageQueue.length > 0) {
      console.log(`Sending ${this.messageQueue.length} queued messages`);
      
      // Create a copy of the queue and clear the original
      const queueCopy = [...this.messageQueue];
      this.messageQueue = [];
      
      // Attempt to send each message
      queueCopy.forEach(msg => {
        this.send(msg.type, msg.payload, msg.messageId);
      });
    }
  }
  
  // Close WebSocket connection
  disconnect(): void {
    this.isReconnecting = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }
    
    this.stopPingInterval();
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnected');
      this.socket = null;
    }
  }
  
  // Register message handler
  on(messageType: string, callback: WebSocketMessageCallback): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    
    this.messageHandlers.get(messageType)?.push(callback);
  }
  
  // Remove message handler
  off(messageType: string, callback: WebSocketMessageCallback): void {
    if (!this.messageHandlers.has(messageType)) {
      return;
    }
    
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  // Register connection status handler
  onStatus(callback: WebSocketStatusCallback): void {
    this.statusCallbacks.push(callback);
    
    // Immediately notify of current status if connected
    if (this.socket) {
      const status = this.isConnected() ? 'connected' : 'disconnected';
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status callback', error);
      }
    }
  }
  
  // Remove connection status handler
  offStatus(callback: WebSocketStatusCallback): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index !== -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }
  
  // Check if WebSocket is connected
  isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }
  
  // Get current WebSocket status
  getStatus(): 'connecting' | 'connected' | 'disconnected' | 'closing' {
    if (!this.socket) return 'disconnected';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED:
      default: return 'disconnected';
    }
  }
  
  // Private: Handle incoming WebSocket messages
  private handleMessage(data: any): void {
    if (!data || !data.type) {
      console.warn('Invalid WebSocket message format', data);
      return;
    }
    
    const handlers = this.messageHandlers.get(data.type) || [];
    handlers.forEach(handler => {
      try {
        handler(data.payload || data);
      } catch (error) {
        console.error('Error in WebSocket message handler', error);
      }
    });
  }
  
  // Private: Notify status change to all listeners
  private notifyStatusChange(status: 'connecting' | 'connected' | 'disconnected' | 'error', error?: Error): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status, error);
      } catch (callbackError) {
        console.error('Error in WebSocket status callback', callbackError);
      }
    });
  }
  
  // Private: Schedule reconnection
  private scheduleReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached or already reconnecting');
      return;
    }
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = window.setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.isReconnecting = false;
      this.connect().catch(() => {
        // Error handling is done in connect() method
      });
    }, delay);
  }
  
  // Private: Generate unique message ID
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  
  // Configure reconnection settings
  configureReconnect(maxAttempts: number, baseDelay: number): void {
    this.maxReconnectAttempts = maxAttempts;
    this.reconnectDelay = baseDelay;
  }
  
  // Get the number of queued messages
  getQueueLength(): number {
    return this.messageQueue.length;
  }
  
  // Get reconnection attempt count
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

// Create a singleton instance with default server URL
// Use environment variable if available, otherwise use default
const WEBSOCKET_URL = import.meta.env.VITE_GSTREAMER_WS_URL || 'ws://localhost:8080/gstreamer';
export const wsClient = new WebSocketClient(WEBSOCKET_URL);

export default wsClient;
