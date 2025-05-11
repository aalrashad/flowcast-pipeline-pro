
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
        
        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.notifyStatusChange('connected');
          resolve();
        };
        
        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected', event.code, event.reason);
          this.notifyStatusChange('disconnected');
          
          // Attempt to reconnect if not intentionally closed
          if (event.code !== 1000 && !this.isReconnecting) {
            this.scheduleReconnect();
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error', error);
          this.notifyStatusChange('error', new Error('WebSocket connection error'));
          reject(error);
        };
        
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
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
  
  // Send message to WebSocket server
  send(type: string, payload: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }
    
    try {
      const message = JSON.stringify({
        type,
        payload,
        id: this.generateMessageId(),
        timestamp: Date.now()
      });
      
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message', error);
      return false;
    }
  }
  
  // Close WebSocket connection
  disconnect(): void {
    this.isReconnecting = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
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
  
  // Private: Handle incoming WebSocket messages
  private handleMessage(data: any): void {
    if (!data || !data.type) {
      console.warn('Invalid WebSocket message format', data);
      return;
    }
    
    const handlers = this.messageHandlers.get(data.type) || [];
    handlers.forEach(handler => {
      try {
        handler(data.payload);
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
}

// Create a singleton instance with default server URL
// In a real application, this would be configured from environment
const WEBSOCKET_URL = 'ws://localhost:8080/gstreamer';
export const wsClient = new WebSocketClient(WEBSOCKET_URL);

export default wsClient;
