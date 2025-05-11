
/**
 * GStreamer Service
 * Provides an interface to interact with GStreamer pipelines
 */

// Extended pipeline states to include more detailed connection states
export type GstPipelineState = 
  'NULL' | 'READY' | 'PAUSED' | 'PLAYING' | 'ERROR' | 
  'CONNECTING' | 'RECONNECTING' | 'RECEIVING' | 'BUFFERING' | 'DISCONNECTED';

// Types for GStreamer operations
export interface GstPipeline {
  id: string;
  description: string;
  state: GstPipelineState;
  elements: GstElement[];
  stats?: GstPipelineStats;
  errorMessage?: string;
  lastStateChange?: Date;
}

export interface GstPipelineStats {
  bufferLevel?: number;
  receivedBytes?: number;
  framesReceived?: number;
  framesDropped?: number;
  bitrate?: number;
  latency?: number;
  jitter?: number;
}

export interface GstElement {
  name: string;
  type: string;
  properties: Record<string, any>;
  pad?: string;
  // Element state can differ from pipeline state
  state?: GstPipelineState;
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
  private stateUpdateIntervals: Record<string, any> = {};
  
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
      elements,
      stats: {
        bufferLevel: 0,
        receivedBytes: 0,
        framesReceived: 0,
        framesDropped: 0,
        bitrate: 0,
        latency: 0,
        jitter: 0
      },
      lastStateChange: new Date()
    };
    
    this.pipelines.push(pipeline);
    console.log(`Created GStreamer pipeline: ${id}`);
    return pipeline;
  }
  
  // Start a pipeline with simulated state transitions
  startPipeline(pipelineId: string): boolean {
    const pipeline = this.pipelines.find(p => p.id === pipelineId);
    if (!pipeline) {
      console.error(`Pipeline ${pipelineId} not found`);
      return false;
    }
    
    // Clear any existing interval
    if (this.stateUpdateIntervals[pipelineId]) {
      clearInterval(this.stateUpdateIntervals[pipelineId]);
    }
    
    // Update state to connecting first
    pipeline.state = 'CONNECTING';
    pipeline.lastStateChange = new Date();
    
    // Simulate connection process with state transitions
    let connectionStep = 0;
    this.stateUpdateIntervals[pipelineId] = setInterval(() => {
      connectionStep++;
      
      switch (connectionStep) {
        case 1:
          pipeline.state = 'READY';
          break;
        case 2:
          pipeline.state = 'BUFFERING';
          // Start simulating receiving data
          this.simulateDataReceiving(pipelineId);
          break;
        case 3:
          // 80% chance of successful connection, 20% chance of reconnecting
          if (Math.random() > 0.2) {
            pipeline.state = 'RECEIVING';
            console.log(`Pipeline ${pipelineId} now receiving`);
          } else {
            pipeline.state = 'RECONNECTING';
            console.log(`Pipeline ${pipelineId} reconnecting...`);
            // Reset to try again
            connectionStep = 0;
          }
          break;
        case 4:
          // Only clear the interval once we're stable
          if (pipeline.state === 'RECEIVING') {
            clearInterval(this.stateUpdateIntervals[pipelineId]);
            console.log(`Pipeline ${pipelineId} connection stabilized`);
          }
          break;
        default:
          break;
      }
      
      pipeline.lastStateChange = new Date();
    }, 1500);
    
    console.log(`Started pipeline: ${pipelineId}`);
    return true;
  }
  
  // Simulates receiving media data
  private simulateDataReceiving(pipelineId: string): void {
    const pipeline = this.pipelines.find(p => p.id === pipelineId);
    if (!pipeline || !pipeline.stats) return;
    
    const statsInterval = setInterval(() => {
      if (!pipeline.stats || pipeline.state === 'PAUSED' || 
          pipeline.state === 'NULL' || pipeline.state === 'ERROR') {
        clearInterval(statsInterval);
        return;
      }
      
      // Simulate receiving data with realistic variations
      pipeline.stats.receivedBytes = (pipeline.stats.receivedBytes || 0) + Math.floor(Math.random() * 1000000);
      pipeline.stats.framesReceived = (pipeline.stats.framesReceived || 0) + Math.floor(Math.random() * 30);
      pipeline.stats.framesDropped = (pipeline.stats.framesDropped || 0) + (Math.random() > 0.9 ? 1 : 0);
      pipeline.stats.bitrate = 2000 + Math.floor(Math.random() * 1000);
      pipeline.stats.bufferLevel = Math.min(100, (pipeline.stats.bufferLevel || 0) + 
        (Math.random() * 10) - (Math.random() > 0.7 ? 5 : 2));
      pipeline.stats.latency = 20 + Math.floor(Math.random() * 10);
      pipeline.stats.jitter = Math.random() * 5;
      
      // Occasionally simulate connection issues
      if (Math.random() > 0.95) {
        this.simulateConnectionIssue(pipelineId);
      }
    }, 1000);
  }
  
  // Simulates temporary connection issues
  private simulateConnectionIssue(pipelineId: string): void {
    const pipeline = this.pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;
    
    if (pipeline.state === 'RECEIVING') {
      // 70% chance of just buffer underrun, 30% chance of reconnect
      if (Math.random() > 0.3) {
        console.log(`Pipeline ${pipelineId} buffer underrun`);
        pipeline.state = 'BUFFERING';
        pipeline.lastStateChange = new Date();
        
        // Recover after short delay
        setTimeout(() => {
          if (pipeline.state === 'BUFFERING') {
            pipeline.state = 'RECEIVING';
            pipeline.lastStateChange = new Date();
            console.log(`Pipeline ${pipelineId} recovered from buffer underrun`);
          }
        }, 2000 + Math.random() * 3000);
      } else {
        console.log(`Pipeline ${pipelineId} connection lost, reconnecting...`);
        pipeline.state = 'RECONNECTING';
        pipeline.lastStateChange = new Date();
        
        // Attempt to reconnect
        setTimeout(() => {
          if (pipeline.state === 'RECONNECTING') {
            pipeline.state = 'RECEIVING';
            pipeline.lastStateChange = new Date();
            console.log(`Pipeline ${pipelineId} reconnected successfully`);
          }
        }, 3000 + Math.random() * 5000);
      }
    }
  }
  
  // Stop a pipeline
  stopPipeline(pipelineId: string): boolean {
    const pipeline = this.pipelines.find(p => p.id === pipelineId);
    if (!pipeline) {
      console.error(`Pipeline ${pipelineId} not found`);
      return false;
    }
    
    // Clear any state update intervals
    if (this.stateUpdateIntervals[pipelineId]) {
      clearInterval(this.stateUpdateIntervals[pipelineId]);
      delete this.stateUpdateIntervals[pipelineId];
    }
    
    pipeline.state = 'PAUSED';
    pipeline.lastStateChange = new Date();
    console.log(`Stopped pipeline: ${pipelineId}`);
    
    return true;
  }
  
  // Delete a pipeline
  deletePipeline(pipelineId: string): boolean {
    // Stop the pipeline first to clean up intervals
    this.stopPipeline(pipelineId);
    
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
  
  // Get pipeline status details
  getPipelineStatus(pipelineId: string): GstPipelineStatus {
    const pipeline = this.pipelines.find(p => p.id === pipelineId);
    if (!pipeline) {
      return {
        state: 'ERROR',
        statusMessage: 'Pipeline not found',
        isActive: false,
        isConnected: false
      };
    }
    
    return {
      state: pipeline.state,
      statusMessage: this.getStatusMessage(pipeline.state),
      isActive: ['PLAYING', 'RECEIVING', 'BUFFERING', 'RECONNECTING'].includes(pipeline.state),
      isConnected: ['RECEIVING'].includes(pipeline.state),
      stats: pipeline.stats
    };
  }
  
  // Helper to get human-readable status message
  private getStatusMessage(state: GstPipelineState): string {
    switch (state) {
      case 'NULL': return 'Not initialized';
      case 'READY': return 'Ready to start';
      case 'PAUSED': return 'Paused';
      case 'PLAYING': return 'Playing';
      case 'ERROR': return 'Error';
      case 'CONNECTING': return 'Connecting...';
      case 'RECONNECTING': return 'Reconnecting...';
      case 'RECEIVING': return 'Receiving stream';
      case 'BUFFERING': return 'Buffering...';
      case 'DISCONNECTED': return 'Disconnected';
      default: return 'Unknown state';
    }
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
        // Using camelCase for property names in JavaScript objects
        { type: 'ndisrc', properties: { ndiName: sourceName } },
        { type: 'videoconvert' },
        { type: 'autovideosink' }
      ]
    });
  }
}

// Status interface for public API
export interface GstPipelineStatus {
  state: GstPipelineState;
  statusMessage: string;
  isActive: boolean;
  isConnected: boolean;
  stats?: GstPipelineStats;
}

export const gstreamerService = new GstreamerService();
export default gstreamerService;
