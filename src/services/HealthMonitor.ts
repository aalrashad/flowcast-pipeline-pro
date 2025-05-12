
import { HealthCheckService } from './HealthCheckService';
import { MetricsCollector } from './MetricsCollector';
import { Logger } from '../utils/Logger';
import { HealthCheckConfig, HealthCheckResult, ResourceStatus } from '../models';

export class HealthMonitor {
  private consecutiveFailures = 0;
  private lastSuccessfulCheck: Date | null = null;
  private isShuttingDown = false;
  private healthCheckInterval: number;
  private logger: Logger;
  private healthCheckService: HealthCheckService;
  private metricsCollector: MetricsCollector;
  private streamCallbacks: Map<string, (streamId: string, healthData: any) => void> = new Map();
  private registeredStreams: Set<string> = new Set();
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    healthCheckInterval: number = 5000,
    logger: Logger = new Logger('HealthMonitor'),
    healthCheckService?: HealthCheckService,
    metricsCollector?: MetricsCollector
  ) {
    this.healthCheckInterval = healthCheckInterval;
    this.logger = logger;
    this.healthCheckService = healthCheckService || new HealthCheckService(this.logger);
    this.metricsCollector = metricsCollector || new MetricsCollector(this.logger);
  }

  /**
   * Starts periodic health monitoring
   */
  public start(callback: (streamId: string, healthData: any) => void): void {
    if (this.intervalId) {
      this.logger.warn('Health monitoring already started');
      return;
    }

    this.logger.info(`Starting health monitoring with interval ${this.healthCheckInterval}ms`);
    
    // Execute an initial health check
    this.executeHealthCheck();
    
    // Set up interval for periodic health checks
    this.intervalId = setInterval(() => {
      this.executeHealthCheck();
      
      // Notify each registered stream
      this.registeredStreams.forEach(streamId => {
        const healthData = {
          status: this.consecutiveFailures > 0 ? 'unhealthy' : 'healthy',
          metrics: this.metricsCollector.getAllMetrics(),
          timestamp: new Date()
        };
        
        try {
          callback(streamId, healthData);
        } catch (error) {
          this.logger.error(`Error notifying stream ${streamId} about health status`, error);
        }
      });
    }, this.healthCheckInterval);
  }
  
  /**
   * Register a stream for health monitoring
   */
  public registerStream(streamId: string): void {
    this.registeredStreams.add(streamId);
    this.logger.debug(`Registered stream ${streamId} for health monitoring`);
  }
  
  /**
   * Unregister a stream from health monitoring
   */
  public unregisterStream(streamId: string): void {
    this.registeredStreams.delete(streamId);
    this.logger.debug(`Unregistered stream ${streamId} from health monitoring`);
  }

  /**
   * Executes a single health check with metrics collection
   */
  public async executeHealthCheck(): Promise<HealthCheckResult> {
    if (this.isShuttingDown) {
      return {
        healthy: false,
        status: 'shutting_down',
        timestamp: new Date()
      };
    }

    const startTime = Date.now();
    try {
      const result = await this.healthCheckService.checkHealth(5000);
      const duration = Date.now() - startTime;

      this.handleSuccess(duration);
      this.recordMetrics({ ...result, duration });
      this.logger.debug(`Health check passed in ${duration}ms`);

      return { ...result, duration, timestamp: new Date() };
    } catch (error) {
      const duration = Date.now() - startTime;
      const result = this.handleFailure(error instanceof Error ? error : new Error(String(error)), duration);
      
      this.recordMetrics(result);
      this.logger.warn(`Health check failed after ${duration}ms`, error);

      return result;
    }
  }

  /**
   * Graceful shutdown indicator
   */
  public shutdown(): void {
    this.isShuttingDown = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.info('Health monitor shutting down');
  }

  // ========== PRIVATE METHODS ========== //

  private handleSuccess(duration: number): void {
    this.consecutiveFailures = 0;
    this.lastSuccessfulCheck = new Date();
    this.metricsCollector.setGauge('health.checks.consecutive_failures', 0);
    this.metricsCollector.setGauge('health.check.duration', duration);
  }

  private handleFailure(error: Error, duration: number): HealthCheckResult {
    this.consecutiveFailures++;
    this.metricsCollector.setGauge('health.checks.consecutive_failures', this.consecutiveFailures);
    this.metricsCollector.setGauge('health.check.duration', duration);

    return {
      healthy: false,
      duration,
      error: error.message,
      status: 'failed',
      timestamp: new Date(),
      consecutiveFailures: this.consecutiveFailures
    };
  }

  private recordMetrics(result: HealthCheckResult & { duration: number }): void {
    try {
      if (typeof result.duration !== 'number' || isNaN(result.duration)) {
        throw new Error(`Invalid duration value: ${result.duration}`);
      }

      this.metricsCollector.setGauge('health.check.status', result.healthy ? 1 : 0);
      this.metricsCollector.setGauge('health.check.duration', result.duration);
      
      const lastSuccessTimestamp = this.lastSuccessfulCheck?.getTime() || 0;
      this.metricsCollector.setGauge('health.check.last_success_timestamp', lastSuccessTimestamp);
    } catch (error) {
      this.logger.error('Failed to record health metrics', error instanceof Error ? error : new Error(String(error)));
    }
  }
}
