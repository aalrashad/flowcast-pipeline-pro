
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

/**
 * Check if secure connection is needed based on current protocol
 * @returns boolean indicating if secure connection is required
 */
export function isSecureConnection(): boolean {
  return window.location.protocol === 'https:';
}
