// Config Factory - Automatically selects the right config manager based on environment
// Uses DevConfigManager for development and ConfigManager for production

import { type IConfigManager, ConfigManager } from "./config-manager";
import { DevConfigManager } from "./dev-config-manager";

/**
 * Determines if we're running in development mode
 */
function isDevelopment(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === "development";
}

/**
 * Creates and returns the appropriate config manager instance
 */
export function createConfigManager(): IConfigManager {
  if (isDevelopment()) {
    console.log("Using DevConfigManager for development");
    return new DevConfigManager();
  }
  return new ConfigManager();
}

// Export a singleton instance
export const configManager = createConfigManager();

// Export default for convenience
export default configManager;
