
import { memo, useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Terminal, Play, Square, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getNodeColor } from '@/lib/nodeUtils';
import { pipelineTemplates, validatePipelineElements } from '@/lib/gstreamerUtils';
import { Progress } from '@/components/ui/progress';
import { GstPipelineStatus } from '@/services/GstreamerService';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GstreamerNodeProps {
  id: string;
  data: {
    label?: string;
    pipelineString?: string;
    status?: 'idle' | 'playing' | 'paused' | 'error' | 'connecting' | 'reconnecting' | 'receiving' | 'buffering';
    pipelineStatus?: GstPipelineStatus;
    onStart?: () => void;
    onStop?: () => void;
    onPipelineUpdate?: (pipeline: string) => void;
    errorMessage?: string;
  };
  selected?: boolean;
}

const GstreamerNode = ({ id, data, selected }: GstreamerNodeProps) => {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [customPipeline, setCustomPipeline] = useState(data.pipelineString || '');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const label = data.label || 'GStreamer';
  const status = data.status || 'idle';
  
  // Validate pipeline on change
  useEffect(() => {
    if (customPipeline) {
      try {
        // Import and use the utility functions
        const { parsePipelineString, validatePipelineElements } = require('@/lib/gstreamerUtils');
        
        const elements = parsePipelineString(customPipeline);
        const validation = validatePipelineElements(elements);
        
        if (!validation.valid) {
          setValidationErrors(validation.errors);
        } else {
          setValidationErrors([]);
        }
      } catch (error) {
        setValidationErrors(['Invalid pipeline syntax']);
      }
    } else {
      setValidationErrors([]);
    }
  }, [customPipeline]);
  
  // Map status to visual indicators
  const getStatusColor = () => {
    switch(status) {
      case 'receiving':
        return 'bg-green-900/20 text-green-500 border-green-500';
      case 'connecting':
      case 'reconnecting':
      case 'buffering':
        return 'bg-amber-900/20 text-amber-500 border-amber-500';
      case 'error':
        return 'bg-red-900/20 text-red-500 border-red-500';
      case 'playing':
        return 'bg-blue-900/20 text-blue-500 border-blue-500';
      default:
        return 'bg-gray-900/20 text-gray-500 border-gray-500';
    }
  };
  
  // Get status icon based on current state
  const getStatusIcon = () => {
    switch(status) {
      case 'connecting':
      case 'reconnecting':
      case 'buffering':
        return <RefreshCw className="w-3 h-3 mr-1 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 mr-1" />;
      case 'playing':
      case 'receiving':
        return <Play className="w-3 h-3 mr-1" />;
      case 'paused':
        return <Square className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };
  
  const handlePlay = () => {
    // Check for validation errors before starting
    if (validationErrors.length > 0) {
      toast.error(`Pipeline validation failed: ${validationErrors[0]}`);
      return;
    }
    
    if (data.onStart) {
      toast.info(`Starting pipeline: ${label}`);
      data.onStart();
    }
  };
  
  const handleStop = () => {
    if (data.onStop) {
      toast.info(`Stopping pipeline: ${label}`);
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
  const bufferLevel = data.pipelineStatus?.stats?.bufferLevel || 0;
  const bitrate = data.pipelineStatus?.stats?.bitrate || 0;
  const framesReceived = data.pipelineStatus?.stats?.framesReceived || 0;

  return (
    <div className={`px-4 py-2 shadow-md rounded-md w-80 bg-[#222532] border-2 ${selected ? 'border-white' : 'border-[#ffcc00]'}`}>
      <div className="flex justify-between items-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#ffcc0020]">
          <Terminal className="w-4 h-4 text-[#ffcc00]" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{label}</div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={`ml-auto text-xs flex items-center ${getStatusColor()}`}
              >
                {getStatusIcon()}
                {status}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Current pipeline state: {data.pipelineStatus?.statusMessage || status}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Add stats indicators if we have them */}
      {data.pipelineStatus?.stats && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {bitrate > 0 && (
            <div className="flex justify-between">
              <span>Bitrate:</span>
              <span>{(bitrate/1000).toFixed(1)} Kbps</span>
            </div>
          )}
          {framesReceived > 0 && (
            <div className="flex justify-between">
              <span>Frames:</span>
              <span>{framesReceived}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Add buffer indicator if we're in a state that needs it */}
      {['connecting', 'reconnecting', 'buffering', 'receiving'].includes(status) && (
        <div className="mt-2 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span>Buffer</span>
            <span>{bufferLevel.toFixed(1)}%</span>
          </div>
          <Progress value={bufferLevel} className="h-1" />
        </div>
      )}
      
      {data.pipelineStatus?.statusMessage && (
        <div className="mt-1 text-xs text-gray-400 flex items-center">
          <Info className="w-3 h-3 mr-1" />
          {data.pipelineStatus.statusMessage}
        </div>
      )}
      
      {data.errorMessage && (
        <div className="mt-1 text-xs text-red-400 flex items-center">
          <AlertCircle className="w-3 h-3 mr-1" />
          {data.errorMessage}
        </div>
      )}
      
      {validationErrors.length > 0 && (
        <div className="mt-1 text-xs text-red-400 flex items-center">
          <AlertCircle className="w-3 h-3 mr-1" />
          {validationErrors[0]}
          {validationErrors.length > 1 && ` (+${validationErrors.length - 1} more errors)`}
        </div>
      )}
      
      <div className="mt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="pipeline" className="pt-2">
            <textarea
              className={`w-full h-20 bg-gray-900/30 text-xs p-1 rounded font-mono resize-none ${
                validationErrors.length > 0 ? 'border border-red-500' : ''
              }`}
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
          disabled={['playing', 'connecting', 'reconnecting', 'buffering', 'receiving'].includes(status) || validationErrors.length > 0}
        >
          <Play className="w-4 h-4 mr-1" />
          Play
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-red-900/20 text-red-500 border-red-500 hover:bg-red-900/30"
          onClick={handleStop}
          disabled={['idle', 'paused', 'error'].includes(status)}
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
