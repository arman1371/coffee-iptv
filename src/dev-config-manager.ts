// Development Config Manager for Coffee IPTV
// Simple file-based config manager for local development (no DB8 dependency)

import {
  type IConfigManager,
  type AppConfig,
  type PlaylistUrl,
  DEFAULT_CONFIG,
} from "./config-manager";

export class DevConfigManager implements IConfigManager {
  private config: AppConfig;
  private readonly configFilePath = "/config.json"; // Relative to public folder
  private isInitialized = false;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Initialize the dev config manager by loading config from file
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const response = await fetch(this.configFilePath);
    if (response.ok) {
      const fileConfig = await response.json();
      this.config = {
        ...DEFAULT_CONFIG,
        ...fileConfig,
      };
      console.log("Dev config loaded from file:", this.config);
    } else {
      throw new Error("Can't load the config file. response not ok");
    }

    this.isInitialized = true;
  }

  /**
   * Get a configuration value by key
   */
  async getConfig<K extends keyof AppConfig>(key: K): Promise<AppConfig[K]> {
    await this.ensureInitialized();
    return this.config[key];
  }

  /**
   * Get all configuration values
   */
  async getAllConfig(): Promise<AppConfig> {
    await this.ensureInitialized();
    return { ...this.config };
  }

  /**
   * Get debug mode status (convenience method)
   */
  async isDebugMode(): Promise<boolean> {
    return await this.getConfig("debugMode");
  }

  /**
   * Get M3U URLs (convenience method)
   */
  async getM3uUrls(): Promise<PlaylistUrl[]> {
    return await this.getConfig("m3uUrls");
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
export const devConfigManager = new DevConfigManager();

// Export default for convenience
export default DevConfigManager;
