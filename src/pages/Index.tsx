
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
import { AlertCircle } from "lucide-react";
import wsClient from "@/services/WebSocketClient";

const Index = () => {
  const [showMonitor, setShowMonitor] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
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
    
    return () => unsubscribe();
  }, []);
  
  const toggleMonitor = () => {
    setShowMonitor(!showMonitor);
    if (!showMonitor) {
      toast.info("Stream monitor activated");
    }
  };

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
              The GStreamer backend server is not connected. Make sure it's running using ./start_server.sh
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
};

export default Index;
