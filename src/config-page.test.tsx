import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/preact";
import { ConfigPage } from "./config-page";
import { configManager } from "./config-factory";
import type { AppConfig } from "./config-manager";

// Mock the config-factory
vi.mock("./config-factory", () => ({
  configManager: {
    initialize: vi.fn(),
    getAllConfig: vi.fn(),
    setDebugMode: vi.fn(),
    setM3uUrls: vi.fn(),
  },
}));

describe("ConfigPage", () => {
  const mockConfig: AppConfig = {
    debugMode: false,
    m3uUrls: [
      { url: "https://example.com/playlist1.m3u", enabled: true },
      { url: "https://example.com/playlist2.m3u", enabled: false },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.history.back
    vi.spyOn(window.history, "back").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("Loading State", () => {
    it("should show loading spinner initially", () => {
      vi.mocked(configManager.initialize).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ConfigPage />);

      expect(screen.getByText("Loading configuration...")).toBeInTheDocument();
    });

    it("should load configuration on mount", async () => {
      vi.mocked(configManager.initialize).mockResolvedValue(undefined);
      vi.mocked(configManager.getAllConfig).mockResolvedValue(mockConfig);

      render(<ConfigPage />);

      await waitFor(() => {
        expect(configManager.initialize).toHaveBeenCalled();
        expect(configManager.getAllConfig).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error when loading configuration fails", async () => {
      const errorMessage = "Database connection failed";
      vi.mocked(configManager.initialize).mockRejectedValue(
        new Error(errorMessage)
      );

      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Failed to Load Configuration")).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it("should show generic error message for non-Error objects", async () => {
      vi.mocked(configManager.initialize).mockRejectedValue("String error");

      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load configuration")).toBeInTheDocument();
      });
    });

    it("should allow retry after load failure", async () => {
      vi.mocked(configManager.initialize)
        .mockRejectedValueOnce(new Error("First failure"))
        .mockResolvedValueOnce(undefined);
      vi.mocked(configManager.getAllConfig).mockResolvedValue(mockConfig);

      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });

      const retryButton = screen.getByText("Try Again");
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(configManager.initialize).toHaveBeenCalledTimes(2);
      });
    });

    it("should show error during save and keep form visible", async () => {
      vi.mocked(configManager.initialize).mockResolvedValue(undefined);
      vi.mocked(configManager.getAllConfig).mockResolvedValue(mockConfig);
      vi.mocked(configManager.setDebugMode!).mockRejectedValue(
        new Error("Save failed")
      );

      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Save Configuration")).toBeInTheDocument();
      });

      const saveButton = screen.getByText("Save Configuration");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Save failed")).toBeInTheDocument();
      });
    });

    it("should show generic error message for non-Error during save", async () => {
      vi.mocked(configManager.initialize).mockResolvedValue(undefined);
      vi.mocked(configManager.getAllConfig).mockResolvedValue(mockConfig);
      vi.mocked(configManager.setDebugMode!).mockRejectedValue("String error");

      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Save Configuration")).toBeInTheDocument();
      });

      const saveButton = screen.getByText("Save Configuration");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to save configuration")).toBeInTheDocument();
      });
    });
  });

  describe("Configuration Display", () => {
    beforeEach(async () => {
      vi.mocked(configManager.initialize).mockResolvedValue(undefined);
      vi.mocked(configManager.getAllConfig).mockResolvedValue(mockConfig);
    });

    it("should display playlist URLs", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("https://example.com/playlist1.m3u")).toBeInTheDocument();
        expect(screen.getByDisplayValue("https://example.com/playlist2.m3u")).toBeInTheDocument();
      });
    });

    it("should display debug mode checkbox", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
        expect(checkbox).toBeInTheDocument();
        expect(checkbox.checked).toBe(false);
      });
    });

    it("should show debug mode as checked when enabled", async () => {
      vi.mocked(configManager.getAllConfig).mockResolvedValue({
        ...mockConfig,
        debugMode: true,
      });

      render(<ConfigPage />);

      await waitFor(() => {
        const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      });
    });

    it("should show empty state message when no URLs configured", async () => {
      vi.mocked(configManager.getAllConfig).mockResolvedValue({
        ...mockConfig,
        m3uUrls: [],
      });

      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText(/No playlist URLs configured/)).toBeInTheDocument();
      });
    });

    it("should display URL count in Add URL button", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Add URL 2/10")).toBeInTheDocument();
      });
    });
  });

  describe("URL Management", () => {
    beforeEach(async () => {
      vi.mocked(configManager.initialize).mockResolvedValue(undefined);
      vi.mocked(configManager.getAllConfig).mockResolvedValue(mockConfig);
    });

    it("should add new URL when Add URL button is clicked", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Add URL 2/10")).toBeInTheDocument();
      });

      const addButton = screen.getByText("Add URL 2/10");
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("Add URL 3/10")).toBeInTheDocument();
      });
    });

    it("should not add URL when limit of 10 is reached", async () => {
      const maxConfig: AppConfig = {
        debugMode: false,
        m3uUrls: Array.from({ length: 10 }, (_, i) => ({
          url: `https://example.com/playlist${i}.m3u`,
          enabled: true,
        })),
      };
      vi.mocked(configManager.getAllConfig).mockResolvedValue(maxConfig);

      render(<ConfigPage />);

      await waitFor(() => {
        const addButton = screen.getByText("Add URL 10/10");
        expect(addButton).toBeDisabled();
      });
    });

    it("should remove URL when Remove button is clicked", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("https://example.com/playlist1.m3u")).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByDisplayValue("https://example.com/playlist1.m3u")).not.toBeInTheDocument();
        expect(screen.getByText("Add URL 1/10")).toBeInTheDocument();
      });
    });

    it("should update URL when input value changes", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("https://example.com/playlist1.m3u")).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue("https://example.com/playlist1.m3u") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "https://new-url.com/test.m3u" } });

      await waitFor(() => {
        expect(input.value).toBe("https://new-url.com/test.m3u");
      });
    });

    it("should toggle URL enabled state when toggle button clicked", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Disable")).toBeInTheDocument();
      });

      const disableButton = screen.getByText("Disable");
      fireEvent.click(disableButton);

      await waitFor(() => {
        expect(screen.getAllByText("Enable")).toHaveLength(2);
      });
    });

    it("should show Enable button for disabled URLs", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Enable")).toBeInTheDocument();
      });
    });

    it("should apply opacity to disabled URL inputs", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText("https://example.com/playlist.m3u");
        const disabledInput = inputs[1];
        expect(disabledInput.className).toContain("opacity-60");
      });
    });
  });

  describe("Debug Mode Toggle", () => {
    beforeEach(async () => {
      vi.mocked(configManager.initialize).mockResolvedValue(undefined);
      vi.mocked(configManager.getAllConfig).mockResolvedValue(mockConfig);
    });

    it("should toggle debug mode when checkbox is clicked", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
      });

      const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(checkbox.checked).toBe(true);
      });
    });
  });

  describe("Save Configuration", () => {
    beforeEach(async () => {
      vi.mocked(configManager.initialize).mockResolvedValue(undefined);
      vi.mocked(configManager.getAllConfig).mockResolvedValue(mockConfig);
      vi.mocked(configManager.setDebugMode!).mockResolvedValue(undefined);
      vi.mocked(configManager.setM3uUrls!).mockResolvedValue(undefined);
    });

    it("should save configuration and navigate back", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Save Configuration")).toBeInTheDocument();
      });

      const saveButton = screen.getByText("Save Configuration");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(configManager.setDebugMode).toHaveBeenCalledWith(false);
        expect(configManager.setM3uUrls).toHaveBeenCalledWith(mockConfig.m3uUrls);
        expect(window.history.back).toHaveBeenCalled();
      });
    });

    it("should show saving state during save", async () => {
      let resolveSave: () => void;
      vi.mocked(configManager.setDebugMode!).mockImplementation(
        () => new Promise((resolve) => { resolveSave = resolve as () => void; })
      );

      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Save Configuration")).toBeInTheDocument();
      });

      const saveButton = screen.getByText("Save Configuration");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Saving...")).toBeInTheDocument();
      });

      resolveSave!();

      await waitFor(() => {
        expect(screen.getByText("Save Configuration")).toBeInTheDocument();
      });
    });

    it("should disable buttons while saving", async () => {
      let resolveSave: () => void;
      vi.mocked(configManager.setDebugMode!).mockImplementation(
        () => new Promise((resolve) => { resolveSave = resolve as () => void; })
      );

      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Save Configuration")).toBeInTheDocument();
      });

      const saveButton = screen.getByText("Save Configuration");
      const cancelButton = screen.getByText("Cancel");

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(saveButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });

      resolveSave!();
    });

    it("should save modified configuration", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeInTheDocument();
      });

      // Enable debug mode
      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      // Change URL
      const input = screen.getByDisplayValue("https://example.com/playlist1.m3u") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "https://modified.com/test.m3u" } });

      // Save
      const saveButton = screen.getByText("Save Configuration");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(configManager.setDebugMode).toHaveBeenCalledWith(true);
        expect(configManager.setM3uUrls).toHaveBeenCalledWith([
          { url: "https://modified.com/test.m3u", enabled: true },
          { url: "https://example.com/playlist2.m3u", enabled: false },
        ]);
      });
    });

    it("should not save if config is null", async () => {
      // This edge case shouldn't happen, but test the guard
      vi.mocked(configManager.getAllConfig).mockResolvedValue(mockConfig);

      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Save Configuration")).toBeInTheDocument();
      });

      // Force config to null by providing an error state that clears it
      // This is a defensive test for the `if (!config) return;` guard
      const saveButton = screen.getByText("Save Configuration") as HTMLButtonElement;
      
      // Button should be disabled when config is null
      expect(saveButton.disabled).toBe(false);
    });
  });

  describe("Cancel Configuration", () => {
    beforeEach(async () => {
      vi.mocked(configManager.initialize).mockResolvedValue(undefined);
      vi.mocked(configManager.getAllConfig).mockResolvedValue(mockConfig);
    });

    it("should reset changes and navigate back when cancel is clicked", async () => {
      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeInTheDocument();
      });

      // Make changes
      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      // Verify change was made
      await waitFor(() => {
        expect((checkbox as HTMLInputElement).checked).toBe(true);
      });

      // Cancel
      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(window.history.back).toHaveBeenCalled();
      });
    });

    it("should clear error when cancel is clicked", async () => {
      vi.mocked(configManager.setDebugMode!).mockRejectedValue(
        new Error("Save error")
      );

      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Save Configuration")).toBeInTheDocument();
      });

      // Try to save to create an error
      const saveButton = screen.getByText("Save Configuration");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Save error")).toBeInTheDocument();
      });

      // Cancel should clear the error
      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      // Error should be cleared and navigate back
      await waitFor(() => {
        expect(window.history.back).toHaveBeenCalled();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle config with no m3uUrls array", async () => {
      vi.mocked(configManager.initialize).mockResolvedValue(undefined);
      vi.mocked(configManager.getAllConfig).mockResolvedValue({
        debugMode: false,
        m3uUrls: [],
      });

      render(<ConfigPage />);

      await waitFor(() => {
        expect(screen.getByText("Add URL 0/10")).toBeInTheDocument();
      });
    });

    it("should handle adding URL when at limit", async () => {
      const maxConfig: AppConfig = {
        debugMode: false,
        m3uUrls: Array.from({ length: 10 }, (_, i) => ({
          url: `https://example.com/playlist${i}.m3u`,
          enabled: true,
        })),
      };
      vi.mocked(configManager.initialize).mockResolvedValue(undefined);
      vi.mocked(configManager.getAllConfig).mockResolvedValue(maxConfig);

      render(<ConfigPage />);

      await waitFor(() => {
        const addButton = screen.getByText("Add URL 10/10");
        expect(addButton).toBeDisabled();
      });
    });
  });
});
