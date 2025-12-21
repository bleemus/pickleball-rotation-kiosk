import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../test/utils";
import userEvent from "@testing-library/user-event";
import { HelpModal, HelpButton } from "./HelpModal";

describe("HelpModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Visibility", () => {
    it("renders when isOpen is true", () => {
      render(<HelpModal {...defaultProps} />);
      expect(screen.getByText("How to Use")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<HelpModal isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByText("How to Use")).not.toBeInTheDocument();
    });
  });

  describe("Content Sections", () => {
    it("renders Getting Started section", () => {
      render(<HelpModal {...defaultProps} />);
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
    });

    it("renders During a Round section", () => {
      render(<HelpModal {...defaultProps} />);
      expect(screen.getByText("During a Round")).toBeInTheDocument();
    });

    it("renders Entering Scores section", () => {
      render(<HelpModal {...defaultProps} />);
      expect(screen.getByText("Entering Scores")).toBeInTheDocument();
    });

    it("renders Managing Players section", () => {
      render(<HelpModal {...defaultProps} />);
      expect(screen.getByText("Managing Players")).toBeInTheDocument();
    });

    it("renders Spectator Display section", () => {
      render(<HelpModal {...defaultProps} />);
      expect(screen.getByText("Spectator Display")).toBeInTheDocument();
    });

    it("renders Mobile Features section", () => {
      render(<HelpModal {...defaultProps} />);
      expect(screen.getByText("Mobile Features")).toBeInTheDocument();
    });

    it("renders Tips section", () => {
      render(<HelpModal {...defaultProps} />);
      expect(screen.getByText("💡 Tips")).toBeInTheDocument();
    });
  });

  describe("Close Interactions", () => {
    it("calls onClose when X button clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<HelpModal isOpen={true} onClose={onClose} />);

      await user.click(screen.getByText("×"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when "Got It!" button clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<HelpModal isOpen={true} onClose={onClose} />);

      await user.click(screen.getByText("Got It!"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Key Instructions", () => {
    it("mentions minimum players per court", () => {
      render(<HelpModal {...defaultProps} />);
      expect(screen.getByText(/at least 4 players per court/)).toBeInTheDocument();
    });

    it("mentions spectator URL", () => {
      render(<HelpModal {...defaultProps} />);
      expect(screen.getByText("/spectator")).toBeInTheDocument();
    });

    it("mentions QR code feature", () => {
      render(<HelpModal {...defaultProps} />);
      expect(screen.getByText(/QR code/)).toBeInTheDocument();
    });

    it("mentions auto-scroll feature", () => {
      render(<HelpModal {...defaultProps} />);
      // Multiple mentions of auto-scroll in help content
      expect(screen.getAllByText(/auto-scroll/i).length).toBeGreaterThan(0);
    });
  });
});

describe("HelpButton", () => {
  it("renders the help button", () => {
    render(<HelpButton />);
    expect(screen.getByText("Help")).toBeInTheDocument();
  });

  it("renders question mark icon", () => {
    render(<HelpButton />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("opens modal when clicked", async () => {
    const user = userEvent.setup();
    render(<HelpButton />);

    await user.click(screen.getByText("Help"));

    expect(screen.getByText("How to Use")).toBeInTheDocument();
  });

  it("closes modal when Got It! clicked", async () => {
    const user = userEvent.setup();
    render(<HelpButton />);

    // Open modal
    await user.click(screen.getByText("Help"));
    expect(screen.getByText("How to Use")).toBeInTheDocument();

    // Close modal
    await user.click(screen.getByText("Got It!"));
    expect(screen.queryByText("How to Use")).not.toBeInTheDocument();
  });
});
