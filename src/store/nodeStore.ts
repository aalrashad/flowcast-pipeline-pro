
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
import gstreamerService, { GstPipeline, GstPipelineState } from "@/services/GstreamerService";

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

// Interface for the pipeline entries in the store, allowing for pending promises
interface PipelineEntry {
  pipeline: GstPipeline;
  statusInterval?: NodeJS.Timeout; // Changed from number to NodeJS.Timeout
  pending?: boolean;
}

type RFState = {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  pipelines: Record<string, PipelineEntry>;
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
  updateGstreamerNodeStatus: (nodeId: string) => void;
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
    // Create a placeholder pipeline until the real one is created
    const placeholderPipeline: GstPipeline = {
      id: `temp-${nodeId}-${sourceId}`,
      description: `NDI Source: ${sourceName}`,
      state: 'CONNECTING',
      elements: [],
      lastStateChange: new Date()
    };
    
    // Update the node immediately with placeholder data
    set(state => ({
      pipelines: {
        ...state.pipelines,
        [nodeId]: { pipeline: placeholderPipeline }
      },
      nodes: state.nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              sourceName,
              ipAddress,
              status: 'connecting',
              pipelineId: placeholderPipeline.id
            }
          };
        }
        return node;
      })
    }));
    
    // Create the actual pipeline asynchronously
    gstreamerService.createNdiSourcePipeline(sourceName)
      .then(pipeline => {
        // Update the store with the real pipeline once it's created
        set(state => ({
          pipelines: {
            ...state.pipelines,
            [nodeId]: { pipeline }
          },
          nodes: state.nodes.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  pipelineId: pipeline.id
                }
              };
            }
            return node;
          })
        }));
      })
      .catch(error => {
        console.error('Failed to create NDI pipeline:', error);
        // Update node to show error state
        set({
          nodes: get().nodes.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  status: 'error',
                  errorMessage: error.message || 'Failed to create pipeline'
                }
              };
            }
            return node;
          })
        });
      });
  },
  
  deleteNode: (nodeId) => {
    // Remove any associated GStreamer pipelines
    const pipelineEntry = get().pipelines[nodeId];
    if (pipelineEntry) {
      gstreamerService.deletePipeline(pipelineEntry.pipeline.id);
      
      // Remove pipeline from state
      const updatedPipelines = {...get().pipelines};
      delete updatedPipelines[nodeId];
      set({ pipelines: updatedPipelines });
      
      // Clear any status update intervals
      if (pipelineEntry.statusInterval) {
        clearInterval(pipelineEntry.statusInterval);
      }
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
    
    // Create a placeholder pipeline until the real one is created
    const placeholderPipeline: GstPipeline = {
      id: `temp-${sourceNodeId}-${encoderNodeId}`,
      description: `Pipeline: ${sourceNode.data?.label || 'Source'} -> ${encoderNode.data?.label || 'Encoder'}`,
      state: 'CONNECTING',
      elements: [],
      lastStateChange: new Date()
    };
    
    // Store the placeholder pipeline
    set(state => ({
      pipelines: {
        ...state.pipelines,
        [sourceNodeId]: { pipeline: placeholderPipeline, pending: true }
      },
      nodes: state.nodes.map(node => {
        if (node.id === sourceNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              pipelineId: placeholderPipeline.id,
              status: 'connecting'
            }
          };
        }
        return node;
      })
    }));
    
    // Now create the actual pipeline asynchronously
    let pipelinePromise: Promise<GstPipeline> | null = null;
    
    // Create different pipelines based on source type
    if (sourceNode.type === 'srt-source' && sourceNode.data?.uri) {
      // Type assertion to handle the unknown type
      const sourceUri = sourceNode.data.uri as string;
      pipelinePromise = gstreamerService.createSrtSourcePipeline(
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
      pipelinePromise = gstreamerService.createNdiSourcePipeline(sourceName);
    }
    
    if (pipelinePromise) {
      pipelinePromise
        .then(pipeline => {
          // Store the actual pipeline once created
          set(state => ({
            pipelines: {
              ...state.pipelines,
              [sourceNodeId]: { pipeline, pending: false }
            },
            nodes: state.nodes.map(node => {
              if (node.id === sourceNodeId) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    pipelineId: pipeline.id
                  }
                };
              }
              return node;
            })
          }));
          
          // Update status immediately
          get().updateGstreamerNodeStatus(sourceNodeId);
        })
        .catch(error => {
          console.error('Failed to create pipeline:', error);
          
          // Update node with error state
          set({
            nodes: get().nodes.map(node => {
              if (node.id === sourceNodeId) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    status: 'error',
                    errorMessage: error.message || 'Failed to create pipeline'
                  }
                };
              }
              return node;
            })
          });
        });
    }
  },
  
  startGstPipeline: (nodeId) => {
    const pipelineEntry = get().pipelines[nodeId];
    if (!pipelineEntry) {
      console.error(`No pipeline found for node ${nodeId}`);
      return;
    }
    
    // Update node status immediately to show feedback
    set({
      nodes: get().nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              status: 'connecting'
            }
          };
        }
        return node;
      })
    });
    
    // Start the pipeline
    gstreamerService.startPipeline(pipelineEntry.pipeline.id)
      .then(success => {
        if (!success) {
          throw new Error('Failed to start pipeline');
        }
        
        // Start polling for pipeline status updates
        const statusInterval = setInterval(() => {
          get().updateGstreamerNodeStatus(nodeId);
        }, 1000);
        
        // Store the interval ID in the pipeline object
        set(state => ({
          pipelines: {
            ...state.pipelines,
            [nodeId]: { 
              ...state.pipelines[nodeId],
              statusInterval
            }
          }
        }));
      })
      .catch(error => {
        console.error('Failed to start pipeline:', error);
        
        // Update node with error state
        set({
          nodes: get().nodes.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  status: 'error',
                  errorMessage: error.message || 'Failed to start pipeline'
                }
              };
            }
            return node;
          })
        });
      });
  },
  
  stopGstPipeline: (nodeId) => {
    const pipelineEntry = get().pipelines[nodeId];
    if (!pipelineEntry) {
      console.error(`No pipeline found for node ${nodeId}`);
      return;
    }
    
    // Clear status update interval if it exists
    if (pipelineEntry.statusInterval) {
      clearInterval(pipelineEntry.statusInterval);
    }
    
    gstreamerService.stopPipeline(pipelineEntry.pipeline.id)
      .then(success => {
        if (!success) {
          throw new Error('Failed to stop pipeline');
        }
        
        set({
          nodes: get().nodes.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  status: 'paused'
                }
              };
            }
            return node;
          })
        });
      })
      .catch(error => {
        console.error('Failed to stop pipeline:', error);
        
        // Update node with error state if needed
        // We might not update the node state here since stopping failure
        // doesn't necessarily mean the pipeline isn't running anymore
      });
  },
  
  updateGstreamerNodeStatus: (nodeId) => {
    const pipelineEntry = get().pipelines[nodeId];
    if (!pipelineEntry || pipelineEntry.pending) {
      // Skip update if no pipeline or pipeline is pending
      return;
    }
    
    // Get current pipeline status
    const pipelineStatus = gstreamerService.getPipelineStatus(pipelineEntry.pipeline.id);
    
    // Map GStreamer pipeline state to node status
    const nodeStatus = (): string => {
      switch (pipelineStatus.state) {
        case 'RECEIVING': return 'receiving';
        case 'CONNECTING': return 'connecting';
        case 'RECONNECTING': return 'reconnecting';
        case 'BUFFERING': return 'buffering';
        case 'PAUSED': return 'paused';
        case 'PLAYING': return 'playing';
        case 'ERROR': return 'error';
        case 'NULL':
        case 'DISCONNECTED': 
        default: return 'idle';
      }
    };
    
    // Update node with current status
    set({
      nodes: get().nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              status: nodeStatus(),
              pipelineStatus
            }
          };
        }
        return node;
      })
    });
  }
}));
