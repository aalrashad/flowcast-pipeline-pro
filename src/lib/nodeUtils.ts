
export const getNodeColor = (nodeType: string | undefined): string => {
  if (!nodeType) return '#9b87f5';
  
  if (nodeType.includes('source') || nodeType === 'source') {
    return '#4ade80';
  } else if (nodeType === 'encoder') {
    return '#facc15';
  } else if (nodeType.includes('sink') || nodeType === 'sink') {
    return '#f87171';
  } else if (nodeType === 'testgen') {
    return '#22d3ee';
  }
  
  return '#9b87f5'; // Default color
};

export const getNodeIcon = (nodeType: string | undefined) => {
  if (!nodeType) return null;
  
  // This would be expanded with actual icons as needed
  const iconMap: any = {
    'source': 'FileInput',
    'encoder': 'Sliders',
    'sink': 'FileOutput',
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
  if (sourceType.includes('source') && 
     (targetType === 'encoder' || targetType.includes('sink'))) {
    return true;
  }
  
  // Encoders can connect to sinks
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
