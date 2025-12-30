import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the environment variable before importing the module
vi.stubEnv("VITE_APPLICATIONINSIGHTS_CONNECTION_STRING", "InstrumentationKey=test-key");

// Mock the ApplicationInsights module with a proper class
vi.mock("@microsoft/applicationinsights-web", () => {
  return {
    ApplicationInsights: function MockApplicationInsights() {
      return {
        loadAppInsights: vi.fn(),
        trackEvent: vi.fn(),
        trackException: vi.fn(),
        trackPageView: vi.fn(),
      };
    },
  };
});

// Import after mocks are set up
import {
  initAppInsights,
  trackEvent,
  trackException,
  trackPageView,
  getAppInsights,
} from "./appInsights";

describe("Application Insights Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module to clear the appInsights instance between tests
    vi.resetModules();
  });

  describe("initAppInsights", () => {
    it("should initialize Application Insights when connection string is set", () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

      initAppInsights();

      // Verify the instance was created by checking getAppInsights
      const instance = getAppInsights();
      expect(instance).not.toBeNull();
      expect(instance?.loadAppInsights).toBeDefined();

      debugSpy.mockRestore();
    });
  });

  describe("trackEvent", () => {
    it("should call trackEvent on the instance", () => {
      initAppInsights();
      const instance = getAppInsights();

      trackEvent("test-event");

      expect(instance?.trackEvent).toHaveBeenCalledWith({ name: "test-event" }, undefined);
    });

    it("should call trackEvent with properties", () => {
      initAppInsights();
      const instance = getAppInsights();

      trackEvent("user-action", { action: "click", target: "button" });

      expect(instance?.trackEvent).toHaveBeenCalledWith(
        { name: "user-action" },
        { action: "click", target: "button" }
      );
    });
  });

  describe("trackException", () => {
    it("should call trackException on the instance", () => {
      initAppInsights();
      const instance = getAppInsights();

      const error = new Error("Test error");
      trackException(error);

      expect(instance?.trackException).toHaveBeenCalledWith({ exception: error }, undefined);
    });

    it("should call trackException with properties", () => {
      initAppInsights();
      const instance = getAppInsights();

      const error = new Error("API error");
      trackException(error, { endpoint: "/api/test", statusCode: "500" });

      expect(instance?.trackException).toHaveBeenCalledWith(
        { exception: error },
        { endpoint: "/api/test", statusCode: "500" }
      );
    });
  });

  describe("trackPageView", () => {
    it("should call trackPageView on the instance", () => {
      initAppInsights();
      const instance = getAppInsights();

      trackPageView("Home");

      expect(instance?.trackPageView).toHaveBeenCalledWith({ name: "Home", uri: undefined });
    });

    it("should call trackPageView with URI", () => {
      initAppInsights();
      const instance = getAppInsights();

      trackPageView("Spectator", "/spectator");

      expect(instance?.trackPageView).toHaveBeenCalledWith({
        name: "Spectator",
        uri: "/spectator",
      });
    });
  });

  describe("getAppInsights", () => {
    it("should return the Application Insights instance after initialization", () => {
      initAppInsights();
      const instance = getAppInsights();

      expect(instance).toBeDefined();
      expect(instance).not.toBeNull();
    });
  });
});
