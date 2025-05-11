
/**
 * Health Monitor Service
 * Monitors the health and performance of running streams
 */

import gstreamerService from './GstreamerService';

export class HealthMonitor {
  private streamIds: Set<string> = new Set();
  private checkInterval: number;
  private timer: NodeJS.Timeout | null = null;
  private callbacks: Array<(streamId: string, healthData: any) => void> = [];
  
  constructor(checkInterval: number = 5000) {
    this.checkInterval = checkInterval;
  }
  
  /**
   * Start monitoring
   */
  start(callback: (streamId: string, healthData: any) => void): void {
    this.callbacks.push(callback);
    
    if (!this.timer) {
      this.timer = setInterval(() => this.checkStreamHealth(), this.checkInterval);
    }
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  
  /**
   * Register a stream for monitoring
   */
  registerStream(streamId: string): void {
    this.streamIds.add(streamId);
  }
  
  /**
   * Unregister a stream
   */
  unregisterStream(streamId: string): void {
    this.streamIds.delete(streamId);
  }
  
  /**
   * Check health of all registered streams
   */
  private checkStreamHealth(): void {
    this.streamIds.forEach(streamId => {
      try {
        this.checkSingleStream(streamId);
      } catch (error) {
        console.error(`Error checking health for stream ${streamId}:`, error);
      }
    });
  }
  
  /**
   * Check health of a single stream
   */
  private checkSingleStream(streamId: string): void {
    const pipelineId = `pipeline-${streamId}`;
    const pipelineStatus = gstreamerService.getPipelineStatus(pipelineId);
    
    if (!pipelineStatus) return;
    
    // Calculate health metrics
    const healthData = this.calculateHealthMetrics(pipelineStatus);
    
    // Notify callbacks if there are issues
    if (healthData.status !== 'healthy') {
      this.callbacks.forEach(callback => {
        try {
          callback(streamId, healthData);
        } catch (error) {
          console.error('Error in health monitor callback:', error);
        }
      });
    }
  }
  
  /**
   * Calculate health metrics from pipeline status
   */
  private calculateHealthMetrics(pipelineStatus: any): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    severity: 'low' | 'medium' | 'high' | 'critical';
    reason?: string;
    metrics: Record<string, any>;
  } {
    const stats = pipelineStatus.stats || {};
    const metrics: Record<string, any> = {
      bufferHealth: Number(stats.bufferLevel || 100),
      bitrate: Number(stats.bitrate || 0),
      framesDropped: Number(stats.framesDropped || 0),
      latency: Number(stats.latency || 0)
    };
    
    // Check for issues
    const issues = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    // Buffer health check
    if (Number(metrics.bufferHealth) < 10) {
      issues.push('Critical buffer underrun');
      severity = 'critical';
    } else if (Number(metrics.bufferHealth) < 30) {
      issues.push('Low buffer level');
      severity = Math.max(severity === 'low' ? 'medium' : severity, 'medium') as any;
    }
    
    // Dropped frames check
    if (stats.framesReceived && stats.framesDropped) {
      const dropRate = (Number(stats.framesDropped) / (Number(stats.framesReceived) + Number(stats.framesDropped))) * 100;
      metrics.dropRate = dropRate;
      
      if (Number(dropRate) > 20) {
        issues.push(`High frame drop rate (${dropRate.toFixed(1)}%)`);
        severity = 'critical';
      } else if (Number(dropRate) > 5) {
        issues.push(`Elevated frame drop rate (${dropRate.toFixed(1)}%)`);
        severity = Math.max(severity === 'low' ? 'high' : severity, 'high') as any;
      }
    }
    
    // Latency check
    if (Number(metrics.latency) > 5000) {
      issues.push(`High latency (${metrics.latency}ms)`);
      severity = Math.max(severity === 'low' ? 'high' : severity, 'high') as any;
    } else if (Number(metrics.latency) > 2000) {
      issues.push(`Elevated latency (${metrics.latency}ms)`);
      severity = Math.max(severity === 'low' ? 'medium' : severity, 'medium') as any;
    }
    
    // Determine overall status
    const status = issues.length === 0 ? 'healthy' : 
                  (severity === 'critical' || severity === 'high') ? 'unhealthy' : 'degraded';
    
    return {
      status,
      severity,
      reason: issues.join(', '),
      metrics
    };
  }
  
  /**
   * Get health status for a specific stream
   */
  getStreamHealth(streamId: string): {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    metrics: Record<string, any>;
  } {
    try {
      const pipelineId = `pipeline-${streamId}`;
      const pipelineStatus = gstreamerService.getPipelineStatus(pipelineId);
      
      if (!pipelineStatus) {
        return { status: 'unknown', metrics: {} };
      }
      
      return this.calculateHealthMetrics(pipelineStatus);
    } catch (error) {
      console.error(`Error getting health for stream ${streamId}:`, error);
      return { status: 'unknown', metrics: {} };
    }
  }
}
