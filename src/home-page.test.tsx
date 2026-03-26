import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/preact";
import { HomePage } from "./home-page";
import type { M3UPlaylist } from "./m3u-manager";

function createPlaylist(count: number): M3UPlaylist {
  const channels = Array.from({ length: count }, (_, i) => ({
    id: `ch-${i}`,
    name: `Channel ${i + 1}`,
    url: `http://example.com/stream${i}.m3u8`,
    group: "Test",
    attributes: {},
  }));

  return {
    channels,
    metadata: {
      totalChannels: count,
      groups: ["Test"],
      parsedAt: new Date().toISOString(),
    },
  };
}

describe("HomePage", () => {
  const defaultProps = {
    playlist: createPlaylist(20),
    loading: false,
    error: null,
    onRetry: vi.fn(),
    onChannelClick: vi.fn(),
    initialFocusIndex: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom doesn't implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("Magic Remote scroll wheel support", () => {
    it("should register a wheel event listener on document", () => {
      const addSpy = vi.spyOn(document, "addEventListener");

      render(<HomePage {...defaultProps} />);

      const wheelCall = addSpy.mock.calls.find(
        (call) => call[0] === "wheel"
      );
      expect(wheelCall).toBeDefined();
      expect(wheelCall![2]).toEqual({ passive: false });
    });

    it("should remove wheel event listener on unmount", () => {
      const removeSpy = vi.spyOn(document, "removeEventListener");

      const { unmount } = render(<HomePage {...defaultProps} />);
      unmount();

      const wheelCall = removeSpy.mock.calls.find(
        (call) => call[0] === "wheel"
      );
      expect(wheelCall).toBeDefined();
    });

    it("should call window.scrollBy with deltaY on wheel down", () => {
      const scrollBySpy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});

      render(<HomePage {...defaultProps} />);

      const wheelEvent = new WheelEvent("wheel", {
        deltaY: 120,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(wheelEvent);

      expect(scrollBySpy).toHaveBeenCalledWith(0, 120);
    });

    it("should call window.scrollBy with negative deltaY on wheel up", () => {
      const scrollBySpy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});

      render(<HomePage {...defaultProps} />);

      const wheelEvent = new WheelEvent("wheel", {
        deltaY: -120,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(wheelEvent);

      expect(scrollBySpy).toHaveBeenCalledWith(0, -120);
    });

    it("should call preventDefault on the wheel event", () => {
      vi.spyOn(window, "scrollBy").mockImplementation(() => {});

      render(<HomePage {...defaultProps} />);

      const wheelEvent = new WheelEvent("wheel", {
        deltaY: 100,
        bubbles: true,
        cancelable: true,
      });
      const preventSpy = vi.spyOn(wheelEvent, "preventDefault");

      document.dispatchEvent(wheelEvent);

      expect(preventSpy).toHaveBeenCalled();
    });

    it("should still register wheel listener when loading", () => {
      const addSpy = vi.spyOn(document, "addEventListener");

      render(<HomePage {...defaultProps} loading={true} />);

      const wheelCall = addSpy.mock.calls.find(
        (call) => call[0] === "wheel"
      );
      expect(wheelCall).toBeDefined();
    });

    it("should still register wheel listener when there is an error", () => {
      const addSpy = vi.spyOn(document, "addEventListener");

      render(
        <HomePage {...defaultProps} error="Something went wrong" />
      );

      const wheelCall = addSpy.mock.calls.find(
        (call) => call[0] === "wheel"
      );
      expect(wheelCall).toBeDefined();
    });

    it("should pass through the exact deltaY value to scrollBy", () => {
      const scrollBySpy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});

      render(<HomePage {...defaultProps} />);

      const values = [1, 50, 200, -1, -75, -300];
      for (const deltaY of values) {
        const event = new WheelEvent("wheel", {
          deltaY,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
      }

      expect(scrollBySpy).toHaveBeenCalledTimes(values.length);
      values.forEach((deltaY, i) => {
        expect(scrollBySpy).toHaveBeenNthCalledWith(i + 1, 0, deltaY);
      });
    });
  });
});
