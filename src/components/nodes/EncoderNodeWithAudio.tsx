
import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sliders, Volume, Volume2, Plus, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AudioSource {
  id: string;
  label: string;
  level: number;
  muted: boolean;
  sourceNodeId?: string;
  sourceType?: string;
}

interface EncoderNodeWithAudioProps {
  id: string;
  data: {
    label?: string;
    codec?: string;
    bitrate?: number;
    resolution?: string;
    frameRate?: number;
    status?: 'idle' | 'encoding' | 'error';
    cpuLoad?: number;
    info?: string;
    width?: number;
    height?: number;
    audioSources?: AudioSource[];
    availableExternalAudio?: { id: string, label: string, nodeId: string, type: string }[];
    onAudioLevelChange?: (sourceId: string, level: number) => void;
    onAudioMuteToggle?: (sourceId: string, muted: boolean) => void;
    onAddExternalAudio?: (sourceNodeId: string, sourceLabel: string, sourceType: string) => void;
    onRemoveAudioSource?: (sourceId: string) => void;
  };
  selected?: boolean;
}

const EncoderNodeWithAudio = ({ id, data, selected }: EncoderNodeWithAudioProps) => {
  const [showAudioMixer, setShowAudioMixer] = useState(false);
  const [externalAudioSelect, setExternalAudioSelect] = useState<string>("");
  
  const label = data.label || 'Encoder';
  const codec = data.codec || 'H.264';
  const bitrate = data.bitrate || 5000;
  const resolution = data.resolution || '1920x1080';
  const frameRate = data.frameRate || 30;
  const status = data.status || 'idle';
  const cpuLoad = data.cpuLoad || 0;
  const nodeWidth = data.width || 240;
  
  // Default audio sources if none provided
  const audioSources = data.audioSources || [
    { id: 'main', label: 'Main Source', level: 75, muted: false },
    { id: 'secondary', label: 'Secondary Source', level: 0, muted: true },
  ];

  // External audio sources that can be added
  const availableExternalAudio = data.availableExternalAudio || [];
  
  const getLoadColor = () => {
    if (cpuLoad > 80) return 'bg-red-500';
    if (cpuLoad > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const handleAudioLevelChange = (sourceId: string, level: number) => {
    if (data.onAudioLevelChange) {
      data.onAudioLevelChange(sourceId, level);
    }
  };
  
  const handleAudioMuteToggle = (sourceId: string, muted: boolean) => {
    if (data.onAudioMuteToggle) {
      data.onAudioMuteToggle(sourceId, muted);
    }
  };

  const handleAddExternalAudio = () => {
    if (!externalAudioSelect || !data.onAddExternalAudio) return;
    
    const selectedSource = availableExternalAudio.find(source => source.id === externalAudioSelect);
    if (selectedSource) {
      data.onAddExternalAudio(
        selectedSource.nodeId,
        selectedSource.label,
        selectedSource.type
      );
      setExternalAudioSelect("");
    }
  };
  
  const handleRemoveAudioSource = (sourceId: string) => {
    if (data.onRemoveAudioSource) {
      data.onRemoveAudioSource(sourceId);
    }
  };
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-[#222532] border-2 ${selected ? 'border-white' : 'border-yellow-500'}`}
         style={{ width: nodeWidth, minWidth: 240, maxWidth: 400 }}>
      <div className="flex justify-between items-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-500/20">
          <Sliders className="w-4 h-4 text-yellow-500" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{label}</div>
        </div>
        <Badge 
          variant="outline" 
          className={`ml-auto text-xs ${
            status === 'encoding' ? 'bg-green-900/20 text-green-500 border-green-500' : 
            status === 'error' ? 'bg-red-900/20 text-red-500 border-red-500' : 
            'bg-gray-900/20 text-gray-500 border-gray-500'
          }`}
        >
          {status}
        </Badge>
      </div>
      
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
        <div className="text-muted-foreground">Codec:</div>
        <div>{codec}</div>
        <div className="text-muted-foreground">Bitrate:</div>
        <div>{bitrate} kbps</div>
        <div className="text-muted-foreground">Resolution:</div>
        <div>{resolution}</div>
        <div className="text-muted-foreground">Frame Rate:</div>
        <div>{frameRate} fps</div>
      </div>
      
      {cpuLoad > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">CPU Load:</span>
            <span className={`${cpuLoad > 80 ? 'text-red-500' : cpuLoad > 60 ? 'text-yellow-500' : 'text-green-500'}`}>
              {cpuLoad}%
            </span>
          </div>
          <Progress 
            value={cpuLoad} 
            className="h-1 bg-gray-700"
            style={{ 
              '--progress-background': getLoadColor()
            } as React.CSSProperties}
          />
        </div>
      )}
      
      <Accordion 
        type="single" 
        collapsible
        className="mt-2 border-t border-gray-700/50 pt-2"
        value={showAudioMixer ? "mixer" : ""}
        onValueChange={(val) => setShowAudioMixer(val === "mixer")}
      >
        <AccordionItem value="mixer" className="border-b-0">
          <AccordionTrigger className="py-1 text-xs">Audio Mixer</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {/* Audio Sources */}
              {audioSources.map(source => (
                <div key={source.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{source.label}</span>
                    <div className="flex gap-1">
                      <button 
                        className="p-1 rounded hover:bg-gray-700/50"
                        onClick={() => handleAudioMuteToggle(source.id, !source.muted)}
                      >
                        {source.muted ? (
                          <Volume className="h-3 w-3 text-gray-400" />
                        ) : (
                          <Volume2 className="h-3 w-3 text-green-400" />
                        )}
                      </button>
                      
                      {/* Only show delete for external sources */}
                      {source.sourceNodeId && (
                        <button 
                          className="p-1 rounded hover:bg-gray-700/50 hover:text-red-400"
                          onClick={() => handleRemoveAudioSource(source.id)}
                        >
                          <Trash className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={source.level}
                    onChange={(e) => handleAudioLevelChange(source.id, parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded [&::-webkit-slider-thumb]:bg-green-400"
                    disabled={source.muted}
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>-∞</span>
                    <span>{source.level}%</span>
                    <span>0 dB</span>
                  </div>
                </div>
              ))}
              
              {/* Add External Audio Source */}
              {availableExternalAudio && availableExternalAudio.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-700/50">
                  <div className="text-xs mb-2">Add External Audio Source</div>
                  <div className="flex gap-2 items-center">
                    <Select value={externalAudioSelect} onValueChange={setExternalAudioSelect}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Select source..." />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        {availableExternalAudio.map(source => (
                          <SelectItem key={source.id} value={source.id} className="text-xs">
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 p-1 bg-green-500/20 hover:bg-green-500/40"
                      onClick={handleAddExternalAudio}
                      disabled={!externalAudioSelect}
                    >
                      <Plus className="h-4 w-4 text-green-500" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!bg-[#9b87f5] !border-[#7E69AB]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!bg-[#9b87f5] !border-[#7E69AB]"
      />
    </div>
  );
};

export default memo(EncoderNodeWithAudio);
