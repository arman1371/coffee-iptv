// Test setup file for Vitest
import { vi } from "vitest";

// Mock webOS global object for testing
const mockWebOS = {
  service: {
    request: vi.fn(),
  },
};

// Set up global window object with webOS mock
Object.defineProperty(window, "webOS", {
  value: mockWebOS,
  writable: true,
});

// Export mock for use in tests
export { mockWebOS };
