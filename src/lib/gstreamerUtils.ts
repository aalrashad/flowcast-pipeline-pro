
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
        properties[key] = value.replace(/"/g, '');
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
        // Handle string values that need quotes
        const formattedValue = typeof value === 'string' && !value.match(/^\d+$/)
          ? `"${value}"`
          : value;
        return `${key}=${formattedValue}`;
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
  srtToRtmp: 'srtsrc uri=srt://example.com:7001 ! tsdemux ! h264parse ! flvmux ! rtmpsink location=rtmp://example.com/live/stream'
};
