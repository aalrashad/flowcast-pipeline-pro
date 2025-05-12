
// This file re-exports the websocket client for backward compatibility
import wsClient, { WebSocketClient, allWebSocketUrls, getAllWebSocketUrls } from './websocket/WebSocketClient';

export { WebSocketClient, allWebSocketUrls, getAllWebSocketUrls };
export default wsClient;
