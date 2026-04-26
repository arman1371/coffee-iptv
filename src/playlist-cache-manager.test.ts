import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PlaylistCacheManager,
  computeUrlsHash,
} from "./playlist-cache-manager";
import {
  DatabaseManager,
  type DB8ErrorResponse,
  type DB8Kind,
  type DB8Query,
} from "./database-manager";
import type { M3UPlaylist } from "./m3u-manager";

describe("PlaylistCacheManager", () => {
  let mockDatabaseManager: DatabaseManager;
  let cacheManager: PlaylistCacheManager;

  const mockPlaylist: M3UPlaylist = {
    channels: [
      {
        id: "ch1",
        name: "Channel 1",
        url: "http://stream1.com/live",
        group: "News",
        attributes: {},
      },
      {
        id: "ch2",
        name: "Channel 2",
        url: "http://stream2.com/live",
        group: "Sports",
        attributes: {},
      },
    ],
    metadata: {
      totalChannels: 2,
      groups: ["News", "Sports"],
      parsedAt: "2026-04-26T12:00:00Z",
    },
  };

  beforeEach(() => {
    mockDatabaseManager = {
      createKind: vi.fn(),
      putKind: vi.fn(),
      createQuery: vi.fn(),
      find: vi.fn(),
      put: vi.fn(),
      del: vi.fn(),
    } as unknown as DatabaseManager;

    cacheManager = new PlaylistCacheManager(mockDatabaseManager);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initialize", () => {
    it("should register the cache kind", async () => {
      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.playlistcache:1",
        owner: "com.arman.coffeeiptv",
        private: true,
        indexes: [{ name: "keyIndex", props: [{ name: "key" }] }],
      };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });

      await cacheManager.initialize();

      expect(mockDatabaseManager.createKind).toHaveBeenCalledWith(
        "com.arman.coffeeiptv.playlistcache:1",
        "com.arman.coffeeiptv",
        true,
        [{ name: "keyIndex", props: [{ name: "key" }] }]
      );
      expect(mockDatabaseManager.putKind).toHaveBeenCalledWith(mockKind);
    });

    it("should only initialize once", async () => {
      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.playlistcache:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };

      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });

      await cacheManager.initialize();
      await cacheManager.initialize();

      expect(mockDatabaseManager.putKind).toHaveBeenCalledTimes(1);
    });

    it("should handle kind already exists error gracefully", async () => {
      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.playlistcache:1",
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

      await expect(cacheManager.initialize()).resolves.not.toThrow();
    });
  });

  describe("getCachedPlaylist", () => {
    beforeEach(() => {
      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.playlistcache:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };
      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });
    });

    it("should return null when no cache exists", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.playlistcache:1",
        where: [{ prop: "key", op: "=", val: "playlistData" }],
      };

      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue({
        returnValue: true,
        results: [],
      });

      const result = await cacheManager.getCachedPlaylist("hash1", 24);

      expect(result).toBeNull();
    });

    it("should return cached playlist when cache is valid", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.playlistcache:1",
        where: [{ prop: "key", op: "=", val: "playlistData" }],
      };

      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue({
        returnValue: true,
        results: [
          {
            _kind: "com.arman.coffeeiptv.playlistcache:1",
            _id: "cache1",
            key: "playlistData",
            data: JSON.stringify(mockPlaylist),
            cachedAt: new Date().toISOString(),
            urlsHash: "hash1",
          },
        ],
      });

      const result = await cacheManager.getCachedPlaylist("hash1", 24);

      expect(result).toEqual(mockPlaylist);
    });

    it("should return null when cache is expired", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.playlistcache:1",
        where: [{ prop: "key", op: "=", val: "playlistData" }],
      };

      const expiredDate = new Date(
        Date.now() - 25 * 3600000
      ).toISOString(); // 25 hours ago

      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue({
        returnValue: true,
        results: [
          {
            _kind: "com.arman.coffeeiptv.playlistcache:1",
            _id: "cache1",
            key: "playlistData",
            data: JSON.stringify(mockPlaylist),
            cachedAt: expiredDate,
            urlsHash: "hash1",
          },
        ],
      });

      const result = await cacheManager.getCachedPlaylist("hash1", 24);

      expect(result).toBeNull();
    });

    it("should return null when URL hash doesn't match", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.playlistcache:1",
        where: [{ prop: "key", op: "=", val: "playlistData" }],
      };

      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue({
        returnValue: true,
        results: [
          {
            _kind: "com.arman.coffeeiptv.playlistcache:1",
            _id: "cache1",
            key: "playlistData",
            data: JSON.stringify(mockPlaylist),
            cachedAt: new Date().toISOString(),
            urlsHash: "old-hash",
          },
        ],
      });

      const result = await cacheManager.getCachedPlaylist("new-hash", 24);

      expect(result).toBeNull();
    });

    it("should return null on database error", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.playlistcache:1",
      };

      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockRejectedValue({
        errorCode: 500,
        errorText: "Database error",
        returnValue: false,
      });

      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = await cacheManager.getCachedPlaylist("hash1", 24);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("cachePlaylist", () => {
    beforeEach(() => {
      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.playlistcache:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };
      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });
    });

    it("should store playlist data in the database", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.playlistcache:1",
        where: [{ prop: "key", op: "=", val: "playlistData" }],
      };

      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue({
        returnValue: true,
        results: [],
      });
      vi.mocked(mockDatabaseManager.put).mockResolvedValue({
        returnValue: true,
      });

      await cacheManager.cachePlaylist(mockPlaylist, "hash1");

      expect(mockDatabaseManager.put).toHaveBeenCalledWith([
        expect.objectContaining({
          _kind: "com.arman.coffeeiptv.playlistcache:1",
          key: "playlistData",
          data: JSON.stringify(mockPlaylist),
          urlsHash: "hash1",
          cachedAt: expect.any(String),
        }),
      ]);
    });

    it("should update existing cache entry", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.playlistcache:1",
        where: [{ prop: "key", op: "=", val: "playlistData" }],
      };

      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.find).mockResolvedValue({
        returnValue: true,
        results: [
          {
            _kind: "com.arman.coffeeiptv.playlistcache:1",
            _id: "existing-id",
            _rev: 5,
            key: "playlistData",
            data: "old-data",
            cachedAt: "2026-01-01T00:00:00Z",
            urlsHash: "old-hash",
          },
        ],
      });
      vi.mocked(mockDatabaseManager.put).mockResolvedValue({
        returnValue: true,
      });

      await cacheManager.cachePlaylist(mockPlaylist, "new-hash");

      expect(mockDatabaseManager.put).toHaveBeenCalledWith([
        expect.objectContaining({
          _id: "existing-id",
          _rev: 5,
          urlsHash: "new-hash",
        }),
      ]);
    });
  });

  describe("clearCache", () => {
    beforeEach(() => {
      const mockKind: DB8Kind = {
        id: "com.arman.coffeeiptv.playlistcache:1",
        owner: "com.arman.coffeeiptv",
        private: true,
      };
      vi.mocked(mockDatabaseManager.createKind).mockReturnValue(mockKind);
      vi.mocked(mockDatabaseManager.putKind).mockResolvedValue({
        returnValue: true,
      });
    });

    it("should delete all cache entries", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.playlistcache:1",
      };

      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.del).mockResolvedValue({
        returnValue: true,
        count: 1,
      });

      await cacheManager.clearCache();

      expect(mockDatabaseManager.del).toHaveBeenCalledWith(mockQuery);
    });

    it("should handle clear cache errors gracefully", async () => {
      const mockQuery: DB8Query = {
        from: "com.arman.coffeeiptv.playlistcache:1",
      };

      vi.mocked(mockDatabaseManager.createQuery).mockReturnValue(mockQuery);
      vi.mocked(mockDatabaseManager.del).mockRejectedValue({
        errorCode: 500,
        errorText: "Delete failed",
        returnValue: false,
      });

      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      await expect(cacheManager.clearCache()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe("computeUrlsHash", () => {
  it("should produce same hash regardless of URL order", () => {
    const hash1 = computeUrlsHash(["http://a.com", "http://b.com"]);
    const hash2 = computeUrlsHash(["http://b.com", "http://a.com"]);

    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different URLs", () => {
    const hash1 = computeUrlsHash(["http://a.com"]);
    const hash2 = computeUrlsHash(["http://b.com"]);

    expect(hash1).not.toBe(hash2);
  });

  it("should handle empty array", () => {
    const hash = computeUrlsHash([]);

    expect(hash).toBe("");
  });

  it("should handle single URL", () => {
    const hash = computeUrlsHash(["http://a.com"]);

    expect(hash).toBe("http://a.com");
  });

  it("should sort and join URLs with pipe separator", () => {
    const hash = computeUrlsHash([
      "http://c.com",
      "http://a.com",
      "http://b.com",
    ]);

    expect(hash).toBe("http://a.com|http://b.com|http://c.com");
  });
});
