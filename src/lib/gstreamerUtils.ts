
/**
 * Utility functions for working with GStreamer pipelines
 */

// Convert a pipeline description string into an element array
export const parsePipelineString = (pipelineString: string) => {
  // Simple parser for GStreamer pipeline strings like:
  // "videotestsrc ! videoconvert ! autovideosink"
  const elements = pipelineString.split('!').map(element => {
    const trimmed = element.trim();
    const parts = trimmed.split(' ');
    const type = parts[0];
    const properties: Record<string, string> = {};
    
    // Parse properties like "property=value"
    parts.slice(1).forEach(prop => {
      const [key, value] = prop.split('=');
      if (key && value) {
        // Convert kebab-case to camelCase for JavaScript compatibility
        const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        properties[camelKey] = value.replace(/"/g, '');
      }
    });
    
    return {
      type,
      properties
    };
  });
  
  return elements;
};

// Generate a GStreamer pipeline string from element configuration
export const generatePipelineString = (elements: any[]) => {
  return elements.map(element => {
    const props = Object.entries(element.properties || {})
      .map(([key, value]) => {
        // Convert camelCase back to kebab-case for GStreamer CLI format
        const kebabKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        
        // Handle string values that need quotes
        const formattedValue = typeof value === 'string' && !value.match(/^\d+$/)
          ? `"${value}"`
          : value;
          
        return `${kebabKey}=${formattedValue}`;
      })
      .join(' ');
    
    return `${element.type} ${props}`.trim();
  }).join(' ! ');
};

// Common pipeline templates
export const pipelineTemplates = {
  rtmpToScreen: 'rtmpsrc location=rtmp://example.com/live/stream ! flvdemux ! h264parse ! avdec_h264 ! videoconvert ! autovideosink',
  webcamToRtmp: 'v4l2src ! videoconvert ! x264enc ! flvmux ! rtmpsink location=rtmp://example.com/live/stream',
  fileToRtmp: 'filesrc location="/path/to/file.mp4" ! qtdemux ! h264parse ! flvmux ! rtmpsink location=rtmp://example.com/live/stream',
  ndiToScreen: 'ndisrc ndi-name="Camera 1" ! videoconvert ! autovideosink',
  srtToRtmp: 'srtsrc uri=srt://example.com:7001 ! tsdemux ! h264parse ! flvmux ! rtmpsink location=rtmp://example.com/live/stream',
  // Additional advanced pipeline templates
  srtToRtmpWithReconnect: 'srtsrc uri=srt://example.com:7001 latency=2000 reconnect=true ! tsdemux ! h264parse ! flvmux ! rtmpsink location=rtmp://example.com/live/stream',
  webrtcSourceToRtmp: 'webrtcsrc ! rtph264depay ! h264parse ! flvmux ! rtmpsink location=rtmp://example.com/live/stream',
  ndiToSrt: 'ndisrc ndi-name="Camera 1" ! videoconvert ! x264enc bitrate=5000 ! mpegtsmux ! srtsink uri=srt://output.example.com:7001/',
  mediaRelay: 'srtsrc uri=srt://input.example.com:7001 ! tsdemux ! h264parse ! tee name=t ! queue ! srtsink uri=srt://output1.example.com:7001/ t. ! queue ! rtmpsink location=rtmp://output2.example.com/live/stream'
};

// Get human-readable status from GStreamer state
export const getStatusDescription = (status: string): string => {
  const statusMap: Record<string, string> = {
    'idle': 'Pipeline is idle',
    'playing': 'Pipeline is active',
    'paused': 'Pipeline is paused',
    'error': 'Error in pipeline',
    'connecting': 'Establishing connection...',
    'reconnecting': 'Connection lost, reconnecting...',
    'receiving': 'Receiving media stream',
    'buffering': 'Buffering media data...'
  };
  
  return statusMap[status] || 'Unknown status';
};
