
/**
 * Stream Manager Service
 * Centralized service for managing multiple media streams and their lifecycles
 */

import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import wsClient from './WebSocketClient';
import gstreamerService, { GstPipeline, GstPipelineState } from './GstreamerService';
import { PipelineFactory } from './PipelineFactory';
import { HealthMonitor } from './HealthMonitor';
import { ResourceAllocator } from './ResourceAllocator';

// Stream type definitions
export interface Stream {
  id: string;
  name: string;
  type: StreamType;
  source: StreamSource;
  destination?: StreamDestination;
  pipeline?: GstPipeline;
  status: StreamStatus;
  stats?: StreamStats;
  createdAt: Date;
  lastUpdated: Date;
  priority: StreamPriority;
  metadata: Record<string, any>;
}

export type StreamType = 'live' | 'recording' | 'transcode' | 'relay';
export type StreamStatus = 'idle' | 'starting' | 'active' | 'paused' | 'error' | 'stopping' | 'terminated';
export type StreamPriority = 'low' | 'normal' | 'high' | 'critical';

export interface StreamSource {
  type: 'srt' | 'rtmp' | 'ndi' | 'file' | 'test';
  uri?: string;
  name?: string;
  parameters?: Record<string, any>;
}

export interface StreamDestination {
  type: 'srt' | 'rtmp' | 'ndi' | 'file' | 'multi';
  uri?: string;
  name?: string;
  parameters?: Record<string, any>;
}

export interface StreamStats {
  bitrate?: number;
  fps?: number;
  resolution?: string;
  bufferHealth?: number;
  dropped?: number;
  streamTime?: number;
  cpu?: number;
  memory?: number;
  lastUpdated: Date;
}

export interface StreamManagerConfig {
  maxStreams?: number;
  resourceLimits?: {
    maxCpu?: number; // percentage
    maxMemory?: number; // MB
    maxBandwidth?: number; // Mbps
  };
  healthCheckInterval?: number; // ms
}

class StreamManagerService {
  private streams: Map<string, Stream> = new Map();
  private config: StreamManagerConfig;
  private pipelineFactory: PipelineFactory;
  private healthMonitor: HealthMonitor;
  private resourceAllocator: ResourceAllocator;
  private statusCallbacks: Map<string, (stream: Stream) => void> = new Map();
  
  constructor(config?: StreamManagerConfig) {
    this.config = {
      maxStreams: config?.maxStreams || 10,
      resourceLimits: {
        maxCpu: config?.resourceLimits?.maxCpu || 80,
        maxMemory: config?.resourceLimits?.maxMemory || 2048,
        maxBandwidth: config?.resourceLimits?.maxBandwidth || 100
      },
      healthCheckInterval: config?.healthCheckInterval || 5000
    };
    
    this.pipelineFactory = new PipelineFactory();
    this.healthMonitor = new HealthMonitor(this.config.healthCheckInterval);
    this.resourceAllocator = new ResourceAllocator(this.config.resourceLimits);
    
    this.initializeWebSocketHandlers();
    this.startHealthChecks();
  }
  
  private initializeWebSocketHandlers(): void {
    wsClient.on('streamCreated', this.handleStreamCreated.bind(this));
    wsClient.on('streamDeleted', this.handleStreamDeleted.bind(this));
    wsClient.on('streamStatusChanged', this.handleStreamStatusChanged.bind(this));
    wsClient.on('streamError', this.handleStreamError.bind(this));
    wsClient.on('streamStats', this.handleStreamStats.bind(this));
    
    // Request current stream list from backend when connected
    wsClient.onStatus((status) => {
      if (status === 'connected') {
        wsClient.send('getStreams', {});
      }
    });
  }
  
  // WebSocket event handlers
  private handleStreamCreated(data: any): void {
    const { stream } = data;
    if (!stream || !stream.id) return;
    
    this.streams.set(stream.id, {
      ...stream,
      lastUpdated: new Date()
    });
    
    toast.success(`Stream created: ${stream.name || stream.id}`);
  }
  
  private handleStreamDeleted(data: any): void {
    const { id } = data;
    if (!id) return;
    
    const stream = this.streams.get(id);
    if (stream) {
      this.streams.delete(id);
      toast.info(`Stream deleted: ${stream.name || stream.id}`);
    }
  }
  
  private handleStreamStatusChanged(data: any): void {
    const { id, status, message } = data;
    if (!id || !status) return;
    
    const stream = this.streams.get(id);
    if (stream) {
      const previousStatus = stream.status;
      stream.status = status as StreamStatus;
      stream.lastUpdated = new Date();
      
      // Notify listeners
      this.notifyStreamChanged(id);
      
      // Show toast for important status changes
      if (status === 'active' && previousStatus !== 'active') {
        toast.success(`Stream active: ${stream.name || stream.id}`);
      } else if (status === 'error') {
        toast.error(`Stream error: ${message || 'Unknown error'}`);
      }
    }
  }
  
  private handleStreamError(data: any): void {
    const { id, errorCode, errorMessage } = data;
    if (!id) return;
    
    const stream = this.streams.get(id);
    if (stream) {
      stream.status = 'error';
      stream.metadata = {
        ...stream.metadata,
        errorCode,
        errorMessage
      };
      stream.lastUpdated = new Date();
      
      // Notify listeners
      this.notifyStreamChanged(id);
      
      toast.error(`Stream error (${stream.name || stream.id}): ${errorMessage}`);
    }
  }
  
  private handleStreamStats(data: any): void {
    const { id, stats } = data;
    if (!id || !stats) return;
    
    const stream = this.streams.get(id);
    if (stream) {
      stream.stats = {
        ...(stream.stats || { lastUpdated: new Date() }),
        ...stats,
        lastUpdated: new Date()
      };
      
      // Notify listeners
      this.notifyStreamChanged(id);
    }
  }
  
  private notifyStreamChanged(streamId: string): void {
    const callback = this.statusCallbacks.get(streamId);
    const stream = this.streams.get(streamId);
    if (callback && stream) {
      try {
        callback(stream);
      } catch (error) {
        console.error('Error in stream status callback', error);
      }
    }
  }
  
  private startHealthChecks(): void {
    this.healthMonitor.start((streamId: string, healthData: any) => {
      const stream = this.streams.get(streamId);
      if (stream) {
        if (healthData.status === 'unhealthy') {
          this.handleUnhealthyStream(stream, healthData);
        }
        
        // Update stream stats with health data
        if (stream.stats) {
          stream.stats = {
            ...stream.stats,
            ...healthData.metrics,
            lastUpdated: new Date()
          };
          
          // Notify listeners
          this.notifyStreamChanged(streamId);
        }
      }
    });
  }
  
  private handleUnhealthyStream(stream: Stream, healthData: any): void {
    console.warn(`Stream ${stream.id} unhealthy:`, healthData);
    
    // Log the issue
    stream.metadata = {
      ...stream.metadata,
      healthWarning: {
        timestamp: new Date(),
        details: healthData
      }
    };
    
    // Based on severity, take different actions
    if (healthData.severity === 'critical') {
      // For critical issues, restart the stream
      toast.warning(`Stream ${stream.name || stream.id} has critical issues. Attempting recovery...`);
      this.restartStream(stream.id);
    } else {
      // For less severe issues, just notify
      toast.warning(`Stream ${stream.name || stream.id} performance degraded.`);
    }
  }
  
  // Public API
  
  /**
   * Create a new stream
   */
  async createStream(options: {
    name: string;
    type: StreamType;
    source: StreamSource;
    destination?: StreamDestination;
    priority?: StreamPriority;
    metadata?: Record<string, any>;
  }): Promise<Stream> {
    // Check if we can create another stream
    if (this.streams.size >= this.config.maxStreams!) {
      throw new Error(`Maximum number of streams (${this.config.maxStreams}) reached`);
    }
    
    // Check if resources are available
    const resourceCheck = await this.resourceAllocator.checkAvailability(options.type, options.priority);
    if (!resourceCheck.available) {
      throw new Error(`Insufficient resources: ${resourceCheck.reason}`);
    }
    
    const streamId = uuidv4();
    const now = new Date();
    
    // Create the stream object
    const stream: Stream = {
      id: streamId,
      name: options.name,
      type: options.type,
      source: options.source,
      destination: options.destination,
      status: 'idle',
      createdAt: now,
      lastUpdated: now,
      priority: options.priority || 'normal',
      metadata: options.metadata || {}
    };
    
    // Store the stream
    this.streams.set(streamId, stream);
    
    // Register with health monitor
    this.healthMonitor.registerStream(streamId);
    
    // Allocate resources
    this.resourceAllocator.allocate(streamId, options.type, options.priority);
    
    // Create the pipeline
    try {
      const pipeline = await this.pipelineFactory.createPipeline(stream);
      
      // Update stream with pipeline
      stream.pipeline = pipeline;
      stream.status = 'idle';
      stream.lastUpdated = new Date();
      
      // Notify backend
      wsClient.send('streamCreated', { stream });
      
      return stream;
    } catch (error) {
      // Clean up on failure
      this.streams.delete(streamId);
      this.healthMonitor.unregisterStream(streamId);
      this.resourceAllocator.release(streamId);
      
      throw error;
    }
  }
  
  /**
   * Start a stream
   */
  async startStream(streamId: string): Promise<boolean> {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }
    
    if (!stream.pipeline) {
      throw new Error(`Stream ${streamId} has no pipeline`);
    }
    
    // Update status
    stream.status = 'starting';
    stream.lastUpdated = new Date();
    this.notifyStreamChanged(streamId);
    
    try {
      // Start the pipeline
      const success = await gstreamerService.startPipeline(stream.pipeline.id);
      
      if (!success) {
        throw new Error('Failed to start stream pipeline');
      }
      
      // Update status
      stream.status = 'active';
      stream.lastUpdated = new Date();
      this.notifyStreamChanged(streamId);
      
      // Notify backend
      wsClient.send('streamStatusChanged', {
        id: streamId,
        status: 'active'
      });
      
      return true;
    } catch (error) {
      // Handle error
      stream.status = 'error';
      stream.metadata = {
        ...stream.metadata,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      stream.lastUpdated = new Date();
      this.notifyStreamChanged(streamId);
      
      throw error;
    }
  }
  
  /**
   * Stop a stream
   */
  async stopStream(streamId: string): Promise<boolean> {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }
    
    if (!stream.pipeline) {
      throw new Error(`Stream ${streamId} has no pipeline`);
    }
    
    // Update status
    stream.status = 'stopping';
    stream.lastUpdated = new Date();
    this.notifyStreamChanged(streamId);
    
    try {
      // Stop the pipeline
      const success = await gstreamerService.stopPipeline(stream.pipeline.id);
      
      if (!success) {
        throw new Error('Failed to stop stream pipeline');
      }
      
      // Update status
      stream.status = 'paused';
      stream.lastUpdated = new Date();
      this.notifyStreamChanged(streamId);
      
      // Notify backend
      wsClient.send('streamStatusChanged', {
        id: streamId,
        status: 'paused'
      });
      
      return true;
    } catch (error) {
      // Don't change status to error as stopping failure doesn't mean the stream isn't active
      console.error(`Error stopping stream ${streamId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a stream
   */
  async deleteStream(streamId: string): Promise<boolean> {
    const stream = this.streams.get(streamId);
    if (!stream) {
      return false;
    }
    
    try {
      // Stop the pipeline if active
      if (stream.status === 'active' || stream.status === 'starting') {
        await this.stopStream(streamId);
      }
      
      // Delete the pipeline
      if (stream.pipeline) {
        await gstreamerService.deletePipeline(stream.pipeline.id);
      }
      
      // Release resources
      this.resourceAllocator.release(streamId);
      this.healthMonitor.unregisterStream(streamId);
      
      // Remove from collection
      this.streams.delete(streamId);
      
      // Notify backend
      wsClient.send('streamDeleted', { id: streamId });
      
      return true;
    } catch (error) {
      console.error(`Error deleting stream ${streamId}:`, error);
      throw error;
    }
  }
  
  /**
   * Restart a stream
   */
  async restartStream(streamId: string): Promise<boolean> {
    try {
      await this.stopStream(streamId);
      // Short delay to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await this.startStream(streamId);
    } catch (error) {
      console.error(`Error restarting stream ${streamId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all streams
   */
  getStreams(): Stream[] {
    return Array.from(this.streams.values());
  }
  
  /**
   * Get a specific stream
   */
  getStream(streamId: string): Stream | undefined {
    return this.streams.get(streamId);
  }
  
  /**
   * Subscribe to stream status updates
   */
  subscribeToStream(streamId: string, callback: (stream: Stream) => void): () => void {
    this.statusCallbacks.set(streamId, callback);
    
    // Immediately notify with current status if stream exists
    const stream = this.streams.get(streamId);
    if (stream) {
      try {
        callback(stream);
      } catch (error) {
        console.error('Error in stream status callback', error);
      }
    }
    
    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(streamId);
    };
  }
  
  /**
   * Get system overview stats
   */
  getSystemStats(): {
    totalStreams: number;
    activeStreams: number;
    cpuUsage: number;
    memoryUsage: number;
    bandwidthUsage: number;
  } {
    return {
      totalStreams: this.streams.size,
      activeStreams: Array.from(this.streams.values()).filter(s => s.status === 'active').length,
      ...this.resourceAllocator.getCurrentUsage()
    };
  }
}

// Create singleton instance
export const streamManager = new StreamManagerService();
export default streamManager;
