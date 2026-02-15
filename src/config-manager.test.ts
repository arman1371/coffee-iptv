import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ConfigManager,
  configManager,
  type ConfigEntry,
} from "./config-manager";
import {
  DatabaseManager,
  type DB8SuccessResponse,
  type DB8ErrorResponse,
  type DB8Kind,
  type DB8Query,
} from "./database-manager";

describe("ConfigManager", () => {
  let mockDatabaseManager: DatabaseManager;
  let testConfigManager: ConfigManager;

  beforeEach(() => {
    // Create a mock database manager
    mockDatabaseManager = {
      createKind: vi.fn(),
      putKind: vi.fn(),
      createQuery: vi.fn(),
      find: vi.fn(),
      put: vi.fn(),
      del: vi.fn(),
      watch: vi.fn(),
    } as unknown as DatabaseManager;

    testConfigManager = new ConfigManager(mockDatabaseManager);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with config kind creation", async () => {
      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.config:1",
        owner: "com.arman.coffeeiptv",
        private: true,
        indexes: [{ name: "keyIndex", props: [{ name: "key" }] }],
      };
      const mockResponse: DB8SuccessResponse = { returnValue: true };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue(mockResponse);

      await testConfigManager.initialize();

      expect(mockDatabaseManager.createKind).toHaveBeenCalledWith(
        "com.arman.coffeeiptv.config:1",
        "com.arman.coffeeiptv",
        true,
        [{ name: "keyIndex", props: [{ name: "key" }] }]
      );
      expect(mockDatabaseManager.putKind).toHaveBeenCalledWith(mockKind);
    });

    it("should handle kind already exists error gracefully", async () => {
      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.config:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };
      const mockError: DB8ErrorResponse = {
        errorCode: 409,
        errorText: "Kind already exists",
        returnValue: false,
      };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockRejectedValue(mockError);

      await expect(testConfigManager.initialize()).resolves.not.toThrow();
    });

    it("should only initialize once", async () => {
      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.config:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };
      const mockResponse: DB8SuccessResponse = { returnValue: true };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue(mockResponse);

      await testConfigManager.initialize();
      await testConfigManager.initialize();

      expect(mockDatabaseManager.putKind).toHaveBeenCalledTimes(1);
    });
  });

  describe("getConfig", () => {
    it("should return config value from database", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.config:1",
        where: [{ prop: "key", op: "=", val: "debugMode" }],
      };
      const mockConfigEntry: ConfigEntry = {
        _kind: "com.arman.coffeeiptv.config:1",
        _id: "config1",
        key: "debugMode",
        value: true,
        updatedAt: "2025-08-31T12:00:00Z",
      };
      const mockResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [mockConfigEntry],
      };

      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.config:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });
      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue(mockResponse);

      const result = await testConfigManager.getConfig("debugMode");

      expect(result).toBe(true);
      expect(mockDatabaseManager.createQuery).toHaveBeenCalledWith(
        "com.arman.coffeeiptv.config:1",
        [{ prop: "key", op: "=", val: "debugMode" }]
      );
    });

    it("should return default value when config not found", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.config:1",
        where: [{ prop: "key", op: "=", val: "debugMode" }],
      };
      const mockResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [],
      };

      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.config:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });
      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue(mockResponse);

      const result = await testConfigManager.getConfig("debugMode");

      expect(result).toBe(false); // default value
    });

    it("should return default value on database error", async () => {
      const mockError: DB8ErrorResponse = {
        errorCode: 500,
        errorText: "Database error",
        returnValue: false,
      };

      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.config:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };
      const mockQuery: DB8Query = { from: "com.arman.coffeeiptv.config:1" };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });
      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockRejectedValue(mockError);

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await testConfigManager.getConfig("m3uUrls");

      expect(result).toEqual([]); // default value for m3uUrls
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get config 'm3uUrls', using default:",
        mockError
      );

      consoleSpy.mockRestore();
    });
  });

  describe("setConfig", () => {
    it("should create new config entry when not exists", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.config:1",
        where: [{ prop: "key", op: "=", val: "debugMode" }],
      };
      const mockFindResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [],
      };
      const mockPutResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [{ id: "config1", rev: 1 }],
      };

      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.config:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });
      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue(mockFindResponse);
      vi.mocked(mockDatabaseManager.put).mockResolvedValue(mockPutResponse);

      await testConfigManager.setConfig("debugMode", true);

      expect(mockDatabaseManager.put).toHaveBeenCalledWith([
        expect.objectContaining({
          _kind: "com.arman.coffeeiptv.config:1",
          key: "debugMode",
          value: true,
          updatedAt: expect.any(String),
        }),
      ]);
    });

    it("should update existing config entry", async () => {
      const existingConfig: ConfigEntry = {
        _kind: "com.arman.coffeeiptv.config:1",
        _id: "config1",
        _rev: 5,
        key: "debugMode",
        value: false,
        updatedAt: "2025-08-31T11:00:00Z",
      };
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.config:1",
        where: [{ prop: "key", op: "=", val: "debugMode" }],
      };
      const mockFindResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [existingConfig],
      };
      const mockPutResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [{ id: "config1", rev: 6 }],
      };

      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.config:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });
      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue(mockFindResponse);
      vi.mocked(mockDatabaseManager.put).mockResolvedValue(mockPutResponse);

      await testConfigManager.setConfig("debugMode", true);

      expect(mockDatabaseManager.put).toHaveBeenCalledWith([
        expect.objectContaining({
          _kind: "com.arman.coffeeiptv.config:1",
          _id: "config1",
          _rev: 5,
          key: "debugMode",
          value: true,
          updatedAt: expect.any(String),
        }),
      ]);
    });
  });

  describe("getAllConfig", () => {
    it("should return all config values from database", async () => {
      const mockConfigs: ConfigEntry[] = [
        {
          _kind: "com.arman.coffeeiptv.config:1",
          _id: "config1",
          key: "debugMode",
          value: true,
          updatedAt: "2025-08-31T12:00:00Z",
        },
        {
          _kind: "com.arman.coffeeiptv.config:1",
          _id: "config2",
          key: "m3uUrls",
          value: JSON.stringify([{ url: "https://example.com/playlist.m3u", enabled: true }]),
          updatedAt: "2025-08-31T12:00:00Z",
        },
      ];
      const mockQuery: DB8Query = { from: "com.arman.coffeeiptv.config:1" };
      const mockResponse: DB8SuccessResponse = {
        returnValue: true,
        results: mockConfigs,
      };

      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.config:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });
      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue(mockResponse);

      const result = await testConfigManager.getAllConfig();

      expect(result).toEqual({
        debugMode: true,
        m3uUrls: [{ url: "https://example.com/playlist.m3u", enabled: true }],
      });
    });

    it("should return defaults when database is empty", async () => {
      const mockQuery: DB8Query = { from: "com.arman.coffeeiptv.config:1" };
      const mockResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [],
      };

      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.config:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });
      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue(mockResponse);

      const result = await testConfigManager.getAllConfig();

      expect(result).toEqual({
        debugMode: false,
        m3uUrls: [],
      });
    });
  });

  describe("convenience methods", () => {
    beforeEach(() => {
      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.config:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };
      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });
    });

    it("should handle debug mode methods", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.config:1",
        where: [{ prop: "key", op: "=", val: "debugMode" }],
      };
      const mockResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [
          {
            _kind: "com.arman.coffeeiptv.config:1",
            _id: "config1",
            key: "debugMode",
            value: true,
            updatedAt: "2025-08-31T12:00:00Z",
          },
        ],
      };

      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue(mockResponse);

      const isDebug = await testConfigManager.isDebugMode();
      expect(isDebug).toBe(true);

      vi.mocked(mockDatabaseManager.find).mockResolvedValue({
        returnValue: true,
        results: [],
      });
      vi.mocked(mockDatabaseManager.put).mockResolvedValue({
        returnValue: true,
      });

      await testConfigManager.setDebugMode(false);
      expect(mockDatabaseManager.put).toHaveBeenCalled();
    });

    it("should handle M3U URL methods", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.config:1",
        where: [{ prop: "key", op: "=", val: "m3uUrls" }],
      };
      const mockResponse: DB8SuccessResponse = {
        returnValue: true,
        results: [
          {
            _kind: "com.arman.coffeeiptv.config:1",
            _id: "config2",
            key: "m3uUrls",
            value: JSON.stringify([{ url: "https://example.com/playlist.m3u", enabled: true }]),
            updatedAt: "2025-08-31T12:00:00Z",
          },
        ],
      };

      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue(mockResponse);

      const urls = await testConfigManager.getM3uUrls();
      expect(urls).toEqual([{ url: "https://example.com/playlist.m3u", enabled: true }]);

      vi.mocked(mockDatabaseManager.find).mockResolvedValue({
        returnValue: true,
        results: [],
      });
      vi.mocked(mockDatabaseManager.put).mockResolvedValue({
        returnValue: true,
      });

      await testConfigManager.setM3uUrls([{ url: "https://new-url.com/playlist.m3u", enabled: false }]);
      expect(mockDatabaseManager.put).toHaveBeenCalled();
    });
  });

  describe("singleton instance", () => {
    it("should export a singleton configManager instance", () => {
      expect(configManager).toBeInstanceOf(ConfigManager);
    });
  });
});
