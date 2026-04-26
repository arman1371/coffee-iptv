// Playlist Cache Manager for Coffee IPTV
// Caches playlist data in webOS Media Database for faster startup

import { DatabaseManager } from "./database-manager";
import type { M3UPlaylist } from "./m3u-manager";

export interface IPlaylistCacheManager {
  initialize(): Promise<void>;
  getCachedPlaylist(
    urlsHash: string,
    refreshHours: number
  ): Promise<M3UPlaylist | null>;
  cachePlaylist(playlist: M3UPlaylist, urlsHash: string): Promise<void>;
  clearCache(): Promise<void>;
}

interface CacheEntry {
  _id?: string;
  _kind: string;
  _rev?: number;
  key: string;
  data: string;
  cachedAt: string;
  urlsHash: string;
  [key: string]: string | number | boolean | undefined;
}

export class PlaylistCacheManager implements IPlaylistCacheManager {
  private dbManager: DatabaseManager;
  private readonly cacheKindId = "com.arman.coffeeiptv.playlistcache:1";
  private readonly appId = "com.arman.coffeeiptv";
  private isInitialized = false;

  constructor(databaseManager?: DatabaseManager) {
    this.dbManager =
      databaseManager || new DatabaseManager("luna://com.webos.mediadb");
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const cacheKind = this.dbManager.createKind(
        this.cacheKindId,
        this.appId,
        true,
        [{ name: "keyIndex", props: [{ name: "key" }] }]
      );

      await this.dbManager.putKind(cacheKind);
      this.isInitialized = true;
    } catch (error) {
      if (error && typeof error === "object" && "errorCode" in error) {
        this.isInitialized = true;
      } else {
        throw new Error(`Failed to initialize PlaylistCacheManager: ${error}`);
      }
    }
  }

  async getCachedPlaylist(
    urlsHash: string,
    refreshHours: number
  ): Promise<M3UPlaylist | null> {
    await this.ensureInitialized();

    try {
      const query = this.dbManager.createQuery(this.cacheKindId, [
        { prop: "key", op: "=", val: "playlistData" },
      ]);

      const result = await this.dbManager.find(query);

      if (
        !result.returnValue ||
        !result.results ||
        result.results.length === 0
      ) {
        return null;
      }

      const cacheEntry = result.results[0] as CacheEntry;

      // Check if URL hash matches
      if (cacheEntry.urlsHash !== urlsHash) {
        return null;
      }

      // Check if cache is still fresh
      const cachedTime = new Date(cacheEntry.cachedAt).getTime();
      const maxAge = refreshHours * 3600000;
      if (Date.now() - cachedTime >= maxAge) {
        return null;
      }

      return JSON.parse(cacheEntry.data) as M3UPlaylist;
    } catch (error) {
      console.warn("Failed to read playlist cache:", error);
      return null;
    }
  }

  async cachePlaylist(playlist: M3UPlaylist, urlsHash: string): Promise<void> {
    await this.ensureInitialized();

    try {
      // Check if a cache entry already exists
      const query = this.dbManager.createQuery(this.cacheKindId, [
        { prop: "key", op: "=", val: "playlistData" },
      ]);
      const existing = await this.dbManager.find(query);

      const cacheEntry: CacheEntry = {
        _kind: this.cacheKindId,
        key: "playlistData",
        data: JSON.stringify(playlist),
        cachedAt: new Date().toISOString(),
        urlsHash,
      };

      if (
        existing.returnValue &&
        existing.results &&
        existing.results.length > 0
      ) {
        const old = existing.results[0] as CacheEntry;
        cacheEntry._id = old._id;
        cacheEntry._rev = old._rev;
      }

      await this.dbManager.put([cacheEntry]);
    } catch (error) {
      console.warn("Failed to cache playlist:", error);
    }
  }

  async clearCache(): Promise<void> {
    await this.ensureInitialized();

    try {
      const query = this.dbManager.createQuery(this.cacheKindId);
      await this.dbManager.del(query);
    } catch (error) {
      console.warn("Failed to clear playlist cache:", error);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

/**
 * Compute a deterministic hash string from a list of enabled playlist URLs.
 * Sorts URLs alphabetically and joins them so that order doesn't matter.
 */
export function computeUrlsHash(urls: string[]): string {
  return [...urls].sort().join("|");
}
