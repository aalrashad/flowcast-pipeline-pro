
/**
 * Creates multiple potential WebSocket URLs to try for connection
 * @returns Array of WebSocket URLs to attempt connection with
 */
export function getWebSocketUrls(): string[] {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  
  // Try different combinations of host/port/path
  return [
    // First try the environment variable if available
    import.meta.env.VITE_WEBSOCKET_URL,
    // Try explicit hostname with port 8080
    `${protocol}//${hostname}:8080/gstreamer`,
    // Try without path
    `${protocol}//${hostname}:8080`,
    // Try with IP address with fixed port
    `ws://127.0.0.1:8080/gstreamer`,
    // Try with localhost with fixed port
    `ws://localhost:8080/gstreamer`,
    // Try with the same port as the frontend as fallback
    `${protocol}//${hostname}:${port}/gstreamer`,
  ].filter(Boolean) as string[]; // Filter out undefined/null values
}

/**
 * Check if secure connection is needed based on current protocol
 * @returns boolean indicating if secure connection is required
 */
export function isSecureConnection(): boolean {
  return window.location.protocol === 'https:';
}
