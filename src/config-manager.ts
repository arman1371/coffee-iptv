// Config Manager for Coffee IPTV
// Manages application configuration using DB8 database

import { DatabaseManager, type DB8Object } from "./database-manager";

export interface AppConfig {
  debugMode: boolean;
  m3uUrl: string;
  [key: string]: string | boolean; // Index signature to allow dynamic property access
}

export interface ConfigEntry extends DB8Object {
  _kind: "com.arman.coffeeiptv.config:1";
  key: string;
  value: string | boolean;
  updatedAt: string;
}

// Shared default configuration values
export const DEFAULT_CONFIG: AppConfig = {
  debugMode: false,
  m3uUrl: "",
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
  getM3uUrl(): Promise<string>;
  setM3uUrl?(url: string): Promise<void>;
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
    } catch (error) {
      // If kind already exists, that's okay
      if (error && typeof error === "object" && "errorCode" in error) {
        // Kind might already exist, which is fine
        this.isInitialized = true;
      } else {
        throw new Error(`Failed to initialize ConfigManager: ${error}`);
      }
    }
  }

  /**
   * Get a configuration value by key
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
        return configEntry.value as AppConfig[K];
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

      const configEntry: ConfigEntry = {
        _kind: this.configKindId,
        key: key as string,
        value,
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
            (config as Record<string, unknown>)[configEntry.key] =
              configEntry.value;
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
   * Get M3U URL (convenience method)
   */
  async getM3uUrl(): Promise<string> {
    return await this.getConfig("m3uUrl");
  }

  /**
   * Set M3U URL (convenience method)
   */
  async setM3uUrl(url: string): Promise<void> {
    await this.setConfig("m3uUrl", url);
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
