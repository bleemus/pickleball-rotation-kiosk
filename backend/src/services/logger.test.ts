import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock applicationinsights before importing logger
const mockTrackTrace = vi.fn();
const mockDefaultClient = {
  trackTrace: mockTrackTrace,
};

vi.mock("applicationinsights", () => ({
  default: {
    defaultClient: mockDefaultClient,
  },
}));

// Import after mocking
import { logger, createChildLogger, errorDetails } from "./logger.js";

describe("Logger Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logger", () => {
    it("should log info messages", () => {
      const consoleSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      logger.info("Test info message");

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("Test info message");

      consoleSpy.mockRestore();
    });

    it("should log error messages", () => {
      const consoleSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      logger.error("Test error message");

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("Test error message");

      consoleSpy.mockRestore();
    });

    it("should log warn messages", () => {
      const consoleSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      logger.warn("Test warning message");

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("Test warning message");

      consoleSpy.mockRestore();
    });

    it("should send logs to Application Insights when configured", async () => {
      const consoleSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      logger.info("Test message for App Insights");

      // Wait for setImmediate to complete
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockTrackTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Test message for App Insights",
          severity: "Information",
          properties: expect.objectContaining({
            service: "backend",
            level: "info",
          }),
        })
      );

      consoleSpy.mockRestore();
    });

    it("should map error level to Error severity", async () => {
      const consoleSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      logger.error("Error message");

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockTrackTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: "Error",
        })
      );

      consoleSpy.mockRestore();
    });

    it("should map warn level to Warning severity", async () => {
      const consoleSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      logger.warn("Warning message");

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockTrackTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: "Warning",
        })
      );

      consoleSpy.mockRestore();
    });

    it("should include additional metadata in properties", async () => {
      const consoleSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      logger.info("Message with metadata", { userId: "123", action: "test" });

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockTrackTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            userId: "123",
            action: "test",
          }),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe("createChildLogger", () => {
    it("should create a child logger with additional context", () => {
      const childLogger = createChildLogger({ requestId: "req-123" });

      expect(childLogger).toBeDefined();
      expect(childLogger.info).toBeDefined();
      expect(childLogger.error).toBeDefined();
    });

    it("should include parent context in child logger", () => {
      const consoleSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      const childLogger = createChildLogger({ requestId: "req-456" });
      childLogger.info("Child logger message");

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("Child logger message");

      consoleSpy.mockRestore();
    });
  });

  describe("errorDetails", () => {
    it("should extract message and stack from Error object", () => {
      const error = new Error("Test error");
      const details = errorDetails(error);

      expect(details.error).toBe("Test error");
      expect(details.stack).toBeDefined();
      expect(details.stack).toContain("Error: Test error");
    });

    it("should convert non-Error values to string", () => {
      const details = errorDetails("String error");

      expect(details.error).toBe("String error");
      expect(details.stack).toBeUndefined();
    });

    it("should handle null values", () => {
      const details = errorDetails(null);

      expect(details.error).toBe("null");
      expect(details.stack).toBeUndefined();
    });

    it("should handle undefined values", () => {
      const details = errorDetails(undefined);

      expect(details.error).toBe("undefined");
      expect(details.stack).toBeUndefined();
    });

    it("should handle object values", () => {
      const details = errorDetails({ code: 500 });

      expect(details.error).toBe("[object Object]");
      expect(details.stack).toBeUndefined();
    });
  });
});
