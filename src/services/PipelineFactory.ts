
/**
 * Pipeline Factory Service
 * Creates standardized GStreamer pipelines based on stream configurations
 */

import gstreamerService, { GstElement, GstPipeline } from './GstreamerService';
import { Stream, StreamSource, StreamDestination } from './StreamManager';
import { v4 as uuidv4 } from 'uuid';

export class PipelineFactory {
  constructor() {}
  
  /**
   * Create a pipeline for a stream
   */
  async createPipeline(stream: Stream): Promise<GstPipeline> {
    // Generate pipeline elements based on source and destination
    const elements = this.generatePipelineElements(stream);
    
    // Create the pipeline
    const pipelineDescription = `${stream.name || stream.id} (${stream.type})`;
    
    try {
      const pipeline = await gstreamerService.createPipeline({
        id: `pipeline-${stream.id}`,
        description: pipelineDescription,
        elements
      });
      
      return pipeline;
    } catch (error) {
      console.error('Failed to create pipeline:', error);
      throw new Error(`Failed to create pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate pipeline elements based on stream configuration
   */
  private generatePipelineElements(stream: Stream): GstElement[] {
    const elements: GstElement[] = [];
    
    // Add source elements
    const sourceElements = this.createSourceElements(stream.source);
    elements.push(...sourceElements);
    
    // Add processing elements based on stream type
    const processingElements = this.createProcessingElements(stream.type);
    elements.push(...processingElements);
    
    // Add destination elements if provided
    if (stream.destination) {
      const destinationElements = this.createDestinationElements(stream.destination);
      elements.push(...destinationElements);
    }
    
    return elements;
  }
  
  /**
   * Create source elements based on source type
   */
  private createSourceElements(source: StreamSource): GstElement[] {
    switch (source.type) {
      case 'srt':
        return [
          {
            name: `srtsrc_${uuidv4().slice(0, 8)}`,
            type: 'srtsrc',
            properties: {
              uri: source.uri || '',
              latency: source.parameters?.latency || 2000,
              mode: source.parameters?.mode || 'caller'
            }
          },
          {
            name: `tsdemux_${uuidv4().slice(0, 8)}`,
            type: 'tsdemux',
            properties: {}
          }
        ];
        
      case 'rtmp':
        return [
          {
            name: `rtmpsrc_${uuidv4().slice(0, 8)}`,
            type: 'rtmpsrc',
            properties: {
              location: source.uri || ''
            }
          },
          {
            name: `flvdemux_${uuidv4().slice(0, 8)}`,
            type: 'flvdemux',
            properties: {}
          }
        ];
        
      case 'ndi':
        return [
          {
            name: `ndisrc_${uuidv4().slice(0, 8)}`,
            type: 'ndisrc',
            properties: {
              ndiName: source.name || ''
            }
          }
        ];
        
      case 'file':
        return [
          {
            name: `filesrc_${uuidv4().slice(0, 8)}`,
            type: 'filesrc',
            properties: {
              location: source.uri || ''
            }
          },
          {
            name: `decodebin_${uuidv4().slice(0, 8)}`,
            type: 'decodebin',
            properties: {}
          }
        ];
        
      case 'test':
      default:
        return [
          {
            name: `videotestsrc_${uuidv4().slice(0, 8)}`,
            type: 'videotestsrc',
            properties: {
              pattern: source.parameters?.pattern || 'smpte'
            }
          }
        ];
    }
  }
  
  /**
   * Create processing elements based on stream type
   */
  private createProcessingElements(streamType: string): GstElement[] {
    // Common elements for all streams
    const commonElements = [
      {
        name: `videoconvert_${uuidv4().slice(0, 8)}`,
        type: 'videoconvert',
        properties: {}
      }
    ];
    
    // Add type-specific processing elements
    switch (streamType) {
      case 'transcode':
        return [
          ...commonElements,
          {
            name: `x264enc_${uuidv4().slice(0, 8)}`,
            type: 'x264enc',
            properties: {
              bitrate: 2000,
              'speed-preset': 'fast',
              tune: 'zerolatency'
            }
          },
          {
            name: `h264parse_${uuidv4().slice(0, 8)}`,
            type: 'h264parse',
            properties: {}
          }
        ];
        
      case 'recording':
        return [
          ...commonElements,
          {
            name: `x264enc_${uuidv4().slice(0, 8)}`,
            type: 'x264enc',
            properties: {
              bitrate: 4000,
              'speed-preset': 'medium'
            }
          }
        ];
        
      case 'relay':
        return [
          ...commonElements,
          {
            name: `tee_${uuidv4().slice(0, 8)}`,
            type: 'tee',
            properties: {
              name: 'relay_tee'
            }
          }
        ];
        
      case 'live':
      default:
        return commonElements;
    }
  }
  
  /**
   * Create destination elements based on destination type
   */
  private createDestinationElements(destination: StreamDestination): GstElement[] {
    switch (destination.type) {
      case 'srt':
        return [
          {
            name: `mpegtsmux_${uuidv4().slice(0, 8)}`,
            type: 'mpegtsmux',
            properties: {}
          },
          {
            name: `srtsink_${uuidv4().slice(0, 8)}`,
            type: 'srtsink',
            properties: {
              uri: destination.uri || '',
              latency: destination.parameters?.latency || 2000,
              mode: destination.parameters?.mode || 'caller'
            }
          }
        ];
        
      case 'rtmp':
        return [
          {
            name: `flvmux_${uuidv4().slice(0, 8)}`,
            type: 'flvmux',
            properties: {
              streamable: true
            }
          },
          {
            name: `rtmpsink_${uuidv4().slice(0, 8)}`,
            type: 'rtmpsink',
            properties: {
              location: destination.uri || ''
            }
          }
        ];
        
      case 'file':
        return [
          {
            name: `mp4mux_${uuidv4().slice(0, 8)}`,
            type: 'mp4mux',
            properties: {}
          },
          {
            name: `filesink_${uuidv4().slice(0, 8)}`,
            type: 'filesink',
            properties: {
              location: destination.uri || '/tmp/output.mp4',
              sync: false
            }
          }
        ];
        
      case 'multi':
        // For multi-destination, assume we're using the tee element from processing
        return [];
        
      default:
        return [
          {
            name: `autovideosink_${uuidv4().slice(0, 8)}`,
            type: 'autovideosink',
            properties: {}
          }
        ];
    }
  }
  
  /**
   * Get standard pipeline templates
   */
  getPipelineTemplates(): Record<string, string> {
    return {
      'srt-to-rtmp': 'SRT source to RTMP destination',
      'rtmp-to-srt': 'RTMP source to SRT destination',
      'ndi-to-rtmp': 'NDI source to RTMP destination',
      'file-to-rtmp': 'File source to RTMP destination',
      'test-to-rtmp': 'Test source to RTMP destination'
    };
  }
}
