
import { Logger } from '../../utils/Logger';

/**
 * Callback for receiving websocket status updates
 */
export type StatusCallback = (status: string, error?: any) => void;

/**
 * Callback for receiving websocket messages
 */
export type MessageCallback = (data: any) => void;

/**
 * Interface for WebSocket client configuration
 */
export interface WebSocketClientConfig {
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  maxTimeoutAttempts?: number;
  connectionTimeout?: number;
}

/**
 * Connection status types
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
