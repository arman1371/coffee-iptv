import { useState, useEffect } from "preact/hooks";
import { configManager, type AppConfig } from "./config-manager";

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
      await configManager.setDebugMode(config.debugMode);
      await configManager.setM3uUrl(config.m3uUrl);

      window.history.back();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: keyof AppConfig, value: string | boolean) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
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
              <label htmlFor="m3uUrl">M3U Playlist URL</label>
              <input
                id="m3uUrl"
                type="url"
                value={config?.m3uUrl || ""}
                onChange={(e) =>
                  handleInputChange(
                    "m3uUrl",
                    (e.target as HTMLInputElement).value
                  )
                }
                placeholder="https://example.com/playlist.m3u"
                className="w-full rounded-md border bg-gray-700 p-3"
              />
              <p className="p-2 pl-4 text-sm text-gray-400">
                Enter the URL of your IPTV M3U playlist file
              </p>
            </div>
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
