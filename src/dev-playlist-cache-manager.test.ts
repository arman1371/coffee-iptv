import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DevPlaylistCacheManager } from "./dev-playlist-cache-manager";
import type { M3UPlaylist } from "./m3u-manager";

describe("DevPlaylistCacheManager", () => {
  let cacheManager: DevPlaylistCacheManager;

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

  const urlsHash = "hash123";

  beforeEach(() => {
    cacheManager = new DevPlaylistCacheManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialize", () => {
    it("should resolve without error (no-op)", async () => {
      await expect(cacheManager.initialize()).resolves.toBeUndefined();
    });

    it("should be callable multiple times", async () => {
      await cacheManager.initialize();
      await cacheManager.initialize();
      // No error means success
    });
  });

  describe("getCachedPlaylist", () => {
    it("should return null when cache is empty", async () => {
      const result = await cacheManager.getCachedPlaylist(urlsHash, 24);
      expect(result).toBeNull();
    });

    it("should return cached playlist when valid", async () => {
      await cacheManager.cachePlaylist(mockPlaylist, urlsHash);

      const result = await cacheManager.getCachedPlaylist(urlsHash, 24);
      expect(result).toEqual(mockPlaylist);
    });

    it("should return null when urls hash does not match", async () => {
      await cacheManager.cachePlaylist(mockPlaylist, urlsHash);

      const result = await cacheManager.getCachedPlaylist("differentHash", 24);
      expect(result).toBeNull();
    });

    it("should return null when cache has expired", async () => {
      await cacheManager.cachePlaylist(mockPlaylist, urlsHash);

      // Advance time by 25 hours (past 24h refresh)
      vi.advanceTimersByTime(25 * 3600000);

      const result = await cacheManager.getCachedPlaylist(urlsHash, 24);
      expect(result).toBeNull();
    });

    it("should return playlist when cache is not yet expired", async () => {
      await cacheManager.cachePlaylist(mockPlaylist, urlsHash);

      // Advance time by 23 hours (still within 24h refresh)
      vi.advanceTimersByTime(23 * 3600000);

      const result = await cacheManager.getCachedPlaylist(urlsHash, 24);
      expect(result).toEqual(mockPlaylist);
    });

    it("should return null when cache expires at exact boundary", async () => {
      await cacheManager.cachePlaylist(mockPlaylist, urlsHash);

      // Advance time by exactly 24 hours (>= maxAge)
      vi.advanceTimersByTime(24 * 3600000);

      const result = await cacheManager.getCachedPlaylist(urlsHash, 24);
      expect(result).toBeNull();
    });

    it("should respect different refresh hour values", async () => {
      await cacheManager.cachePlaylist(mockPlaylist, urlsHash);

      // Advance 2 hours
      vi.advanceTimersByTime(2 * 3600000);

      // With 1-hour refresh, should be expired
      const expired = await cacheManager.getCachedPlaylist(urlsHash, 1);
      expect(expired).toBeNull();

      // With 3-hour refresh, should still be valid
      const valid = await cacheManager.getCachedPlaylist(urlsHash, 3);
      expect(valid).toEqual(mockPlaylist);
    });
  });

  describe("cachePlaylist", () => {
    it("should store playlist data", async () => {
      await cacheManager.cachePlaylist(mockPlaylist, urlsHash);

      const result = await cacheManager.getCachedPlaylist(urlsHash, 24);
      expect(result).toEqual(mockPlaylist);
    });

    it("should overwrite previous cache", async () => {
      const newPlaylist: M3UPlaylist = {
        channels: [
          {
            id: "ch3",
            name: "Channel 3",
            url: "http://stream3.com/live",
            group: "Movies",
            attributes: {},
          },
        ],
        metadata: {
          totalChannels: 1,
          groups: ["Movies"],
          parsedAt: "2026-04-27T12:00:00Z",
        },
      };

      await cacheManager.cachePlaylist(mockPlaylist, urlsHash);
      await cacheManager.cachePlaylist(newPlaylist, "newHash");

      // Old hash should not match
      const oldResult = await cacheManager.getCachedPlaylist(urlsHash, 24);
      expect(oldResult).toBeNull();

      // New hash should return new playlist
      const newResult = await cacheManager.getCachedPlaylist("newHash", 24);
      expect(newResult).toEqual(newPlaylist);
    });

    it("should reset the cache timestamp on overwrite", async () => {
      await cacheManager.cachePlaylist(mockPlaylist, urlsHash);

      // Advance 23 hours
      vi.advanceTimersByTime(23 * 3600000);

      // Re-cache with same data
      await cacheManager.cachePlaylist(mockPlaylist, urlsHash);

      // Advance another 23 hours (46 total from first cache, but only 23 from re-cache)
      vi.advanceTimersByTime(23 * 3600000);

      // Should still be valid because we re-cached
      const result = await cacheManager.getCachedPlaylist(urlsHash, 24);
      expect(result).toEqual(mockPlaylist);
    });
  });

  describe("clearCache", () => {
    it("should clear cached data", async () => {
      await cacheManager.cachePlaylist(mockPlaylist, urlsHash);
      await cacheManager.clearCache();

      const result = await cacheManager.getCachedPlaylist(urlsHash, 24);
      expect(result).toBeNull();
    });

    it("should not throw when cache is already empty", async () => {
      await expect(cacheManager.clearCache()).resolves.toBeUndefined();
    });
  });
});
