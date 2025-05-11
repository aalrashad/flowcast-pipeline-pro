
/**
 * GStreamer Service
 * Provides an interface to interact with GStreamer pipelines
 */

// Types for GStreamer operations
export interface GstPipeline {
  id: string;
  description: string;
  state: 'NULL' | 'READY' | 'PAUSED' | 'PLAYING' | 'ERROR';
  elements: GstElement[];
}

export interface GstElement {
  name: string;
  type: string;
  properties: Record<string, any>;
}

export interface GstPipelineOptions {
  id?: string;
  description?: string;
  elements: {
    type: string;
    name?: string;
    properties?: Record<string, any>;
  }[];
}

// Mock implementation - in a real app, this would communicate with a backend
class GstreamerService {
  private pipelines: GstPipeline[] = [];
  
  // Create a new pipeline
  createPipeline(options: GstPipelineOptions): GstPipeline {
    const id = options.id || `pipeline-${Date.now()}`;
    const description = options.description || `Pipeline ${id}`;
    
    const elements: GstElement[] = options.elements.map((el, index) => ({
      name: el.name || `${el.type}_${index}`,
      type: el.type,
      properties: el.properties || {}
    }));
    
    const pipeline: GstPipeline = {
      id,
      description,
      state: 'NULL',
      elements
    };
    
    this.pipelines.push(pipeline);
    console.log(`Created GStreamer pipeline: ${id}`);
    return pipeline;
  }
  
  // Start a pipeline
  startPipeline(pipelineId: string): boolean {
    const pipeline = this.pipelines.find(p => p.id === pipelineId);
    if (!pipeline) {
      console.error(`Pipeline ${pipelineId} not found`);
      return false;
    }
    
    pipeline.state = 'PLAYING';
    console.log(`Started pipeline: ${pipelineId}`);
    return true;
  }
  
  // Stop a pipeline
  stopPipeline(pipelineId: string): boolean {
    const pipeline = this.pipelines.find(p => p.id === pipelineId);
    if (!pipeline) {
      console.error(`Pipeline ${pipelineId} not found`);
      return false;
    }
    
    pipeline.state = 'PAUSED';
    console.log(`Stopped pipeline: ${pipelineId}`);
    return true;
  }
  
  // Delete a pipeline
  deletePipeline(pipelineId: string): boolean {
    const initialLength = this.pipelines.length;
    this.pipelines = this.pipelines.filter(p => p.id !== pipelineId);
    
    if (this.pipelines.length === initialLength) {
      console.error(`Pipeline ${pipelineId} not found`);
      return false;
    }
    
    console.log(`Deleted pipeline: ${pipelineId}`);
    return true;
  }
  
  // Get all pipelines
  getPipelines(): GstPipeline[] {
    return [...this.pipelines];
  }
  
  // Get a specific pipeline
  getPipeline(pipelineId: string): GstPipeline | undefined {
    return this.pipelines.find(p => p.id === pipelineId);
  }
  
  // Create an SRT source to encoder pipeline
  createSrtSourcePipeline(sourceUri: string, encoderSettings: any): GstPipeline {
    return this.createPipeline({
      description: `SRT Source to Encoder`,
      elements: [
        { type: 'srtsrc', properties: { uri: sourceUri } },
        { type: 'decodebin' },
        { type: 'videoconvert' },
        { type: 'x264enc', properties: { bitrate: encoderSettings.bitrate } },
        { type: 'rtmpsink', properties: { location: encoderSettings.outputUri } }
      ]
    });
  }
  
  // Create an NDI source pipeline
  createNdiSourcePipeline(sourceName: string): GstPipeline {
    return this.createPipeline({
      description: `NDI Source: ${sourceName}`,
      elements: [
        // Fix: Using camelCase for property names in JavaScript objects
        { type: 'ndisrc', properties: { ndiName: sourceName } },
        { type: 'videoconvert' },
        { type: 'autovideosink' }
      ]
    });
  }
}

export const gstreamerService = new GstreamerService();
export default gstreamerService;
