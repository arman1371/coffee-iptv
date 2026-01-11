import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";
import checker from "vite-plugin-checker";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    checker({
      typescript: true,
    }),
  ],
  base: "./",
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
