
import { HealthCheckResult } from '../models';
import { Logger } from '../utils/Logger';

export class HealthCheckService {
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }

  async checkHealth(timeout: number): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Simple health check implementation
      // In a real app, this would check database connectivity, external services, etc.
      await new Promise(resolve => setTimeout(resolve, Math.min(100, timeout / 2)));
      
      const endTime = Date.now();
      return {
        healthy: true,
        status: 'healthy',
        timestamp: new Date(),
        duration: endTime - startTime // Ensure duration is always included and not optional
      };
    } catch (error) {
      const endTime = Date.now();
      this.logger.error('Health check failed', error);
      return {
        healthy: false,
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: endTime - startTime // Ensure duration is always included and not optional
      };
    }
  }
}
