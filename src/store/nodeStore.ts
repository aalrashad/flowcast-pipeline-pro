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
import gstreamerService, { GstPipeline } from "@/services/GstreamerService";

type NodeData = {
  label?: string;
  [key: string]: any;
};

type AudioSource = {
  id: string;
  label: string;
  level: number;
  muted: boolean;
  sourceNodeId?: string;
  sourceType?: string;
};

type RFState = {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  pipelines: Record<string, GstPipeline>;
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
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  addExternalAudioToEncoder: (encoderNodeId: string, sourceNodeId: string, sourceLabel: string, sourceType: string) => void;
  removeAudioSource: (encoderNodeId: string, sourceId: string) => void;
  createGstPipeline: (sourceNodeId: string, encoderNodeId: string) => void;
  startGstPipeline: (nodeId: string) => void;
  stopGstPipeline: (nodeId: string) => void;
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
  pipelines: {},
  
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
    
    // Ensure targetIds is an array before using forEach
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
        if (node.id === nodeId && node.data?.audioSources) {
          // Ensure node.data.audioSources is an array before using map
          const audioSources = Array.isArray(node.data.audioSources) 
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
              audioSources: audioSources
            }
          };
        }
        return node;
      })
    });
  },
  
  selectNdiSource: (nodeId: string, sourceId: string, sourceName: string, ipAddress: string) => {
    set({
      nodes: get().nodes.map(node => {
        if (node.id === nodeId) {
          // Create a GStreamer NDI pipeline when selecting a source
          const pipelineId = `ndi-${nodeId}-${sourceId}`;
          const pipeline = gstreamerService.createNdiSourcePipeline(sourceName);
          
          // Store the pipeline reference
          set(state => ({
            pipelines: {
              ...state.pipelines,
              [nodeId]: pipeline
            }
          }));
          
          return {
            ...node,
            data: {
              ...node.data,
              sourceName,
              ipAddress,
              status: 'connected',
              pipelineId: pipeline.id
            }
          };
        }
        return node;
      })
    });
  },
  
  deleteNode: (nodeId) => {
    // Remove any associated GStreamer pipelines
    if (get().pipelines[nodeId]) {
      gstreamerService.deletePipeline(get().pipelines[nodeId].id);
      
      // Remove pipeline from state
      const updatedPipelines = {...get().pipelines};
      delete updatedPipelines[nodeId];
      set({ pipelines: updatedPipelines });
    }
    
    // Remove the node and connected edges
    const updatedNodes = get().nodes.filter(node => node.id !== nodeId);
    const updatedEdges = get().edges.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    );
    
    set({
      nodes: updatedNodes,
      edges: updatedEdges,
      selectedNode: get().selectedNode?.id === nodeId ? null : get().selectedNode
    });
  },
  
  deleteEdge: (edgeId) => {
    const updatedEdges = get().edges.filter(edge => edge.id !== edgeId);
    set({ edges: updatedEdges });
  },
  
  addExternalAudioToEncoder: (encoderNodeId, sourceNodeId, sourceLabel, sourceType) => {
    const nodes = get().nodes;
    const encoderNode = nodes.find(node => node.id === encoderNodeId);
    
    if (encoderNode && encoderNode.data?.audioSources) {
      // Create a unique ID for this audio source
      const audioSourceId = `audio-${sourceNodeId}-${uuidv4().slice(0, 4)}`;
      
      // Add the new audio source
      const newAudioSource: AudioSource = {
        id: audioSourceId,
        label: sourceLabel,
        level: 75,
        muted: false,
        sourceNodeId,
        sourceType
      };
      
      // Ensure audioSources is an array before trying to spread it
      const currentAudioSources = Array.isArray(encoderNode.data.audioSources) 
        ? encoderNode.data.audioSources 
        : [];
      
      // Update encoder node with new audio source
      set({
        nodes: nodes.map(node => {
          if (node.id === encoderNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                audioSources: [...currentAudioSources, newAudioSource]
              }
            };
          }
          return node;
        })
      });
    }
  },
  
  removeAudioSource: (encoderNodeId, sourceId) => {
    const nodes = get().nodes;
    
    set({
      nodes: nodes.map(node => {
        if (node.id === encoderNodeId && node.data?.audioSources) {
          // Ensure audioSources is an array before using filter
          const audioSources = Array.isArray(node.data.audioSources) 
            ? node.data.audioSources.filter(source => source.id !== sourceId)
            : [];
            
          return {
            ...node,
            data: {
              ...node.data,
              audioSources: audioSources
            }
          };
        }
        return node;
      })
    });
  },
  
  createGstPipeline: (sourceNodeId: string, encoderNodeId: string) => {
    const nodes = get().nodes;
    const sourceNode = nodes.find(node => node.id === sourceNodeId);
    const encoderNode = nodes.find(node => node.id === encoderNodeId);
    
    if (!sourceNode || !encoderNode) {
      console.error('Source or encoder node not found');
      return;
    }
    
    let pipeline: GstPipeline | null = null;
    
    // Create different pipelines based on source type
    if (sourceNode.type === 'srt-source' && sourceNode.data?.uri) {
      // Type assertion to handle the unknown type
      const sourceUri = sourceNode.data.uri as string;
      pipeline = gstreamerService.createSrtSourcePipeline(
        sourceUri,
        {
          bitrate: encoderNode.data?.bitrate || 5000,
          // Type assertion to ensure string type for output URI
          outputUri: 'rtmp://example.com/live/stream'
        }
      );
    } else if (sourceNode.type === 'ndi-source' && sourceNode.data?.sourceName) {
      // Type assertion to handle the unknown type
      const sourceName = sourceNode.data.sourceName as string;
      pipeline = gstreamerService.createNdiSourcePipeline(sourceName);
    }
    
    if (pipeline) {
      // Store the pipeline reference
      set(state => ({
        pipelines: {
          ...state.pipelines,
          [sourceNodeId]: pipeline as GstPipeline
        },
        nodes: state.nodes.map(node => {
          if (node.id === sourceNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                pipelineId: pipeline?.id
              }
            };
          }
          return node;
        })
      }));
    }
  },
  
  startGstPipeline: (nodeId) => {
    const pipeline = get().pipelines[nodeId];
    if (!pipeline) {
      console.error(`No pipeline found for node ${nodeId}`);
      return;
    }
    
    if (gstreamerService.startPipeline(pipeline.id)) {
      set({
        nodes: get().nodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                status: 'connected'
              }
            };
          }
          return node;
        })
      });
    }
  },
  
  stopGstPipeline: (nodeId) => {
    const pipeline = get().pipelines[nodeId];
    if (!pipeline) {
      console.error(`No pipeline found for node ${nodeId}`);
      return;
    }
    
    if (gstreamerService.stopPipeline(pipeline.id)) {
      set({
        nodes: get().nodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                status: 'offline'
              }
            };
          }
          return node;
        })
      });
    }
  }
}));
