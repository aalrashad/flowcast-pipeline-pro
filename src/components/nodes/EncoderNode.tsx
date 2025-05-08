
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
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md w-60 bg-[#222532] border-2 ${selected ? 'border-white' : 'border-yellow-500'}`}>
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
          <Progress value={cpuLoad} 
            className="h-1 bg-gray-700"
            indicatorClassName={`${cpuLoad > 80 ? 'bg-red-500' : cpuLoad > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
          />
        </div>
      )}

      {data.info && (
        <div className="mt-2 text-xs text-gray-400">
          {data.info}
        </div>
      )}

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

export default memo(EncoderNode);
