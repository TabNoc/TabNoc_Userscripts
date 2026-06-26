export interface WatchSessionLogger {
  debug(message: string, payload?: unknown): void;
  info(message: string, payload?: unknown): void;
  warn(message: string, payload?: unknown): void;
  error(message: string, payload?: unknown): void;
}

export class ConsoleWatchSessionLogger implements WatchSessionLogger {
  constructor(private readonly namespace: string) {}

  debug(message: string, payload?: unknown): void {
    console.debug(this.format(message), payload ?? "");
  }

  info(message: string, payload?: unknown): void {
    console.info(this.format(message), payload ?? "");
  }

  warn(message: string, payload?: unknown): void {
    console.warn(this.format(message), payload ?? "");
  }

  error(message: string, payload?: unknown): void {
    console.error(this.format(message), payload ?? "");
  }

  private format(message: string): string {
    return `[${this.namespace}] ${message}`;
  }
}
