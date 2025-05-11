
import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Terminal, Play, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getNodeColor } from '@/lib/nodeUtils';
import { pipelineTemplates } from '@/lib/gstreamerUtils';

interface GstreamerNodeProps {
  id: string;
  data: {
    label?: string;
    pipelineString?: string;
    status?: 'idle' | 'playing' | 'paused' | 'error';
    onStart?: () => void;
    onStop?: () => void;
    onPipelineUpdate?: (pipeline: string) => void;
  };
  selected?: boolean;
}

const GstreamerNode = ({ id, data, selected }: GstreamerNodeProps) => {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [customPipeline, setCustomPipeline] = useState(data.pipelineString || '');
  
  const label = data.label || 'GStreamer';
  const status = data.status || 'idle';
  
  const handlePlay = () => {
    if (data.onStart) {
      data.onStart();
    }
  };
  
  const handleStop = () => {
    if (data.onStop) {
      data.onStop();
    }
  };
  
  const handlePipelineChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomPipeline(e.target.value);
    if (data.onPipelineUpdate) {
      data.onPipelineUpdate(e.target.value);
    }
  };
  
  const handleSelectTemplate = (template: string) => {
    setCustomPipeline(template);
    if (data.onPipelineUpdate) {
      data.onPipelineUpdate(template);
    }
  };
  
  const nodeColor = getNodeColor('gstreamer');

  return (
    <div className={`px-4 py-2 shadow-md rounded-md w-80 bg-[#222532] border-2 ${selected ? 'border-white' : 'border-[#ffcc00]'}`}>
      <div className="flex justify-between items-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#ffcc0020]">
          <Terminal className="w-4 h-4 text-[#ffcc00]" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{label}</div>
        </div>
        <Badge 
          variant="outline" 
          className={`ml-auto text-xs ${
            status === 'playing' ? 'bg-green-900/20 text-green-500 border-green-500' : 
            status === 'error' ? 'bg-red-900/20 text-red-500 border-red-500' : 
            status === 'paused' ? 'bg-amber-900/20 text-amber-500 border-amber-500' :
            'bg-gray-900/20 text-gray-500 border-gray-500'
          }`}
        >
          {status}
        </Badge>
      </div>
      
      <div className="mt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="pipeline" className="pt-2">
            <textarea
              className="w-full h-20 bg-gray-900/30 text-xs p-1 rounded font-mono resize-none"
              value={customPipeline}
              onChange={handlePipelineChange}
              placeholder="Enter GStreamer pipeline"
            />
          </TabsContent>
          <TabsContent value="templates" className="pt-2">
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {Object.entries(pipelineTemplates).map(([name, pipeline]) => (
                <div 
                  key={name}
                  className="text-xs p-1 hover:bg-gray-800/50 rounded cursor-pointer"
                  onClick={() => handleSelectTemplate(pipeline)}
                >
                  {name}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex justify-center gap-2 mt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-green-900/20 text-green-500 border-green-500 hover:bg-green-900/30"
          onClick={handlePlay}
          disabled={status === 'playing'}
        >
          <Play className="w-4 h-4 mr-1" />
          Play
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-red-900/20 text-red-500 border-red-500 hover:bg-red-900/30"
          onClick={handleStop}
          disabled={status === 'idle'}
        >
          <Square className="w-4 h-4 mr-1" />
          Stop
        </Button>
      </div>
      
      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
};

export default memo(GstreamerNode);
