
import { Logger } from '../utils/Logger';

export class MetricsCollector {
  private metrics: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }

  public setGauge(name: string, value: number): void {
    if (isNaN(value)) {
      this.logger.warn(`Attempted to set metric ${name} to NaN value`);
      return;
    }
    this.metrics.set(name, value);
  }

  public incrementCounter(name: string, increment: number = 1): void {
    const currentValue = this.counters.get(name) || 0;
    this.counters.set(name, currentValue + increment);
  }

  public getMetric(name: string): number {
    return this.metrics.get(name) || 0;
  }

  public getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  public getAllMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    this.counters.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}
