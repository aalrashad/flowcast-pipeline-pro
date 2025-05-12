import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import wsClient, { allWebSocketUrls } from "@/services/websocket/WebSocketClient";
import { Wifi, WifiOff, AlertTriangle, Terminal, Loader2 } from "lucide-react";

export function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'reconnecting'>('connecting');
  const [lastAttempt, setLastAttempt] = useState<Date | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>(wsClient.getDebugConnectionUrl());

  useEffect(() => {
    const handleStatus = (connectionStatus: string, error?: any) => {
      if (connectionStatus === 'connected') {
        setStatus('connected');
        setAttempts(0);
        setErrorDetails(null);
        setCurrentUrl(wsClient.getDebugConnectionUrl());
      } else if (connectionStatus === 'connecting') {
        setStatus('connecting');
        setLastAttempt(new Date());
        setCurrentUrl(wsClient.getDebugConnectionUrl());
      } else if (connectionStatus === 'reconnecting') {
        setStatus('reconnecting');
        setLastAttempt(new Date());
        setCurrentUrl(wsClient.getDebugConnectionUrl());
        if (error?.attempt) {
          setAttempts(error.attempt);
        } else {
          setAttempts(prev => prev + 1);
        }
      } else if (connectionStatus === 'error') {
        setStatus('disconnected');
        setLastAttempt(new Date());
        setAttempts(prev => prev + 1);
        setCurrentUrl(wsClient.getDebugConnectionUrl());
        
        // Store error details if available
        if (error?.message) {
          setErrorDetails(error.message);
        } else if (error?.code) {
          setErrorDetails(`Error code: ${error.code}`);
        }
      } else {
        setStatus('disconnected');
        setLastAttempt(new Date());
        setCurrentUrl(wsClient.getDebugConnectionUrl());
        
        // For close events, show the close code
        if (error?.code) {
          setErrorDetails(`Close code: ${error.code}`);
        }
      }
    };

    // Subscribe to WebSocket status updates
    const unsubscribe = wsClient.onStatus(handleStatus);

    // Initialize attempts from WebSocket client
    setAttempts(wsClient.getReconnectAttempts());
    
    // Update current URL
    setCurrentUrl(wsClient.getDebugConnectionUrl());

    return () => {
      unsubscribe();
    };
  }, []);

  // Check if there might be a port conflict
  const possiblePortConflict = status === 'disconnected' && 
    (errorDetails?.includes('1006') || !errorDetails);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            <Badge 
              variant={status === 'connected' ? 'success' : status === 'connecting' || status === 'reconnecting' ? 'warning' : 'destructive'}
              className={`cursor-pointer flex items-center gap-1 h-6 ${
                status === 'connected' ? 'bg-green-700 hover:bg-green-800' : 
                status === 'connecting' ? 'bg-yellow-600 hover:bg-yellow-700' : 
                status === 'reconnecting' ? 'bg-orange-600 hover:bg-orange-700' : 
                'bg-red-700 hover:bg-red-800'
              }`}
            >
              {status === 'connected' ? (
                <>
                  <Wifi className="w-3 h-3" /> Connected
                </>
              ) : status === 'connecting' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Connecting
                </>
              ) : status === 'reconnecting' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Reconnecting
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" /> Disconnected
                </>
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent className="w-80 max-w-[90vw]">
          <div className="text-xs">
            <p>Backend connection: <strong>{status}</strong></p>
            {status !== 'connected' && (
              <>
                <p>Reconnection attempts: {attempts}</p>
                {lastAttempt && (
                  <p>Last attempt: {lastAttempt.toLocaleTimeString()}</p>
                )}
                {errorDetails && (
                  <p className="text-red-300 flex items-center mt-1">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {errorDetails}
                  </p>
                )}
                <p className="mt-1">Check if the backend server is running.</p>
                
                <div className="mt-2 border-t border-gray-700 pt-2">
                  <p className="text-yellow-300 flex items-center">
                    <Terminal className="h-3 w-3 mr-1" /> Connection Info:
                  </p>
                  <p className="mt-1">Backend should be running on port 8080 and listening on all interfaces (0.0.0.0).</p>
                  <p className="mt-1">Current URL: <code className="bg-black/30 px-1 py-0.5 rounded">{currentUrl}</code></p>
                  <p className="mt-1">Common issues:</p>
                  <ul className="list-disc ml-5 mt-1">
                    <li>Backend server not running</li>
                    <li>Backend server not listening on all interfaces (0.0.0.0)</li>
                    <li>Firewall blocking connections</li>
                    <li>WebSocket server on a different port</li>
                  </ul>
                  <p className="mt-1">Try running:</p>
                  <pre className="bg-black/30 px-2 py-1 rounded mt-1 overflow-x-auto">GSTREAMER_WS_HOST=0.0.0.0 python server.py</pre>
                  <p className="mt-1">Or use the start script with the recreate option:</p>
                  <pre className="bg-black/30 px-2 py-1 rounded mt-1 overflow-x-auto">./start_server.sh --recreate-venv</pre>
                </div>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ConnectionStatus;
