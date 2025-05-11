import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  Panel,
  NodeTypes,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNodeStore } from '@/store/nodeStore';
import SourceNode from '@/components/nodes/SourceNode';
import EncoderNode from '@/components/nodes/EncoderNode';
import EncoderNodeWithAudio from '@/components/nodes/EncoderNodeWithAudio'; 
import SinkNode from '@/components/nodes/SinkNode';
import TestGenNode from '@/components/nodes/TestGenNode';
import NdiSourceNode from '@/components/nodes/NdiSourceNode';
import { toast } from 'sonner';
import FileBrowser from '@/components/FileBrowser';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

const nodeTypes: NodeTypes = {
  source: SourceNode,
  'srt-source': SourceNode,
  'rist-source': SourceNode,
  'rtmp-source': SourceNode,
  'file-source': SourceNode,
  'ndi-source': NdiSourceNode,
  encoder: EncoderNodeWithAudio,
  'encoder-basic': EncoderNode,
  sink: SinkNode,
  'srt-sink': SinkNode,
  'rtmp-sink': SinkNode,
  'file-sink': SinkNode,
  testgen: TestGenNode,
};

const FlowCanvas = () => {
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const [fileSelectedNodeId, setFileSelectedNodeId] = useState<string | null>(null);
  
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect, 
    setSelectedNode, 
    updateNodeData, 
    selectNdiSource, 
    updateAudioMixer,
    deleteNode,
    deleteEdge,
    addExternalAudioToEncoder,
    removeAudioSource
  } = useNodeStore();
  
  const reactFlowInstance = useReactFlow();

  const onNodeClick = useCallback((_, node) => {
    // Check if it's a file browser click for file sources
    if (node.type === 'file-source' || node.type === 'file-sink') {
      setFileSelectedNodeId(node.id);
      setFileBrowserOpen(true);
      return;
    }
    
    setSelectedNode(node);
  }, [setSelectedNode]);

  const onNodeDoubleClick = useCallback((_, node) => {
    if (node.type === 'ndi-source') {
      // Handle NDI source discovery/selection logic
      return;
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    const selectedEdges = edges.filter(edge => edge.selected);
    
    if (selectedNodes.length > 0) {
      selectedNodes.forEach(node => {
        deleteNode(node.id);
      });
      toast.success(`Deleted ${selectedNodes.length} node(s)`);
    }
    
    if (selectedEdges.length > 0) {
      selectedEdges.forEach(edge => {
        deleteEdge(edge.id);
      });
      toast.success(`Deleted ${selectedEdges.length} connection(s)`);
    }
    
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      toast.info("No elements selected");
    }
  }, [nodes, edges, deleteNode, deleteEdge]);

  const validateConnection = useCallback((connection) => {
    // Prevent connections to input nodes that already have connections
    const targetHandleId = connection.targetHandle;
    const targetNodeId = connection.target;
    const existingEdges = edges;
    
    const hasExistingConnection = existingEdges.some(
      edge => edge.target === targetNodeId && edge.targetHandle === targetHandleId
    );

    if (hasExistingConnection) {
      toast.error("This input already has a connection");
      return false;
    }

    // Check if connection type is valid (source to encoder, encoder to sink)
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);
    
    if (!sourceNode || !targetNode) return false;
    
    const sourceType = sourceNode.type;
    const targetType = targetNode.type;
    
    if ((sourceType?.includes('source') || sourceType === 'testgen') && 
        (targetType === 'encoder' || targetType?.includes('sink'))) {
      return true;
    }
    
    if (sourceType === 'encoder' && targetType?.includes('sink')) {
      return true;
    }
    
    toast.error("Invalid connection between these node types");
    return false;
  }, [edges, nodes]);

  const handleConnect = useCallback((params) => {
    if (validateConnection(params)) {
      onConnect(params);
      toast.success("Connection established");
    }
  }, [validateConnection, onConnect]);
  
  const handleFileSelect = (filePath: string) => {
    if (fileSelectedNodeId) {
      updateNodeData(fileSelectedNodeId, {
        uri: filePath
      });
      setFileBrowserOpen(false);
      setFileSelectedNodeId(null);
      toast.success("File path updated");
    }
  };
  
  const handleNdiSourceSelect = (nodeId: string, sourceId: string, sourceName: string, ipAddress: string) => {
    selectNdiSource(nodeId, sourceId, sourceName, ipAddress);
    toast.success(`Connected to NDI source: ${sourceName}`);
  };
  
  const handleAudioLevelChange = (nodeId: string, sourceId: string, level: number) => {
    updateAudioMixer(nodeId, sourceId, { level });
  };
  
  const handleAudioMuteToggle = (nodeId: string, sourceId: string, muted: boolean) => {
    updateAudioMixer(nodeId, sourceId, { muted });
    toast.info(`${muted ? 'Muted' : 'Unmuted'} audio source: ${sourceId}`);
  };

  const handleAddExternalAudio = (encoderNodeId: string, sourceNodeId: string, sourceLabel: string, sourceType: string) => {
    addExternalAudioToEncoder(encoderNodeId, sourceNodeId, sourceLabel, sourceType);
    toast.success(`Added external audio: ${sourceLabel}`);
  };
  
  const handleRemoveAudioSource = (encoderNodeId: string, sourceId: string) => {
    removeAudioSource(encoderNodeId, sourceId);
    toast.success("Removed audio source");
  };

  // Process nodes to find available audio sources for each encoder
  const processedNodes = nodes.map(node => {
    if (node.type === 'ndi-source') {
      return {
        ...node,
        data: {
          ...node.data,
          onSourceSelect: (sourceId: string, sourceName: string, ipAddress: string) => 
            handleNdiSourceSelect(node.id, sourceId, sourceName, ipAddress)
        }
      };
    }
    
    if (node.type === 'encoder') {
      // Find all source nodes connected to this encoder
      const incomingEdges = edges.filter(e => e.target === node.id);
      const connectedSourceNodes = incomingEdges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        return sourceNode;
      }).filter(Boolean);
      
      // Find all other potential audio sources (not already connected)
      const availableExternalAudio = nodes
        .filter(n => 
          // Is a source type node
          (n.type?.includes('source') || n.type === 'testgen') && 
          // Not already connected to this encoder
          !incomingEdges.some(e => e.source === n.id)
        )
        .map(n => ({
          id: `${n.id}-audio`,
          label: `${n.data.label || n.type} Audio`,
          nodeId: n.id,
          type: n.type || ''
        }));
      
      return {
        ...node,
        data: {
          ...node.data,
          availableExternalAudio,
          onAudioLevelChange: (sourceId: string, level: number) => 
            handleAudioLevelChange(node.id, sourceId, level),
          onAudioMuteToggle: (sourceId: string, muted: boolean) => 
            handleAudioMuteToggle(node.id, sourceId, muted),
          onAddExternalAudio: (sourceNodeId: string, sourceLabel: string, sourceType: string) =>
            handleAddExternalAudio(node.id, sourceNodeId, sourceLabel, sourceType),
          onRemoveAudioSource: (sourceId: string) =>
            handleRemoveAudioSource(node.id, sourceId)
        }
      };
    }
    
    return node;
  });

  return (
    <>
      <ReactFlow
        nodes={processedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultViewport={{ x: 0, y: 0, zoom: 1.5 }}
        minZoom={0.2}
        maxZoom={4}
        fitView
        style={{ background: '#1A1F2C' }}
        connectionLineStyle={{ stroke: '#9b87f5', strokeWidth: 2 }}
        defaultEdgeOptions={{
          style: { stroke: '#9b87f5', strokeWidth: 2 },
          type: 'smoothstep',
          animated: true,
        }}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        nodeExtent={[[-Infinity, -Infinity], [Infinity, Infinity]]}
      >
        <Background color="#2A2F3C" gap={16} />
        <Controls />
        <Panel position="top-right">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDeleteSelected}
            className="flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </Button>
        </Panel>
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.type?.includes('source')) return '#4ade80';
            if (n.type === 'encoder') return '#facc15';
            return '#f87171';
          }}
          nodeColor={(n) => {
            if (n.type?.includes('source')) return '#4ade8060';
            if (n.type === 'encoder') return '#facc1560';
            return '#f8717160';
          }}
          maskColor="#1A1F2C80"
          style={{ background: '#222532' }}
        />
      </ReactFlow>
      
      <FileBrowser 
        isOpen={fileBrowserOpen} 
        onClose={() => setFileBrowserOpen(false)}
        onSelect={handleFileSelect}
      />
    </>
  );
};

export default FlowCanvas;
