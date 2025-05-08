
import { useCallback } from 'react';
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
import SinkNode from '@/components/nodes/SinkNode';
import TestGenNode from '@/components/nodes/TestGenNode';
import { toast } from 'sonner';

const nodeTypes: NodeTypes = {
  source: SourceNode,
  'srt-source': SourceNode,
  'rist-source': SourceNode,
  'rtmp-source': SourceNode,
  'file-source': SourceNode,
  encoder: EncoderNode,
  sink: SinkNode,
  'srt-sink': SinkNode,
  'rtmp-sink': SinkNode,
  'file-sink': SinkNode,
  testgen: TestGenNode,
};

const FlowCanvas = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setSelectedNode } = useNodeStore();
  const reactFlowInstance = useReactFlow();

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

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

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      onNodeClick={onNodeClick}
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
  );
};

export default FlowCanvas;
