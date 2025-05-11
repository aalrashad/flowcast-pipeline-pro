
import { useState } from "react";
import { X, ChevronRight, ChevronDown, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNodeStore } from "@/store/nodeStore";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

interface TempData {
  label: string;
  uri: string;
  codec: string;
  bitrate: number;
  resolution: string;
  frameRate: number;
  protocol: string;
  pattern: string;
  width: number;
  height: number;
}

const NodeDetailsPanel = () => {
  const { selectedNode, updateNodeData, setSelectedNode } = useNodeStore();
  
  const [tempData, setTempData] = useState<TempData>({
    label: selectedNode?.data?.label as string || "",
    uri: selectedNode?.data?.uri as string || "",
    codec: selectedNode?.data?.codec as string || "h264",
    bitrate: selectedNode?.data?.bitrate as number || 5000,
    resolution: selectedNode?.data?.resolution as string || "1920x1080",
    frameRate: selectedNode?.data?.frameRate as number || 30,
    protocol: selectedNode?.data?.protocol as string || "SRT",
    pattern: selectedNode?.data?.pattern as string || "Color Bars",
  });
  
  if (!selectedNode) return null;
  
  const handleClose = () => {
    setSelectedNode(null);
  };
  
  const handleSave = () => {
    updateNodeData(selectedNode.id, tempData);
    toast.success("Node settings updated");
  };
  
  const handleChange = (field: string, value: string | number) => {
    setTempData(prev => ({ ...prev, [field]: value }));
  };
  
  const getSourceFields = () => {
    const isFileSource = selectedNode.type === 'file-source';
    
    return (
      <>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="protocol">Protocol</Label>
            <Select 
              value={tempData.protocol} 
              onValueChange={(value) => handleChange('protocol', value)}
              disabled={!!selectedNode.type && selectedNode.type !== 'source'}
            >
              <SelectTrigger className="bg-[#222532] border-[#2A2F3C]">
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent className="bg-[#222532] border-[#2A2F3C]">
                {isFileSource ? (
                  <>
                    <SelectItem value="MP4">MP4</SelectItem>
                    <SelectItem value="MKV">MKV</SelectItem>
                    <SelectItem value="MOV">MOV</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="SRT">SRT</SelectItem>
                    <SelectItem value="RIST">RIST</SelectItem>
                    <SelectItem value="RTMP">RTMP</SelectItem>
                    <SelectItem value="UDP">UDP</SelectItem>
                    <SelectItem value="NDI">NDI</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="uri">{isFileSource ? 'File Path' : 'URI'}</Label>
            <Input
              id="uri"
              value={tempData.uri}
              onChange={(e) => handleChange('uri', e.target.value)}
              className="bg-[#222532] border-[#2A2F3C]"
              placeholder={isFileSource ? "/path/to/video.mp4" : "srt://192.168.1.100:9000"}
            />
          </div>
        </div>
      </>
    );
  };
  
  const getEncoderFields = () => {
    return (
      <>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codec">Codec</Label>
            <Select 
              value={tempData.codec} 
              onValueChange={(value) => handleChange('codec', value)}
            >
              <SelectTrigger className="bg-[#222532] border-[#2A2F3C]">
                <SelectValue placeholder="Select codec" />
              </SelectTrigger>
              <SelectContent className="bg-[#222532] border-[#2A2F3C]">
                <SelectItem value="h264">H.264 / AVC</SelectItem>
                <SelectItem value="h265">H.265 / HEVC</SelectItem>
                <SelectItem value="av1">AV1</SelectItem>
                <SelectItem value="vp9">VP9</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="bitrate">Bitrate (kbps)</Label>
              <span className="text-xs text-muted-foreground">{tempData.bitrate} kbps</span>
            </div>
            <Slider
              value={[tempData.bitrate]}
              min={500}
              max={50000}
              step={500}
              className="bg-[#222532]"
              onValueChange={(value) => handleChange('bitrate', value[0])}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution</Label>
            <Select 
              value={tempData.resolution} 
              onValueChange={(value) => handleChange('resolution', value)}
            >
              <SelectTrigger className="bg-[#222532] border-[#2A2F3C]">
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent className="bg-[#222532] border-[#2A2F3C]">
                <SelectItem value="3840x2160">4K (3840x2160)</SelectItem>
                <SelectItem value="1920x1080">FHD (1920x1080)</SelectItem>
                <SelectItem value="1280x720">HD (1280x720)</SelectItem>
                <SelectItem value="854x480">SD (854x480)</SelectItem>
                <SelectItem value="640x360">360p (640x360)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="frameRate">Frame Rate</Label>
            <Select 
              value={String(tempData.frameRate)} 
              onValueChange={(value) => handleChange('frameRate', parseInt(value))}
            >
              <SelectTrigger className="bg-[#222532] border-[#2A2F3C]">
                <SelectValue placeholder="Select frame rate" />
              </SelectTrigger>
              <SelectContent className="bg-[#222532] border-[#2A2F3C]">
                <SelectItem value="60">60 fps</SelectItem>
                <SelectItem value="30">30 fps</SelectItem>
                <SelectItem value="25">25 fps</SelectItem>
                <SelectItem value="24">24 fps</SelectItem>
                <SelectItem value="15">15 fps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="advanced" className="border-[#2A2F3C]">
            <AccordionTrigger className="text-sm">Advanced Settings</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="rateControl">Rate Control</Label>
                  <Select defaultValue="cbr">
                    <SelectTrigger className="bg-[#222532] border-[#2A2F3C]">
                      <SelectValue placeholder="Rate control" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#222532] border-[#2A2F3C]">
                      <SelectItem value="cbr">CBR</SelectItem>
                      <SelectItem value="vbr">VBR</SelectItem>
                      <SelectItem value="qvbr">QVBR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="profile">Profile</Label>
                  <Select defaultValue="main">
                    <SelectTrigger className="bg-[#222532] border-[#2A2F3C]">
                      <SelectValue placeholder="Profile" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#222532] border-[#2A2F3C]">
                      <SelectItem value="baseline">Baseline</SelectItem>
                      <SelectItem value="main">Main</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="aiEnhance">AI Enhancement</Label>
                  <Select defaultValue="none">
                    <SelectTrigger className="bg-[#222532] border-[#2A2F3C]">
                      <SelectValue placeholder="AI enhancement" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#222532] border-[#2A2F3C]">
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="upscale">AI Upscaling</SelectItem>
                      <SelectItem value="noise">Noise Reduction</SelectItem>
                      <SelectItem value="dynamic">Dynamic Bitrate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </>
    );
  };
  
  const getSinkFields = () => {
    const isFileSink = selectedNode.type === 'file-sink';
    
    return (
      <>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="protocol">Protocol</Label>
            <Select 
              value={tempData.protocol} 
              onValueChange={(value) => handleChange('protocol', value)}
              disabled={!!selectedNode.type && selectedNode.type !== 'sink'}
            >
              <SelectTrigger className="bg-[#222532] border-[#2A2F3C]">
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent className="bg-[#222532] border-[#2A2F3C]">
                {isFileSink ? (
                  <>
                    <SelectItem value="MP4">MP4</SelectItem>
                    <SelectItem value="MKV">MKV</SelectItem>
                    <SelectItem value="MOV">MOV</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="SRT">SRT</SelectItem>
                    <SelectItem value="RIST">RIST</SelectItem>
                    <SelectItem value="RTMP">RTMP</SelectItem>
                    <SelectItem value="UDP">UDP</SelectItem>
                    <SelectItem value="NDI">NDI</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="uri">{isFileSink ? 'File Path' : 'URI'}</Label>
            <Input
              id="uri"
              value={tempData.uri}
              onChange={(e) => handleChange('uri', e.target.value)}
              className="bg-[#222532] border-[#2A2F3C]"
              placeholder={isFileSink ? "/path/to/output.mp4" : "srt://192.168.1.100:9000"}
            />
          </div>
        </div>
      </>
    );
  };
  
  const getTestGenFields = () => {
    return (
      <>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pattern">Test Pattern</Label>
            <Select 
              value={tempData.pattern} 
              onValueChange={(value) => handleChange('pattern', value)}
            >
              <SelectTrigger className="bg-[#222532] border-[#2A2F3C]">
                <SelectValue placeholder="Select pattern" />
              </SelectTrigger>
              <SelectContent className="bg-[#222532] border-[#2A2F3C]">
                <SelectItem value="Color Bars">Color Bars</SelectItem>
                <SelectItem value="SMPTE Bars">SMPTE Bars</SelectItem>
                <SelectItem value="Checkerboard">Checkerboard</SelectItem>
                <SelectItem value="Solid Color">Solid Color</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution</Label>
            <Select 
              value={tempData.resolution} 
              onValueChange={(value) => handleChange('resolution', value)}
            >
              <SelectTrigger className="bg-[#222532] border-[#2A2F3C]">
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent className="bg-[#222532] border-[#2A2F3C]">
                <SelectItem value="3840x2160">4K (3840x2160)</SelectItem>
                <SelectItem value="1920x1080">FHD (1920x1080)</SelectItem>
                <SelectItem value="1280x720">HD (1280x720)</SelectItem>
                <SelectItem value="854x480">SD (854x480)</SelectItem>
                <SelectItem value="640x360">360p (640x360)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="frameRate">Frame Rate</Label>
            <Select 
              value={String(tempData.frameRate)} 
              onValueChange={(value) => handleChange('frameRate', parseInt(value))}
            >
              <SelectTrigger className="bg-[#222532] border-[#2A2F3C]">
                <SelectValue placeholder="Select frame rate" />
              </SelectTrigger>
              <SelectContent className="bg-[#222532] border-[#2A2F3C]">
                <SelectItem value="60">60 fps</SelectItem>
                <SelectItem value="30">30 fps</SelectItem>
                <SelectItem value="25">25 fps</SelectItem>
                <SelectItem value="24">24 fps</SelectItem>
                <SelectItem value="15">15 fps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </>
    );
  };
  
  const getFormFields = () => {
    const type = selectedNode.type || '';
    
    if (type.includes('source') || type === 'source') {
      return getSourceFields();
    } else if (type === 'encoder') {
      return getEncoderFields();
    } else if (type.includes('sink') || type === 'sink') {
      return getSinkFields();
    } else if (type === 'testgen') {
      return getTestGenFields();
    }
    
    return null;
  };
  
  return (
    <div className="w-80 border-l border-[#2A2F3C] bg-[#1A1F2C] overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-[#2A2F3C]">
        <h2 className="text-sm font-semibold">Node Settings</h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={tempData.label}
            onChange={(e) => handleChange('label', e.target.value)}
            className="bg-[#222532] border-[#2A2F3C]"
          />
        </div>
        
        <Separator className="bg-[#2A2F3C]" />
        
        <Tabs defaultValue="settings">
          <TabsList className="bg-[#222532] w-full">
            <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
            <TabsTrigger value="monitoring" className="flex-1 text-xs">Monitoring</TabsTrigger>
          </TabsList>
          <TabsContent value="settings" className="space-y-4 pt-4">
            {getFormFields()}
            
            <div className="pt-4">
              <Button className="w-full" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="monitoring" className="space-y-4 pt-4">
            <div className="space-y-2 p-4 rounded bg-[#222532] text-center">
              <p className="text-sm text-muted-foreground">Monitoring data will appear here when the pipeline is active</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NodeDetailsPanel;
