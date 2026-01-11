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
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: "v8",
      reporter: ['html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/test-setup.ts', '**/vite-env.d.ts', '**/webos-types.d.ts']
    },
  },
});
