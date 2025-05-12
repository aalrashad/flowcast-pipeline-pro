
export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  failureThreshold?: number;
  successThreshold?: number;
  enabled?: boolean;
}

export interface HealthCheckResult {
  healthy: boolean;
  status: string;
  timestamp: Date;
  error?: string;
  duration?: number;
  consecutiveFailures?: number;
}

export interface ResourceStatus {
  cpu: number;
  memory: number;
  bandwidth: number;
}
