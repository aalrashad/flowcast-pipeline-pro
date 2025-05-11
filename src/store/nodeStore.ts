
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
  updateNodeDimensions: (nodeId: string, width: number, height: number) => void;
  duplicateConnection: (sourceId: string, targetIds: string[]) => void;
  updateAudioMixer: (nodeId: string, sourceId: string, data: {level?: number, muted?: boolean}) => void;
  selectNdiSource: (nodeId: string, sourceId: string, sourceName: string, ipAddress: string) => void;
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
      status: 'idle',
      width: 240,
      height: 200,
      audioSources: [
        { id: 'main', label: 'Main Source', level: 75, muted: false },
        { id: 'secondary', label: 'Secondary Source', level: 0, muted: true },
      ]
    },
    position: { x: 350, y: 100 },
    style: { width: 240, height: 200 },
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
  {
    id: '6',
    type: 'ndi-source',
    data: { 
      label: 'NDI Source',
      sourceName: 'No source selected',
      ipAddress: '',
      status: 'offline',
      ndiSources: [
        { id: 'ndi1', name: 'Camera 1', ipAddress: '192.168.1.100' },
        { id: 'ndi2', name: 'Camera 2', ipAddress: '192.168.1.101' },
        { id: 'ndi3', name: 'Graphics', ipAddress: '192.168.1.102' },
      ]
    },
    position: { x: 100, y: 400 },
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
    const newEdge = { 
      ...connection, 
      id: `e${connection.source}-${connection.target}`, 
      type: 'smoothstep', 
      animated: true 
    } as Edge;
    
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
      
      if (type === 'ndi-source') {
        newNode.data = {
          label: 'NDI Source',
          sourceName: 'No source selected',
          ipAddress: '',
          status: 'offline',
          ndiSources: [
            { id: 'ndi1', name: 'Camera 1', ipAddress: '192.168.1.100' },
            { id: 'ndi2', name: 'Camera 2', ipAddress: '192.168.1.101' },
            { id: 'ndi3', name: 'Graphics', ipAddress: '192.168.1.102' },
          ]
        };
      }
    } else if (type === 'encoder') {
      newNode.data = {
        label: 'Encoder',
        codec: 'H.264',
        bitrate: 5000,
        resolution: '1920x1080',
        frameRate: 30,
        status: 'idle',
        width: 240,
        height: 200,
        audioSources: [
          { id: 'main', label: 'Main Source', level: 75, muted: false },
          { id: 'secondary', label: 'Secondary Source', level: 0, muted: true },
        ]
      };
      
      newNode.style = {
        width: 240,
        height: 200
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
  
  updateNodeDimensions: (nodeId, width, height) => {
    set({
      nodes: get().nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            style: {
              ...node.style,
              width,
              height
            },
            data: {
              ...node.data,
              width,
              height
            }
          };
        }
        return node;
      }),
    });
  },
  
  duplicateConnection: (sourceId, targetIds) => {
    const newEdges = [...get().edges];
    
    // Type guard: ensure targetIds is an array before using map
    if (Array.isArray(targetIds)) {
      targetIds.forEach(targetId => {
        const edgeId = `e${sourceId}-${targetId}`;
        
        // Check if this connection already exists
        const connectionExists = newEdges.some(edge => 
          edge.source === sourceId && edge.target === targetId
        );
        
        if (!connectionExists) {
          newEdges.push({
            id: edgeId,
            source: sourceId,
            target: targetId,
            type: 'smoothstep',
            animated: true
          } as Edge);
        }
      });
    }
    
    set({ edges: newEdges });
  },
  
  updateAudioMixer: (nodeId, sourceId, data) => {
    set({
      nodes: get().nodes.map(node => {
        if (node.id === nodeId && node.data.audioSources) {
          const updatedAudioSources = Array.isArray(node.data.audioSources) 
            ? node.data.audioSources.map(source => {
                if (source.id === sourceId) {
                  return {
                    ...source,
                    ...data
                  };
                }
                return source;
              })
            : [];
          
          return {
            ...node,
            data: {
              ...node.data,
              audioSources: updatedAudioSources
            }
          };
        }
        return node;
      })
    });
  },
  
  selectNdiSource: (nodeId, sourceId, sourceName, ipAddress) => {
    set({
      nodes: get().nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              sourceName,
              ipAddress,
              status: 'connected'
            }
          };
        }
        return node;
      })
    });
  }
}));
