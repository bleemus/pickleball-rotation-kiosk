import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpectatorView } from "./SpectatorView";

// Mock SpectatorDisplay component
vi.mock("../components/SpectatorDisplay", () => ({
  SpectatorDisplay: ({ apiUrl }: { apiUrl: string }) => (
    <div data-testid="spectator-display">SpectatorDisplay with apiUrl: {apiUrl}</div>
  ),
}));

describe("SpectatorView", () => {
  it("renders SpectatorDisplay component", () => {
    render(<SpectatorView />);

    expect(screen.getByTestId("spectator-display")).toBeInTheDocument();
  });

  it("passes API URL to SpectatorDisplay", () => {
    render(<SpectatorView />);

    // Default API URL is /api when VITE_API_URL is not set
    expect(screen.getByText(/SpectatorDisplay with apiUrl:/)).toBeInTheDocument();
  });
});
