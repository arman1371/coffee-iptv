import { useState, useEffect } from "preact/hooks";
import { configManager, notifyConfigChanged } from "./config-factory";
import { playlistCacheManager } from "./playlist-cache-factory";
import { type AppConfig, type PlaylistUrl } from "./config-manager";

export function ConfigPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    // Reset to original config without saving
    setConfig(originalConfig);
    setError(null);

    window.history.back();
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Remove manual back button handling - let WebOS handle via History API
  // The configuration page will be navigated back via the History API popstate event

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      await configManager.initialize();
      const currentConfig = await configManager.getAllConfig();
      setConfig(currentConfig);
      setOriginalConfig(currentConfig);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load configuration"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      // Save each configuration item
      await configManager.setDebugMode?.(config.debugMode);
      await configManager.setM3uUrls?.(config.m3uUrls);
      await configManager.setCacheRefreshHours?.(config.cacheRefreshHours);

      notifyConfigChanged();
      window.history.back();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: keyof AppConfig, value: string | boolean | number | PlaylistUrl[]) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const handleAddUrl = () => {
    if (!config || config.m3uUrls.length >= 10) return;
    const newUrls = [...config.m3uUrls, { url: "", enabled: true }];
    handleInputChange("m3uUrls", newUrls);
  };

  const handleRemoveUrl = (index: number) => {
    if (!config) return;
    const newUrls = config.m3uUrls.filter((_, i) => i !== index);
    handleInputChange("m3uUrls", newUrls);
  };

  const handleUrlChange = (index: number, value: string) => {
    if (!config) return;
    const newUrls = [...config.m3uUrls];
    newUrls[index] = { ...newUrls[index], url: value };
    handleInputChange("m3uUrls", newUrls);
  };

  const handleToggleUrl = (index: number) => {
    if (!config) return;
    const newUrls = [...config.m3uUrls];
    newUrls[index] = { ...newUrls[index], enabled: !newUrls[index].enabled };
    handleInputChange("m3uUrls", newUrls);
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen w-full overflow-hidden bg-gray-900 p-6 pt-20 font-sans text-white`}
      >
        <div className="flex flex-col items-center">
          <div className="mb-5 h-15 w-15 animate-spin rounded-full border-4 border-t-blue-500" />
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div
        className={`min-h-screen w-full overflow-hidden bg-gray-900 p-6 pt-20 font-sans text-white`}
      >
        <div className="flex flex-col items-center rounded-xl bg-gray-800 p-10">
          <div className="mb-2 text-6xl">⚠️</div>
          <h2 className="text-3xl font-semibold">
            Failed to Load Configuration
          </h2>
          <p className="p-4 text-base">{error}</p>
          <button
            className="mt-5 cursor-pointer rounded-md bg-gray-950 p-3 text-white hover:bg-gray-900"
            onClick={loadConfig}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full overflow-hidden bg-gray-900 p-6 pt-20 font-sans text-white`}
    >
      <main>
        {error && (
          <div className="mb-6 flex items-center rounded-md bg-red-500 p-4">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        )}

        <div className="mx-auto w-1/2">
          <div className="mb-5 rounded-md bg-gray-800 p-6">
            <h2 className="mb-6 text-2xl font-semibold">Playlist Settings</h2>

            <div>
              <label className="mb-2 block font-medium">M3U Playlist URLs</label>
              
              {config?.m3uUrls.length === 0 ? (
                <p className="mb-4 text-sm text-gray-400">
                  No playlist URLs configured. Click "Add URL" to add your first playlist.
                </p>
              ) : (
                <div className="mb-4 space-y-3">
                  {config?.m3uUrls.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="url"
                        value={item.url}
                        onChange={(e) =>
                          handleUrlChange(index, (e.target as HTMLInputElement).value)
                        }
                        placeholder="https://example.com/playlist.m3u"
                        className={`flex-1 rounded-md border bg-gray-700 p-3 ${
                          !item.enabled ? "opacity-60" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleToggleUrl(index)}
                        className={`flex-shrink-0 px-4 py-3 rounded-md font-medium ${
                          item.enabled
                            ? "bg-green-600 hover:bg-green-500"
                            : "bg-gray-600 hover:bg-gray-500"
                        }`}
                        disabled={saving}
                        title={item.enabled ? "Enabled" : "Disabled"}
                      >
                        {item.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveUrl(index)}
                        className="cursor-pointer rounded-md bg-red-600 px-4 py-3 hover:bg-red-500"
                        disabled={saving}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddUrl}
                className="cursor-pointer rounded-md bg-green-600 px-4 py-2 hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving || (config?.m3uUrls.length ?? 0) >= 10}
              >
                Add URL {config?.m3uUrls.length ?? 0}/10
              </button>

              <p className="mt-2 p-2 pl-4 text-sm text-gray-400">
                Add up to 10 M3U playlist URLs. All playlists will be merged together.
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-md bg-gray-800 p-6">
            <h2 className="mb-6 text-2xl font-semibold">Cache Settings</h2>

            <div className="mb-4">
              <label className="mb-2 block font-medium">
                Refresh interval (hours)
              </label>
              <input
                type="number"
                min="0"
                max="720"
                step="1"
                value={config?.cacheRefreshHours ?? 24}
                onChange={(e) => {
                  const val = parseInt(
                    (e.target as HTMLInputElement).value,
                    10
                  );
                  if (!isNaN(val)) {
                    handleInputChange(
                      "cacheRefreshHours",
                      Math.max(0, Math.min(720, val))
                    );
                  }
                }}
                className="w-32 rounded-md border bg-gray-700 p-3"
                disabled={saving}
              />
              <p className="mt-2 p-2 pl-4 text-sm text-gray-400">
                How often to re-download playlists. Set to 0 to always download
                fresh. Maximum 720 hours (30 days).
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                await playlistCacheManager.initialize();
                await playlistCacheManager.clearCache();
              }}
              className="cursor-pointer rounded-md bg-red-600 px-4 py-2 hover:bg-red-500"
              disabled={saving}
            >
              Clear Cache Now
            </button>
            <p className="mt-2 p-2 pl-4 text-sm text-gray-400">
              Force the next load to download playlists fresh from the network.
            </p>
          </div>

          <div className="mb-5 rounded-md bg-gray-800 p-6">
            <h2 className="mb-6 text-2xl font-semibold">Developer Settings</h2>

            <div>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={config?.debugMode || false}
                  onChange={(e) =>
                    handleInputChange(
                      "debugMode",
                      (e.target as HTMLInputElement).checked
                    )
                  }
                  className="cursor-pointer"
                />
                <span>Enable Debug Mode</span>
              </label>
              <p className="p-2 pl-4 text-sm text-gray-400">
                Shows additional debugging information in the console
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              className="cursor-pointer rounded-md bg-gray-700 p-3 hover:bg-gray-600"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="cursor-pointer rounded-md bg-blue-600 p-3 hover:bg-blue-500"
              onClick={handleSave}
              disabled={saving || !config}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
