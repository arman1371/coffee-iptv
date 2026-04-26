// Config Manager for Coffee IPTV
// Manages application configuration using DB8 database

import { DatabaseManager, type DB8Object } from "./database-manager";

export interface PlaylistUrl {
  url: string;
  enabled: boolean;
}

export interface AppConfig {
  debugMode: boolean;
  m3uUrls: PlaylistUrl[];
  cacheRefreshHours: number;
  [key: string]: string | boolean | number | PlaylistUrl[]; // Index signature to allow dynamic property access
}

export interface ConfigEntry extends DB8Object {
  _kind: "com.arman.coffeeiptv.config:1";
  key: string;
  value: string | boolean | number;
  updatedAt: string;
}

// Shared default configuration values
export const DEFAULT_CONFIG: AppConfig = {
  debugMode: false,
  m3uUrls: [],
  cacheRefreshHours: 24,
};

// Interface for config manager implementations
export interface IConfigManager {
  initialize(): Promise<void>;
  getConfig<K extends keyof AppConfig>(key: K): Promise<AppConfig[K]>;
  setConfig?<K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K]
  ): Promise<void>;
  getAllConfig(): Promise<AppConfig>;
  isDebugMode(): Promise<boolean>;
  setDebugMode?(enabled: boolean): Promise<void>;
  getM3uUrls(): Promise<PlaylistUrl[]>;
  setM3uUrls?(urls: PlaylistUrl[] | string[]): Promise<void>;
  getCacheRefreshHours(): Promise<number>;
  setCacheRefreshHours?(hours: number): Promise<void>;
}

export class ConfigManager implements IConfigManager {
  private dbManager: DatabaseManager;
  private readonly configKindId = "com.arman.coffeeiptv.config:1";
  private readonly appId = "com.arman.coffeeiptv";
  private isInitialized = false;

  constructor(databaseManager?: DatabaseManager) {
    this.dbManager = databaseManager || new DatabaseManager();
  }

  /**
   * Initialize the config manager by creating the config kind if it doesn't exist
   * Also migrates old m3uUrl format to m3uUrls array if needed
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create the config kind with proper indexes
      const configKind = this.dbManager.createKind(
        this.configKindId,
        this.appId,
        true, // private - will be removed when app is uninstalled
        [{ name: "keyIndex", props: [{ name: "key" }] }]
      );

      await this.dbManager.putKind(configKind);
      this.isInitialized = true;
      
      // Migrate old m3uUrl to m3uUrls if needed
      await this.migrateOldConfig();
    } catch (error) {
      // If kind already exists, that's okay
      if (error && typeof error === "object" && "errorCode" in error) {
        // Kind might already exist, which is fine
        this.isInitialized = true;
        
        // Still try to migrate
        await this.migrateOldConfig();
      } else {
        throw new Error(`Failed to initialize ConfigManager: ${error}`);
      }
    }
  }

  /**
   * Get a configuration value by key
   * For array values, deserializes from JSON string
   */
  async getConfig<K extends keyof AppConfig>(key: K): Promise<AppConfig[K]> {
    await this.ensureInitialized();

    try {
      const query = this.dbManager.createQuery(this.configKindId, [
        { prop: "key", op: "=", val: key },
      ]);

      const result = await this.dbManager.find(query);

      if (result.returnValue && result.results && result.results.length > 0) {
        const configEntry = result.results[0] as ConfigEntry;
        const value = configEntry.value;
        
        // Deserialize JSON strings back to arrays
        if (typeof value === 'string' && key === 'm3uUrls') {
          try {
            return JSON.parse(value) as AppConfig[K];
          } catch {
            // If parsing fails, return default
            return DEFAULT_CONFIG[key];
          }
        }
        
        return value as AppConfig[K];
      }

      // Return default value if not found
      return DEFAULT_CONFIG[key];
    } catch (error) {
      console.warn(`Failed to get config '${key}', using default:`, error);
      return DEFAULT_CONFIG[key];
    }
  }

  /**
   * Set a configuration value by key
   * For array values, serializes to JSON string
   */
  async setConfig<K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K]
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      // Check if config entry already exists
      const existingQuery = this.dbManager.createQuery(this.configKindId, [
        { prop: "key", op: "=", val: key },
      ]);

      const existingResult = await this.dbManager.find(existingQuery);

      // Serialize arrays to JSON strings for DB8 storage
      const serializedValue = Array.isArray(value) ? JSON.stringify(value) : value as string | boolean | number;

      const configEntry: ConfigEntry = {
        _kind: this.configKindId,
        key: key as string,
        value: serializedValue as string | boolean | number,
        updatedAt: new Date().toISOString(),
      };

      if (
        existingResult.returnValue &&
        existingResult.results &&
        existingResult.results.length > 0
      ) {
        // Update existing entry
        const existing = existingResult.results[0] as ConfigEntry;
        configEntry._id = existing._id;
        configEntry._rev = existing._rev;
      }

      await this.dbManager.put([configEntry]);
    } catch (error) {
      throw new Error(`Failed to set config '${key}': ${error}`);
    }
  }

  /**
   * Get all configuration values
   */
  async getAllConfig(): Promise<AppConfig> {
    await this.ensureInitialized();

    try {
      const query = this.dbManager.createQuery(this.configKindId);
      const result = await this.dbManager.find(query);

      const config: AppConfig = { ...DEFAULT_CONFIG };

      if (result.returnValue && result.results) {
        for (const item of result.results) {
          const configEntry = item as ConfigEntry;
          if (configEntry.key in config) {
            const value = configEntry.value;
            
            // Deserialize JSON strings back to arrays for m3uUrls
            if (typeof value === 'string' && configEntry.key === 'm3uUrls') {
              try {
                (config as Record<string, unknown>)[configEntry.key] = JSON.parse(value);
              } catch {
                // If parsing fails, use default
                (config as Record<string, unknown>)[configEntry.key] = DEFAULT_CONFIG[configEntry.key as keyof AppConfig];
              }
            } else {
              (config as Record<string, unknown>)[configEntry.key] = value;
            }
          }
        }
      }

      return config;
    } catch (error) {
      console.warn("Failed to get all config, using defaults:", error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Get debug mode status (convenience method)
   */
  async isDebugMode(): Promise<boolean> {
    return await this.getConfig("debugMode");
  }

  /**
   * Set debug mode (convenience method)
   */
  async setDebugMode(enabled: boolean): Promise<void> {
    await this.setConfig("debugMode", enabled);
  }

  /**
   * Get M3U URLs (convenience method)
   */
  async getM3uUrls(): Promise<PlaylistUrl[]> {
    return await this.getConfig("m3uUrls");
  }

  /**
   * Set M3U URLs (convenience method)
   * Filters out empty URLs and enforces max 10 limit
   * Accepts both PlaylistUrl[] and string[] for backward compatibility
   */
  async setM3uUrls(urls: PlaylistUrl[] | string[]): Promise<void> {
    // Normalize to PlaylistUrl[] format
    const playlistUrls: PlaylistUrl[] = urls.map(item => {
      if (typeof item === 'string') {
        return { url: item, enabled: true };
      }
      return item;
    });

    // Filter out empty/whitespace URLs and trim
    const cleanedUrls = playlistUrls
      .map(item => ({ ...item, url: item.url.trim() }))
      .filter(item => item.url !== '')
      .slice(0, 10); // Enforce max 10 URLs
    
    await this.setConfig("m3uUrls", cleanedUrls);
  }

  /**
   * Get cache refresh interval in hours (convenience method)
   */
  async getCacheRefreshHours(): Promise<number> {
    return await this.getConfig("cacheRefreshHours");
  }

  /**
   * Set cache refresh interval in hours (convenience method)
   */
  async setCacheRefreshHours(hours: number): Promise<void> {
    await this.setConfig("cacheRefreshHours", hours);
  }

  /**
   * Migrate old m3uUrl config to m3uUrls array
   */
  private async migrateOldConfig(): Promise<void> {
    try {
      const query = this.dbManager.createQuery(this.configKindId, [
        { prop: "key", op: "=", val: "m3uUrl" },
      ]);

      const result = await this.dbManager.find(query);

      if (result.returnValue && result.results && result.results.length > 0) {
        const oldConfigEntry = result.results[0] as ConfigEntry;
        const oldUrl = oldConfigEntry.value;
        
        // Only migrate if old URL exists, is a string, and is not empty
        if (oldUrl && typeof oldUrl === 'string' && oldUrl.trim() !== '') {
          // Check if m3uUrls already exists
          const newQuery = this.dbManager.createQuery(this.configKindId, [
            { prop: "key", op: "=", val: "m3uUrls" },
          ]);
          const newResult = await this.dbManager.find(newQuery);
          
          // Only migrate if m3uUrls doesn't exist yet
          if (!newResult.returnValue || !newResult.results || newResult.results.length === 0) {
            await this.setM3uUrls([{ url: oldUrl, enabled: true }]);
            console.log('Migrated old m3uUrl to m3uUrls array');
          }
        }
      }
    } catch (error) {
      // Migration failure is not critical, just log it
      console.warn('Failed to migrate old config:', error);
    }
  }

  /**
   * Ensure the config manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

// Export a singleton instance for easy use
export const configManager = new ConfigManager();

// Export default for convenience
export default ConfigManager;
