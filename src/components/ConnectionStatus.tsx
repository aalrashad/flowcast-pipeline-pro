
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import wsClient from "@/services/WebSocketClient";
import { Wifi, WifiOff, AlertTriangle, Terminal } from "lucide-react";

export function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'reconnecting'>('connecting');
  const [lastAttempt, setLastAttempt] = useState<Date | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const handleStatus = (connectionStatus: string, error?: any) => {
      if (connectionStatus === 'connected') {
        setStatus('connected');
        setAttempts(0);
        setErrorDetails(null);
      } else if (connectionStatus === 'connecting') {
        setStatus('connecting');
        setLastAttempt(new Date());
      } else if (connectionStatus === 'reconnecting') {
        setStatus('reconnecting');
        setLastAttempt(new Date());
        if (error?.attempt) {
          setAttempts(error.attempt);
        } else {
          setAttempts(prev => prev + 1);
        }
      } else if (connectionStatus === 'error') {
        setStatus('disconnected');
        setLastAttempt(new Date());
        setAttempts(prev => prev + 1);
        // Store error details if available
        if (error?.message) {
          setErrorDetails(error.message);
        } else if (error?.code) {
          setErrorDetails(`Error code: ${error.code}`);
        }
      } else {
        setStatus('disconnected');
        setLastAttempt(new Date());
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
                  <Wifi className="w-3 h-3 animate-pulse" /> Connecting
                </>
              ) : status === 'reconnecting' ? (
                <>
                  <Wifi className="w-3 h-3 animate-pulse" /> Reconnecting
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" /> Disconnected
                </>
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
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
                
                {possiblePortConflict && (
                  <div className="mt-2 border-t border-gray-700 pt-2">
                    <p className="text-yellow-300 flex items-center">
                      <Terminal className="h-3 w-3 mr-1" /> Possible issue detected:
                    </p>
                    <p className="mt-1">The frontend server is running on port 8080, which conflicts with the backend.</p>
                    <p className="mt-1">Try one of these solutions:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Change Vite frontend port: <code className="bg-black/30 px-1 py-0.5 rounded">npm run dev -- --port 3000</code></li>
                      <li>Change the backend port: <code className="bg-black/30 px-1 py-0.5 rounded">GSTREAMER_WS_PORT=8081 ./start_server.sh</code></li>
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ConnectionStatus;
