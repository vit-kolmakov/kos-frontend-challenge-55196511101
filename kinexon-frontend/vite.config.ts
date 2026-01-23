/// <reference types="vitest" />

import { defineConfig } from "vite";
import analog from "@analogjs/platform";
import viteTsConfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    target: ["esnext"],
  },
  resolve: {
    mainFields: ["module"],
  },
  plugins: [
    // INFO: Enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    analog({
      // INFO: Builds in pure SPA mode
      ssr: false,
      static: true,
      vite: {
        tsconfig: "./tsconfig.app.json", // Add this line inside the analog object
      },
      prerender: {
        routes: [],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
