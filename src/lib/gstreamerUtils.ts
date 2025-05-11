
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

// Validate pipeline elements against known GStreamer elements
export const validatePipelineElements = (elements: any[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const knownElementTypes = [
    'videotestsrc', 'v4l2src', 'filesrc', 'udpsrc', 'tcpsrc', 'rtmpsrc', 'srtsrc', 
    'ristrtpsrc', 'ndisrc', 'rtspsrc', 'webrtcsrc',
    'videoconvert', 'audioresample', 'audioconvert',
    'videoscale', 'videorate', 'audiorate',
    'x264enc', 'x265enc', 'nvh264enc', 'vaapih264enc', 'vp8enc', 'vp9enc', 'av1enc',
    'rtph264pay', 'rtpmp4gpay', 'rtpvp8pay', 'rtpvp9pay',
    'flvmux', 'mp4mux', 'matroskamux', 'mpegtsmux',
    'udpsink', 'tcpsink', 'rtmpsink', 'srtsink', 'filesink',
    'autovideosink', 'autoaudiosink', 'glimagesink', 'xvimagesink',
    'tee', 'queue', 'decodebin', 'parsebin', 'playbin', 'uridecodebin',
    'h264parse', 'h265parse', 'mpegaudioparse', 'aacparse',
    'avdec_h264', 'avdec_h265', 'avdec_aac', 'avdec_mp3',
    'capsfilter', 'audiomixer', 'compositor'
  ];

  for (const element of elements) {
    if (!knownElementTypes.includes(element.type)) {
      errors.push(`Unknown GStreamer element type: ${element.type}`);
    }
    
    // Validate required properties for specific elements
    if (element.type === 'srtsrc' && !element.properties.uri) {
      errors.push('srtsrc element requires uri property');
    }
    
    if (element.type === 'rtmpsink' && !element.properties.location) {
      errors.push('rtmpsink element requires location property');
    }
    
    if (element.type === 'filesrc' && !element.properties.location) {
      errors.push('filesrc element requires location property');
    }
  }
  
  return { valid: errors.length === 0, errors };
};

// Translate GStreamer error messages to user-friendly messages
export const translateGstreamerError = (errorMessage: string): string => {
  // Common GStreamer errors mapped to user-friendly messages
  const errorMappings: Record<string, string> = {
    'no such element': 'Missing GStreamer plugin. This element is not installed on the server.',
    'could not link': 'Failed to connect elements. The output format may be incompatible with the input.',
    'could not set to PLAYING': 'Failed to start pipeline. Check element connections and properties.',
    'resource not found': 'Media resource not found. Check the file path or network URI.',
    'pad link failed': 'Failed to link elements. The formats may be incompatible.',
    'not-negotiated': 'Format negotiation failed between elements. Try adding a converter.',
    'Internal data stream error': 'Stream error. There may be network connectivity issues.',
    'Could not open resource': 'Failed to open media resource. Check permissions and availability.',
  };

  // Try to match the error with known patterns
  for (const [pattern, friendlyMessage] of Object.entries(errorMappings)) {
    if (errorMessage.includes(pattern)) {
      return `${friendlyMessage} (${errorMessage})`;
    }
  }
  
  // Default to the original message if no match
  return errorMessage;
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

// Convert between frontend and backend pipeline formats
export const convertToBackendPipeline = (elements: any[]): any => {
  return {
    elements: elements.map(element => ({
      type: element.type,
      properties: element.properties || {}
    })),
    options: {
      latency: 500,
      bufferSize: 8192,
      reconnect: true,
      reconnectDelay: 2000,
      maxReconnects: 10
    }
  };
};

// Create serializable error object
export const createErrorObject = (errorCode: string, message: string, details?: any) => {
  return {
    code: errorCode,
    message,
    details,
    timestamp: new Date().toISOString()
  };
};
