
export const getNodeColor = (nodeType: string | undefined): string => {
  if (!nodeType) return '#9b87f5';
  
  if (nodeType.includes('source')) {
    if (nodeType === 'ndi-source') return '#22d3ee';
    return '#4ade80';
  } else if (nodeType === 'encoder') {
    return '#facc15';
  } else if (nodeType.includes('sink')) {
    return '#f87171';
  } else if (nodeType === 'testgen') {
    return '#22d3ee';
  }
  
  return '#9b87f5'; // Default color
};

export const getNodeIcon = (nodeType: string | undefined) => {
  if (!nodeType) return null;
  
  const iconMap: any = {
    'source': 'FileInput',
    'srt-source': 'Wifi',
    'rtmp-source': 'Wifi',
    'file-source': 'FileInput',
    'ndi-source': 'Cast',
    'encoder': 'Sliders',
    'sink': 'FileOutput',
    'srt-sink': 'Wifi',
    'rtmp-sink': 'Wifi',
    'file-sink': 'FileOutput',
    'testgen': 'Monitor',
  };
  
  return iconMap[nodeType] || null;
};

export const validateConnection = (source: any, target: any, edges: any[]) => {
  if (!source || !target) return false;
  
  // Check if the connection already exists
  const connectionExists = edges.some(
    edge => edge.source === source.id && edge.target === target.id
  );
  
  if (connectionExists) return false;
  
  // Check valid connection types
  const sourceType = source.type;
  const targetType = target.type;
  
  // Source nodes can connect to encoders or sinks
  if ((sourceType.includes('source') || sourceType === 'ndi-source') && 
     (targetType === 'encoder' || targetType.includes('sink'))) {
    return true;
  }
  
  // Encoders can connect to multiple sinks (1-to-many)
  if (sourceType === 'encoder' && targetType.includes('sink')) {
    return true;
  }
  
  // Test generators can connect to encoders or sinks
  if (sourceType === 'testgen' && 
     (targetType === 'encoder' || targetType.includes('sink'))) {
    return true;
  }
  
  return false;
};

// Helper function to get all sources connected to a node
export const getConnectedSources = (nodeId: string, nodes: any[], edges: any[]) => {
  return edges
    .filter(edge => edge.target === nodeId)
    .map(edge => nodes.find(node => node.id === edge.source))
    .filter(Boolean);
};

// Helper function to get all destinations connected to a node
export const getConnectedDestinations = (nodeId: string, nodes: any[], edges: any[]) => {
  return edges
    .filter(edge => edge.source === nodeId)
    .map(edge => nodes.find(node => node.id === edge.target))
    .filter(Boolean);
};
