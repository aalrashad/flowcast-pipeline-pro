
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
  duration: number; // Changed from optional to required
  error?: string;
  consecutiveFailures?: number;
}

export interface ResourceStatus {
  cpu: number;
  memory: number;
  bandwidth: number;
}
