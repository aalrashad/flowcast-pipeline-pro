
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Minimize, Maximize, Settings, Activity } from "lucide-react";

const StreamMonitor = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedStream, setSelectedStream] = useState("preview");
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  return (
    <Card className={`absolute right-4 bottom-4 bg-[#1A1F2C] border-[#2A2F3C] shadow-lg z-10 w-[420px] ${isFullscreen ? 'h-[80%] w-[80%]' : 'h-[300px]'}`}>
      <CardHeader className="p-2 border-b border-[#2A2F3C] flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center">
          <Activity className="h-4 w-4 mr-1" />
          Stream Monitor
        </CardTitle>
        <div className="flex items-center space-x-1">
          <Badge variant="outline" className="bg-green-900/20 text-green-500 text-xs">
            Live
          </Badge>
          <Select value={selectedStream} onValueChange={setSelectedStream}>
            <SelectTrigger className="w-32 h-6 text-xs bg-[#222532] border-[#2A2F3C]">
              <SelectValue placeholder="Select stream" />
            </SelectTrigger>
            <SelectContent className="bg-[#222532] border-[#2A2F3C]">
              <SelectItem value="preview">Preview Output</SelectItem>
              <SelectItem value="program">Program Output</SelectItem>
              <SelectItem value="source1">SRT Source</SelectItem>
              <SelectItem value="source2">File Source</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="w-6 h-6">
            <Settings className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="w-6 h-6">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-full">
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          <div className="w-full h-full bg-[#222532] flex items-center justify-center">
            {/* Placeholder for video stream */}
            <div className="flex flex-col items-center justify-center text-gray-500">
              <div className="h-8 w-32 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] mb-4 rounded"></div>
              <div className="text-sm">Test Pattern - {selectedStream}</div>
              <div className="text-xs mt-2">1920x1080 • 30fps • 5Mbps</div>
            </div>
          </div>
          
          {/* Stream info overlay */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Badge className="bg-black/50 text-white border-none text-xs">
                1920x1080
              </Badge>
              <Badge className="bg-black/50 text-white border-none text-xs">
                30fps
              </Badge>
            </div>
            <div>
              <Badge className="bg-black/50 text-white border-none text-xs">
                5.2 Mbps
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreamMonitor;
