import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/preact";
import { DebugPanel } from "./debug-panel";
import { configManager, onConfigChanged } from "./config-factory";

// Capture the checkDebug callback that DebugPanel registers via onConfigChanged
// so tests can simulate a config-save event.
let capturedConfigChangeCallback: (() => Promise<void>) | null = null;

vi.mock("./config-factory", () => ({
  configManager: {
    initialize: vi.fn().mockResolvedValue(undefined),
    isDebugMode: vi.fn().mockResolvedValue(false),
  },
  onConfigChanged: vi.fn(),
}));

describe("DebugPanel", () => {
  beforeEach(() => {
    capturedConfigChangeCallback = null;
    vi.clearAllMocks();

    vi.mocked(configManager.initialize).mockResolvedValue(undefined);
    vi.mocked(configManager.isDebugMode).mockResolvedValue(false);

    // Capture the callback passed by DebugPanel so tests can trigger it
    vi.mocked(onConfigChanged).mockImplementation(
      (cb: () => void) => {
        capturedConfigChangeCallback = cb as () => Promise<void>;
        return () => {
          capturedConfigChangeCallback = null;
        };
      }
    );
  });

  afterEach(() => {
    cleanup();
  });

  // ─── Visibility ────────────────────────────────────────────────────────────

  describe("visibility", () => {
    it("renders nothing when debug mode is disabled", async () => {
      vi.mocked(configManager.isDebugMode).mockResolvedValue(false);
      const { container } = render(<DebugPanel />);

      await waitFor(() => {
        expect(configManager.isDebugMode).toHaveBeenCalled();
      });

      expect(container.firstChild).toBeNull();
    });

    it("renders the panel when debug mode is enabled", async () => {
      vi.mocked(configManager.isDebugMode).mockResolvedValue(true);
      render(<DebugPanel />);

      await waitFor(() => {
        expect(screen.getByText("🐛 Debug Console")).toBeInTheDocument();
      });
    });

    it("appears after config-change notification enables debug mode", async () => {
      // Start with debug disabled
      vi.mocked(configManager.isDebugMode).mockResolvedValue(false);
      render(<DebugPanel />);

      await waitFor(() => {
        expect(configManager.isDebugMode).toHaveBeenCalled();
      });
      expect(screen.queryByText("🐛 Debug Console")).not.toBeInTheDocument();

      // User enables debug and saves config → simulate notification
      vi.mocked(configManager.isDebugMode).mockResolvedValue(true);
      await act(async () => {
        await capturedConfigChangeCallback?.();
      });

      await waitFor(() => {
        expect(screen.getByText("🐛 Debug Console")).toBeInTheDocument();
      });
    });

    it("disappears after config-change notification disables debug mode", async () => {
      // Start with debug enabled
      vi.mocked(configManager.isDebugMode).mockResolvedValue(true);
      render(<DebugPanel />);

      await waitFor(() => {
        expect(screen.getByText("🐛 Debug Console")).toBeInTheDocument();
      });

      // User disables debug and saves → simulate notification
      vi.mocked(configManager.isDebugMode).mockResolvedValue(false);
      await act(async () => {
        await capturedConfigChangeCallback?.();
      });

      await waitFor(() => {
        expect(screen.queryByText("🐛 Debug Console")).not.toBeInTheDocument();
      });
    });
  });

  // ─── Initialisation ────────────────────────────────────────────────────────

  describe("initialisation", () => {
    it("calls configManager.initialize on mount", async () => {
      render(<DebugPanel />);

      await waitFor(() => {
        expect(configManager.initialize).toHaveBeenCalled();
      });
    });

    it("subscribes to config changes via onConfigChanged", async () => {
      render(<DebugPanel />);

      await waitFor(() => {
        expect(onConfigChanged).toHaveBeenCalledWith(expect.any(Function));
      });
    });

    it("unsubscribes from config changes on unmount", async () => {
      const unsubscribe = vi.fn();
      vi.mocked(onConfigChanged).mockReturnValue(unsubscribe);

      const { unmount } = render(<DebugPanel />);
      await waitFor(() => expect(onConfigChanged).toHaveBeenCalled());

      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });

    it("re-checks debug mode when config changes", async () => {
      vi.mocked(configManager.isDebugMode).mockResolvedValue(false);
      render(<DebugPanel />);

      await waitFor(() => expect(configManager.isDebugMode).toHaveBeenCalledTimes(1));

      await act(async () => {
        await capturedConfigChangeCallback?.();
      });

      await waitFor(() => {
        expect(configManager.isDebugMode).toHaveBeenCalledTimes(2);
      });
    });

    it("does not crash when configManager.initialize rejects", async () => {
      vi.mocked(configManager.initialize).mockRejectedValue(
        new Error("DB error")
      );

      expect(() => render(<DebugPanel />)).not.toThrow();
    });
  });

  // ─── Toolbar ───────────────────────────────────────────────────────────────

  describe("toolbar", () => {
    beforeEach(async () => {
      vi.mocked(configManager.isDebugMode).mockResolvedValue(true);
    });

    it("shows the 'Debug Console' title", async () => {
      render(<DebugPanel />);
      await waitFor(() =>
        expect(screen.getByText("🐛 Debug Console")).toBeInTheDocument()
      );
    });

    it("shows a Clear button", async () => {
      render(<DebugPanel />);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument()
      );
    });

    it("shows a Hide button when panel is expanded", async () => {
      render(<DebugPanel />);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "▼ Hide" })).toBeInTheDocument()
      );
    });

    it("toggles to Show button when Hide is clicked", async () => {
      render(<DebugPanel />);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "▼ Hide" })).toBeInTheDocument()
      );

      fireEvent.click(screen.getByRole("button", { name: "▼ Hide" }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "▲ Show" })).toBeInTheDocument()
      );
    });

    it("toggles back to Hide when Show is clicked", async () => {
      render(<DebugPanel />);
      await waitFor(() => screen.getByRole("button", { name: "▼ Hide" }));

      fireEvent.click(screen.getByRole("button", { name: "▼ Hide" }));
      await waitFor(() => screen.getByRole("button", { name: "▲ Show" }));

      fireEvent.click(screen.getByRole("button", { name: "▲ Show" }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "▼ Hide" })).toBeInTheDocument()
      );
    });
  });

  // ─── Log area ──────────────────────────────────────────────────────────────

  describe("log area", () => {
    beforeEach(async () => {
      vi.mocked(configManager.isDebugMode).mockResolvedValue(true);
    });

    it("shows 'No log entries yet' placeholder when logs are empty", async () => {
      render(<DebugPanel />);

      await waitFor(() => screen.getByText("🐛 Debug Console"));

      // Clear any existing entries first via the Clear button
      fireEvent.click(screen.getByRole("button", { name: "Clear" }));

      await waitFor(() =>
        expect(screen.getByText("No log entries yet…")).toBeInTheDocument()
      );
    });

    it("hides log area when panel is collapsed", async () => {
      render(<DebugPanel />);
      await waitFor(() => screen.getByRole("button", { name: "▼ Hide" }));

      fireEvent.click(screen.getByRole("button", { name: "▼ Hide" }));

      await waitFor(() => {
        expect(screen.queryByText("No log entries yet…")).not.toBeInTheDocument();
      });
    });

    it("captures console.log entries and shows them in the panel", async () => {
      render(<DebugPanel />);
      await waitFor(() => screen.getByText("🐛 Debug Console"));

      // Clear first so we start with a clean slate for this assertion
      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      await waitFor(() => screen.getByText("No log entries yet…"));

      act(() => {
        console.log("hello from test");
      });

      await waitFor(() =>
        expect(screen.getByText("hello from test")).toBeInTheDocument()
      );
    });

    it("captures console.warn entries with correct level label", async () => {
      render(<DebugPanel />);
      await waitFor(() => screen.getByText("🐛 Debug Console"));

      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      await waitFor(() => screen.getByText("No log entries yet…"));

      act(() => {
        console.warn("warning message");
      });

      await waitFor(() => {
        expect(screen.getByText("warning message")).toBeInTheDocument();
        expect(screen.getByText("[warn]")).toBeInTheDocument();
      });
    });

    it("captures console.error entries with correct level label", async () => {
      render(<DebugPanel />);
      await waitFor(() => screen.getByText("🐛 Debug Console"));

      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      await waitFor(() => screen.getByText("No log entries yet…"));

      act(() => {
        console.error("error message");
      });

      await waitFor(() => {
        expect(screen.getByText("error message")).toBeInTheDocument();
        expect(screen.getByText("[error]")).toBeInTheDocument();
      });
    });

    it("captures console.info entries with correct level label", async () => {
      render(<DebugPanel />);
      await waitFor(() => screen.getByText("🐛 Debug Console"));

      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      await waitFor(() => screen.getByText("No log entries yet…"));

      act(() => {
        console.info("info message");
      });

      await waitFor(() => {
        expect(screen.getByText("info message")).toBeInTheDocument();
        expect(screen.getByText("[info]")).toBeInTheDocument();
      });
    });

    it("serialises object arguments to JSON", async () => {
      render(<DebugPanel />);
      await waitFor(() => screen.getByText("🐛 Debug Console"));

      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      await waitFor(() => screen.getByText("No log entries yet…"));

      act(() => {
        console.log({ key: "value" });
      });

      await waitFor(() =>
        expect(screen.getByText('{"key":"value"}')).toBeInTheDocument()
      );
    });

    it("formats Error objects as 'Name: message'", async () => {
      render(<DebugPanel />);
      await waitFor(() => screen.getByText("🐛 Debug Console"));

      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      await waitFor(() => screen.getByText("No log entries yet…"));

      act(() => {
        console.log(new TypeError("something went wrong"));
      });

      await waitFor(() =>
        expect(
          screen.getByText("TypeError: something went wrong")
        ).toBeInTheDocument()
      );
    });

    it("joins multiple arguments with a space", async () => {
      render(<DebugPanel />);
      await waitFor(() => screen.getByText("🐛 Debug Console"));

      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      await waitFor(() => screen.getByText("No log entries yet…"));

      act(() => {
        console.log("a", "b", "c");
      });

      await waitFor(() =>
        expect(screen.getByText("a b c")).toBeInTheDocument()
      );
    });

    it("clears all log entries when Clear button is clicked", async () => {
      render(<DebugPanel />);
      await waitFor(() => screen.getByText("🐛 Debug Console"));

      // Clear first — this also ensures the logListeners subscription effect has
      // settled before we add a new entry (same pattern as the other log tests).
      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      await waitFor(() => screen.getByText("No log entries yet…"));

      act(() => {
        console.log("entry to be cleared");
      });
      await waitFor(() => screen.getByText("entry to be cleared"));

      fireEvent.click(screen.getByRole("button", { name: "Clear" }));

      await waitFor(() =>
        expect(screen.getByText("No log entries yet…")).toBeInTheDocument()
      );
    });
  });
});
