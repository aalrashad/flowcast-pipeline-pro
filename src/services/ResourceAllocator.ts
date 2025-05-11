
/**
 * Resource Allocator Service
 * Manages system resource allocation for streams
 */

import { StreamType, StreamPriority } from './StreamManager';

interface ResourceAllocation {
  cpu: number;
  memory: number;
  bandwidth: number;
  priority: StreamPriority;
}

export class ResourceAllocator {
  private allocations: Map<string, ResourceAllocation> = new Map();
  private limits: {
    maxCpu: number;
    maxMemory: number;
    maxBandwidth: number;
  };
  
  constructor(limits?: { maxCpu?: number; maxMemory?: number; maxBandwidth?: number }) {
    this.limits = {
      maxCpu: limits?.maxCpu || 80, // percentage
      maxMemory: limits?.maxMemory || 2048, // MB
      maxBandwidth: limits?.maxBandwidth || 100 // Mbps
    };
  }
  
  /**
   * Check if resources are available for a new stream
   */
  async checkAvailability(streamType: StreamType, priority: StreamPriority = 'normal'): Promise<{
    available: boolean;
    reason?: string;
  }> {
    const requiredResources = this.estimateResourceNeeds(streamType);
    const currentUsage = this.calculateTotalUsage();
    
    // Check each resource
    if (currentUsage.cpu + requiredResources.cpu > this.limits.maxCpu) {
      return {
        available: false,
        reason: 'Insufficient CPU resources'
      };
    }
    
    if (currentUsage.memory + requiredResources.memory > this.limits.maxMemory) {
      return {
        available: false,
        reason: 'Insufficient memory resources'
      };
    }
    
    if (currentUsage.bandwidth + requiredResources.bandwidth > this.limits.maxBandwidth) {
      return {
        available: false,
        reason: 'Insufficient bandwidth'
      };
    }
    
    return { available: true };
  }
  
  /**
   * Allocate resources for a stream
   */
  allocate(streamId: string, streamType: StreamType, priority: StreamPriority = 'normal'): void {
    const resources = this.estimateResourceNeeds(streamType);
    
    this.allocations.set(streamId, {
      ...resources,
      priority
    });
  }
  
  /**
   * Release resources for a stream
   */
  release(streamId: string): void {
    this.allocations.delete(streamId);
  }
  
  /**
   * Get current resource usage
   */
  getCurrentUsage(): {
    cpuUsage: number;
    memoryUsage: number;
    bandwidthUsage: number;
  } {
    const usage = this.calculateTotalUsage();
    return {
      cpuUsage: usage.cpu,
      memoryUsage: usage.memory,
      bandwidthUsage: usage.bandwidth
    };
  }
  
  /**
   * Calculate total resource usage from all allocations
   */
  private calculateTotalUsage(): {
    cpu: number;
    memory: number;
    bandwidth: number;
  } {
    let cpu = 0;
    let memory = 0;
    let bandwidth = 0;
    
    this.allocations.forEach(allocation => {
      cpu += allocation.cpu;
      memory += allocation.memory;
      bandwidth += allocation.bandwidth;
    });
    
    return { cpu, memory, bandwidth };
  }
  
  /**
   * Estimate resource needs for a stream type
   */
  private estimateResourceNeeds(streamType: StreamType): {
    cpu: number;
    memory: number;
    bandwidth: number;
  } {
    // Default resource estimates based on stream type
    switch (streamType) {
      case 'transcode':
        return {
          cpu: 25, // percentage
          memory: 500, // MB
          bandwidth: 10 // Mbps
        };
        
      case 'recording':
        return {
          cpu: 15,
          memory: 300,
          bandwidth: 8
        };
        
      case 'relay':
        return {
          cpu: 10,
          memory: 200,
          bandwidth: 15
        };
        
      case 'live':
      default:
        return {
          cpu: 15,
          memory: 250,
          bandwidth: 5
        };
    }
  }
  
  /**
   * Check if a specific priority level can preempt resources
   * Used for implementing priority-based resource allocation
   */
  canPreempt(priority: StreamPriority): string[] {
    // Only critical streams can preempt other streams
    if (priority !== 'critical') {
      return [];
    }
    
    // Find low priority streams that could be preempted
    const preemptCandidates: string[] = [];
    
    this.allocations.forEach((allocation, streamId) => {
      if (allocation.priority === 'low') {
        preemptCandidates.push(streamId);
      }
    });
    
    return preemptCandidates;
  }
}
