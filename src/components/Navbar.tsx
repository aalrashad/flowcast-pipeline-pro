
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Save, 
  FileInput, 
  Undo, 
  Redo, 
  Play, 
  Pause, 
  Settings, 
  Plus, 
  Database,
  Monitor,
  Sliders,
  FileOutput,
  Gauge
} from "lucide-react";
import { useNodeStore } from "@/store/nodeStore";
import { toast } from "sonner";
import { useFlowStore } from "@/store/flowStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  toggleMonitor: () => void;
}

const Navbar = ({ toggleMonitor }: NavbarProps) => {
  const [isLive, setIsLive] = useState(false);
  const { addNode } = useNodeStore();
  const { saveFlow, loadFlow, canUndo, canRedo, undo, redo } = useFlowStore();

  const handleSave = () => {
    saveFlow();
    toast.success("Workflow saved successfully");
  };

  const handleLoad = () => {
    loadFlow();
    toast.success("Workflow loaded successfully");
  };

  const handleUndo = () => {
    undo();
    toast.info("Action undone");
  };

  const handleRedo = () => {
    redo();
    toast.info("Action redone");
  };

  const toggleLive = () => {
    setIsLive(!isLive);
    if (!isLive) {
      toast.success("Pipeline activated, streams are now live");
    } else {
      toast.info("Pipeline deactivated, streams stopped");
    }
  };

  const handleAddNode = (type: string) => {
    addNode(type);
    toast.success(`New ${type} node added to workflow`);
  };

  return (
    <div className="flex items-center h-14 px-4 border-b bg-[#1A1F2C] border-[#2A2F3C] z-10">
      <div className="flex items-center mr-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] text-transparent bg-clip-text mr-2">
          FlowCast Pipeline Pro
        </h1>
      </div>
      
      <div className="flex space-x-1 mr-6">
        <Button size="sm" variant="ghost" onClick={handleSave} title="Save workflow">
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={handleLoad} title="Load workflow">
          <FileInput className="w-4 h-4 mr-1" />
          Load
        </Button>
        <Button size="sm" variant="ghost" onClick={handleUndo} disabled={!canUndo} title="Undo">
          <Undo className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleRedo} disabled={!canRedo} title="Redo">
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      <div className="border-r border-[#2A2F3C] h-8 mx-4"></div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="secondary" className="bg-[#8B5CF6] hover:bg-[#7E69AB]">
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[#222532] border-[#2A2F3C] text-white">
          <DropdownMenuItem onClick={() => handleAddNode("source")} className="hover:bg-[#2A2F3C]">
            <FileInput className="mr-2 h-4 w-4" />
            <span>Source Node</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddNode("encoder")} className="hover:bg-[#2A2F3C]">
            <Sliders className="mr-2 h-4 w-4" />
            <span>Encoder Node</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddNode("sink")} className="hover:bg-[#2A2F3C]">
            <FileOutput className="mr-2 h-4 w-4" />
            <span>Sink Node</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddNode("testgen")} className="hover:bg-[#2A2F3C]">
            <Monitor className="mr-2 h-4 w-4" />
            <span>Test Generator</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center space-x-2">
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={toggleMonitor} 
          className="border border-[#2A2F3C]"
          title="Toggle preview window"
        >
          <Monitor className="w-4 h-4 mr-1" />
          Preview
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="border border-[#2A2F3C]"
          title="View system metrics"
        >
          <Gauge className="w-4 h-4 mr-1" />
          Metrics
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant={isLive ? "destructive" : "default"}
          className={isLive ? "" : "bg-green-600 hover:bg-green-700"}
          onClick={toggleLive}
        >
          {isLive ? (
            <>
              <Pause className="w-4 h-4 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-1" />
              Go Live
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Navbar;
