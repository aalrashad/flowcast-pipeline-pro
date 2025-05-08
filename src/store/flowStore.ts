
import { create } from "zustand";
import { useNodeStore } from "@/store/nodeStore";
import { toast } from "sonner";

type FlowHistoryState = {
  past: {
    nodes: any[];
    edges: any[];
  }[];
  future: {
    nodes: any[];
    edges: any[];
  }[];
  savedState: {
    nodes: any[];
    edges: any[];
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
      nodeStore.onNodesChange([
        { type: 'reset', items: savedState.nodes },
      ]);
      nodeStore.onEdgesChange([
        { type: 'reset', items: savedState.edges },
      ]);
    } else {
      // Try loading from localStorage in a real app
      const savedFlow = localStorage.getItem('flowState');
      if (savedFlow) {
        try {
          const { nodes, edges } = JSON.parse(savedFlow);
          const nodeStore = useNodeStore.getState();
          nodeStore.onNodesChange([
            { type: 'reset', items: nodes },
          ]);
          nodeStore.onEdgesChange([
            { type: 'reset', items: edges },
          ]);
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
      nodeStore.onNodesChange([
        { type: 'reset', items: previous.nodes },
      ]);
      nodeStore.onEdgesChange([
        { type: 'reset', items: previous.edges },
      ]);
      
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
      nodeStore.onNodesChange([
        { type: 'reset', items: next.nodes },
      ]);
      nodeStore.onEdgesChange([
        { type: 'reset', items: next.edges },
      ]);
      
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
