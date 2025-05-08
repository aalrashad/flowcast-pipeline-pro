
import { create } from "zustand";
import { 
  Connection,
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
} from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";

type NodeData = {
  label?: string;
  [key: string]: any;
};

type RFState = {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: string) => void;
  updateNodeData: (nodeId: string, data: NodeData) => void;
  setSelectedNode: (node: Node | null) => void;
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'srt-source',
    data: { 
      label: 'SRT Source',
      protocol: 'SRT',
      uri: 'srt://example.com:9000',
      status: 'offline' 
    },
    position: { x: 100, y: 100 },
  },
  {
    id: '2',
    type: 'encoder',
    data: { 
      label: 'Main Encoder',
      codec: 'H.264',
      bitrate: 5000,
      resolution: '1920x1080',
      frameRate: 30,
      status: 'idle'
    },
    position: { x: 350, y: 100 },
  },
  {
    id: '3',
    type: 'rtmp-sink',
    data: { 
      label: 'RTMP Output',
      protocol: 'RTMP',
      uri: 'rtmp://stream.example.com/live/stream',
      status: 'offline'
    },
    position: { x: 600, y: 100 },
  },
  {
    id: '4',
    type: 'testgen',
    data: { 
      label: 'Color Bars',
      pattern: 'Color Bars',
      resolution: '1920x1080',
      frameRate: 30,
      status: 'idle'
    },
    position: { x: 100, y: 250 },
  },
  {
    id: '5',
    type: 'file-sink',
    data: { 
      label: 'MP4 Recording',
      protocol: 'MP4',
      uri: '/recordings/output.mp4',
      status: 'offline'
    },
    position: { x: 600, y: 250 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true },
  { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', animated: true },
];

export const useNodeStore = create<RFState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNode: null,
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  onConnect: (connection: Connection) => {
    const newEdge = { ...connection, id: `e${connection.source}-${connection.target}`, type: 'smoothstep', animated: true };
    set({
      edges: addEdge(newEdge, get().edges),
    });
  },
  
  addNode: (type) => {
    const getId = () => `node-${uuidv4().slice(0, 8)}`;
    const id = getId();
    
    let newNode: Node = {
      id,
      type,
      position: { x: 250, y: 150 },
      data: { label: `${type.charAt(0).toUpperCase() + type.slice(1)}` },
    };
    
    // Customize node based on type
    if (type.includes('source')) {
      const protocol = type.split('-')[0].toUpperCase();
      newNode.data = {
        label: `${protocol} Source`,
        protocol,
        uri: protocol === 'FILE' ? '/path/to/video.mp4' : `${protocol.toLowerCase()}://example.com:9000`,
        status: 'offline'
      };
    } else if (type === 'encoder') {
      newNode.data = {
        label: 'Encoder',
        codec: 'H.264',
        bitrate: 5000,
        resolution: '1920x1080',
        frameRate: 30,
        status: 'idle'
      };
    } else if (type.includes('sink')) {
      const protocol = type.split('-')[0].toUpperCase();
      newNode.data = {
        label: `${protocol} Output`,
        protocol,
        uri: protocol === 'FILE' ? '/path/to/output.mp4' : `${protocol.toLowerCase()}://example.com:9000`,
        status: 'offline'
      };
    } else if (type === 'testgen') {
      newNode.data = {
        label: 'Test Generator',
        pattern: 'Color Bars',
        resolution: '1920x1080',
        frameRate: 30,
        status: 'idle'
      };
    }
    
    set({
      nodes: [...get().nodes, newNode],
    });
  },
  
  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          };
        }
        return node;
      }),
    });
  },
  
  setSelectedNode: (node) => {
    set({ selectedNode: node });
  },
}));
