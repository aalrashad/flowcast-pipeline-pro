
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileInput, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getNodeColor } from '@/lib/nodeUtils';

interface SourceNodeProps {
  id: string;
  data: {
    label?: string;
    protocol?: string;
    uri?: string;
    status?: 'offline' | 'connected' | 'error';
    sourceType?: string;
    info?: string;
  };
  type?: string;
  selected?: boolean;
}

const SourceNode = ({ id, data, type = 'source', selected }: SourceNodeProps) => {
  // Default values if not provided
  const protocol = data.protocol || (
    type === 'srt-source' ? 'SRT' :
    type === 'rtmp-source' ? 'RTMP' :
    type === 'rist-source' ? 'RIST' : 
    type === 'file-source' ? 'FILE' : 'SRT'
  );
  
  const label = data.label || `${protocol} Source`;
  const status = data.status || 'offline';
  const sourceType = type || 'source';
  
  const nodeColor = getNodeColor(sourceType);
  const icon = sourceType === 'file-source' ? <FileInput className="w-4 h-4" /> : <Wifi className="w-4 h-4" />;

  return (
    <div className={`px-4 py-2 shadow-md rounded-md w-56 bg-[#222532] border-2 ${selected ? 'border-white' : `border-[${nodeColor}]`}`}>
      <div className="flex justify-between items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-[${nodeColor}20]`}>
          {icon}
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{label}</div>
        </div>
        <Badge 
          variant="outline" 
          className={`ml-auto text-xs ${
            status === 'connected' ? 'bg-green-900/20 text-green-500 border-green-500' : 
            status === 'error' ? 'bg-red-900/20 text-red-500 border-red-500' : 
            'bg-gray-900/20 text-gray-500 border-gray-500'
          }`}
        >
          {status}
        </Badge>
      </div>
      
      {data.uri && (
        <div className="mt-2 text-xs bg-gray-900/30 p-1 rounded overflow-hidden overflow-ellipsis whitespace-nowrap">
          {data.uri}
        </div>
      )}
      
      {data.info && (
        <div className="mt-1 text-xs text-gray-400">
          {data.info}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!bg-[#9b87f5] !border-[#7E69AB]"
      />
    </div>
  );
};

export default memo(SourceNode);
