
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
  NodeResizeControl,
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
  
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setSelectedNode, updateNodeData, updateNodeDimensions, selectNdiSource, updateAudioMixer } = useNodeStore();
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
  
  const onNodeResize = useCallback((_, node, width, height) => {
    updateNodeDimensions(node.id, width, height);
  }, [updateNodeDimensions]);

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

  // Process nodes to add event handlers
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
      return {
        ...node,
        data: {
          ...node.data,
          onAudioLevelChange: (sourceId: string, level: number) => 
            handleAudioLevelChange(node.id, sourceId, level),
          onAudioMuteToggle: (sourceId: string, muted: boolean) => 
            handleAudioMuteToggle(node.id, sourceId, muted)
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
        onNodeResize={onNodeResize}
      >
        <Background color="#2A2F3C" gap={16} />
        <Controls />
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
