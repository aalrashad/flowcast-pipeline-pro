
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import wsClient from "@/services/WebSocketClient";
import { Wifi, WifiOff } from "lucide-react";

export function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [lastAttempt, setLastAttempt] = useState<Date | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const handleStatus = (connectionStatus: string) => {
      if (connectionStatus === 'connected') {
        setStatus('connected');
        setAttempts(0);
      } else if (connectionStatus === 'connecting') {
        setStatus('connecting');
        setLastAttempt(new Date());
        setAttempts(prev => prev + 1);
      } else {
        setStatus('disconnected');
      }
    };

    // Subscribe to WebSocket status updates
    const unsubscribe = wsClient.onStatus(handleStatus);

    // Ping connection status on mount
    wsClient.getConnectionStatus();

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            <Badge 
              variant={status === 'connected' ? 'success' : status === 'connecting' ? 'warning' : 'destructive'}
              className={`cursor-pointer flex items-center gap-1 h-6 ${
                status === 'connected' ? 'bg-green-700 hover:bg-green-800' : 
                status === 'connecting' ? 'bg-yellow-600 hover:bg-yellow-700' : 
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
            {status === 'disconnected' && (
              <>
                <p>Reconnection attempts: {attempts}</p>
                {lastAttempt && (
                  <p>Last attempt: {lastAttempt.toLocaleTimeString()}</p>
                )}
                <p>Check if the backend server is running.</p>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ConnectionStatus;
