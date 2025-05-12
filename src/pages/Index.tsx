
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import FlowCanvas from "@/components/FlowCanvas";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNodeStore } from "@/store/nodeStore";
import StreamMonitor from "@/components/StreamMonitor";
import NodeDetailsPanel from "@/components/NodeDetailsPanel";
import ConnectionStatus from "@/components/ConnectionStatus";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ExternalLink, HelpCircle, Terminal } from "lucide-react";
import wsClient, { allWebSocketUrls } from "@/services/WebSocketClient";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [showMonitor, setShowMonitor] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const { selectedNode } = useNodeStore();
  
  useEffect(() => {
    // Monitor WebSocket connection status
    const unsubscribe = wsClient.onStatus((status) => {
      setConnectionStatus(status);
      if (status === "connected") {
        toast.success("Connected to streaming server");
      } else if (status === "disconnected") {
        toast.error("Disconnected from streaming server");
      }
    });

    // Try to connect when component mounts
    wsClient.connect().catch(error => {
      console.error("Failed to connect to backend", error);
    });
    
    return () => unsubscribe();
  }, []);
  
  const toggleMonitor = () => {
    setShowMonitor(!showMonitor);
    if (!showMonitor) {
      toast.info("Stream monitor activated");
    }
  };

  const manualReconnect = () => {
    toast.info("Attempting to reconnect...");
    wsClient.connect().catch(error => {
      console.error("Reconnection failed", error);
      toast.error("Reconnection failed. Please check server status.");
    });
  };

  // Determine if we're running on HTTPS but the backend is likely using WS
  const isSecurityIssue = window.location.protocol === 'https:' && connectionStatus === 'disconnected';

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-[#1A1F2C] text-white overflow-hidden">
        <Navbar toggleMonitor={toggleMonitor} />
        <div className="absolute right-2 top-2 z-10">
          <ConnectionStatus />
        </div>
        {connectionStatus !== "connected" && (
          <Alert variant="destructive" className="mx-4 mt-2 bg-red-900/30 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                The GStreamer backend server is not connected. Make sure it's running using{" "}
                <code className="bg-black/30 px-1 py-0.5 rounded">./start_server.sh</code>
              </p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={manualReconnect}>
                  Try Reconnect
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                >
                  <HelpCircle className="h-4 w-4 mr-1" />
                  {showTroubleshooting ? "Hide Troubleshooting" : "Show Troubleshooting"}
                </Button>
              </div>
              
              {showTroubleshooting && (
                <div className="mt-3 pt-3 border-t border-red-800/50">
                  <h3 className="text-sm font-medium mb-1">Connection Troubleshooting Steps:</h3>
                  
                  <ol className="list-decimal pl-5 text-sm space-y-1">
                    <li>Verify the backend server is running using <code className="bg-black/30 px-1 py-0.5 rounded">./start_server.sh</code></li>
                    <li>Check the terminal output for any errors in the Python server</li>
                    <li>Ensure GStreamer and required Python packages are installed</li>
                    <li>Backend should now be listening on all network interfaces (0.0.0.0)</li>
                    <li>Try running with: <code className="bg-black/30 px-1 py-0.5 rounded">./start_server.sh --recreate-venv</code></li>
                  </ol>

                  <div className="text-amber-300 border-l-2 border-amber-400 pl-2 mt-3">
                    <p className="font-medium flex items-center">
                      <Terminal className="h-4 w-4 mr-1" /> Connection Information
                    </p>
                    <p className="mt-1">
                      Both the frontend and backend use port 8080.
                    </p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>WebSocket URL: <code className="bg-black/30 px-1 py-0.5 rounded">{wsClient.getDebugConnectionUrl()}</code></li>
                      <li>Try running: <code className="bg-black/30 px-1 py-0.5 rounded">python server.py</code> directly from your terminal</li>
                    </ul>
                    
                    <p className="mt-2 font-medium">Attempted WebSocket URLs:</p>
                    <div className="mt-1 max-h-24 overflow-y-auto">
                      {allWebSocketUrls.map((url, index) => (
                        <code key={index} className="bg-black/30 px-1 py-0.5 rounded block mb-1 text-xs">{url}</code>
                      ))}
                    </div>
                  </div>
                  
                  {isSecurityIssue && (
                    <div className="text-yellow-300 border-l-2 border-yellow-400 pl-2 mt-3">
                      <p className="font-medium flex items-center">
                        <Terminal className="h-4 w-4 mr-1" /> Security Issue Detected
                      </p>
                      <p className="mt-1">
                        You are accessing this application over HTTPS, but trying to connect to a non-secure WebSocket (ws://).
                      </p>
                      <p className="mt-1">
                        Try one of these solutions:
                      </p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Access this application using HTTP instead of HTTPS</li>
                        <li>Configure your server to use a secure WebSocket connection (WSS)</li>
                        <li>Use a reverse proxy to handle secure connections</li>
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-3 text-xs text-gray-400">
                    Current WebSocket URL: {wsClient.getDebugConnectionUrl()}
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex-1 relative overflow-hidden">
            <FlowCanvas />
            {showMonitor && <StreamMonitor />}
          </div>
          {selectedNode && <NodeDetailsPanel />}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default Index;
