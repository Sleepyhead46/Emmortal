type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, string | number | boolean | undefined>;

function write(level: LogLevel, event: string, context: LogContext = {}) {
  console[level](JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...context }));
}

export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, error: unknown, context: LogContext = {}) => write("error", event, { ...context, error: error instanceof Error ? error.message : "Unknown error" }),
};
