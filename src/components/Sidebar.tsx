
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wifi,
  Database,
  Settings,
  Monitor,
  FileInput,
  FileOutput,
  HelpCircle,
  Sliders,
} from "lucide-react";
import { useNodeStore } from "@/store/nodeStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { addNode } = useNodeStore();

  const handleAddNode = (type: string) => {
    addNode(type);
    toast.success(`${type} node added to workflow`);
  };

  return (
    <div 
      className={`border-r border-[#2A2F3C] bg-[#1A1F2C] overflow-y-auto transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setCollapsed(!collapsed)} 
          className="w-full justify-start mb-4"
        >
          {collapsed ? "≫" : "≪"}
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>

        <Tabs defaultValue="nodes" className="w-full">
          <TabsList className="w-full bg-[#2A2F3C]">
            <TabsTrigger value="nodes" className="flex-1 text-xs">
              {collapsed ? <Database className="w-4 h-4" /> : "Nodes"}
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex-1 text-xs">
              {collapsed ? <Settings className="w-4 h-4" /> : "Presets"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nodes" className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                {!collapsed && "Source Nodes"}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddNode("srt-source")}
                      className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                    >
                      <Wifi className="w-4 h-4 text-blue-500" />
                      {!collapsed && <span className="ml-2 text-xs">SRT Source</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={collapsed ? "" : "hidden"}>
                    SRT Source
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddNode("rist-source")}
                      className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                    >
                      <Wifi className="w-4 h-4 text-purple-500" />
                      {!collapsed && <span className="ml-2 text-xs">RIST Source</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={collapsed ? "" : "hidden"}>
                    RIST Source
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddNode("rtmp-source")}
                      className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                    >
                      <Wifi className="w-4 h-4 text-red-500" />
                      {!collapsed && <span className="ml-2 text-xs">RTMP Source</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={collapsed ? "" : "hidden"}>
                    RTMP Source
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddNode("file-source")}
                      className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                    >
                      <FileInput className="w-4 h-4 text-green-500" />
                      {!collapsed && <span className="ml-2 text-xs">File Source</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={collapsed ? "" : "hidden"}>
                    File Source
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <Separator className="my-4 bg-[#2A2F3C]" />

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                {!collapsed && "Processing"}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddNode("encoder")}
                      className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                    >
                      <Sliders className="w-4 h-4 text-yellow-500" />
                      {!collapsed && <span className="ml-2 text-xs">Encoder</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={collapsed ? "" : "hidden"}>
                    Encoder
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddNode("testgen")}
                      className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                    >
                      <Monitor className="w-4 h-4 text-cyan-500" />
                      {!collapsed && <span className="ml-2 text-xs">Test Generator</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={collapsed ? "" : "hidden"}>
                    Test Generator
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <Separator className="my-4 bg-[#2A2F3C]" />

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                {!collapsed && "Outputs"}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddNode("srt-sink")}
                      className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                    >
                      <FileOutput className="w-4 h-4 text-blue-500" />
                      {!collapsed && <span className="ml-2 text-xs">SRT Output</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={collapsed ? "" : "hidden"}>
                    SRT Output
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddNode("rtmp-sink")}
                      className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                    >
                      <FileOutput className="w-4 h-4 text-red-500" />
                      {!collapsed && <span className="ml-2 text-xs">RTMP Output</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={collapsed ? "" : "hidden"}>
                    RTMP Output
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddNode("file-sink")}
                      className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                    >
                      <FileOutput className="w-4 h-4 text-green-500" />
                      {!collapsed && <span className="ml-2 text-xs">File Output</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={collapsed ? "" : "hidden"}>
                    File Output
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                {!collapsed && "Workflow Presets"}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                >
                  <Database className="w-4 h-4 text-blue-500" />
                  {!collapsed && <span className="ml-2 text-xs">Live Streaming Pipeline</span>}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                >
                  <Database className="w-4 h-4 text-green-500" />
                  {!collapsed && <span className="ml-2 text-xs">Multi-Bitrate Ladder</span>}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`w-full justify-${collapsed ? "center" : "start"} hover:bg-[#2A2F3C] border-[#2A2F3C]`}
                >
                  <Database className="w-4 h-4 text-yellow-500" />
                  {!collapsed && <span className="ml-2 text-xs">File Transcoding</span>}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="absolute bottom-4 left-0 right-0 px-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className={`w-full justify-${collapsed ? "center" : "start"}`}
        >
          <HelpCircle className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Help</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
