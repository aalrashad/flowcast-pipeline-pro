
/**
 * GStreamer Service
 * Provides an interface to interact with GStreamer pipelines via WebSocket
 */
import wsClient from './WebSocketClient';
import { 
  parsePipelineString, 
  generatePipelineString, 
  validatePipelineElements,
  translateGstreamerError,
  convertToBackendPipeline,
  createErrorObject
} from '@/lib/gstreamerUtils';

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

// Status interface for public API
export interface GstPipelineStatus {
  state: GstPipelineState;
  statusMessage: string;
  isActive: boolean;
  isConnected: boolean;
  stats?: GstPipelineStats;
}

class GstreamerService {
  private pipelines: Map<string, GstPipeline> = new Map();
  private statusCallbacks: Map<string, (status: GstPipelineStatus) => void> = new Map();
  private connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  
  constructor() {
    this.initializeWebSocketConnection();
  }
  
  // Initialize WebSocket connection and message handlers
  private async initializeWebSocketConnection(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      // Set up WebSocket status handling
      wsClient.onStatus((status, error) => {
        if (status === 'connected') {
          this.connected = true;
          console.log('Connected to GStreamer backend');
          resolve();
          
          // Request current pipeline status
          wsClient.send('getPipelines', {});
        } else if (status === 'disconnected' || status === 'error') {
          this.connected = false;
          console.error('Disconnected from GStreamer backend', error);
          
          // Update all pipelines to error state
          this.pipelines.forEach((pipeline, id) => {
            this.updatePipelineState(id, 'DISCONNECTED', 'Lost connection to GStreamer backend');
          });
        }
      });
      
      // Set up message handlers
      wsClient.on('pipelineCreated', this.handlePipelineCreated.bind(this));
      wsClient.on('pipelineDeleted', this.handlePipelineDeleted.bind(this));
      wsClient.on('pipelineStateChanged', this.handlePipelineStateChanged.bind(this));
      wsClient.on('pipelineError', this.handlePipelineError.bind(this));
      wsClient.on('pipelineStats', this.handlePipelineStats.bind(this));
      wsClient.on('pipelinesList', this.handlePipelinesList.bind(this));
      
      // Connect to WebSocket
      wsClient.connect().catch(error => {
        console.error('Failed to connect to GStreamer backend', error);
        reject(error);
      });
    });
    
    return this.connectionPromise;
  }
  
  // Ensure we're connected to the WebSocket server
  private async ensureConnected(): Promise<void> {
    if (this.connected) {
      return;
    }
    
    try {
      await this.initializeWebSocketConnection();
    } catch (error) {
      throw new Error('Cannot connect to GStreamer backend');
    }
  }
  
  // WebSocket event handlers
  private handlePipelineCreated(data: any): void {
    const { pipeline } = data;
    if (!pipeline || !pipeline.id) return;
    
    // Store the pipeline data
    this.pipelines.set(pipeline.id, {
      ...pipeline,
      lastStateChange: new Date()
    });
    
    console.log(`Pipeline created: ${pipeline.id}`);
  }
  
  private handlePipelineDeleted(data: any): void {
    const { id } = data;
    if (!id) return;
    
    // Remove the pipeline
    this.pipelines.delete(id);
    console.log(`Pipeline deleted: ${id}`);
  }
  
  private handlePipelineStateChanged(data: any): void {
    const { id, state, message } = data;
    if (!id || !state) return;
    
    this.updatePipelineState(id, state as GstPipelineState, message);
  }
  
  private handlePipelineError(data: any): void {
    const { id, errorCode, errorMessage, details } = data;
    if (!id) return;
    
    // Update pipeline with error information
    const pipeline = this.pipelines.get(id);
    if (pipeline) {
      pipeline.state = 'ERROR';
      pipeline.errorMessage = translateGstreamerError(errorMessage);
      pipeline.lastStateChange = new Date();
      
      // Notify listeners
      this.notifyStatusChanged(id);
      
      console.error(`Pipeline error (${id}): ${errorMessage}`, details);
    }
  }
  
  private handlePipelineStats(data: any): void {
    const { id, stats } = data;
    if (!id || !stats) return;
    
    // Update pipeline stats
    const pipeline = this.pipelines.get(id);
    if (pipeline) {
      pipeline.stats = {
        ...(pipeline.stats || {}),
        ...stats
      };
      
      // Notify listeners
      this.notifyStatusChanged(id);
    }
  }
  
  private handlePipelinesList(data: any): void {
    const { pipelines } = data;
    if (!Array.isArray(pipelines)) return;
    
    // Replace current pipelines with the received list
    this.pipelines.clear();
    pipelines.forEach(pipeline => {
      if (pipeline && pipeline.id) {
        this.pipelines.set(pipeline.id, {
          ...pipeline,
          lastStateChange: new Date()
        });
      }
    });
    
    console.log(`Received pipelines list: ${pipelines.length} pipelines`);
  }
  
  // Update pipeline state and notify listeners
  private updatePipelineState(id: string, state: GstPipelineState, message?: string): void {
    const pipeline = this.pipelines.get(id);
    if (pipeline) {
      pipeline.state = state;
      if (message) {
        pipeline.errorMessage = message;
      }
      pipeline.lastStateChange = new Date();
      
      // Notify listeners
      this.notifyStatusChanged(id);
      
      console.log(`Pipeline ${id} state changed to ${state}`);
    }
  }
  
  private notifyStatusChanged(pipelineId: string): void {
    const callback = this.statusCallbacks.get(pipelineId);
    if (callback) {
      const status = this.getPipelineStatus(pipelineId);
      callback(status);
    }
  }
  
  // Public API methods
  
  // Create a new pipeline
  async createPipeline(options: GstPipelineOptions): Promise<GstPipeline> {
    await this.ensureConnected();
    
    // Validate pipeline elements
    const validationResult = validatePipelineElements(options.elements);
    if (!validationResult.valid) {
      throw new Error(`Invalid pipeline: ${validationResult.errors.join(', ')}`);
    }
    
    const id = options.id || `pipeline-${Date.now()}`;
    const description = options.description || `Pipeline ${id}`;
    
    // Convert to backend format
    const backendPipeline = convertToBackendPipeline(options.elements);
    
    // Send create request
    const success = wsClient.send('createPipeline', {
      id,
      description,
      pipeline: backendPipeline
    });
    
    if (!success) {
      throw new Error('Failed to send pipeline creation request');
    }
    
    // Create temporary pipeline object while waiting for confirmation
    const pipeline: GstPipeline = {
      id,
      description,
      state: 'NULL',
      elements: options.elements.map((el, index) => ({
        name: el.name || `${el.type}_${index}`,
        type: el.type,
        properties: el.properties || {}
      })),
      lastStateChange: new Date()
    };
    
    // Store in local cache
    this.pipelines.set(id, pipeline);
    
    return pipeline;
  }
  
  // Start a pipeline
  async startPipeline(pipelineId: string): Promise<boolean> {
    await this.ensureConnected();
    
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }
    
    // Update local state optimistically
    this.updatePipelineState(pipelineId, 'CONNECTING');
    
    // Send start request
    return wsClient.send('startPipeline', { id: pipelineId });
  }
  
  // Stop a pipeline
  async stopPipeline(pipelineId: string): Promise<boolean> {
    await this.ensureConnected();
    
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }
    
    // Update local state optimistically
    this.updatePipelineState(pipelineId, 'PAUSED');
    
    // Send stop request
    return wsClient.send('stopPipeline', { id: pipelineId });
  }
  
  // Delete a pipeline
  async deletePipeline(pipelineId: string): Promise<boolean> {
    await this.ensureConnected();
    
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      console.error(`Pipeline ${pipelineId} not found`);
      return false;
    }
    
    // Send delete request
    const success = wsClient.send('deletePipeline', { id: pipelineId });
    
    // Remove from local cache optimistically
    if (success) {
      this.pipelines.delete(pipelineId);
    }
    
    return success;
  }
  
  // Subscribe to pipeline status updates
  subscribeToPipeline(pipelineId: string, callback: (status: GstPipelineStatus) => void): () => void {
    this.statusCallbacks.set(pipelineId, callback);
    
    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(pipelineId);
    };
  }
  
  // Get all pipelines
  getPipelines(): GstPipeline[] {
    return Array.from(this.pipelines.values());
  }
  
  // Get a specific pipeline
  getPipeline(pipelineId: string): GstPipeline | undefined {
    return this.pipelines.get(pipelineId);
  }
  
  // Get pipeline status details
  getPipelineStatus(pipelineId: string): GstPipelineStatus {
    const pipeline = this.pipelines.get(pipelineId);
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
      statusMessage: this.getStatusMessage(pipeline.state, pipeline.errorMessage),
      isActive: ['PLAYING', 'RECEIVING', 'BUFFERING', 'RECONNECTING', 'CONNECTING'].includes(pipeline.state),
      isConnected: ['RECEIVING', 'PLAYING'].includes(pipeline.state),
      stats: pipeline.stats
    };
  }
  
  // Helper to get human-readable status message
  private getStatusMessage(state: GstPipelineState, errorMessage?: string): string {
    if (state === 'ERROR' && errorMessage) {
      return `Error: ${errorMessage}`;
    }
    
    switch (state) {
      case 'NULL': return 'Not initialized';
      case 'READY': return 'Ready to start';
      case 'PAUSED': return 'Paused';
      case 'PLAYING': return 'Playing';
      case 'ERROR': return 'Error occurred';
      case 'CONNECTING': return 'Connecting...';
      case 'RECONNECTING': return 'Reconnecting...';
      case 'RECEIVING': return 'Receiving stream';
      case 'BUFFERING': return 'Buffering...';
      case 'DISCONNECTED': return 'Disconnected';
      default: return 'Unknown state';
    }
  }
  
  // Create an SRT source to encoder pipeline
  async createSrtSourcePipeline(sourceUri: string, encoderSettings: any): Promise<GstPipeline> {
    const elements = [
      { type: 'srtsrc', properties: { uri: sourceUri } },
      { type: 'tsdemux', properties: {} },
      { type: 'h264parse', properties: {} },
      { type: 'x264enc', properties: { bitrate: encoderSettings.bitrate } },
      { type: 'flvmux', properties: {} },
      { type: 'rtmpsink', properties: { location: encoderSettings.outputUri } }
    ];
    
    return this.createPipeline({
      description: `SRT Source (${sourceUri}) to Encoder`,
      elements
    });
  }
  
  // Create an NDI source pipeline
  async createNdiSourcePipeline(sourceName: string): Promise<GstPipeline> {
    const elements = [
      // Using camelCase for property names in JavaScript objects
      { type: 'ndisrc', properties: { ndiName: sourceName } },
      { type: 'videoconvert', properties: {} },
      { type: 'autovideosink', properties: {} }
    ];
    
    return this.createPipeline({
      description: `NDI Source: ${sourceName}`,
      elements
    });
  }
  
  // Parse pipeline string and create pipeline
  async createPipelineFromString(pipelineString: string, description?: string): Promise<GstPipeline> {
    const elements = parsePipelineString(pipelineString);
    
    return this.createPipeline({
      description: description || `Pipeline from string`,
      elements
    });
  }
  
  // Method to manually update stats for testing without a backend
  // This is useful during development before backend is ready
  simulateStats(pipelineId: string): void {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return;
    
    // Only simulate if in receiving or buffering state
    if (!['RECEIVING', 'BUFFERING'].includes(pipeline.state)) return;
    
    pipeline.stats = pipeline.stats || {};
    
    // Simulate some realistic stats
    pipeline.stats.bufferLevel = Math.min(100, (pipeline.stats.bufferLevel || 0) + (Math.random() * 10) - 2);
    pipeline.stats.receivedBytes = (pipeline.stats.receivedBytes || 0) + Math.floor(Math.random() * 100000);
    pipeline.stats.framesReceived = (pipeline.stats.framesReceived || 0) + Math.floor(Math.random() * 30);
    pipeline.stats.bitrate = 2000 + Math.floor(Math.random() * 500);
    
    // Notify listeners
    this.notifyStatusChanged(pipelineId);
  }
  
  // Check if the service is connected to the backend
  isConnected(): boolean {
    return this.connected;
  }
}

// Create singleton instance
export const gstreamerService = new GstreamerService();
export default gstreamerService;
