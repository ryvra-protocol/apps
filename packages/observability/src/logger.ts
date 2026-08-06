export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

export function createConsoleLogger(scope: string): Logger {
  const write = (level: LogLevel, message: string, metadata?: Record<string, unknown>) => {
    const payload = { level, scope, message, metadata };
    if (level === "error") {
      console.error(payload);
      return;
    }
    if (level === "warn") {
      console.warn(payload);
      return;
    }
    console.log(payload);
  };

  return {
    debug(message, metadata) {
      write("debug", message, metadata);
    },
    info(message, metadata) {
      write("info", message, metadata);
    },
    warn(message, metadata) {
      write("warn", message, metadata);
    },
    error(message, metadata) {
      write("error", message, metadata);
    },
  };
}
