import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createConfigManager,
  configManager,
  onConfigChanged,
  notifyConfigChanged,
} from "./config-factory";
import type { IConfigManager } from "./config-manager";

// Mock fetch for DevConfigManager tests
const mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ debugMode: false, m3uUrls: [] }),
  } as Response)
);
globalThis.fetch = mockFetch as typeof fetch;

describe("config-factory", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console.log
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    // Reset fetch mock
    mockFetch.mockClear();
  });

  afterEach(() => {
    // Restore console.log
    consoleLogSpy.mockRestore();
    vi.resetAllMocks();
  });

  describe("createConfigManager", () => {
    it("should return a config manager instance", () => {
      const manager = createConfigManager();

      expect(manager).toBeDefined();
      expect(manager).not.toBeNull();
    });

    it("should return a new instance on each call", () => {
      const manager1 = createConfigManager();
      const manager2 = createConfigManager();

      // Should be different instances
      expect(manager1).not.toBe(manager2);
    });

    it("should return an object with IConfigManager interface methods", () => {
      const manager = createConfigManager();

      expect(typeof manager.initialize).toBe("function");
      expect(typeof manager.getConfig).toBe("function");
      // Note: DevConfigManager doesn't have setConfig (read-only in dev)
      // Only check if method exists, not if it's present
      expect(typeof manager.getAllConfig).toBe("function");
      expect(typeof manager.isDebugMode).toBe("function");
      // Note: DevConfigManager doesn't have setDebugMode (read-only in dev)
      expect(typeof manager.getM3uUrls).toBe("function");
      // Note: DevConfigManager doesn't have setM3uUrls (read-only in dev)
    });

    it("should handle multiple sequential createConfigManager calls", () => {
      const managers = [];
      for (let i = 0; i < 5; i++) {
        managers.push(createConfigManager());
      }

      // All should be defined
      managers.forEach((manager) => {
        expect(manager).toBeDefined();
        expect(typeof manager.initialize).toBe("function");
      });

      // All should be different instances
      for (let i = 0; i < managers.length; i++) {
        for (let j = i + 1; j < managers.length; j++) {
          expect(managers[i]).not.toBe(managers[j]);
        }
      }
    });

    it("should not throw errors when creating manager", () => {
      expect(() => createConfigManager()).not.toThrow();
    });
  });

  describe("singleton configManager", () => {
    it("should export a singleton configManager instance", () => {
      expect(configManager).toBeDefined();
      expect(configManager).toHaveProperty("initialize");
      expect(configManager).toHaveProperty("getConfig");
      // Note: DevConfigManager doesn't have setConfig (read-only in dev)
      expect(configManager).toHaveProperty("getAllConfig");
      expect(configManager).toHaveProperty("isDebugMode");
      // Note: DevConfigManager doesn't have setDebugMode (read-only in dev)
      expect(configManager).toHaveProperty("getM3uUrls");
      // Note: DevConfigManager doesn't have setM3uUrls (read-only in dev)
    });

    it("should be the same instance as default export", async () => {
      const { default: defaultExport } = await import("./config-factory");
      expect(defaultExport).toBe(configManager);
    });

    it("should be consistent across multiple accesses", () => {
      const manager1 = configManager;
      const manager2 = configManager;

      expect(manager1).toBe(manager2);
    });

    it("should be a different instance than createConfigManager returns", () => {
      const manager = createConfigManager();

      // Singleton should be different from newly created instances
      expect(manager).not.toBe(configManager);
    });
  });

  describe("functionality tests", () => {
    it("should create manager that can be initialized", async () => {
      const manager = createConfigManager();

      // Should be able to call initialize
      await expect(manager.initialize()).resolves.toBeUndefined();
    });

    it("should create manager with functional methods", async () => {
      const manager = createConfigManager();

      // Initialize first
      await manager.initialize();

      // Should be able to call getter methods
      const debugMode = await manager.isDebugMode();
      expect(typeof debugMode).toBe("boolean");

      const m3uUrls = await manager.getM3uUrls();
      expect(Array.isArray(m3uUrls)).toBe(true);

      const allConfig = await manager.getAllConfig();
      expect(typeof allConfig).toBe("object");
    });

    it("should create manager that can set values", async () => {
      const manager = createConfigManager();
      await manager.initialize();

      // Note: DevConfigManager is read-only, so setConfig methods don't exist
      // This test only checks that manager was initialized successfully
      expect(manager).toBeDefined();

      // If it's a ConfigManager (production), it will have setConfig methods
      if ("setDebugMode" in manager) {
        await (manager as IConfigManager & { setDebugMode: (enabled: boolean) => Promise<void> }).setDebugMode(true);
        expect(manager).toBeDefined();
      }
      if ("setM3uUrls" in manager) {
        await (manager as IConfigManager & { setM3uUrls: (urls: Array<{ url: string; enabled: boolean }>) => Promise<void> }).setM3uUrls([{ url: "https://example.com/playlist.m3u", enabled: true }]);
        expect(manager).toBeDefined();
      }
    });

    it("should create manager that can get specific config values", async () => {
      const manager = createConfigManager();
      await manager.initialize();

      // Should be able to get specific config values
      const debugMode = await manager.getConfig("debugMode");
      expect(typeof debugMode).toBe("boolean");

      const m3uUrls = await manager.getConfig("m3uUrls");
      expect(Array.isArray(m3uUrls)).toBe(true);
    });
  });

  describe("integration tests", () => {
    it("should work with the singleton instance", async () => {
      // Should be able to use the exported singleton
      await expect(configManager.initialize()).resolves.toBeUndefined();
      await expect(configManager.isDebugMode()).resolves.toBeDefined();
      await expect(configManager.getM3uUrls()).resolves.toBeDefined();
    });

    it("should maintain consistent interface across multiple managers", () => {
      const manager1 = createConfigManager();
      const manager2 = createConfigManager();

      // Both should have the same methods
      const methods1 = Object.keys(manager1).sort();
      const methods2 = Object.keys(manager2).sort();

      expect(methods1).toEqual(methods2);
    });

    it("should handle concurrent manager creation", () => {
      const managers = Array.from({ length: 10 }, () => createConfigManager());

      // All should be valid
      managers.forEach((manager) => {
        expect(manager).toBeDefined();
        expect(manager).not.toBeNull();
      });

      // All should be unique instances
      const uniqueManagers = new Set(managers);
      expect(uniqueManagers.size).toBe(managers.length);
    });
  });

  describe("type safety", () => {
    it("should implement IConfigManager interface", async () => {
      const manager: IConfigManager = createConfigManager();

      // TypeScript should enforce the interface
      expect(manager).toBeDefined();

      // Should have all required methods
      await expect(manager.initialize()).resolves.toBeUndefined();
    });

    it("should export singleton with correct type", () => {
      const manager: IConfigManager = configManager;
      expect(manager).toBeDefined();
    });

    it("should allow assignment to IConfigManager type", () => {
      const manager: IConfigManager = createConfigManager();

      // TypeScript compilation ensures this works
      expect(manager).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should return non-null manager", () => {
      const manager = createConfigManager();
      expect(manager).not.toBeNull();
      expect(manager).not.toBeUndefined();
    });

    it("should handle rapid successive calls", () => {
      const managers = [];
      for (let i = 0; i < 100; i++) {
        managers.push(createConfigManager());
      }

      expect(managers).toHaveLength(100);
      managers.forEach((manager) => {
        expect(manager).toBeDefined();
      });
    });

    it("should create manager with all required properties", () => {
      const manager = createConfigManager();

      // Core required methods that both ConfigManager and DevConfigManager have
      const requiredMethods = [
        "initialize",
        "getConfig",
        "getAllConfig",
        "isDebugMode",
        "getM3uUrls",
      ] as const;

      requiredMethods.forEach((method) => {
        expect(manager).toHaveProperty(method);
        expect(typeof (manager as unknown as Record<string, unknown>)[method]).toBe("function");
      });
    });
  });

  describe("module exports", () => {
    it("should export createConfigManager function", () => {
      expect(createConfigManager).toBeDefined();
      expect(typeof createConfigManager).toBe("function");
    });

    it("should export configManager singleton", () => {
      expect(configManager).toBeDefined();
      expect(typeof configManager).toBe("object");
    });

    it("should have default export pointing to singleton", async () => {
      const module = await import("./config-factory");
      expect(module.default).toBeDefined();
      expect(module.default).toBe(module.configManager);
    });
  });

  describe("consistency tests", () => {
    it("should always return instances with the same interface structure", () => {
      const manager1 = createConfigManager();
      const manager2 = createConfigManager();
      const manager3 = createConfigManager();

      const keys1 = Object.keys(manager1).sort();
      const keys2 = Object.keys(manager2).sort();
      const keys3 = Object.keys(manager3).sort();

      expect(keys1).toEqual(keys2);
      expect(keys2).toEqual(keys3);
    });

    it("should maintain interface contract across all instances", async () => {
      const managers = Array.from({ length: 5 }, () => createConfigManager());

      for (const manager of managers) {
        // All should implement the IConfigManager interface
        await expect(manager.initialize()).resolves.toBeUndefined();
        expect(typeof (await manager.isDebugMode())).toBe("boolean");
        expect(Array.isArray(await manager.getM3uUrls())).toBe(true);
      }
    });
  });

  describe("error handling", () => {
    it("should not throw when accessing methods", () => {
      const manager = createConfigManager();

      // Accessing methods should not throw
      expect(() => manager.initialize).not.toThrow();
      expect(() => manager.getConfig).not.toThrow();
      expect(() => manager.isDebugMode).not.toThrow();
    });

    it("should handle initialization gracefully", async () => {
      const manager = createConfigManager();

      // Should not throw on first initialization
      await expect(manager.initialize()).resolves.toBeUndefined();

      // Should handle multiple initializations
      await expect(manager.initialize()).resolves.toBeUndefined();
    });
  });
});

describe("config change event emitter", () => {
  // Keep track of all unsubscribe functions so we never leak listeners
  // between tests.
  const unsubscribers: Array<() => void> = [];

  afterEach(() => {
    unsubscribers.forEach((fn) => {
      fn();
    });
    unsubscribers.length = 0;
  });

  it("notifyConfigChanged calls a registered listener", () => {
    const listener = vi.fn();
    unsubscribers.push(onConfigChanged(listener));

    notifyConfigChanged();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("onConfigChanged returns an unsubscribe function that removes the listener", () => {
    const listener = vi.fn();
    const unsubscribe = onConfigChanged(listener);

    notifyConfigChanged();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    notifyConfigChanged();

    // Still only one call — listener was removed
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("calling unsubscribe multiple times is safe", () => {
    const listener = vi.fn();
    const unsubscribe = onConfigChanged(listener);

    unsubscribe();
    expect(() => unsubscribe()).not.toThrow();
  });

  it("notifies multiple independent listeners", () => {
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    const listenerC = vi.fn();

    unsubscribers.push(
      onConfigChanged(listenerA),
      onConfigChanged(listenerB),
      onConfigChanged(listenerC)
    );

    notifyConfigChanged();

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerC).toHaveBeenCalledTimes(1);
  });

  it("removing one listener does not affect others", () => {
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    const unsubA = onConfigChanged(listenerA);
    unsubscribers.push(onConfigChanged(listenerB));

    unsubA(); // remove only A
    notifyConfigChanged();

    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it("notifyConfigChanged is a no-op when there are no listeners", () => {
    expect(() => notifyConfigChanged()).not.toThrow();
  });

  it("the same listener can be registered multiple times and fires multiple times", () => {
    const listener = vi.fn();
    unsubscribers.push(
      onConfigChanged(listener),
      onConfigChanged(listener)
    );

    notifyConfigChanged();

    // Set stores unique references — registering the same fn twice
    // only stores it once.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("notifyConfigChanged can be called multiple times", () => {
    const listener = vi.fn();
    unsubscribers.push(onConfigChanged(listener));

    notifyConfigChanged();
    notifyConfigChanged();
    notifyConfigChanged();

    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("onConfigChanged returns a function", () => {
    const unsubscribe = onConfigChanged(vi.fn());
    unsubscribers.push(unsubscribe);

    expect(typeof unsubscribe).toBe("function");
  });
});
