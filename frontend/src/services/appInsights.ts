import { ApplicationInsights } from "@microsoft/applicationinsights-web";

let appInsights: ApplicationInsights | null = null;

/**
 * Initialize Application Insights for frontend telemetry.
 * Call this early in the app lifecycle (e.g., in main.tsx).
 */
export function initAppInsights(): void {
  const connectionString = import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.debug(
      "Application Insights not configured (VITE_APPLICATIONINSIGHTS_CONNECTION_STRING not set)"
    );
    return;
  }

  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      enableAutoRouteTracking: true,
      enableCorsCorrelation: true,
      enableRequestHeaderTracking: true,
      enableResponseHeaderTracking: true,
    },
  });

  appInsights.loadAppInsights();
  console.debug("Application Insights initialized");
}

/**
 * Track a custom event
 */
export function trackEvent(name: string, properties?: Record<string, string>): void {
  appInsights?.trackEvent({ name }, properties);
}

/**
 * Track an exception
 */
export function trackException(error: Error, properties?: Record<string, string>): void {
  appInsights?.trackException({ exception: error }, properties);
}

/**
 * Track a page view
 */
export function trackPageView(name: string, uri?: string): void {
  appInsights?.trackPageView({ name, uri });
}

/**
 * Get the Application Insights instance (for advanced usage)
 */
export function getAppInsights(): ApplicationInsights | null {
  return appInsights;
}
