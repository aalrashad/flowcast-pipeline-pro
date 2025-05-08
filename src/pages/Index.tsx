
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import FlowCanvas from "@/components/FlowCanvas";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNodeStore } from "@/store/nodeStore";
import StreamMonitor from "@/components/StreamMonitor";
import NodeDetailsPanel from "@/components/NodeDetailsPanel";
import { toast } from "sonner";

const Index = () => {
  const [showMonitor, setShowMonitor] = useState(false);
  const { selectedNode } = useNodeStore();
  
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
