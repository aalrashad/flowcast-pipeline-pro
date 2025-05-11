import { HealthCheckService } from './HealthCheckService';
import { MetricsCollector } from './MetricsCollector';
import { Logger } from '../utils/Logger';
import { HealthCheckConfig, HealthCheckResult, ResourceStatus } from '../models';

export class HealthMonitor {
  private consecutiveFailures = 0;
  private lastSuccessfulCheck: Date | null = null;
  private isShuttingDown = false;

  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly metricsCollector: MetricsCollector,
    private readonly logger: Logger,
    private config: HealthCheckConfig
  ) {
    this.validateConfig();
  }

  /**
   * Starts periodic health monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (this.config.enabled) {
      await this.executeHealthCheck();
      setInterval(() => this.executeHealthCheck(), this.config.interval);
    }
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
      const result = await this.healthCheckService.checkHealth(this.config.timeout);
      const duration = Date.now() - startTime;

      this.handleSuccess(duration);
      this.recordMetrics({ ...result, duration });
      this.logger.debug(`Health check passed in ${duration}ms`);

      return { ...result, duration, timestamp: new Date() };
    } catch (error) {
      const duration = Date.now() - startTime;
      const result = this.handleFailure(error, duration);
      
      this.recordMetrics(result);
      this.logger.warn(`Health check failed after ${duration}ms`, error);

      return result;
    }
  }

  /**
   * Updates monitoring configuration with validation
   */
  public updateConfig(config: Partial<HealthCheckConfig>): void {
    const newConfig = {
      ...this.config,
      interval: config.interval ? this.sanitizeNumber(config.interval) : this.config.interval,
      timeout: config.timeout ? this.sanitizeNumber(config.timeout) : this.config.timeout,
      enabled: config.enabled ?? this.config.enabled
    };

    this.validateConfig(newConfig);
    this.config = newConfig;
  }

  /**
   * Graceful shutdown indicator
   */
  public shutdown(): void {
    this.isShuttingDown = true;
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

    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.metricsCollector.incrementCounter('health.checks.critical_failure');
      this.logger.error('Critical health check failure threshold reached');
    }

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
      this.metricsCollector.setGauge('health.check.status', result.healthy ? 1 : 0);
      this.metricsCollector.setGauge('health.check.duration', result.duration);
      this.metricsCollector.setGauge('health.check.last_success_timestamp', 
        this.lastSuccessfulCheck?.getTime() || 0);
    } catch (error) {
      this.logger.error('Failed to record health metrics', error);
    }
  }

  private validateConfig(config?: HealthCheckConfig): void {
    const cfg = config || this.config;
    
    if (cfg.interval <= 0) throw new Error('Interval must be positive');
    if (cfg.timeout <= 0) throw new Error('Timeout must be positive');
    if (cfg.timeout >= cfg.interval) {
      throw new Error('Timeout must be less than interval');
    }
  }

  private sanitizeNumber(value: string | number): number {
    const num = typeof value === 'string' ? Number(value) : value;
    if (isNaN(num)) throw new Error(`Invalid number value: ${value}`);
    return num;
  }
}
