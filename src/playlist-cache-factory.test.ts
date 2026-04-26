import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createPlaylistCacheManager,
  playlistCacheManager,
} from "./playlist-cache-factory";
import type { IPlaylistCacheManager } from "./playlist-cache-manager";

describe("playlist-cache-factory", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    vi.resetAllMocks();
  });

  describe("createPlaylistCacheManager", () => {
    it("should return a cache manager instance", () => {
      const manager = createPlaylistCacheManager();
      expect(manager).toBeDefined();
      expect(manager).not.toBeNull();
    });

    it("should return a new instance on each call", () => {
      const manager1 = createPlaylistCacheManager();
      const manager2 = createPlaylistCacheManager();
      expect(manager1).not.toBe(manager2);
    });

    it("should return an object with IPlaylistCacheManager interface methods", () => {
      const manager = createPlaylistCacheManager();

      expect(typeof manager.initialize).toBe("function");
      expect(typeof manager.getCachedPlaylist).toBe("function");
      expect(typeof manager.cachePlaylist).toBe("function");
      expect(typeof manager.clearCache).toBe("function");
    });

    it("should not throw errors when creating manager", () => {
      expect(() => createPlaylistCacheManager()).not.toThrow();
    });

    it("should handle multiple sequential calls", () => {
      const managers = [];
      for (let i = 0; i < 5; i++) {
        managers.push(createPlaylistCacheManager());
      }

      managers.forEach((manager) => {
        expect(manager).toBeDefined();
        expect(typeof manager.initialize).toBe("function");
      });

      // All should be different instances
      const uniqueManagers = new Set(managers);
      expect(uniqueManagers.size).toBe(managers.length);
    });
  });

  describe("singleton playlistCacheManager", () => {
    it("should export a singleton instance", () => {
      expect(playlistCacheManager).toBeDefined();
      expect(playlistCacheManager).not.toBeNull();
    });

    it("should have all IPlaylistCacheManager methods", () => {
      expect(typeof playlistCacheManager.initialize).toBe("function");
      expect(typeof playlistCacheManager.getCachedPlaylist).toBe("function");
      expect(typeof playlistCacheManager.cachePlaylist).toBe("function");
      expect(typeof playlistCacheManager.clearCache).toBe("function");
    });

    it("should be consistent across multiple accesses", () => {
      const ref1 = playlistCacheManager;
      const ref2 = playlistCacheManager;
      expect(ref1).toBe(ref2);
    });

    it("should be a different instance than createPlaylistCacheManager returns", () => {
      const manager = createPlaylistCacheManager();
      expect(manager).not.toBe(playlistCacheManager);
    });
  });

  describe("type safety", () => {
    it("should implement IPlaylistCacheManager interface", () => {
      const manager: IPlaylistCacheManager = createPlaylistCacheManager();
      expect(manager).toBeDefined();
    });

    it("should export singleton with correct type", () => {
      const manager: IPlaylistCacheManager = playlistCacheManager;
      expect(manager).toBeDefined();
    });
  });

  describe("functionality tests", () => {
    it("should create manager that can be initialized", async () => {
      const manager = createPlaylistCacheManager();
      await expect(manager.initialize()).resolves.toBeUndefined();
    });

    it("should create manager that returns null for empty cache", async () => {
      const manager = createPlaylistCacheManager();
      await manager.initialize();

      const result = await manager.getCachedPlaylist("somehash", 24);
      expect(result).toBeNull();
    });

    it("should create manager with working clearCache", async () => {
      const manager = createPlaylistCacheManager();
      await manager.initialize();
      await expect(manager.clearCache()).resolves.toBeUndefined();
    });
  });

  describe("module exports", () => {
    it("should export createPlaylistCacheManager function", () => {
      expect(createPlaylistCacheManager).toBeDefined();
      expect(typeof createPlaylistCacheManager).toBe("function");
    });

    it("should export playlistCacheManager singleton", () => {
      expect(playlistCacheManager).toBeDefined();
      expect(typeof playlistCacheManager).toBe("object");
    });
  });
});
