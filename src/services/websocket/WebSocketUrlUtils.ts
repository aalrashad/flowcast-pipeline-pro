/**
 * Creates multiple potential WebSocket URLs to try for connection
 * @returns Array of WebSocket URLs to attempt connection with
 */
export function getWebSocketUrls(): string[] {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const port = '8080'; // Fixed port for backend
  
  // Try different combinations of host/port/path
  return [
    // First try the environment variable if available
    import.meta.env.VITE_WEBSOCKET_URL,
    // Try with explicit path - this is the most likely to work
    `${protocol}//${hostname}:${port}/gstreamer`,
    // Try localhost with path (important for development)
    `ws://localhost:${port}/gstreamer`,
    // Try 127.0.0.1 with path (fallback for localhost)
    `ws://127.0.0.1:${port}/gstreamer`,
    // Try without path as fallback
    `${protocol}//${hostname}:${port}`,
    // Try localhost without path
    `ws://localhost:${port}`,
    // Try 127.0.0.1 without path
    `ws://127.0.0.1:${port}`,
  ].filter(Boolean) as string[]; // Filter out undefined/null values
}

/**
 * Check if secure connection is needed based on current protocol
 * @returns boolean indicating if secure connection is required
 */
export function isSecureConnection(): boolean {
  return window.location.protocol === 'https:';
}

/**
 * Get the most likely WebSocket URL based on the current environment
 * This is useful for display purposes or when a single URL is needed
 * @returns The most likely WebSocket URL to work
 */
export function getPrimaryWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const port = '8080';
  
  // If env variable is set, use it
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    return import.meta.env.VITE_WEBSOCKET_URL;
  }
  
  // Otherwise use current hostname with explicit path
  return `${protocol}//${hostname}:${port}/gstreamer`;
}
