// Tests for Config Factory

import { describe, it, expect, vi } from "vitest";
import { createConfigManager } from "./config-factory";
import { DevConfigManager } from "./dev-config-manager";

describe("Config Factory", () => {
  describe("createConfigManager", () => {
    it("should return DevConfigManager in development/test mode", () => {
      // In test environment, it should return DevConfigManager
      const manager = createConfigManager();
      expect(manager).toBeInstanceOf(DevConfigManager);
    });

    it("should return an object implementing IConfigManager interface", () => {
      const manager = createConfigManager();
      
      expect(manager).toHaveProperty("initialize");
      expect(manager).toHaveProperty("getConfig");
      expect(manager).toHaveProperty("getAllConfig");
      expect(manager).toHaveProperty("isDebugMode");
      expect(manager).toHaveProperty("getM3uUrls");
      
      expect(typeof manager.initialize).toBe("function");
      expect(typeof manager.getConfig).toBe("function");
      expect(typeof manager.getAllConfig).toBe("function");
      expect(typeof manager.isDebugMode).toBe("function");
      expect(typeof manager.getM3uUrls).toBe("function");
    });

    it("should call initialize on the returned manager", async () => {
      const manager = createConfigManager();
      
      // Mock fetch for DevConfigManager
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          debugMode: false,
          m3uUrls: [],
        }),
      });
      globalThis.fetch = mockFetch as typeof fetch;

      await expect(manager.initialize()).resolves.not.toThrow();
    });
  });
});
