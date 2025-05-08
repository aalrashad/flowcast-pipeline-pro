
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TestGenNodeProps {
  id: string;
  data: {
    label?: string;
    pattern?: string;
    resolution?: string;
    frameRate?: number;
    status?: 'idle' | 'active' | 'error';
    info?: string;
  };
  selected?: boolean;
}

const TestGenNode = ({ id, data, selected }: TestGenNodeProps) => {
  const label = data.label || 'Test Generator';
  const pattern = data.pattern || 'Color Bars';
  const resolution = data.resolution || '1920x1080';
  const frameRate = data.frameRate || 30;
  const status = data.status || 'idle';
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md w-56 bg-[#222532] border-2 ${selected ? 'border-white' : 'border-cyan-500'}`}>
      <div className="flex justify-between items-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-cyan-500/20">
          <Monitor className="w-4 h-4 text-cyan-500" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{label}</div>
        </div>
        <Badge 
          variant="outline" 
          className={`ml-auto text-xs ${
            status === 'active' ? 'bg-green-900/20 text-green-500 border-green-500' : 
            status === 'error' ? 'bg-red-900/20 text-red-500 border-red-500' : 
            'bg-gray-900/20 text-gray-500 border-gray-500'
          }`}
        >
          {status}
        </Badge>
      </div>
      
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
        <div className="text-muted-foreground">Pattern:</div>
        <div>{pattern}</div>
        <div className="text-muted-foreground">Resolution:</div>
        <div>{resolution}</div>
        <div className="text-muted-foreground">Frame Rate:</div>
        <div>{frameRate} fps</div>
      </div>
      
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

export default memo(TestGenNode);
