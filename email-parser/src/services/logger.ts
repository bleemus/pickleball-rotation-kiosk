import winston from "winston";
import Transport from "winston-transport";
import appInsights from "applicationinsights";

const LOG_LEVEL = process.env.LOG_LEVEL || "info";

// Map winston levels to Application Insights severity levels
const severityMap: Record<string, string> = {
  error: "Error",
  warn: "Warning",
  info: "Information",
  debug: "Verbose",
};

// Custom winston transport for Application Insights
class AppInsightsTransport extends Transport {
  override log(
    info: { level: string; message: string; [key: string]: unknown },
    callback: () => void
  ): void {
    setImmediate(() => this.emit("logged", info));

    // Send to Application Insights if configured
    const client = appInsights.defaultClient;
    if (client) {
      const { level, message, service, timestamp, ...meta } = info;
      client.trackTrace({
        message: String(message),
        severity: severityMap[level] ?? "Information",
        properties: {
          service: String(service || "email-parser"),
          timestamp: String(timestamp || new Date().toISOString()),
          level: String(level),
          ...Object.fromEntries(
            Object.entries(meta)
              .filter(([k]) => k !== "Symbol(level)" && k !== "Symbol(message)")
              .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)])
          ),
        },
      });
    }

    callback();
  }
}

// Custom format that outputs clean JSON for rsyslog consumption
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Pretty format for local development (when not in production)
const prettyFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
  })
);

// Use JSON format in production, pretty format in development
const format = process.env.NODE_ENV === "production" ? jsonFormat : prettyFormat;

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format,
  defaultMeta: { service: "email-parser" },
  transports: [new winston.transports.Console(), new AppInsightsTransport()],
});

// Helper function to create a child logger with additional context
export function createChildLogger(metadata: Record<string, unknown>): winston.Logger {
  return logger.child(metadata);
}

// Helper to safely extract error details for logging
export function errorDetails(error: unknown): { error: string; stack?: string } {
  if (error instanceof Error) {
    return { error: error.message, stack: error.stack };
  }
  return { error: String(error) };
}
