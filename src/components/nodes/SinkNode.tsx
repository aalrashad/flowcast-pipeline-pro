
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileOutput, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getNodeColor } from '@/lib/nodeUtils';

interface SinkNodeProps {
  id: string;
  data: {
    label?: string;
    protocol?: string;
    uri?: string;
    status?: 'offline' | 'streaming' | 'error';
    sinkType?: string;
    bitrate?: number;
    viewers?: number;
    info?: string;
  };
  type?: string;
  selected?: boolean;
}

const SinkNode = ({ id, data, type = 'sink', selected }: SinkNodeProps) => {
  // Default values if not provided
  const protocol = data.protocol || (
    type === 'srt-sink' ? 'SRT' :
    type === 'rtmp-sink' ? 'RTMP' :
    type === 'file-sink' ? 'FILE' : 'SRT'
  );
  
  const label = data.label || `${protocol} Output`;
  const status = data.status || 'offline';
  const sinkType = type || 'sink';
  const bitrate = data.bitrate || 0;
  const viewers = data.viewers || 0;
  
  const nodeColor = getNodeColor(sinkType);
  const icon = sinkType === 'file-sink' ? <FileOutput className="w-3 h-3" /> : <Wifi className="w-3 h-3" />;

  return (
    <div className={`px-2 py-1 shadow-md rounded-md w-44 bg-[#222532] border-2 ${selected ? 'border-white' : `border-[${nodeColor}]`}`}>
      <div className="flex justify-between items-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-[${nodeColor}20]`}>
          {icon}
        </div>
        <div className="ml-1">
          <div className="text-xs font-bold truncate max-w-28">{label}</div>
        </div>
        <Badge 
          variant="outline" 
          className={`ml-auto text-[10px] px-1 py-0 h-5 ${
            status === 'streaming' ? 'bg-green-900/20 text-green-500 border-green-500' : 
            status === 'error' ? 'bg-red-900/20 text-red-500 border-red-500' : 
            'bg-gray-900/20 text-gray-500 border-gray-500'
          }`}
        >
          {status}
        </Badge>
      </div>
      
      {data.uri && (
        <div className="mt-1 text-[10px] bg-gray-900/30 p-1 rounded overflow-hidden overflow-ellipsis whitespace-nowrap">
          {data.uri}
        </div>
      )}
      
      {(bitrate > 0 || viewers > 0) && (
        <div className="mt-1 grid grid-cols-2 gap-1 text-[10px]">
          {bitrate > 0 && (
            <>
              <div className="text-muted-foreground">Bitrate:</div>
              <div>{bitrate} kbps</div>
            </>
          )}
          {viewers > 0 && (
            <>
              <div className="text-muted-foreground">Viewers:</div>
              <div>{viewers}</div>
            </>
          )}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!bg-[#9b87f5] !border-[#7E69AB] !w-2 !h-2"
      />
    </div>
  );
};

export default memo(SinkNode);
