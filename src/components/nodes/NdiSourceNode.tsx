import { memo, useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Cast, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getNodeColor } from '@/lib/nodeUtils';
import { ndiDiscoveryService, NdiSource } from '@/services/NdiDiscoveryService';

interface NdiSourceNodeProps {
  id: string;
  data: {
    label?: string;
    sourceName?: string;
    ipAddress?: string;
    status?: 'offline' | 'connected' | 'error';
    info?: string;
    ndiSources?: {id: string, name: string, ipAddress: string}[];
    onSourceSelect?: (sourceId: string, sourceName: string, ipAddress: string) => void;
  };
  selected?: boolean;
}

const NdiSourceNode = ({ id, data, selected }: NdiSourceNodeProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [discoveredSources, setDiscoveredSources] = useState<NdiSource[]>([]);
  
  const label = data.label || 'NDI Source';
  const sourceName = data.sourceName || 'No source selected';
  const ipAddress = data.ipAddress || '';
  const status = data.status || 'offline';
  
  useEffect(() => {
    // Initialize NDI sources from either the discovery service or props
    setDiscoveredSources(ndiDiscoveryService.getSources());
    
    // Set up listener for NDI source discovery updates
    ndiDiscoveryService.addListener((sources) => {
      setDiscoveredSources(sources);
    });
    
    return () => {
      // Clean up listener when component unmounts
      ndiDiscoveryService.removeListener(setDiscoveredSources);
    };
  }, []);
  
  const handleSearch = () => {
    setIsSearching(true);
    
    // Start NDI discovery
    ndiDiscoveryService.startDiscovery();
    
    setTimeout(() => {
      setIsSearching(false);
      setShowSources(true);
      
      // Stop discovery after a short period to save resources
      // In a real app, you might want to keep discovery running longer or have a stop button
      setTimeout(() => {
        ndiDiscoveryService.stopDiscovery();
      }, 10000);
    }, 1500);
  };
  
  const handleSelectSource = (sourceId: string, sourceName: string, ipAddress: string) => {
    if (data.onSourceSelect) {
      data.onSourceSelect(sourceId, sourceName, ipAddress);
    }
    setShowSources(false);
  };
  
  const nodeColor = getNodeColor('ndi-source');

  return (
    <div className={`px-4 py-2 shadow-md rounded-md w-64 bg-[#222532] border-2 ${selected ? 'border-white' : 'border-[#22d3ee]'}`}>
      <div className="flex justify-between items-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#22d3ee20]">
          <Cast className="w-4 h-4 text-[#22d3ee]" />
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
      
      <div className="mt-2 space-y-2">
        <div className="text-xs bg-gray-900/30 p-1 rounded flex justify-between items-center">
          <span>{sourceName}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0" 
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
          </Button>
        </div>
        
        {ipAddress && (
          <div className="text-xs text-gray-400">
            {ipAddress}
          </div>
        )}
        
        {isSearching && (
          <div className="text-xs text-center py-1">
            Discovering NDI sources...
          </div>
        )}
        
        {showSources && discoveredSources.length > 0 && (
          <div className="bg-gray-900/50 rounded p-1 mt-2 max-h-32 overflow-y-auto">
            <div className="text-xs font-semibold mb-1">Available Sources:</div>
            {discoveredSources.map(source => (
              <div 
                key={source.id}
                className="text-xs p-1 hover:bg-gray-800/50 rounded cursor-pointer flex justify-between"
                onClick={() => handleSelectSource(source.id, source.name, source.ipAddress)}
              >
                <span>{source.name}</span>
                <span className="text-gray-400">{source.ipAddress}</span>
              </div>
            ))}
          </div>
        )}
        
        {showSources && discoveredSources.length === 0 && (
          <div className="text-xs text-center py-1">
            No NDI sources found
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!bg-[#9b87f5] !border-[#7E69AB]"
      />
    </div>
  );
};

export default memo(NdiSourceNode);
