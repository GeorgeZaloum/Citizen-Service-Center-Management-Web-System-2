import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import type { UserConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const config: UserConfig = {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      // 5173 is the origin the backend trusts (CORS_ALLOWED_ORIGINS / CSRF_TRUSTED_ORIGINS).
      port: 5173,
      strictPort: true,
      // Same-origin requests in development: the session and csrftoken cookies stay first-party.
      // 127.0.0.1, not localhost: Node resolves localhost to ::1, where runserver does not listen.
      proxy: {
        "/api": { target: env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000", changeOrigin: true },
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Libraries change less often than the app: separate chunks stay cached between releases.
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            mui: ["@mui/material", "@emotion/react", "@emotion/styled", "@emotion/cache"],
            data: ["axios", "@tanstack/react-query", "zustand", "i18next", "react-i18next"],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      env: { VITE_USE_MOCKS: "false", VITE_API_BASE_URL: "/api/v1" },
    },
  };
  return config;
});
