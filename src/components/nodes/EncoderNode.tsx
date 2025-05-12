
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sliders } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface EncoderNodeProps {
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
  };
  selected?: boolean;
}

const EncoderNode = ({ id, data, selected }: EncoderNodeProps) => {
  const label = data.label || 'Encoder';
  const codec = data.codec || 'H.264';
  const bitrate = data.bitrate || 5000;
  const resolution = data.resolution || '1920x1080';
  const frameRate = data.frameRate || 30;
  const status = data.status || 'idle';
  const cpuLoad = data.cpuLoad || 0;
  
  const getLoadColor = () => {
    if (cpuLoad > 80) return 'bg-red-500';
    if (cpuLoad > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  return (
    <div className={`px-2 py-1 shadow-md rounded-md w-48 bg-[#222532] border-2 ${selected ? 'border-white' : 'border-yellow-500'}`}>
      <div className="flex justify-between items-center">
        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-yellow-500/20">
          <Sliders className="w-3 h-3 text-yellow-500" />
        </div>
        <div className="ml-1">
          <div className="text-xs font-bold">{label}</div>
        </div>
        <Badge 
          variant="outline" 
          className={`ml-auto text-[10px] px-1 py-0 h-5 ${
            status === 'encoding' ? 'bg-green-900/20 text-green-500 border-green-500' : 
            status === 'error' ? 'bg-red-900/20 text-red-500 border-red-500' : 
            'bg-gray-900/20 text-gray-500 border-gray-500'
          }`}
        >
          {status}
        </Badge>
      </div>
      
      <div className="mt-1 grid grid-cols-2 gap-x-1 gap-y-[2px] text-[10px]">
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
        <div className="mt-2">
          <div className="flex justify-between text-[10px] mb-[2px]">
            <span className="text-muted-foreground">CPU:</span>
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

      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!bg-[#9b87f5] !border-[#7E69AB] !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!bg-[#9b87f5] !border-[#7E69AB] !w-2 !h-2"
      />
    </div>
  );
};

export default memo(EncoderNode);
