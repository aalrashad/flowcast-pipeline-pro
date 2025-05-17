
/**
 * Creates multiple potential WebSocket URLs to try for connection
 * @returns Array of WebSocket URLs to attempt connection with
 */
export function getWebSocketUrls(): string[] {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  
  // Try different combinations of host/port/path
  return [
    // First try the environment variable if available
    import.meta.env.VITE_WEBSOCKET_URL,
    // Try with explicit path - this is the most likely to work
    `${protocol}//${hostname}:8080/gstreamer`,
    // Try without path as fallback
    `${protocol}//${hostname}:8080`,
    // Try localhost with path
    `ws://localhost:8080/gstreamer`,
    // Try 127.0.0.1 with path
    `ws://127.0.0.1:8080/gstreamer`,
  ].filter(Boolean) as string[]; // Filter out undefined/null values
}

/**
 * Check if secure connection is needed based on current protocol
 * @returns boolean indicating if secure connection is required
 */
export function isSecureConnection(): boolean {
  return window.location.protocol === 'https:';
}
