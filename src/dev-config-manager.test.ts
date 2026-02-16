// Tests for DevConfigManager

import { describe, it, expect, beforeEach, vi } from "vitest";
import { DevConfigManager } from "./dev-config-manager";
import { DEFAULT_CONFIG } from "./config-manager";

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

describe("DevConfigManager", () => {
  let devConfigManager: DevConfigManager;

  beforeEach(() => {
    devConfigManager = new DevConfigManager();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should load config from file on initialize", async () => {
      const mockConfig = {
        debugMode: true,
        m3uUrls: [
          { url: "https://example.com/playlist.m3u", enabled: true },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      await devConfigManager.initialize();

      const config = await devConfigManager.getAllConfig();
      expect(config).toEqual(mockConfig);
    });

    it("should throw error if config file cannot be loaded", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(devConfigManager.initialize()).rejects.toThrow(
        "Can't load the config file. response not ok"
      );
    });

    it("should only initialize once", async () => {
      const mockConfig = {
        debugMode: false,
        m3uUrls: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      });

      await devConfigManager.initialize();
      await devConfigManager.initialize();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should merge file config with defaults", async () => {
      const partialConfig = {
        debugMode: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => partialConfig,
      });

      await devConfigManager.initialize();

      const config = await devConfigManager.getAllConfig();
      expect(config.debugMode).toBe(true);
      expect(config.m3uUrls).toEqual(DEFAULT_CONFIG.m3uUrls);
    });
  });

  describe("getConfig", () => {
    it("should return specific config value", async () => {
      const mockConfig = {
        debugMode: true,
        m3uUrls: [
          { url: "https://example.com/playlist.m3u", enabled: true },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const debugMode = await devConfigManager.getConfig("debugMode");
      expect(debugMode).toBe(true);
    });

    it("should auto-initialize if not initialized", async () => {
      const mockConfig = {
        debugMode: false,
        m3uUrls: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const value = await devConfigManager.getConfig("debugMode");
      expect(value).toBe(false);
    });
  });

  describe("getAllConfig", () => {
    it("should return all config values", async () => {
      const mockConfig = {
        debugMode: true,
        m3uUrls: [
          { url: "https://example.com/test.m3u", enabled: true },
          { url: "https://example.com/test2.m3u", enabled: false },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const config = await devConfigManager.getAllConfig();
      expect(config).toEqual(mockConfig);
    });

    it("should return a copy of config not reference", async () => {
      const mockConfig = {
        debugMode: true,
        m3uUrls: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const config1 = await devConfigManager.getAllConfig();
      const config2 = await devConfigManager.getAllConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });
  });

  describe("isDebugMode", () => {
    it("should return debug mode status", async () => {
      const mockConfig = {
        debugMode: true,
        m3uUrls: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const isDebug = await devConfigManager.isDebugMode();
      expect(isDebug).toBe(true);
    });

    it("should return false when debug mode is disabled", async () => {
      const mockConfig = {
        debugMode: false,
        m3uUrls: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const isDebug = await devConfigManager.isDebugMode();
      expect(isDebug).toBe(false);
    });
  });

  describe("getM3uUrls", () => {
    it("should return M3U URLs array", async () => {
      const mockUrls = [
        { url: "https://example.com/playlist1.m3u", enabled: true },
        { url: "https://example.com/playlist2.m3u", enabled: false },
      ];

      const mockConfig = {
        debugMode: false,
        m3uUrls: mockUrls,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const urls = await devConfigManager.getM3uUrls();
      expect(urls).toEqual(mockUrls);
    });

    it("should return empty array when no URLs configured", async () => {
      const mockConfig = {
        debugMode: false,
        m3uUrls: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const urls = await devConfigManager.getM3uUrls();
      expect(urls).toEqual([]);
    });
  });
});
