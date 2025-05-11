/**
 * Health Monitor Service
 * Monitors the health and performance of running streams
 */

import gstreamerService from './GstreamerService';

// Type Definitions
interface PipelineStatus {
  stats?: {
    [key: string]: string | number | undefined;
    bufferHealth?: string | number;
    bitrate?: string | number;
    framesDropped?: string | number;
    framesReceived?: string | number;
    latency?: string | number;
  };
}

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

interface HealthMetrics {
  status: HealthStatus;
  severity: SeverityLevel;
  reason?: string;
  metrics: Record<string, number>;
}

type HealthCallback = (streamId: string, healthData: HealthMetrics) => void;

export class HealthMonitor {
  private streamIds: Set<string> = new Set();
  private checkInterval: number;
  private timer: NodeJS.Timeout | null = null;
  private callbacks: HealthCallback[] = [];
  
  constructor(checkInterval: number = 5000) {
    if (checkInterval <= 0) {
      throw new Error('Check interval must be positive');
    }
    this.checkInterval = checkInterval;
  }
  
  /**
   * Start monitoring
   */
  start(callback: HealthCallback): void {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    this.callbacks.push(callback);
    
    if (!this.timer) {
      this.timer = setInterval(() => this.checkStreamHealth(), this.checkInterval);
      process.nextTick(() => this.checkStreamHealth()); // Immediate first check
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
    this.callbacks = [];
  }
  
  /**
   * Register a stream for monitoring
   */
  registerStream(streamId: string): void {
    if (!streamId || typeof streamId !== 'string') {
      throw new Error('Invalid streamId');
    }
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
      this.checkSingleStream(streamId);
    });
  }
  
  /**
   * Check health of a single stream
   */
  private checkSingleStream(streamId: string): void {
    try {
      if (!this.streamIds.has(streamId)) return;
      
      const pipelineId = `pipeline-${streamId}`;
      const pipelineStatus = gstreamerService.getPipelineStatus(pipelineId);
      
      if (!pipelineStatus) return;
      
      const healthData = this.calculateHealthMetrics(pipelineStatus);
      this.notifyCallbacks(streamId, healthData);
    } catch (error) {
      console.error(`Error checking health for stream ${streamId}:`, error);
    }
  }
  
  /**
   * Calculate health metrics from pipeline status
   */
  private calculateHealthMetrics(pipelineStatus: PipelineStatus): HealthMetrics {
    const stats = pipelineStatus.stats || {};
    
    // Convert all values to numbers safely
    const metrics: Record<string, number> = {
      bufferHealth: this.safeNumber(stats.bufferHealth, 100),
      bitrate: this.safeNumber(stats.bitrate, 0),
      framesDropped: this.safeNumber(stats.framesDropped, 0),
      latency: this.safeNumber(stats.latency, 0)
    };
    
    // Calculate frame drop rate if possible
    if (stats.framesReceived !== undefined) {
      const received = this.safeNumber(stats.framesReceived, 0);
      const dropped = metrics.framesDropped;
      const totalFrames = received + dropped;
      metrics.dropRate = totalFrames > 0 ? (dropped / totalFrames) * 100 : 0;
    }
    
    // Check for issues
    const issues: string[] = [];
    let severity: SeverityLevel = 'low';
    
    // Buffer health check
    if (metrics.bufferHealth < 10) {
      issues.push(`Critical buffer underrun (${metrics.bufferHealth}%)`);
      severity = 'critical';
    } else if (metrics.bufferHealth < 30) {
      issues.push(`Low buffer level (${metrics.bufferHealth}%)`);
      severity = this.upgradeSeverity(severity, 'medium');
    }
    
    // Frame drop rate check
    if (metrics.dropRate !== undefined) {
      if (metrics.dropRate > 20) {
        issues.push(`High frame drop rate (${metrics.dropRate.toFixed(1)}%)`);
        severity = this.upgradeSeverity(severity, 'critical');
      } else if (metrics.dropRate > 5) {
        issues.push(`Elevated frame drop rate (${metrics.dropRate.toFixed(1)}%)`);
        severity = this.upgradeSeverity(severity, 'high');
      }
    }
    
    // Latency check
    if (metrics.latency > 5000) {
      issues.push(`High latency (${metrics.latency}ms)`);
      severity = this.upgradeSeverity(severity, 'high');
    } else if (metrics.latency > 2000) {
      issues.push(`Elevated latency (${metrics.latency}ms)`);
      severity = this.upgradeSeverity(severity, 'medium');
    }
    
    // Determine overall status
    const status = issues.length === 0 ? 'healthy' : 
                  severity === 'critical' || severity === 'high' ? 'unhealthy' : 'degraded';
    
    return {
      status,
      severity,
      reason: issues.join('; '),
      metrics
    };
  }
  
  /**
   * Get health status for a specific stream
   */
  getStreamHealth(streamId: string): {
    status: HealthStatus;
    metrics: Record<string, number>;
  } {
    try {
      if (!this.streamIds.has(streamId)) {
        return { status: 'unknown', metrics: {} };
      }
      
      const pipelineId = `pipeline-${streamId}`;
      const pipelineStatus = gstreamerService.getPipelineStatus(pipelineId);
      
      if (!pipelineStatus) {
        return { status: 'unknown', metrics: {} };
      }
      
      const { status, metrics } = this.calculateHealthMetrics(pipelineStatus);
      return { status, metrics };
    } catch (error) {
      console.error(`Error getting health for stream ${streamId}:`, error);
      return { status: 'unknown', metrics: {} };
    }
  }
  
  /**
   * Safely convert to number
   */
  private safeNumber(value: string | number | undefined, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }
  
  /**
   * Upgrade severity level while maintaining the highest level
   */
  private upgradeSeverity(current: SeverityLevel, proposed: SeverityLevel): SeverityLevel {
    const levels: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    const proposedIndex = levels.indexOf(proposed);
    return levels[Math.max(currentIndex, proposedIndex)];
  }
  
  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(streamId: string, healthData: HealthMetrics): void {
    if (healthData.status === 'healthy') return;
    
    this.callbacks.forEach(callback => {
      try {
        callback(streamId, healthData);
      } catch (error) {
        console.error('Error in health monitor callback:', error);
      }
    });
  }
}
