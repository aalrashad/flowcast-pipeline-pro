
import { create } from "zustand";
import { useNodeStore } from "@/store/nodeStore";
import { toast } from "sonner";
import { Node, Edge, NodeChange, EdgeChange } from "@xyflow/react";

type FlowHistoryState = {
  past: {
    nodes: Node[];
    edges: Edge[];
  }[];
  future: {
    nodes: Node[];
    edges: Edge[];
  }[];
  savedState: {
    nodes: Node[];
    edges: Edge[];
  } | null;
};

type FlowState = FlowHistoryState & {
  canUndo: boolean;
  canRedo: boolean;
  saveFlow: () => void;
  loadFlow: () => void;
  undo: () => void;
  redo: () => void;
  addToHistory: () => void;
};

export const useFlowStore = create<FlowState>((set, get) => ({
  past: [],
  future: [],
  savedState: null,
  canUndo: false,
  canRedo: false,
  
  saveFlow: () => {
    const { nodes, edges } = useNodeStore.getState();
    set({
      savedState: {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      },
    });
    
    // In a real application, we would save to local storage or server
    localStorage.setItem('flowState', JSON.stringify({ nodes, edges }));
  },
  
  loadFlow: () => {
    const { savedState } = get();
    
    if (savedState) {
      const nodeStore = useNodeStore.getState();
      // Apply each node individually
      savedState.nodes.forEach((node) => {
        nodeStore.onNodesChange([
          { type: 'replace', id: node.id, item: node },
        ]);
      });
      
      // Apply each edge individually
      savedState.edges.forEach((edge) => {
        nodeStore.onEdgesChange([
          { type: 'replace', id: edge.id, item: edge },
        ]);
      });
    } else {
      // Try loading from localStorage in a real app
      const savedFlow = localStorage.getItem('flowState');
      if (savedFlow) {
        try {
          const { nodes, edges } = JSON.parse(savedFlow);
          const nodeStore = useNodeStore.getState();
          
          // Apply nodes individually
          nodes.forEach((node) => {
            nodeStore.onNodesChange([
              { type: 'replace', id: node.id, item: node },
            ]);
          });
          
          // Apply edges individually
          edges.forEach((edge) => {
            nodeStore.onEdgesChange([
              { type: 'replace', id: edge.id, item: edge },
            ]);
          });
        } catch (e) {
          toast.error("Failed to load saved flow");
        }
      }
    }
    
    // Add current state to history after loading
    get().addToHistory();
  },
  
  addToHistory: () => {
    const { nodes, edges } = useNodeStore.getState();
    
    set(state => {
      const newPast = [
        ...state.past,
        {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        },
      ].slice(-20); // Keep only last 20 states
      
      return {
        past: newPast,
        future: [],
        canUndo: newPast.length > 0,
        canRedo: false,
      };
    });
  },
  
  undo: () => {
    const { past } = get();
    
    if (past.length === 0) return;
    
    const newPast = [...past];
    const previous = newPast.pop();
    
    if (!previous) return;
    
    set(state => {
      const { nodes, edges } = useNodeStore.getState();
      
      const newFuture = [
        {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        },
        ...state.future,
      ];
      
      // Apply the previous state
      const nodeStore = useNodeStore.getState();
      
      // Apply nodes individually
      previous.nodes.forEach((node) => {
        nodeStore.onNodesChange([
          { type: 'replace', id: node.id, item: node },
        ]);
      });
      
      // Apply edges individually
      previous.edges.forEach((edge) => {
        nodeStore.onEdgesChange([
          { type: 'replace', id: edge.id, item: edge },
        ]);
      });
      
      return {
        past: newPast,
        future: newFuture,
        canUndo: newPast.length > 0,
        canRedo: true,
      };
    });
  },
  
  redo: () => {
    const { future } = get();
    
    if (future.length === 0) return;
    
    const newFuture = [...future];
    const next = newFuture.shift();
    
    if (!next) return;
    
    set(state => {
      const { nodes, edges } = useNodeStore.getState();
      
      const newPast = [
        ...state.past,
        {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        },
      ];
      
      // Apply the next state
      const nodeStore = useNodeStore.getState();
      
      // Apply nodes individually
      next.nodes.forEach((node) => {
        nodeStore.onNodesChange([
          { type: 'replace', id: node.id, item: node },
        ]);
      });
      
      // Apply edges individually
      next.edges.forEach((edge) => {
        nodeStore.onEdgesChange([
          { type: 'replace', id: edge.id, item: edge },
        ]);
      });
      
      return {
        past: newPast,
        future: newFuture,
        canUndo: true,
        canRedo: newFuture.length > 0,
      };
    });
  },
}));

// Add a listener to node changes to update history
useNodeStore.subscribe(
  (state) => [state.nodes, state.edges],
  () => {
    useFlowStore.getState().addToHistory();
  }
);
