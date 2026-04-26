// Development Playlist Cache Manager for Coffee IPTV
// In-memory cache implementation for local development (no Media DB dependency)

import type { IPlaylistCacheManager } from "./playlist-cache-manager";
import type { M3UPlaylist } from "./m3u-manager";

interface CachedData {
  playlist: M3UPlaylist;
  cachedAt: number;
  urlsHash: string;
}

export class DevPlaylistCacheManager implements IPlaylistCacheManager {
  private cache: CachedData | null = null;

  async initialize(): Promise<void> {
    // No-op for dev — in-memory, no DB setup needed
  }

  async getCachedPlaylist(
    urlsHash: string,
    refreshHours: number
  ): Promise<M3UPlaylist | null> {
    if (!this.cache) {
      return null;
    }

    if (this.cache.urlsHash !== urlsHash) {
      return null;
    }

    const maxAge = refreshHours * 3600000;
    if (Date.now() - this.cache.cachedAt >= maxAge) {
      return null;
    }

    return this.cache.playlist;
  }

  async cachePlaylist(playlist: M3UPlaylist, urlsHash: string): Promise<void> {
    this.cache = {
      playlist,
      cachedAt: Date.now(),
      urlsHash,
    };
  }

  async clearCache(): Promise<void> {
    this.cache = null;
  }
}
