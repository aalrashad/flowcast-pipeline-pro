
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, ...args: any[]): void {
    console.info(`${new Date().toISOString()} info: [${this.context}] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`${new Date().toISOString()} debug: [${this.context}] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`${new Date().toISOString()} warn: [${this.context}] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`${new Date().toISOString()} error: [${this.context}] ${message}`, ...args);
  }
}
